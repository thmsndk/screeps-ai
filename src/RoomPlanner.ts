import { Position } from "./RoomScanner"
import { getPositions } from "RoomScanner"
import { Infrastructure } from "RoomPlanner/Infrastructure"
export class RoomPlanner {
  private infrastructure: Infrastructure
  constructor(infrastructure: Infrastructure) {
    // Should probably be an interface and not an exact implementation
    this.infrastructure = infrastructure
  }

  public plan(roomName: string, rcl: number): Infrastructure {
    for (let index = 0; index <= rcl; index++) {
      if (!this.infrastructure.Layers[index]) {
        this.infrastructure.AddLayer(roomName)
      }
    }

    // wall = RCL 2
    // extension = RCL 2
    // Rampart = RCL 2
    // Tower = RCL 3
    // Storage = RCL 4
    // Link = RCL 5
    // Extractor = RCL 6
    // LAB = RCL 6
    // Terminal = RCL 6

    // TODO: method to clear a layer?

    let spawn = null
    for (const spawnName in Game.spawns) {
      if (Game.spawns.hasOwnProperty(spawnName)) {
        spawn = Game.spawns[spawnName]
        if (spawn.room.name === roomName) {
          break
        }
      }
    }

    if (spawn) {
      const roomTerrain = new Room.Terrain(roomName) // TODO: not sure we want to do this, due to unit tests

      // TODO: we might need roomName aswell to add to correct layer
      const positions: Position[] = []

      let offset = 2
      this.AlternatePositions(positions, 2, roomTerrain, spawn.pos, offset, 5)

      if (rcl >= 3) {
        offset += 2
        this.AlternatePositions(positions, 3, roomTerrain, spawn.pos, offset, 5)
      }

      if (rcl >= 4) {
        offset += 2
        this.AlternatePositions(positions, 4, roomTerrain, spawn.pos, offset, 10)
      }

      if (rcl >= 5) {
        offset += 2
        this.AlternatePositions(positions, 5, roomTerrain, spawn.pos, offset, 10)
      }

      if (rcl >= 6) {
        offset += 2
        this.AlternatePositions(positions, 6, roomTerrain, spawn.pos, offset, 10)
      }

      if (rcl >= 7) {
        offset += 2
        this.AlternatePositions(positions, 7, roomTerrain, spawn.pos, offset, 10)
      }

      if (rcl >= 8) {
        offset += 2
        this.AlternatePositions(positions, 8, roomTerrain, spawn.pos, offset, 10)
      }
    }

    return this.infrastructure
  }

  private AlternatePositions(
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
        this.infrastructure.AddPosition(layerIndex, STRUCTURE_EXTENSION, position.x, position.y)
      }

      // skip every second position
      existingPositions.pop()
    }

    return offset
  }
}
