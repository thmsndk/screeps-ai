import { Position } from "./RoomScanner"
import { getPositions } from "RoomScanner"
import { Infrastructure } from "RoomPlanner/Infrastructure"

export class RoomPlanner {
  private infrastructure: Infrastructure

  public lastRun?: number

  public constructor(infrastructure: Infrastructure) {
    // Should probably be an interface and not an exact implementation
    this.infrastructure = infrastructure
  }

  public plan(roomName: string, rcl: number): Infrastructure {
    this.lastRun = Game.time
    for (let index = 0; index <= rcl; index++) {
      const roomLayers = this.infrastructure.Layers[roomName]
      if (!roomLayers || !roomLayers[index]) {
        this.infrastructure.AddLayer(roomName)
      }
    }
    // TODO: when finding positions, ignore exits, too close to sources

    // TODO: do we need to define what we are planning for? e.g. Main room, Remote Room
    // Wall = RCL 2
    // Extension = RCL 2
    // Rampart = RCL 2
    // Tower = RCL 3
    // Storage = RCL 4
    // Link = RCL 5
    // Extractor = RCL 6
    // LAB = RCL 6
    // Terminal = RCL 6

    // TODO: method to clear a layer?
    const spawns = Object.keys(Game.spawns).length

    let radiatePosition = null
    for (const spawnName in Game.spawns) {
      if (Game.spawns.hasOwnProperty(spawnName)) {
        const spawn = Game.spawns[spawnName]
        if (spawn.room.name === roomName) {
          // TODO: What do we do if we run the room planner again when we have multiple spawns in the room?
          radiatePosition = spawn.pos
          break
        }
      }
    }

    // Find cSite
    for (const constructionSiteId in Game.constructionSites) {
      if (Game.constructionSites.hasOwnProperty(constructionSiteId)) {
        const constructionSite = Game.constructionSites[constructionSiteId]
        if (constructionSite.pos.roomName === roomName && constructionSite.structureType === STRUCTURE_SPAWN) {
          radiatePosition = constructionSite.pos
          this.infrastructure.AddPosition(roomName, 1, STRUCTURE_SPAWN, radiatePosition.x, radiatePosition.y)
        }
      }
    }

    const roomTerrain = new Room.Terrain(roomName) // TODO: not sure we want to do this, due to unit tests

    if (!radiatePosition) {
      // Planner should only run when we have just claimed a room, thus should be visible and have been scanned, unless claimer just died
      const room = Game.rooms[roomName]
      if (room) {
        const goals = [] as RoomPosition[]

        for (const sourceId in room.memory.sources) {
          if (room.memory.sources.hasOwnProperty(sourceId)) {
            const sourceMemory = room.memory.sources[sourceId]
            goals.push(...sourceMemory.miningPositions.map(mp => new RoomPosition(mp.x, mp.y, roomName)))
          }
        }

        if (room.controller) {
          const pathFromControllerToClosestSource = PathFinder.search(room.controller.pos, goals)
          radiatePosition =
            pathFromControllerToClosestSource.path[Math.floor(pathFromControllerToClosestSource.path.length / 2)]
        } else {
          radiatePosition = new RoomPosition(25, 25, roomName)
        }

        this.infrastructure.AddPosition(roomName, 1, STRUCTURE_SPAWN, radiatePosition.x, radiatePosition.y)
      }
    }

    if (radiatePosition) {
      // TODO: we might need roomName aswell to add to correct layer
      const positions: Position[] = []

      let offset = 2
      this.AlternatePositions(roomName, positions, 2, roomTerrain, radiatePosition, offset, 5)
      // TODO: containers, when do we build them? When 1 extension is build? because that allows for big enough harvesters for static?
      // This reveals a problem though, we need to activate the container part of the plan. should it be on a new layer?
      // Should we be able to flag a position with meta data that will evaluate when pulling a job? could flag it with "minAvailableEnergy"
      if (rcl >= 3) {
        offset += 1
        this.AlternatePositions(roomName, positions, 3, roomTerrain, radiatePosition, offset, 5)

        const position = positions.pop()
        if (position) {
          this.infrastructure.AddPosition(roomName, 3, STRUCTURE_TOWER, position.x, position.y)
        }
      }

      if (rcl >= 4) {
        offset += 1
        this.AlternatePositions(roomName, positions, 4, roomTerrain, radiatePosition, offset, 10)

        const position = positions.pop()
        if (position) {
          this.infrastructure.AddPosition(roomName, 4, STRUCTURE_STORAGE, position.x, position.y)
        }
      }

      if (rcl >= 5) {
        offset += 1
        this.AlternatePositions(roomName, positions, 5, roomTerrain, radiatePosition, offset, 10)

        const position = positions.pop()
        if (position) {
          this.infrastructure.AddPosition(roomName, 5, STRUCTURE_TOWER, position.x, position.y)
        }
      }

      if (rcl >= 6) {
        offset += 1
        this.AlternatePositions(roomName, positions, 6, roomTerrain, radiatePosition, offset, 10)
      }

      if (rcl >= 7) {
        offset += 1
        this.AlternatePositions(roomName, positions, 7, roomTerrain, radiatePosition, offset, 10)

        const position = positions.pop()
        if (position) {
          this.infrastructure.AddPosition(roomName, 7, STRUCTURE_TOWER, position.x, position.y)
        }
      }

      if (rcl >= 8) {
        offset += 1
        this.AlternatePositions(roomName, positions, 8, roomTerrain, radiatePosition, offset, 10)

        let position = positions.pop()
        if (position) {
          this.infrastructure.AddPosition(roomName, 8, STRUCTURE_TOWER, position.x, position.y)
        }
        position = positions.pop()
        if (position) {
          this.infrastructure.AddPosition(roomName, 8, STRUCTURE_TOWER, position.x, position.y)
        }
        position = positions.pop()
        if (position) {
          this.infrastructure.AddPosition(roomName, 8, STRUCTURE_TOWER, position.x, position.y)
        }
      }
    }

    return this.infrastructure
  }

  private AlternatePositions(
    roomName: string,
    existingPositions: Position[],
    layerIndex: number,
    roomTerrain: RoomTerrain,
    pos: RoomPosition,
    offset: number,
    requiredPositions: number
  ): number {
    if (existingPositions.length / 2 < requiredPositions) {
      const positions = getPositions(roomTerrain, pos, offset)
      existingPositions.push(...positions)
    }

    for (let index = 0; index < requiredPositions; index++) {
      // TODO: what if there is not 5 available positions, then we need to acquire new positions, messing with the offset of the next layers
      const position = existingPositions.pop()
      if (position) {
        this.infrastructure.AddPosition(roomName, layerIndex, STRUCTURE_EXTENSION, position.x, position.y)
      }

      // Skip every second position
      existingPositions.pop()
    }

    return offset
  }
}
