import { BuilderJob } from "./jobs/BuilderJob"
import { EnergyMission } from "./jobs/EnergyMission"
import { UpgradeControllerJob } from "./jobs/UpgradeControllerJob"
import { JobType, IStats } from "_lib/interfaces"
import { collect_stats, add_stats_callback } from "_lib/screepsplus"
import { Hatchery } from "Hatchery"
import { Job, JobPriority } from "jobs/Job"
import { Dictionary } from "lodash"
import { ErrorMapper } from "utils/ErrorMapper"
import { summarize_room } from "_lib/resources"
import { Role } from "role/roles"
import { HaulingJob } from "jobs/HaulingJob"
import { deseralizeJobCreeps } from "utils/MemoryUtil"
import DEFCON from "./DEFCON"
import { RemoteEnergyMission } from "missions/RemoteEnergyMission"
import { IRemoteEnergyMissionMemory } from "types"

// global.DEFCON = DEFCON

add_stats_callback((stats: IStats) => {
  if (stats) {
    stats.jobs = Memory.jobs

    // Memory.jobs.forEach(job => {
    //   if (stats && stats.jobs && job.target) {
    //     let jobTarget = stats.jobs[job.target]
    //     if (!jobTarget) {
    //       stats.jobs[job.target] = jobTarget = []
    //     }
    //     jobTarget.push(job)
    //     // TODO: what about subjobs?
    //   }
    // })
  }
})

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
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
      console.log("Clearing non-existing creep memory:", name)
    } else {
      if (!creep.role) {
        creep.role = Role.Larvae
      }
    }
  }

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
  // deseralize jobs
  const jobs: Dictionary<Job[]> = deseralizeJobs()

  queueFlagMissions()

  for (const roomName in Memory.rooms) {
    if (Memory.rooms.hasOwnProperty(roomName)) {
      const room = Game.rooms[roomName]
      const roomMemory = Memory.rooms[roomName]

      // room visible
      if (room) {
        DEFCON.scan(room)

        // if (roomMemory.energymission) {
        //   const energyMission = new EnergyMission(room)
        //   energyMission.run()
        // }
      }

      // room not visible
      if (roomMemory.remoteEnergyMission) {
        const remoteEnergyMission = new RemoteEnergyMission({
          roomName,
          memory: roomMemory.remoteEnergyMission
        })
        remoteEnergyMission.run()
      }
    }
  }

  // What defines an energymission, that we have a spawn?
  const energyMission = new EnergyMission(Game.spawns.Spawn1.room)
  energyMission.run()

  // TODO: detect jobs
  // MiningJob how to detect a job exists, search jobs for sourceId
  // TODO:How do we prioritize the jobs?

  // queue upgradeController job, how to determine how many upgraders we want?
  if (Game.spawns.Spawn1) {
    const controller = Game.spawns.Spawn1.room.controller
    if (controller) {
      if (!jobs[controller.id]) {
        Memory.jobs[controller.id] = []
        // having to construct the memory this way and then sending it in, to be able to push the memory, is sily
        const jobMemory = {
          type: JobType.UpgradeController,
          target: controller.id,
          creeps: [],
          priority: JobPriority.Low
        }

        Memory.jobs[controller.id].push(jobMemory) // "Seralize job" TODO: change structure to a dictionary per jobType and a list

        const job = new UpgradeControllerJob(controller, jobMemory)

        jobs[controller.id] = [job]
      }
    }

    // queue building jobs
    const constructionSites = Game.spawns.Spawn1.room.find(FIND_MY_CONSTRUCTION_SITES)
    // group construction sites by type?, the type could be utilized as id, might be deleted then by earlier logic
    // road work, what priority is that? Low?
    // extension, what priority is that? Medium
    // container, what priority? HIGH
    // walls ?
    // priority is not that important when we do not sort jobs by priority.
    // We wish to accomplish "enough" workers assigned to "all" construction jobs, we also wish workers to get assigned to the closest job

    constructionSites.forEach(site => {
      if (!jobs[site.id]) {
        const job = new BuilderJob(site)
        jobs[site.id] = [job]
      }
    })

    // queue tower hauling jobs
    const towers = Game.spawns.Spawn1.room.find<StructureTower>(FIND_MY_STRUCTURES, {
      filter: (structure: Structure) => structure.structureType === STRUCTURE_TOWER
    })

    towers.forEach(tower => {
      if (!jobs[tower.id]) {
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

    // hatchery, should contain a list of requested creep types for jobs, but we also need to determine what hatchery should hatch it later

    for (const target in jobs) {
      if (jobs.hasOwnProperty(target)) {
        const targetJobs = jobs[target]
        targetJobs.forEach(job => {
          job.run()
        })
      }
    }

    // seralize jobs
    // Memory.jobs = jobs

    // Map Sources

    for (const spawnName in Game.spawns) {
      if (Game.spawns.hasOwnProperty(spawnName)) {
        const spawn = Game.spawns[spawnName]
        const hatchery = new Hatchery(spawn)
        hatchery.run()
      }
    }
  }

  // How do I make sure collect stats resets room stats when I die?

  collect_stats()

  if (Game.spawns.Spawn1) {
    let spawn1Stats = summarize_room(Game.spawns.Spawn1.room)
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
        }
      })
    }
  }

  return jobs
}
