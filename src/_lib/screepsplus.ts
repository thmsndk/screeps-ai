// https://github.com/LispEngineer/screeps/blob/master/screepsplus.js

// Module to format data in memory for use with the https://screepspl.us
// Grafana utility run by ags131.
//
// Installation: Run a node script from https://github.com/ScreepsPlus/node-agent
// and configure your screepspl.us token and Screeps login (if you use Steam,
// you have to create a password on the Profile page in Screeps),
// then run that in the background (e.g., on Linode, AWS, your always-on Mac).
//
// Then, put whatever you want in Memory.stats, which will be collected every
// 15 seconds (yes, not every tick) by the above script and sent to screepspl.us.
// In this case, I call the collect_stats() routine below at the end of every
// trip through the main loop, with the absolute final call at the end of the
// main loop to update the final CPU usage.
//
// Then, configure a Grafana page (see example code) which graphs stuff whichever
// way you like.
//
// This module uses my resources module, which analyzes the state of affairs
// for every room you can see.
import { Callback, CallbackFunction } from "./callback"
import { summarize_rooms } from "./resources"
// const resources = require('_lib.resources');
// const cb = require('_lib.callback');

const statsCallbacks = new Callback()

// Tell us that you want a callback when we're collecting the stats.
// We will send you in the partially completed stats object.
export function add_stats_callback(cbfunc: CallbackFunction) {
  statsCallbacks.subscribe(cbfunc)
}

// Update the Memory.stats with useful information for trend analysis and graphing.
// Also calls all registered stats callback functions before returning.
export function collect_stats() {
  // Don't overwrite things if other modules are putting stuff into Memory.stats
  if (Memory.stats == null) {
    Memory.stats = { tick: Game.time, jobs: {} }
  }

  // Note: This is fragile and will change if the Game.cpu API changes
  Memory.stats.cpu = { ...Game.cpu, used: Game.cpu.getUsed() }
  // Memory.stats.cpu.used = Game.cpu.getUsed(); // AT END OF MAIN LOOP

  // Note: This is fragile and will change if the Game.gcl API changes
  Memory.stats.gcl = Game.gcl

  const memoryUsed = RawMemory.get().length
  // console.log('Memory used: ' + memory_used);
  Memory.stats.memory = {
    used: memoryUsed
    // Other memory stats here?
  }

  Memory.stats.market = {
    credits: Game.market.credits,
    num_orders: Game.market.orders ? Object.keys(Game.market.orders).length : 0
  }

  Memory.stats.roomSummary = summarize_rooms()

  // Add callback functions which we can call to add additional
  // statistics to here, and have a way to register them.
  // 1. Merge in the current repair ratchets into the room summary
  // TODO: Merge in the current creep desired numbers into the room summary
  // console.log("fire", Memory.stats.tick)
  statsCallbacks.fire(Memory.stats)
} // collect_stats
