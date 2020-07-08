import { log } from "_lib/Overmind/console/log"
import { Tasks } from "task"

let claimerRequested = false

export const shardMigration = (
  sourceShard: string,
  destinationShard: string,
  sourcePortalPosition: RoomPosition,
  roomToClaim: string
): void => {
  if (Game.shard.name === sourceShard) {
    if (!claimerRequested || Game.time % 1000 === 0) {
      log.info('QUEING CREEPS FOR SHARD "INVASION"')

      if (!claimerRequested) {
        const claimers = {
          rune: "claimers",
          count: 1,
          runePowers: { [MOVE]: 1, [CLAIM]: 1 },
          priority: 666,
          mission: "shard2",
          missionRoom: sourcePortalPosition.roomName
        }

        global.freya.pray(claimers)
        claimerRequested = true
      }

      const miners = {
        rune: "miners",
        count: 4,
        runePowers: { [WORK]: 3, [CARRY]: 1, [MOVE]: 3 },
        priority: 665,
        mission: "shard2",
        missionRoom: sourcePortalPosition.roomName
      }

      global.freya.pray(miners)

      const haulers = {
        rune: "haulers",
        count: 4,
        runePowers: { [CARRY]: 7, [MOVE]: 7 },
        priority: 665,
        mission: "shard2",
        missionRoom: sourcePortalPosition.roomName
      }

      global.freya.pray(haulers)

      const builders = {
        rune: "builders",
        count: 2,
        runePowers: { [WORK]: 3, [CARRY]: 5, [MOVE]: 3 },
        priority: 660,
        mission: "shard2",
        missionRoom: sourcePortalPosition.roomName
      }

      global.freya.pray(builders)
    }

    // Run creeps
    for (const creepName in Game.creeps) {
      if (Game.creeps.hasOwnProperty(creepName)) {
        const creep = Game.creeps[creepName]
        if (creep.memory.mission.indexOf("shard2") !== -1) {
          // Send everyone to portal
          if (!creep.task) {
            creep.task = Tasks.goTo(sourcePortalPosition, { moveOptions: { range: 0 } })
          }

          creep.run()
        }
      }
    }
  }

  if (Game.shard.name === destinationShard) {
    // // log.info('SHARD 2 Migration "module"')
    if (!Memory.rooms[roomToClaim]) {
      Memory.rooms[roomToClaim] = { claim: true } as any
    }
    // Loop all creeps and make them move away from the portal if in range
    for (const roomName in Game.rooms) {
      if (Game.rooms.hasOwnProperty(roomName)) {
        const room = Game.rooms[roomName]
        const portals = room.find(FIND_STRUCTURES, {
          filter: structure => structure.structureType === STRUCTURE_PORTAL
        })
        // // log.info(`${portals.length} portals found`)
        portals.forEach(portal => {
          const creeps = portal.pos.findInRange(FIND_MY_CREEPS, 30)
          // // log.info(`${creeps.length} creeps found near portals`)
          creeps.forEach(creep => {
            if (!creep.task) {
              log.info(`${creep.name} getting task for ${roomToClaim}`)
              creep.task = Tasks.goToRoom(roomToClaim, { moveOptions: { range: 20 } })
              creep.memory.home = roomToClaim

              // Amnesia quuick fix
              if (creep.name.indexOf("builders") !== -1) {
                creep.memory.rune = "builders"
              }

              if (creep.name.indexOf("haulers") !== -1) {
                creep.memory.rune = "haulers"
              }

              if (creep.name.indexOf("miners") !== -1) {
                creep.memory.rune = "miners"
              }
            }
          })
        })
      }
    }

    for (const creepName in Game.creeps) {
      if (Game.creeps.hasOwnProperty(creepName)) {
        const creep = Game.creeps[creepName]
        if (creep.task?.targetPos.roomName === roomToClaim) {
          creep.run()
        }
      }
    }
  }
}
