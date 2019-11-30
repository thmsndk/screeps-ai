import "./_lib/RoomVisual/RoomVisual"
import "./task/prototypes"
import { Freya } from "./Freya"
import { Elders } from "./Elders"
import { RoomPlanner } from "RoomPlanner"

import { summarize_room } from "_lib/resources"
import { visualizeCreepRole } from "_lib/roleicons"
import { add_stats_callback, collect_stats } from "_lib/screepsplus"
import { PathStyle } from "jobs/MovementPathStyles"
import { Dictionary } from "lodash"
import { InfraStructureMission } from "missions/InfrastructureMission"
import { ErrorMapper } from "utils/ErrorMapper"

import { init } from "./_lib/Profiler"
import DEFCON, { DEFCONLEVEL } from "./DEFCON"
import { Hatchery } from "./Hatchery"
import { EnergyMission } from "./missions/EnergyMission"
import { RoomScanner } from "./RoomScanner"
import { Task } from "./task/Task"
import { Infrastructure } from "RoomPlanner/Infrastructure"
import { InfrastructureMemory } from "RoomPlanner/InfrastructureMemory"
import { Stats } from "_lib/Overmind/stats"
import { Mem } from "_lib/Overmind/Memory"

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

const counsil = new Elders(roomPlanner, roomScanner, freya, infrastructure)

export const infraStructureMissions: Dictionary<InfraStructureMission> = {}

export const hatcheries: Dictionary<Hatchery> = {}

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

  // Memory operations: load and clean memory, suspend operation as needed -------------------------------------------
  Mem.load() // Load previous parsed memory if present
  if (!Mem.shouldRun()) {
    return
  } // Suspend operation if necessary
  Mem.clean() // Clean memory contents

  infrastructure.hydrate()

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
