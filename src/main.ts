import "./_lib/RoomVisual/RoomVisual"
import "./task/prototypes"
import { Mem, Stats } from "_lib/Overmind"
import { Freya } from "./Freya"
import { Elders } from "./Elders"
import { RoomPlanner } from "RoomPlanner"

// // import { summarize_room } from "_lib/resources"
import { visualizeCreepRole } from "_lib/roleicons"
// // import { add_stats_callback, collect_stats } from "_lib/screepsplus"
// // import { PathStyle } from "jobs/MovementPathStyles"
import { Dictionary } from "lodash"
import { InfraStructureMission } from "missions/InfrastructureMission"
import { ErrorMapper } from "utils/ErrorMapper"

import { init } from "./_lib/Profiler"
// // import DEFCON, { DEFCONLEVEL } from "./DEFCON"
import { Hatchery } from "./Hatchery"
import { RoomScanner } from "./RoomScanner"
import { Infrastructure } from "RoomPlanner/Infrastructure"
import { Thor } from "Thor"
// // import { log, LogLevels } from "_lib/Overmind/console/log"

import { log } from "_lib/Overmind/console/log"
import { Tasks } from "task"

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

const infrastructure = new Infrastructure() // Should memory be in the village room?
const roomPlanner = new RoomPlanner(infrastructure) // How do we plan accross rooms?
const roomScanner = new RoomScanner()
const freya = new Freya()
global.freya = freya

const thor = new Thor()
// // global.freya = thor

const counsil = new Elders(roomPlanner, roomScanner, freya, infrastructure, thor)

export const infraStructureMissions: Dictionary<InfraStructureMission> = {}

export const hatcheries: Dictionary<Hatchery> = {}
// // log.setLogLevel(LogLevels.INFO)

let shard2CreepsRequested = true
const shard2MissionCreeps: string[] = []
let pixelCreepName: string

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
    log.info(`New code uploaded ${__BUILD_TIME__} (${__REVISION__})`)
  }

  // Memory operations: load and clean memory, suspend operation as needed -------------------------------------------
  Mem.load() // Load previous parsed memory if present
  if (!Mem.shouldRun()) {
    return
  } // Suspend operation if necessary

  Mem.clean() // Clean memory contents

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name]
      // Console.log("Clearing non-existing creep memory:", name)
    }
  }

  if (Game.cpu.generatePixel && Game.cpu.bucket > 9000) {
    log.info("bucket huge, generating pixels")
    Game.cpu.generatePixel()
  }

  infrastructure.hydrate()
  freya.hydrate()

  // Intershard migration
  // If shard2 and room not initialized mark it for claiming (E20S40)
  // Default logic should take over

  // Shard 3 logic, persist in memory that creeps have been queued.
  // Request creeps, we need 1 claimer, 2 large miners, X large haulers filled energy. Y Builders filled with energy
  // Send creeps to portal (E20S40) 33, 36
  const roomWithPortal = "E20S40"
  const roomToClaim = "E22S39"
  if (Game.shard.name === "shard3") {
    if (Game.time % 1000 === 0) {
      log.info("QUEING CREEPS FOR SHARD2 PIXEL PRESENCE")
      const pixel = {
        rune: "pixel",
        count: 4,
        runePowers: { [MOVE]: 1 },
        priority: 665,
        mission: "shard2-pixels",
        missionRoom: roomWithPortal
      }

      const pixels = freya.pray(pixel)
      pixelCreepName = pixels.pixel[0]
    }

    if (!shard2CreepsRequested && Game.time % 1000 === 0) {
      log.info('QUEING CREEPS FOR SHARD "INVASION"')
      // // const claimers = {
      // //   rune: "claimers",
      // //   count: 1,
      // //   runePowers: { [MOVE]: 1, [CLAIM]: 1 },
      // //   priority: 666,
      // //   mission: "shard2",
      // //   missionRoom: roomWithPortal
      // // }

      // // freya.pray(claimers)

      const miners = {
        rune: "miners",
        count: 4,
        runePowers: { [WORK]: 3, [CARRY]: 1, [MOVE]: 3 },
        priority: 665,
        mission: "shard2",
        missionRoom: roomWithPortal
      }

      freya.pray(miners)

      const haulers = {
        rune: "haulers",
        count: 4,
        runePowers: { [CARRY]: 7, [MOVE]: 7 },
        priority: 665,
        mission: "shard2",
        missionRoom: roomWithPortal
      }

      freya.pray(haulers)

      const builders = {
        rune: "builders",
        count: 2,
        runePowers: { [WORK]: 3, [CARRY]: 5, [MOVE]: 3 },
        priority: 660,
        mission: "shard2",
        missionRoom: roomWithPortal
      }

      freya.pray(builders)

      shard2CreepsRequested = true
    }

    // // // // freya.print()

    // // // // Send everyone to portal
    // // // // const portalRoom = Game.rooms[roomWithPortal]
    // // // // if (portalRoom) {
    // // // //   const creeps = portalRoom.find(FIND_MY_CREEPS, { filter: creep => creep.memory.mission === "shard2" })
    // // // //   creeps.forEach(creep => {
    // // // //     if (!creep.task) {
    // // // //       creep.task = Tasks.goTo(new RoomPosition(33, 36, roomWithPortal))
    // // // //     }
    // // // //   })
    // // // // }
    // // // Run creeps
    // // for (const creepName in Game.creeps) {
    // //   if (Game.creeps.hasOwnProperty(creepName)) {
    // //     const creep = Game.creeps[creepName]
    // //     if (creep.memory.mission.indexOf("shard2") !== -1) {
    // //       // Send everyone to portal
    // //       if (!creep.task) {
    // //         creep.task = Tasks.goTo(new RoomPosition(33, 36, roomWithPortal), { moveOptions: { range: 0 } })
    // //       }

    // //       creep.run()
    // //     }
    // //   }
    // // }
    // Move pixel creep
    if (pixelCreepName) {
      const pixelCreep = Game.creeps[pixelCreepName]
      if (pixelCreep) {
        if (!pixelCreep.task) {
          pixelCreep.task = Tasks.goTo(new RoomPosition(33, 36, roomWithPortal), { moveOptions: { range: 0 } })
        }

        pixelCreep.run()
      }
    }
  }

  // // if (Game.shard.name === "shard2") {
  // //   // // log.info('SHARD 2 Migration "module"')
  // //   if (!Memory.rooms[roomToClaim]) {
  // //     Memory.rooms[roomToClaim] = { claim: true } as any
  // //   }
  // //   // Loop all creeps and make them move away from the portal if in range
  // //   for (const roomName in Game.rooms) {
  // //     if (Game.rooms.hasOwnProperty(roomName)) {
  // //       const room = Game.rooms[roomName]
  // //       const portals = room.find(FIND_STRUCTURES, {
  // //         filter: structure => structure.structureType === STRUCTURE_PORTAL
  // //       })
  // //       // // log.info(`${portals.length} portals found`)
  // //       portals.forEach(portal => {
  // //         const creeps = portal.pos.findInRange(FIND_MY_CREEPS, 30)
  // //         // // log.info(`${creeps.length} creeps found near portals`)
  // //         creeps.forEach(creep => {
  // //           if (!creep.task) {
  // //             log.info(`${creep.name} getting task for ${roomToClaim}`)
  // //             creep.task = Tasks.goToRoom(roomToClaim, { moveOptions: { range: 20 } })
  // //             creep.memory.home = roomToClaim

  // //             // Amnesia quuick fix
  // //             if (creep.name.indexOf("builders") !== -1) {
  // //               creep.memory.rune = "builders"
  // //             }

  // //             if (creep.name.indexOf("haulers") !== -1) {
  // //               creep.memory.rune = "haulers"
  // //             }

  // //             if (creep.name.indexOf("miners") !== -1) {
  // //               creep.memory.rune = "miners"
  // //             }
  // //           }
  // //         })
  // //       })
  // //     }
  // //   }

  // //   for (const creepName in Game.creeps) {
  // //     if (Game.creeps.hasOwnProperty(creepName)) {
  // //       const creep = Game.creeps[creepName]
  // //       if (creep.task?.targetPos.roomName === roomToClaim) {
  // //         creep.run()
  // //       }
  // //     }
  // //   }
  // // }

  // Run "Counsil"
  const missions = counsil.run()

  // Run "Freya"
  freya.run()

  // Run Village missions
  // Run Outpost missions
  // Run Raids (attack / loot & other)
  missions.forEach(mission => mission.run())

  // How do I make sure collect stats resets room stats when I die?

  Stats.run()
  // Collect_stats()
  Stats.colonyStats()

  visualizeCreepRole()

  // // if (Game.spawns.Spawn1) {
  // //   const spawn1Stats = summarize_room(Game.spawns.Spawn1.room)
  // //   let y = 25
  // //   if (spawn1Stats) {
  // //     // Game.spawns.Spawn1.room.visual.text(
  // //     //   `⚡ ${spawn1Stats.energy_avail} / ${spawn1Stats.energy_cap}`,
  // //     //   25,
  // //     //   Y,
  // //     //   { align: 'center', opacity: 0.8 });

  // //     // Y += 1

  // //     for (const role in spawn1Stats.creep_counts) {
  // //       if (spawn1Stats.creep_counts.hasOwnProperty(role)) {
  // //         const count = spawn1Stats.creep_counts[role]
  // //         y += 1
  // //         Game.spawns.Spawn1.room.visual.text(`${role}: ${count}`, 25, y, {
  // //           align: "center",
  // //           opacity: 0.8
  // //         })
  // //       }
  // //     }
  // //   }
  // // }
})

// This gets run on each global reset
function onGlobalReset(): void {
  // // if (USE_PROFILER) {
  // //   profiler.enable()
  // // }
  Mem.format()
  // // OvermindConsole.init()
  // // VersionMigration.run()
  Memory.stats.persistent.lastGlobalReset = Game.time
  // // OvermindConsole.printUpdateMessage()
}

// Genocide function, need to register it as utility method
// // Object.values(Game.creeps).forEach(c => c.suicide())

// Run the global reset code
onGlobalReset()
