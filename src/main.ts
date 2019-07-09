import { summarize_room } from "_lib/resources"
import { add_stats_callback, collect_stats } from "_lib/screepsplus"
import { HaulingJob } from "jobs/HaulingJob"
import { Job, JobPriority, JobType } from "jobs/Job"
import { PathStyle } from "jobs/MovementPathStyles"
import { Dictionary } from "lodash"
import { RemoteEnergyMission } from "missions/RemoteEnergyMission"
import { Role } from "role/roles"
import PriorityQueue from "ts-priority-queue"
import { ErrorMapper } from "utils/ErrorMapper"
import { deseralizeJobCreeps } from "utils/MemoryUtil"
import { init } from "./_lib/Profiler"
import DEFCON, { DEFCONLEVEL } from "./DEFCON"
import { CreepMutations, Hatchery } from "./Hatchery"
import { BuilderJob } from "./jobs/BuilderJob"
import { EnergyMission } from "./jobs/EnergyMission"
import { UpgradeControllerJob } from "./jobs/UpgradeControllerJob"
import { RoomScanner } from "./RoomScanner"
// import "./_lib/client-abuse/injectBirthday.js"
global.Profiler = init()

// global.DEFCON = DEFCON

// add_stats_callback((stats: IStats) => {
//   if (stats) {
//     stats.jobs = Memory.jobs

//     // Memory.jobs.forEach(job => {
//     //   if (stats && stats.jobs && job.target) {
//     //     let jobTarget = stats.jobs[job.target]
//     //     if (!jobTarget) {
//     //       stats.jobs[job.target] = jobTarget = []
//     //     }
//     //     jobTarget.push(job)
//     //     // TODO: what about subjobs?
//     //   }
//     // })
//   }
// })

const roomScanner = new RoomScanner()

// https://github.com/bencbartlett/creep-tasks

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  // global.injectBirthday()
  // console.log(`Current game tick is ${Game.time}`);

  // https://screepers.gitbook.io/screeps-typescript-starter/in-depth/cookbook/environment-letiables
  if (!Memory.BUILD_TIME || Memory.BUILD_TIME !== __BUILD_TIME__) {
    Memory.BUILD_TIME = __BUILD_TIME__
    Memory.SCRIPT_VERSION = __REVISION__
    console.log(`New code uploaded ${__BUILD_TIME__} (${__REVISION__})`)
  }

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    const creep = Memory.creeps[name]
    if (creep) {
      creep.unemployed = true
    }

    if (!(name in Game.creeps)) {
      delete Memory.creeps[name]
      // console.log("Clearing non-existing creep memory:", name)
    } else {
      if (!creep.role) {
        creep.role = Role.Larvae
      }
    }
  }

  // Processes / Directives
  // RCL = 1
  // A colony is defined by having one or more spawners? or RCL?
  // Colony should have general purpose harvesters
  let hatchery: Hatchery | undefined
  for (const spawnName in Game.spawns) {
    if (Game.spawns.hasOwnProperty(spawnName)) {
      const spawn = Game.spawns[spawnName]
      // TODO: only scan the room for static data once
      roomScanner.scan(spawn.room)

      hatchery = new Hatchery(spawn)

      hatchery.run()

      // How do we determine what hatchery the mission should utilize? Thats a problem for RCL 7+
      // TODO: energymission should only be run once per room
      const energyMission = new EnergyMission(spawn.room)
      energyMission.run()
    }
  }
  // ramparts? walls? basebuilding directive?

  const jobs: Dictionary<Job[]> = deseralizeJobs()

  // Visible rooms
  for (const roomName in Game.rooms) {
    if (Game.rooms.hasOwnProperty(roomName)) {
      const room = Game.rooms[roomName]

      if (room) {
        calculateAverageEnergy(room)

        queueUpgraderJob(room, jobs)

        // const exitWalls = new RoomScanner().exitWalls(room)
        const scanResult = DEFCON.scan(room)

        if (room.memory.DEFCON && hatchery) {
          switch (room.memory.DEFCON.level) {
            case DEFCONLEVEL.POSSIBLE_ATTACK:
              const defenderRequests = hatchery.getRequests(room.name, CreepMutations.DEFENDER)
              const currentDefenders = _.filter(Game.creeps, creep => creep.memory.role === Role.DEFENDER)
              if (defenderRequests === 0 && currentDefenders.length === 0) {
                hatchery.queue({
                  mutation: CreepMutations.DEFENDER,
                  target: room.name,
                  priority: JobPriority.Medium + 5
                })
              }

              currentDefenders.forEach(defender => {
                const target = scanResult.attack.pop()
                if (target && defender.rangedAttack(target) === ERR_NOT_IN_RANGE) {
                  defender.moveTo(target, { visualizePathStyle: PathStyle.Attack })
                }
              })

              break
          }
        }

        handleTowersAndQueueTowerHaulers(room, jobs)
      }
    }
  }

  queueBuildingJobs(jobs)

  for (const target in jobs) {
    if (jobs.hasOwnProperty(target)) {
      const targetJobs = jobs[target]
      targetJobs.forEach(job => {
        job.run()
      })
    }
  }

  // Major issues
  // Energy requests
  //  upgraders should only pickup "available"/spare energy
  //    does this mean upgraders never pick up energy from extensions or spawn?
  //    should upgraders only get energy from containers? should they request energy and a hauler brings it to them?
  //  our spawn mechanic spawns the biggest creature it can, so it will always "claim" all the energy to produce more upgraders, leaving no energy for them.
  //  unless the requests are queue based and a hauler is responsible for delivering it, or the creep requesting the energy for that matter.
  // Too specialized? (tasks?)
  //  e.g. I want a hauler creep that hauls from miners and everywhere else if miners do not have resources

  // TODO: how to handle memory after death? clear jobs? scrub parts of the memory?
  // TODO: if our energy income can not sustain  the amount of workers or upgraders we have, can we release them? what do they require to be "converted" to "bad versions" of haulers and miners? and when they are converted and we create a new spawn, can we release them again?
  // TODO: upgrader creeps gets released, but why do we have upgrader creeps? - render jobs somewwhere, with the amount of workers, color code and render a rectangle at job position
  // TODO: calculate upgrade positions for controller and make sure upgraders are placed there, and that we don't go too much overboard with upgraders - perhaps a hauler to haul energy to them? - alternatively, if there are no upgrade positions left, the upgrader can just transfer to upgrader already upgrading?, atleast when the upgrader is a "generic creep"
  // TODO: Miners needs a Manager to figure out how many creeps should be assigned to each job
  // TODO: a player module that automates what i do manually, spawn placement, extension placement, container placement. http://docs.screeps.com/api/#Room.createConstructionSite
  // TODO: a module that determines how many of the different roles we need based on amount of work needed
  // TODO: a module that can spawn creeps
  // if a creep wants to do a job, make sure it has time enough to live
  // TODO: harvesters going to a resource node with a keeper lair ?

  // TODO: should we have jobs in each room? what about "general purpose" jobs?

  // // deseralize jobs

  // queueFlagMissions()

  // // What defines an energymission, that we have a spawn?

  // for (const roomName in Memory.rooms) {
  //   if (Memory.rooms.hasOwnProperty(roomName)) {
  //     const room = Game.rooms[roomName]
  //     const roomMemory = Memory.rooms[roomName]

  //     // room visible
  //     if (room) {

  //       // if (roomMemory.energymission) {
  //       //   const energyMission = new EnergyMission(room)
  //       //   energyMission.run()
  //       // }
  //     }

  //     // room not visible
  //     if (roomMemory.remoteEnergyMission) {
  //       const remoteEnergyMission = new RemoteEnergyMission({
  //         roomName,
  //         memory: roomMemory.remoteEnergyMission
  //       })
  //       remoteEnergyMission.run()
  //     }
  //   }
  // }

  // // TODO: detect jobs
  // // MiningJob how to detect a job exists, search jobs for sourceId
  // // TODO:How do we prioritize the jobs?

  // // queue upgradeController job, how to determine how many upgraders we want?
  // if (Game.spawns.Spawn1) {
  //   queueUpgraderJobsForSpawn1(jobs)

  //   handleTowersAndQueueTowerHaulers(jobs)

  //   // hatchery, should contain a list of requested creep types for jobs, but we also need to determine what hatchery should hatch it later

  //   // seralize jobs
  //   // Memory.jobs = jobs

  //   // Map Sources

  //   for (const spawnName in Game.spawns) {
  //     if (Game.spawns.hasOwnProperty(spawnName)) {
  //       const spawn = Game.spawns[spawnName]
  //       const hatchery = new Hatchery(spawn)
  //       hatchery.run()
  //     }
  //   }
  // }

  // How do I make sure collect stats resets room stats when I die?

  collect_stats()

  if (Game.spawns.Spawn1) {
    const spawn1Stats = summarize_room(Game.spawns.Spawn1.room)
    let y = 25
    if (spawn1Stats) {
      // Game.spawns.Spawn1.room.visual.text(
      //   `⚡ ${spawn1Stats.energy_avail} / ${spawn1Stats.energy_cap}`,
      //   25,
      //   y,
      //   { align: 'center', opacity: 0.8 });

      // y += 1

      for (const role in spawn1Stats.creep_counts) {
        if (spawn1Stats.creep_counts.hasOwnProperty(role)) {
          const count = spawn1Stats.creep_counts[role]
          y += 1
          Game.spawns.Spawn1.room.visual.text(`${role}: ${count}`, 25, y, {
            align: "center",
            opacity: 0.8
          })
        }
      }
    }
  }
})

function queueUpgraderJob(room: Room, jobs: Dictionary<Job[]>) {
  const controller = room.controller
  if (controller && controller.my) {
    if (!jobs[controller.id]) {
      Memory.jobs[controller.id] = []
      // having to construct the memory this way and then sending it in, to be able to push the memory, is sily
      const jobMemory = {
        type: JobType.UpgradeController,
        target: controller.id,
        creeps: [],
        priority: JobPriority.Low
      }
      Memory.jobs[controller.id].push(jobMemory)
      const job = new UpgradeControllerJob(controller, jobMemory)
      jobs[controller.id] = [job]
    }
  }
}

function handleTowersAndQueueTowerHaulers(room: Room, jobs: Dictionary<Job[]>) {
  const towers = room.find<StructureTower>(FIND_MY_STRUCTURES, {
    filter: (structure: Structure) => structure.structureType === STRUCTURE_TOWER
  })
  towers.forEach(tower => {
    // queue tower hauling jobs
    if (!jobs[tower.id] || jobs[tower.id].length === 0) {
      const job = new HaulingJob(tower)
      jobs[tower.id] = [job]
    }
    // prefer shooting enemies
    const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
    if (closestHostile) {
      tower.attack(closestHostile)
    } else {
      const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        // walls does not appear to be in "FIND_MY_STRUCTURES"
        filter: (structure: Structure) => {
          // console.log(structure.structureType, structure.hits, structure.hitsMax, structure.hits / structure.hitsMax)
          return (
            (structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL) ||
            structure.hits / structure.hitsMax < 0.0004
          )
        }
      })
      if (closestDamagedStructure) {
        tower.repair(closestDamagedStructure)
      }
    }
  })
}

const comparePriority = (a: BuilderJob, b: BuilderJob) => b.memory.priority - a.memory.priority

function queueBuildingJobs(jobs: Dictionary<Job[]>) {
  const constructionSites = Game.spawns.Spawn1.room.find(FIND_MY_CONSTRUCTION_SITES)
  // group construction sites by type?, the type could be utilized as id, might be deleted then by earlier logic that deletes jobs if target is not found
  // road work, what priority is that? Low?
  // extension, what priority is that? Medium
  // container, what priority? HIGH
  // walls ?
  // priority is not that important when we do not sort jobs by priority.
  // We wish to accomplish "enough" workers assigned to "all" construction jobs, we also wish workers to get assigned to the closest job

  // how do we handle construction requests in other rooms?
  // when do we spawn new creeps?

  // Should workers both construct and repair stuff?
  // should we calculate how long time it will take to construct stuff and assign workers based on that?
  // should we mark a construction job with a tick we want it finished? and based on that a decision as to how many creeps should be requested?

  // The problem with "queueing" building jobs, is that it's for detecting jobs I manually place.... they should be automated, then I don't have to queue them.
  // We need a "Building Mission" it should be responsible of prioritizing jobs, determine if we need more builders for all the jobs, bigger builders and what order they should be done in

  const constructionJobs: PriorityQueue<BuilderJob> = new PriorityQueue({ comparator: comparePriority })

  constructionSites.forEach(site => {
    if (!jobs[site.id]) {
      const job = new BuilderJob(site)
      jobs[site.id] = [job]
    }

    constructionJobs.queue(jobs[site.id][0] as BuilderJob)
  })

  if (constructionJobs.length > 0) {
    const nextConstructionJob = constructionJobs.dequeue()
    // TODO: sort constructionJobs by priority, take the first, we need a PriorityQueue
    const maxCreeps = 5
    const assignedCreeps = Object.keys(nextConstructionJob.Creeps).length

    const energyPercentage = nextConstructionJob.constructionSite.room
      ? nextConstructionJob.constructionSite.room.energyAvailable /
        nextConstructionJob.constructionSite.room.energyCapacityAvailable
      : null
    if (assignedCreeps < maxCreeps && energyPercentage && energyPercentage > 0.25) {
      if (assignedCreeps === 0) {
        nextConstructionJob.memory.priority = JobPriority.High
      }

      nextConstructionJob.memory.priority = JobPriority.Medium

      if (assignedCreeps / maxCreeps >= 0.25 && nextConstructionJob.memory.priority >= JobPriority.Medium) {
        nextConstructionJob.memory.priority = JobPriority.Low
      }

      // find creep that can solve task currently all our creeps can solve all tasks, this needs to be specialized
      // TODO: acquire free builders with energy close to build site, sort unemployed by priority
      // TODO: should find closest builder to assign
      let neededWorkers = maxCreeps - assignedCreeps
      neededWorkers = nextConstructionJob.assign(neededWorkers, nextConstructionJob.memory, Role.builder)

      nextConstructionJob.requestHatch(neededWorkers, CreepMutations.WORKER, nextConstructionJob.memory.priority)
    }
  }
}

function calculateAverageEnergy(room: Room) {
  const storageEnergy = room.storage ? room.storage.store[RESOURCE_ENERGY] : 0
  const energyAvail = room.energyAvailable
  // const energyCap = room.energyCapacityAvailable
  const containers = room.find<StructureContainer>(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_CONTAINER
  })
  const containerEnergy = _.sum(containers, c => c.store.energy)
  // const links = room.find<StructureLink>(FIND_STRUCTURES, {
  //   filter: s => s.structureType === STRUCTURE_LINK && s.my
  // })
  // const linkEnergy = _.sum(links, l => l.energy)

  const energy = storageEnergy + energyAvail + containerEnergy

  if (!room.memory.averageEnergy) {
    room.memory.averageEnergy = { points: 1, average: energy, spawn: energyAvail }
  }

  room.memory.averageEnergy.points += 1
  room.memory.averageEnergy.average = calculateCumulativeMovingAverage(
    room.memory.averageEnergy.average,
    room.memory.averageEnergy.points,
    energy
  )
  room.memory.averageEnergy.spawn = calculateCumulativeMovingAverage(
    room.memory.averageEnergy.spawn,
    room.memory.averageEnergy.points,
    energyAvail
  )
}

function calculateCumulativeMovingAverage(average: number, points: number, mesurement: number) {
  // https://en.wikipedia.org/wiki/Moving_average
  return average + (mesurement + 1 - average) / (points + 1)
}

function queueFlagMissions() {
  const remoteFlags: Dictionary<Flag[]> = {}
  for (const flagName in Game.flags) {
    if (Game.flags.hasOwnProperty(flagName)) {
      const flag = Game.flags[flagName]
      if (flag.name.startsWith("remote") || flag.name.startsWith("source")) {
        if (!remoteFlags[flag.pos.roomName]) {
          remoteFlags[flag.pos.roomName] = []
        }
        remoteFlags[flag.pos.roomName].push(flag)
      }
    }
  }

  // Remote Mining Mission
  for (const roomName in remoteFlags) {
    if (remoteFlags.hasOwnProperty(roomName)) {
      const flags = remoteFlags[roomName]

      if (!Memory.rooms[roomName]) {
        Memory.rooms[roomName] = {}
      }

      const remoteFlag = flags.find(flag => flag.name.startsWith("remote"))

      const remoteEnergyMissionMemory = Memory.rooms[roomName].remoteEnergyMission

      if (
        !remoteEnergyMissionMemory ||
        (remoteFlag && remoteEnergyMissionMemory && remoteEnergyMissionMemory.flagId !== remoteFlag.name)
      ) {
        const remoteEnergyMission = new RemoteEnergyMission({ roomName, flags })
      }
    }
  }
}

function deseralizeJobs() {
  const jobs: Dictionary<Job[]> = {} // should this be a dictionary with target as id? what if a target has multiple jobs then? e.g. Mining and Hauler Job
  if (!Memory.jobs) {
    Memory.jobs = {}
  }

  // TODO: solve sorting is it important at all?
  // Memory.jobs.sort((a, b) => {
  //   return b.priority - a.priority
  // })

  for (const targetId in Memory.jobs) {
    if (Memory.jobs.hasOwnProperty(targetId)) {
      const target = Game.getObjectById<RoomObject>(targetId)
      if (!target) {
        delete Memory.jobs[targetId] // TODO: this might become an issue when we queue jobs in other rooms
        continue
      }

      const serializedJobs = Memory.jobs[targetId]

      jobs[targetId] = []

      serializedJobs.forEach(seralizedJob => {
        switch (seralizedJob.type) {
          case JobType.UpgradeController:
            // seralizedJob.priority = JobPriority.Low // mokeypatched memory
            const controller = target as StructureController
            if (controller) {
              const creeps = deseralizeJobCreeps(seralizedJob)

              jobs[targetId].push(new UpgradeControllerJob(controller, seralizedJob, creeps))
            }
            break
          case JobType.Building:
            // seralizedJob.priority = JobPriority.Medium // mokeypatched memory
            const site = target as ConstructionSite
            if (site) {
              const creeps = deseralizeJobCreeps(seralizedJob)

              jobs[targetId].push(new BuilderJob(site, seralizedJob, creeps))
            }
            break
          case JobType.Hauling:
            // seralizedJob.priority = JobPriority.Medium // mokeypatched memory
            const structure = target as Structure
            if (structure) {
              const creeps = deseralizeJobCreeps(seralizedJob)

              jobs[targetId].push(new HaulingJob(structure, seralizedJob, creeps))
            }
            break
        }
      })
    }
  }

  return jobs
}
