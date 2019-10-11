import { TransferTask } from "./task/Tasks/TransferTask"
import { TaskWithdraw } from "./task/Tasks/TaskWithdraw"
import { RoomPlanner } from "RoomPlanner"
import "./_lib/RoomVisual/RoomVisual"
import "./task/prototypes"

import { summarize_room } from "_lib/resources"
import { visualizeCreepRole } from "_lib/roleicons"
import { add_stats_callback, collect_stats } from "_lib/screepsplus"
import { HaulingJob } from "jobs/HaulingJob"
import { Job, JobPriority, JobType } from "jobs/Job"
import { PathStyle } from "jobs/MovementPathStyles"
import { Dictionary } from "lodash"
import { InfraStructureMission } from "missions/InfrastructureMission"
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
import { Task } from "./task/Task"
import { Infrastructure } from "RoomPlanner/Infrastructure"
import { Tasks } from "task"

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

const infraStructureMissions: Dictionary<InfraStructureMission> = {}

const hatcheries: Dictionary<Hatchery> = {}

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
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name]
      // console.log("Clearing non-existing creep memory:", name)
    }
  }

  // bootstrap process - runs every X ticks to validate health of a "village" / core room
  // Run "Counsil"
  //    settle first village (e.g. 1 room, safemode rcl = 1 or safemode and no spawn (auto)) - run planner
  //    generate village missions
  //      scout missions to find outposts, intell is gathered and the intell counsil member is informed?
  //    generate outpost missions
  //    Convert outpost to village? (construct spawn) - this is a somewhat strategic decision in regards to reinforcement and how far we can extend ourselves
  //    allocate creeps to missions or request creep suitible for mission
  // Run "Freya"
  // Run Village missions
  // Run Outpost missions
  // Run Raids (attack / loot & other)

  // The "counsil" should be controllable by flags, green = on, red = off
  // e.g. mark something as an outpost, convert it to village

  ///-----------------------------------------
  // Processes / Directives
  // RCL = 1
  // A colony is defined by having one or more spawners? or RCL?
  // Colony should have general purpose harvesters
  let hatchery: Hatchery | undefined
  for (const spawnName in Game.spawns) {
    if (Game.spawns.hasOwnProperty(spawnName)) {
      const spawn = Game.spawns[spawnName]

      // TODO: We can't do this because the memory object seems to get removed?
      // hatchery = hatcheries[spawn.room.name]
      // if (!hatchery) {
      hatcheries[spawn.room.name] = hatchery = new Hatchery(spawn)
      // }

      hatchery.run()

      // How do we determine what hatchery the mission should utilize? Thats a problem for RCL 7+
      // if (room.controller && room.controller.my) {
      // TODO: only scan the room for static data once
      roomScanner.scan(spawn.room)

      // TODO: energymission should only be run once per room
      const energyMission = new EnergyMission(spawn.room)
      energyMission.run()
      // }
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
              if (defenderRequests === 0 && currentDefenders.length < 3) {
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

  queueFlagMissions()

  queueBuildingJobs(Game.spawns.Spawn1.room, jobs)

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

  visualizeCreepRole()

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
            (structure.hits < structure.hitsMax &&
              structure.structureType !== STRUCTURE_WALL &&
              structure.structureType !== STRUCTURE_RAMPART) ||
            structure.hits / structure.hitsMax < 0.0004
          )
        }
      })
      if (closestDamagedStructure) {
        tower.repair(closestDamagedStructure)
      } else {
        const closestCreep = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
          // walls does not appear to be in "FIND_MY_STRUCTURES"
          filter: (creep: Creep) => {
            // console.log(structure.structureType, structure.hits, structure.hitsMax, structure.hits / structure.hitsMax)
            return creep.hits < creep.hitsMax
          }
        })
        if (closestCreep) {
          tower.heal(closestCreep)
        }
      }
    }
  })
}

const comparePriority = (a: BuilderJob, b: BuilderJob) => b.memory.priority - a.memory.priority

function queueBuildingJobs(room: Room, jobs: Dictionary<Job[]>) {
  const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES)
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

  // get mission from cache or create new one
  // let mission = infraStructureMissions[room.name] // we can't do this because then we store a reference to the creeps, references should be reevaluated each tick
  // if (!mission) {
  let memory = room.memory.infrastructure // should infrastructure not exist on the global scope?
  if (!memory || !memory.layers) {
    memory = room.memory.infrastructure = { layers: [] }
    room.memory.runPlanner = true
  }

  // if (room.controller) {
  //   const tmpInfrastructure = new Infrastructure({ memory: { layers: [] } })
  //   const roomPlanner = new RoomPlanner(tmpInfrastructure)
  //   roomPlanner.plan(room.name, 8 /*room.controller.level + 1*/)
  //   tmpInfrastructure.visualize()
  // }

  const infrastructure = new Infrastructure({ memory })
  let planRanThisTick = false
  if (room.memory.runPlanner) {
    const roomPlanner = new RoomPlanner(infrastructure)
    roomPlanner.plan(room.name, 8 /*room.controller.level + 1*/)
    room.memory.runPlanner = false
    planRanThisTick = true
  }

  infrastructure.visualize()

  let infrastructureMissionMemory = room.memory.infrastructureMission
  if (!infrastructureMissionMemory || !infrastructureMissionMemory.creeps) {
    infrastructureMissionMemory = room.memory.infrastructureMission = { creeps: [] }
  }

  const mission = new InfraStructureMission({ memory: infrastructureMissionMemory, infrastructure })

  infraStructureMissions[room.name] = mission
  // }

  const hatchery = _.first(Object.values(hatcheries))
  let neededWorkers = constructionSites.length > 0 ? 2 : 0 // currently a naive approach making us have 2 workers
  // should probably adjust amount of workers based on how much energy we want to use, how many construction sites, and more
  neededWorkers -= Object.keys(mission.creeps).length

  // assign creeps to mission
  const idle = _.filter(
    Game.creeps,
    creep => !creep.spawning && creep.memory.unemployed && creep.isIdle && creep.memory.role === Role.builder
  )

  if (idle) {
    idle.slice(0, neededWorkers).forEach(creep => {
      neededWorkers -= 1
      mission.addCreep(creep)
      creep.memory.unemployed = false
    })
  }

  // requestHatch, should be moved to a function somewhere
  if (hatchery) {
    const target = "infrastructure"
    const mutation = CreepMutations.WORKER
    const requests = hatchery.getRequests(target, mutation)

    neededWorkers -= requests

    if (neededWorkers > 0) {
      for (let index = 0; index < neededWorkers; index++) {
        // request new creeps
        // console.log(`${this.target} requested ${mutation}`, neededWorkers, requests)
        hatchery.queue({
          mutation,
          target,
          priority: JobPriority.Medium + 10
        })
      }
    }
  }

  // distribute tasks
  mission.distributeTasks()

  // Add manual cSites
  if (!planRanThisTick) {
    constructionSites.forEach(site => {
      // plan was just run, the cSite does not exist in this tick
      const plan = infrastructure.findInfrastructure(site.id)
      // TODO: there seem to be an issue finding existing cSites in the plan
      if (!plan || Object.keys(plan).length <= 0) {
        console.log("adding to layer 0")

        infrastructure.addConstructionSite(0, site)
      }
    })
  }

  // run creeps
  mission.run()
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
  const lootFlags: Dictionary<Flag> = {}
  const claimFlags: Dictionary<Flag> = {}
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

      if (flag.name.startsWith("loot")) {
        if (!remoteFlags[flag.pos.roomName]) {
          lootFlags[flag.pos.roomName] = flag
        }
      }

      if (flag.name.startsWith("claim")) {
        if (!remoteFlags[flag.pos.roomName]) {
          claimFlags[flag.pos.roomName] = flag
        }
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

      // const remoteFlag = flags.find(flag => flag.name.startsWith("remote"))

      // const remoteEnergyMissionMemory = Memory.rooms[roomName].remoteEnergyMission
      // console.log(JSON.stringify(remoteEnergyMissionMemory))
      // if (
      //   !remoteEnergyMissionMemory ||
      //   (remoteFlag && remoteEnergyMissionMemory && remoteEnergyMissionMemory.flagId !== remoteFlag.name)
      // ) {
      const remoteEnergyMission = new RemoteEnergyMission({ roomName, flags })
      remoteEnergyMission.run()
      // }
    }
  }

  // loot "mission"
  for (const roomName in lootFlags) {
    if (lootFlags.hasOwnProperty(roomName)) {
      const flag = lootFlags[roomName]

      const hatchery = new Hatchery(Game.spawns.Spawn1) // TODO: Hatchery should be a singleton?
      let requiredLooters = 2
      const requestedLooters = hatchery.getRequests(flag.name, CreepMutations.HAULER)
      const missionCreeps = _.filter(Game.creeps, creep => creep.memory.target === flag.name)
      requiredLooters -= requestedLooters + missionCreeps.length

      for (let index = requestedLooters; index < requiredLooters; index++) {
        hatchery.queue({
          target: flag.name,
          mutation: CreepMutations.HAULER,
          priority: JobPriority.Medium,
          employed: true
        })
      }

      missionCreeps.forEach(creep => {
        if (creep.carry[RESOURCE_ENERGY] !== creep.carryCapacity) {
          if (!flag.room) {
            // no vision
            creep.task = Tasks.goTo(flag, { moveOptions: { range: 3 } })
          } else {
            if (flag.room !== creep.room) {
              creep.task = Tasks.goTo(flag, { moveOptions: { range: 3 } })
            } else {
              const target: any = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => {
                  // console.log("MHJ", structure.structureType)
                  switch (structure.structureType) {
                    case STRUCTURE_EXTENSION:
                      const extension = structure as StructureExtension
                      return extension.energy !== 0
                    case STRUCTURE_SPAWN:
                      const spawn = structure as StructureSpawn
                      return spawn.energy !== 0
                    case STRUCTURE_STORAGE:
                      const storage = structure as StructureStorage
                      return storage.store[RESOURCE_ENERGY] !== 0
                    case STRUCTURE_TOWER:
                      const tower = structure as StructureTower
                      return tower.energy !== 0
                    case STRUCTURE_CONTAINER:
                      const container = structure as StructureContainer
                      return container.store[RESOURCE_ENERGY] !== 0
                  }

                  return false
                }
              })

              // assign harvest task to target if it does not already have a harvest task
              if (creep.task == null || creep.task.name !== TaskWithdraw.taskName) {
                creep.task = Tasks.withdraw(target)
              }
            }
          }
        } else {
          if (creep.pos.roomName !== creep.memory.home) {
            // goto home room
            creep.task = Tasks.goToRoom(creep.memory.home)
          } else {
            // Transfer task
            const target: any = creep.pos.findClosestByRange(FIND_STRUCTURES, {
              filter: structure => {
                // console.log("MHJ", structure.structureType)
                switch (structure.structureType) {
                  case STRUCTURE_EXTENSION:
                    const extension = structure as StructureExtension
                    return extension.energy < extension.energyCapacity
                  case STRUCTURE_SPAWN:
                    const spawn = structure as StructureSpawn
                    return spawn.energy < spawn.energyCapacity
                  case STRUCTURE_STORAGE:
                    const storage = structure as StructureStorage
                    return (
                      storage.store[RESOURCE_ENERGY] < storage.storeCapacity &&
                      creep.room.energyAvailable === creep.room.energyCapacityAvailable
                    )
                  // case STRUCTURE_TOWER:
                  //     const tower = structure as StructureTower
                  //     return tower.energy < tower.energyCapacity
                  // case STRUCTURE_CONTAINER:
                  //     const container = structure as StructureContainer
                  //     return structure.id !== job.memory.target && container.store[RESOURCE_ENERGY] < container.storeCapacity
                }

                return false
              }
            })

            if (creep.task == null || creep.task.name !== TransferTask.taskName) {
              creep.task = Tasks.transfer(target)
            }
          }
        }

        creep.run()
      })
    }
  }

  // claim "mission"
  for (const roomName in claimFlags) {
    if (claimFlags.hasOwnProperty(roomName)) {
      const flag = claimFlags[roomName]

      const hatchery = new Hatchery(Game.spawns.Spawn1) // TODO: Hatchery should be a singleton?
      let requiredClaimers = 1
      const requestedLooters = hatchery.getRequests(flag.name, CreepMutations.CLAIMER)
      const missionCreeps = _.filter(Game.creeps, creep => creep.memory.target === flag.name)
      requiredClaimers -= requestedLooters + missionCreeps.length

      for (let index = requestedLooters; index < requiredClaimers; index++) {
        hatchery.queue({
          target: flag.name,
          mutation: CreepMutations.CLAIMER,
          priority: JobPriority.Medium,
          employed: true
        })
      }

      missionCreeps.forEach(creep => {
        if (!flag.room) {
          // no vision
          creep.task = Tasks.goTo(flag, { moveOptions: { range: 3 } })
        } else {
          if (flag.room !== creep.room) {
            creep.task = Tasks.goTo(flag, { moveOptions: { range: 3 } })
          } else {
            const target: any = creep.room.controller

            // assign harvest task to target if it does not already have a harvest task
            if (creep.task == null || creep.task.name !== TaskWithdraw.taskName) {
              creep.task = Tasks.claim(target)
            }
          }
        }

        creep.run()
      })
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
