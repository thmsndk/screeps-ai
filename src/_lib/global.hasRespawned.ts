// /**
//  * global.hasRespawned()
//  *
//  * @author:  SemperRabbit
//  * @version: 1.0
//  * @date:    180331
//  * @return:  boolean whether this is the first tick after a respawn or not
//  *
//  * The checks are set as early returns in case of failure, and are ordered
//  * from the least CPU intensive checks to the most. The checks are as follows:
//  *
//  *      If it has returned true previously during this tick, return true again
//  *      Check Game.time === 0 (returns true for sim room "respawns")
//  *      There are no creeps
//  *      There is only 1 room in Game.rooms
//  *      The 1 room has a controller
//  *      The controller is RCL 1 with no progress
//  *      The controller is in safemode with the initial value
//  *      There is only 1 StructureSpawn
//  *
//  * The only time that all of these cases are true, is the first tick of a respawn.
//  * If all of these are true, you have respawned.
//  */
// global.hasRespawned = function hasRespawned() {
//   // check for multiple calls on same tick
//   if (Memory.respawnTick && Memory.respawnTick === Game.time) return true
//   // server reset or sim
//   if (Game.time === 0) {
//     Memory.respawnTick = Game.time
//     return true
//   }
//   // check for 0 creeps
//   if (Object.keys(Game.creeps).length) return false
//   // check for only 1 room
//   var rNames = Object.keys(Game.rooms)
//   if (rNames.length !== 1) return false
//   // check for controller, progress and safe mode
//   var room = Game.rooms[rNames[0]]
//   if (
//     !room.controller ||
//     !room.controller.my ||
//     room.controller.level !== 1 ||
//     room.controller.progress ||
//     !room.controller.safeMode ||
//     room.controller.safeMode !== SAFE_MODE_DURATION - 1
//   )
//     return false
//   // check for 1 spawn
//   if (Object.keys(Game.spawns).length !== 1) return false
//   // if all cases point to a respawn, you've respawned
//   Memory.respawnTick = Game.time
//   return true
// }
