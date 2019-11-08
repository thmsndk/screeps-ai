import "./_lib/RoomVisual/RoomVisual"
import "./task/prototypes"
import { Freya } from "./Freya"
import { Elders } from "./Elders"
import { TransferTask } from "./task/Tasks/TransferTask"
import { TaskWithdraw } from "./task/Tasks/TaskWithdraw"
import { RoomPlanner } from "RoomPlanner"

import { summarize_room } from "_lib/resources"
import { visualizeCreepRole } from "_lib/roleicons"
import { add_stats_callback, collect_stats } from "_lib/screepsplus"
import { HaulingJob } from "jobs/HaulingJob"
import { Job, JobPriority, JobType } from "jobs/Job"
import { PathStyle } from "jobs/MovementPathStyles"
import { Dictionary } from "lodash"
import { InfraStructureMission } from "missions/InfrastructureMission"
// Import { RemoteEnergyMission } from "missions/RemoteEnergyMission"
import { Role } from "role/roles"
import PriorityQueue from "ts-priority-queue"
import { ErrorMapper } from "utils/ErrorMapper"
import { deseralizeJobCreeps } from "utils/MemoryUtil"

import { init } from "./_lib/Profiler"
import DEFCON, { DEFCONLEVEL } from "./DEFCON"
import { CreepMutations, Hatchery } from "./Hatchery"
import { BuilderJob } from "./jobs/BuilderJob"
import { EnergyMission } from "./missions/EnergyMission"
import { UpgradeControllerJob } from "./jobs/UpgradeControllerJob"
import { RoomScanner } from "./RoomScanner"
import { Task } from "./task/Task"
import { Infrastructure } from "RoomPlanner/Infrastructure"
import { Tasks } from "task"
import { InfrastructureMemory } from "RoomPlanner/InfrastructureMemory"

// Import "./_lib/client-abuse/injectBirthday.js"

global.Profiler = init()

// Global.DEFCON = DEFCON

// Add_stats_callback((stats: IStats) => {
//   If (stats) {
//     Stats.jobs = Memory.jobs

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
if (!Memory.infrastructure) {
  Memory.infrastructure = { layers: [] }
}
const infrastructure = new Infrastructure({ memory: Memory.infrastructure }) // Should memory be in the village room?
const roomPlanner = new RoomPlanner(infrastructure) // How do we plan accross rooms?
const roomScanner = new RoomScanner()
const freya = new Freya()
global.freya = freya

const counsil = new Elders(roomPlanner, roomScanner, freya)

const infraStructureMissions: Dictionary<InfraStructureMission> = {}

const hatcheries: Dictionary<Hatchery> = {}

console.log("finished initializing globals")
// https://github.com/bencbartlett/creep-tasks

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  // Global.injectBirthday()
  // Console.log(`Current game tick is ${Game.time}`);

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
      // Console.log("Clearing non-existing creep memory:", name)
    }
  }

  // Run "Counsil"
  counsil.run()
  // Run "Freya"
  freya.run()
  // Run Village missions
  // Run Outpost missions
  // Run Raids (attack / loot & other)

  // The "counsil" should be controllable by flags, green = on, red = off
  // E.g. mark something as an outpost, convert it to village

  // --- Lines below here should be reimplemented and extracted out

  // /-----------------------------------------
  // Processes / Directives
  // RCL = 1
  // A colony is defined by having one or more spawners? or RCL?
  // Colony should have general purpose harvesters
  // Let hatchery: Hatchery | undefined
  // For (const spawnName in Game.spawns) {
  //   If (Game.spawns.hasOwnProperty(spawnName)) {
  //     Const spawn = Game.spawns[spawnName]

  //     // TODO: We can't do this because the memory object seems to get removed?
  //     // hatchery = hatcheries[spawn.room.name]
  //     // if (!hatchery) {
  //     Hatcheries[spawn.room.name] = hatchery = new Hatchery(spawn)
  //     // }

  //     Hatchery.run()

  //     // How do we determine what hatchery the mission should utilize? Thats a problem for RCL 7+
  //     // if (room.controller && room.controller.my) {
  //     // TODO: only scan the room for static data once
  //     RoomScanner.scan(spawn.room)

  //     // TODO: energymission should only be run once per room
  //     Const energyMission = new EnergyMission(spawn.room)
  //     EnergyMission.run()
  //     // }
  //   }
  // }
  // // ramparts? walls? basebuilding directive?

  // Const jobs: Dictionary<Job[]> = deseralizeJobs()

  // // Visible rooms
  // For (const roomName in Game.rooms) {
  //   If (Game.rooms.hasOwnProperty(roomName)) {
  //     Const room = Game.rooms[roomName]

  //     If (room) {
  //       CalculateAverageEnergy(room)

  //       QueueUpgraderJob(room, jobs)

  //       // const exitWalls = new RoomScanner().exitWalls(room)
  //       Const scanResult = DEFCON.scan(room)

  //       If (room.memory.DEFCON && hatchery) {
  //         Switch (room.memory.DEFCON.level) {
  //           Case DEFCONLEVEL.POSSIBLE_ATTACK:
  //             Const defenderRequests = hatchery.getRequests(room.name, CreepMutations.DEFENDER)
  //             Const currentDefenders = _.filter(Game.creeps, creep => creep.memory.role === Role.DEFENDER)
  //             If (defenderRequests === 0 && currentDefenders.length < 3) {
  //               Hatchery.queue({
  //                 Mutation: CreepMutations.DEFENDER,
  //                 Target: room.name,
  //                 Priority: JobPriority.Medium + 5
  //               })
  //             }

  //             CurrentDefenders.forEach(defender => {
  //               Const target = scanResult.attack.pop()
  //               If (target && defender.rangedAttack(target) === ERR_NOT_IN_RANGE) {
  //                 Defender.moveTo(target, { visualizePathStyle: PathStyle.Attack })
  //               }
  //             })

  //             Break
  //         }
  //       }

  //       HandleTowersAndQueueTowerHaulers(room, jobs)
  //     }
  //   }
  // }

  // QueueFlagMissions()

  // QueueBuildingJobs(Game.spawns.Spawn1.room, jobs)

  // For (const target in jobs) {
  //   If (jobs.hasOwnProperty(target)) {
  //     Const targetJobs = jobs[target]
  //     TargetJobs.forEach(job => {
  //       Job.run()
  //     })
  //   }
  // }

  // Major issues
  // Energy requests
  //  Upgraders should only pickup "available"/spare energy
  //    Does this mean upgraders never pick up energy from extensions or spawn?
  //    Should upgraders only get energy from containers? should they request energy and a hauler brings it to them?
  //  Our spawn mechanic spawns the biggest creature it can, so it will always "claim" all the energy to produce more upgraders, leaving no energy for them.
  //  Unless the requests are queue based and a hauler is responsible for delivering it, or the creep requesting the energy for that matter.
  // Too specialized? (tasks?)
  //  E.g. I want a hauler creep that hauls from miners and everywhere else if miners do not have resources

  // TODO: how to handle memory after death? clear jobs? scrub parts of the memory?
  // TODO: if our energy income can not sustain  the amount of workers or upgraders we have, can we release them? what do they require to be "converted" to "bad versions" of haulers and miners? and when they are converted and we create a new spawn, can we release them again?
  // TODO: upgrader creeps gets released, but why do we have upgrader creeps? - render jobs somewwhere, with the amount of workers, color code and render a rectangle at job position
  // TODO: calculate upgrade positions for controller and make sure upgraders are placed there, and that we don't go too much overboard with upgraders - perhaps a hauler to haul energy to them? - alternatively, if there are no upgrade positions left, the upgrader can just transfer to upgrader already upgrading?, atleast when the upgrader is a "generic creep"
  // TODO: Miners needs a Manager to figure out how many creeps should be assigned to each job
  // TODO: a player module that automates what i do manually, spawn placement, extension placement, container placement. http://docs.screeps.com/api/#Room.createConstructionSite
  // TODO: a module that determines how many of the different roles we need based on amount of work needed
  // TODO: a module that can spawn creeps
  // If a creep wants to do a job, make sure it has time enough to live
  // TODO: harvesters going to a resource node with a keeper lair ?

  // TODO: should we have jobs in each room? what about "general purpose" jobs?

  // // deseralize jobs

  // QueueFlagMissions()

  // // What defines an energymission, that we have a spawn?

  // For (const roomName in Memory.rooms) {
  //   If (Memory.rooms.hasOwnProperty(roomName)) {
  //     Const room = Game.rooms[roomName]
  //     Const roomMemory = Memory.rooms[roomName]

  //     // room visible
  //     If (room) {

  //       // if (roomMemory.energymission) {
  //       //   const energyMission = new EnergyMission(room)
  //       //   energyMission.run()
  //       // }
  //     }

  //     // room not visible
  //     If (roomMemory.remoteEnergyMission) {
  //       Const remoteEnergyMission = new RemoteEnergyMission({
  //         RoomName,
  //         Memory: roomMemory.remoteEnergyMission
  //       })
  //       RemoteEnergyMission.run()
  //     }
  //   }
  // }

  // // TODO: detect jobs
  // // MiningJob how to detect a job exists, search jobs for sourceId
  // // TODO:How do we prioritize the jobs?

  // // queue upgradeController job, how to determine how many upgraders we want?
  // If (Game.spawns.Spawn1) {
  //   QueueUpgraderJobsForSpawn1(jobs)

  //   HandleTowersAndQueueTowerHaulers(jobs)

  //   // hatchery, should contain a list of requested creep types for jobs, but we also need to determine what hatchery should hatch it later

  //   // seralize jobs
  //   // Memory.jobs = jobs

  //   // Map Sources

  //   For (const spawnName in Game.spawns) {
  //     If (Game.spawns.hasOwnProperty(spawnName)) {
  //       Const spawn = Game.spawns[spawnName]
  //       Const hatchery = new Hatchery(spawn)
  //       Hatchery.run()
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
      //   Y,
      //   { align: 'center', opacity: 0.8 });

      // Y += 1

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
      // Having to construct the memory this way and then sending it in, to be able to push the memory, is sily
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
    // Queue tower hauling jobs
    if (!jobs[tower.id] || jobs[tower.id].length === 0) {
      const job = new HaulingJob(tower)
      jobs[tower.id] = [job]
    }
    // Prefer shooting enemies
    const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
    if (closestHostile) {
      tower.attack(closestHostile)
    } else {
      const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        // Walls does not appear to be in "FIND_MY_STRUCTURES"
        filter: (structure: Structure) =>
          // Console.log(structure.structureType, structure.hits, structure.hitsMax, structure.hits / structure.hitsMax)
          (structure.hits < structure.hitsMax &&
            structure.structureType !== STRUCTURE_WALL &&
            structure.structureType !== STRUCTURE_RAMPART) ||
          structure.hits / structure.hitsMax < 0.0004
      })
      if (closestDamagedStructure) {
        tower.repair(closestDamagedStructure)
      } else {
        const closestCreep = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
          // Walls does not appear to be in "FIND_MY_STRUCTURES"
          filter: (creep: Creep) =>
            // Console.log(structure.structureType, structure.hits, structure.hitsMax, structure.hits / structure.hitsMax)
            creep.hits < creep.hitsMax
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
  // Group construction sites by type?, the type could be utilized as id, might be deleted then by earlier logic that deletes jobs if target is not found
  // Road work, what priority is that? Low?
  // Extension, what priority is that? Medium
  // Container, what priority? HIGH
  // Walls ?
  // Priority is not that important when we do not sort jobs by priority.
  // We wish to accomplish "enough" workers assigned to "all" construction jobs, we also wish workers to get assigned to the closest job

  // How do we handle construction requests in other rooms?
  // When do we spawn new creeps?

  // Should workers both construct and repair stuff?
  // Should we calculate how long time it will take to construct stuff and assign workers based on that?
  // Should we mark a construction job with a tick we want it finished? and based on that a decision as to how many creeps should be requested?

  // The problem with "queueing" building jobs, is that it's for detecting jobs I manually place.... they should be automated, then I don't have to queue them.
  // We need a "Building Mission" it should be responsible of prioritizing jobs, determine if we need more builders for all the jobs, bigger builders and what order they should be done in

  // Get mission from cache or create new one
  // Let mission = infraStructureMissions[room.name] // we can't do this because then we store a reference to the creeps, references should be reevaluated each tick
  // If (!mission) {
  let memory = room.memory.infrastructure // Should infrastructure not exist on the global scope?
  if (!memory || !memory.layers) {
    memory = room.memory.infrastructure = { layers: [] }
    room.memory.runPlanner = true
  }

  // If (room.controller) {
  //   Const tmpInfrastructure = new Infrastructure({ memory: { layers: [] } })
  //   Const roomPlanner = new RoomPlanner(tmpInfrastructure)
  //   RoomPlanner.plan(room.name, 8 /*room.controller.level + 1*/)
  //   TmpInfrastructure.visualize()
  // }

  const infrastructure = new Infrastructure({ memory })
  let planRanThisTick = false
  if (room.memory.runPlanner) {
    const roomPlanner = new RoomPlanner(infrastructure)
    roomPlanner.plan(room.name, 8 /* Room.controller.level + 1*/)
    room.memory.runPlanner = false
    planRanThisTick = true
  }

  infrastructure.visualize()

  let infrastructureMissionMemory = room.memory.infrastructureMission
  if (!infrastructureMissionMemory || !infrastructureMissionMemory.creeps) {
    infrastructureMissionMemory = room.memory.infrastructureMission = { creeps: { builders: [] } }
  }

  const mission = new InfraStructureMission({ memory: infrastructureMissionMemory, infrastructure })

  infraStructureMissions[room.name] = mission
  // }

  const hatchery = _.first(Object.values(hatcheries))
  let neededWorkers = constructionSites.length > 0 ? 2 : 0 // Currently a naive approach making us have 2 workers
  // Should probably adjust amount of workers based on how much energy we want to use, how many construction sites, and more
  neededWorkers -= Object.keys(mission.creeps).length

  // Assign creeps to mission
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

  // RequestHatch, should be moved to a function somewhere
  if (hatchery) {
    const target = "infrastructure"
    const mutation = CreepMutations.WORKER
    const requests = hatchery.getRequests(target, mutation)

    neededWorkers -= requests

    if (neededWorkers > 0) {
      for (let index = 0; index < neededWorkers; index++) {
        // Request new creeps
        // Console.log(`${this.target} requested ${mutation}`, neededWorkers, requests)
        hatchery.queue({
          mutation,
          target,
          priority: JobPriority.Medium + 10
        })
      }
    }
  }

  // Distribute tasks
  mission.distributeTasks()

  // Add manual cSites
  if (!planRanThisTick) {
    constructionSites.forEach(site => {
      // Plan was just run, the cSite does not exist in this tick
      const plan = infrastructure.findInfrastructure(site.id)
      // TODO: there seem to be an issue finding existing cSites in the plan
      if (!plan || Object.keys(plan).length <= 0) {
        console.log("adding to layer 0")

        infrastructure.addConstructionSite(0, site)
      }
    })
  }

  // Run creeps
  mission.run()
}

function calculateAverageEnergy(room: Room) {
  const storageEnergy = room.storage ? room.storage.store[RESOURCE_ENERGY] : 0
  const energyAvail = room.energyAvailable
  // Const energyCap = room.energyCapacityAvailable
  const containers = room.find<StructureContainer>(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_CONTAINER
  })
  const containerEnergy = _.sum(containers, c => c.store.energy)
  // Const links = room.find<StructureLink>(FIND_STRUCTURES, {
  //   Filter: s => s.structureType === STRUCTURE_LINK && s.my
  // })
  // Const linkEnergy = _.sum(links, l => l.energy)

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

      // Const remoteFlag = flags.find(flag => flag.name.startsWith("remote"))

      // Const remoteEnergyMissionMemory = Memory.rooms[roomName].remoteEnergyMission
      // Console.log(JSON.stringify(remoteEnergyMissionMemory))
      // If (
      //   !remoteEnergyMissionMemory ||
      //   (remoteFlag && remoteEnergyMissionMemory && remoteEnergyMissionMemory.flagId !== remoteFlag.name)
      // ) {
      // Const remoteEnergyMission = new RemoteEnergyMission({ roomName, flags })
      // RemoteEnergyMission.run()
      // }
    }
  }

  // Loot "mission"
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
            // No vision
            creep.task = Tasks.goTo(flag, { moveOptions: { range: 3 } })
          } else {
            if (flag.room !== creep.room) {
              creep.task = Tasks.goTo(flag, { moveOptions: { range: 3 } })
            } else {
              const target: any = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => {
                  // Console.log("MHJ", structure.structureType)
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

              // Assign harvest task to target if it does not already have a harvest task
              if (creep.task == null || creep.task.name !== TaskWithdraw.taskName) {
                creep.task = Tasks.withdraw(target)
              }
            }
          }
        } else {
          if (creep.pos.roomName !== creep.memory.home) {
            // Goto home room
            creep.task = Tasks.goToRoom(creep.memory.home)
          } else {
            // Transfer task
            const target: any = creep.pos.findClosestByRange(FIND_STRUCTURES, {
              filter: structure => {
                // Console.log("MHJ", structure.structureType)
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
                  // Case STRUCTURE_TOWER:
                  //     Const tower = structure as StructureTower
                  //     Return tower.energy < tower.energyCapacity
                  // Case STRUCTURE_CONTAINER:
                  //     Const container = structure as StructureContainer
                  //     Return structure.id !== job.memory.target && container.store[RESOURCE_ENERGY] < container.storeCapacity
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

  // Claim "mission"
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
          // No vision
          creep.task = Tasks.goTo(flag, { moveOptions: { range: 3 } })
        } else {
          if (flag.room !== creep.room) {
            creep.task = Tasks.goTo(flag, { moveOptions: { range: 3 } })
          } else {
            const target: any = creep.room.controller

            // Assign harvest task to target if it does not already have a harvest task
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
  const jobs: Dictionary<Job[]> = {} // Should this be a dictionary with target as id? what if a target has multiple jobs then? e.g. Mining and Hauler Job
  if (!Memory.jobs) {
    Memory.jobs = {}
  }

  // TODO: solve sorting is it important at all?
  // Memory.jobs.sort((a, b) => {
  //   Return b.priority - a.priority
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
            // SeralizedJob.priority = JobPriority.Low // mokeypatched memory
            const controller = target as StructureController
            if (controller) {
              const creeps = deseralizeJobCreeps(seralizedJob)

              jobs[targetId].push(new UpgradeControllerJob(controller, seralizedJob, creeps))
            }
            break
          case JobType.Building:
            // SeralizedJob.priority = JobPriority.Medium // mokeypatched memory
            const site = target as ConstructionSite
            if (site) {
              const creeps = deseralizeJobCreeps(seralizedJob)

              jobs[targetId].push(new BuilderJob(site, seralizedJob, creeps))
            }
            break
          case JobType.Hauling:
            // SeralizedJob.priority = JobPriority.Medium // mokeypatched memory
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
