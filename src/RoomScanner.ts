import { ISourceMemory } from "types"

function isPositionWalkable(roomTerrain: RoomTerrain, roomPosition: RoomPosition | null): boolean | null {
  if (!roomPosition) {
    return null
  }

  const terrain = roomTerrain.get(roomPosition.x, roomPosition.y)

  return terrain !== TERRAIN_MASK_WALL
}

// this is something I should write tests for tbh
export function getPositions(
  room: Room,
  roomTerrain: RoomTerrain,
  target: RoomPosition,
  offset?: number
): RoomPosition[] {
  let positions: RoomPosition[] = []

  if (!offset) {
    offset = 1
  }
  // TODO: calculate distance between corners
  const borderLength = target.x + offset - (target.x - offset) + 1

  // topLine
  for (let index = 0; index < borderLength; index++) {
    const position = room.getPositionAt(target.x - offset + index, target.y - offset)
    if (position && isPositionWalkable(roomTerrain, position)) {
      positions.push(position)
    }
  }

  // right, we do not count corners
  for (let index = 0; index < borderLength - 2; index++) {
    const position = room.getPositionAt(target.x + offset, target.y - offset + index + 1)
    if (position && isPositionWalkable(roomTerrain, position)) {
      positions.push(position)
    }
  }

  // bottomLine
  for (let index = 0; index < borderLength; index++) {
    const position = room.getPositionAt(target.x - offset + index, target.y + offset)
    if (position && isPositionWalkable(roomTerrain, position)) {
      positions.push(position)
    }
  }

  // left, we do not count corners
  for (let index = 0; index < borderLength - 2; index++) {
    const position = room.getPositionAt(target.x - offset, target.y - offset + index + 1)
    if (position && isPositionWalkable(roomTerrain, position)) {
      positions.push(position)
    }
  }

  return positions
}
export class RoomScanner {
  /** Scans the room for static data, currently source nodes and miningpositions */
  scan(room: Room) {
    if (!room) {
      console.log("[Warning] room is not defined")
      return
    }
    var roomTerrain = new Room.Terrain(room.name)
    const sources = room.find(FIND_SOURCES)
    room.memory.miningPositions = 0
    sources.forEach(source => {
      const positions = getPositions(room, roomTerrain, source.pos)

      room.memory.miningPositions += positions.length

      if (!room.memory.sources) {
        room.memory.sources = {}
      }

      let sourceMemory = room.memory.sources[source.id]

      if (!sourceMemory) {
        let distanceToSpawn = 0
        const nearestSpawn = source.pos.findClosestByRange(FIND_MY_SPAWNS)
        if (nearestSpawn) {
          const path = PathFinder.search(source.pos, { pos: nearestSpawn.pos, range: 1 })
          distanceToSpawn = path.cost
        }
        sourceMemory = {
          assignedCreepIds: [],
          miningPositions: [],
          distanceToSpawn
        } as ISourceMemory
        room.memory.sources[source.id] = sourceMemory
      }

      sourceMemory.assignedCreepIds = _.filter(sourceMemory.assignedCreepIds, creepId => Game.getObjectById(creepId))

      sourceMemory.miningPositions = positions
    })
  }
}
