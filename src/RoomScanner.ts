import { profile } from "_lib/Profiler"

export class Position implements IPosition {
  public x: number
  public y: number
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }
}

function isPositionWalkable(roomTerrain: RoomTerrain, position: Position | null): boolean | null {
  if (!position) {
    return null
  }

  const terrain = roomTerrain.get(position.x, position.y)

  return terrain !== TERRAIN_MASK_WALL
}

// this is something I should write tests for tbh
export function getPositions(roomTerrain: RoomTerrain, target: RoomPosition, offset?: number): Position[] {
  const positions: Position[] = []

  if (!offset) {
    offset = 1
  }

  const borderLength = target.x + offset - (target.x - offset) + 1

  // topLine
  for (let index = 0; index < borderLength; index++) {
    const position = new Position(target.x - offset + index, target.y - offset)
    if (position && isPositionWalkable(roomTerrain, position)) {
      positions.push(position)
    }
  }

  // right, we do not count corners
  for (let index = 0; index < borderLength - 2; index++) {
    const position = new Position(target.x + offset, target.y - offset + index + 1)
    if (position && isPositionWalkable(roomTerrain, position)) {
      positions.push(position)
    }
  }

  // bottomLine
  for (let index = 0; index < borderLength; index++) {
    const position = new Position(target.x - offset + index, target.y + offset)
    if (position && isPositionWalkable(roomTerrain, position)) {
      positions.push(position)
    }
  }

  // left, we do not count corners
  for (let index = 0; index < borderLength - 2; index++) {
    const position = new Position(target.x - offset, target.y - offset + index + 1)
    if (position && isPositionWalkable(roomTerrain, position)) {
      positions.push(position)
    }
  }

  return positions
}
// tslint:disable-next-line: max-classes-per-file
@profile
export class RoomScanner {
  public exitWalls(room: Room) {
    let cpuUsage = Game.cpu.getUsed()
    const walls: RoomPosition[] = []
    const exits = room.find(FIND_EXIT)
    exits.forEach(exit => {
      const walkable = getPositions(room.getTerrain(), exit, 1)
      walkable
        .filter(pos => pos.x !== exit.x && pos.y !== exit.y)
        .forEach(pos => {
          const roomPosition = room.getPositionAt(pos.x, pos.y)
          const hasPosition =
            walls.findIndex((wall: RoomPosition) => {
              return wall.x === pos.x && wall.y === pos.y
            }) >= 0

          if (roomPosition && !hasPosition) {
            walls.push(roomPosition)
          }
        })
    })

    walls.forEach(wall => {
      room.visual.circle(wall, { fill: "transparent", radius: 0.55, stroke: "red" })
    })

    cpuUsage = Game.cpu.getUsed() - cpuUsage
    room.visual.text(`CPU Usage: ${cpuUsage}`, 0, 0, { align: "left" })
    // uses ~1 cpu and also generates excessive walls, should probably use pathfinding
  }

  /** Scans the room for static data, currently source nodes and miningpositions */
  public scan(room: Room) {
    if (!room) {
      console.log("[Warning] room is not defined")
      return
    }
    const roomTerrain = new Room.Terrain(room.name)
    const sources = room.find(FIND_SOURCES)
    room.memory.miningPositions = 0
    sources.forEach(source => {
      const positions = getPositions(roomTerrain, source.pos)

      if (room.memory.miningPositions !== undefined) {
        room.memory.miningPositions += positions.length
      }

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
          distanceToSpawn,
          miningPositions: []
        } as ISourceMemory
        room.memory.sources[source.id] = sourceMemory
      }

      sourceMemory.miningPositions = positions
    })
  }
}
