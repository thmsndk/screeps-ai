import { Dictionary } from 'lodash';
declare global { interface RoomMemory { sources: Dictionary<ISourceMemory>, miningPositions: number } } // TODO: in use / unused mining position?
export interface IMiningPosition {
    roomPosition: RoomPosition,
}
export interface ISourceMemory {
    miningPositions: IMiningPosition[]
    assignedCreepIds: string[]
}
function isPositionMinable(roomTerrain: RoomTerrain, roomPosition: RoomPosition | null): IMiningPosition | null {

    if (!roomPosition) {
        return null;
    }

    const terrain = roomTerrain.get(roomPosition.x, roomPosition.y)

    return terrain !== TERRAIN_MASK_WALL ? { roomPosition } : null

}

function isPositionWalkable(roomTerrain: RoomTerrain, roomPosition: RoomPosition | null): boolean | null {

    if (!roomPosition) {
        return null;
    }

    const terrain = roomTerrain.get(roomPosition.x, roomPosition.y)

    return terrain !== TERRAIN_MASK_WALL
}

// this is something I should write tests for tbh
export function getPositions(room: Room, roomTerrain: RoomTerrain, target: RoomPosition, offset?: number): RoomPosition[] {
    let positions: RoomPosition[] = []

    if (!offset) {
        offset = 1
    }
    // TODO: calculate distance between corners
    const borderLength = (target.x + offset) - (target.x - offset) + 1

    // topLine
    for (let index = 0; index < borderLength; index++) {
        const position = room.getPositionAt(target.x - offset + index, target.y - offset)
        if (position && isPositionWalkable(roomTerrain, position)) { positions.push(position) }
    }

    // right, we do not count corners
    for (let index = 0; index < (borderLength - 2); index++) {
        const position = room.getPositionAt(target.x + offset, target.y - offset + index + 1)
        if (position && isPositionWalkable(roomTerrain, position)) { positions.push(position) }
    }

    // bottomLine
    for (let index = 0; index < borderLength; index++) {
        const position = room.getPositionAt(target.x - offset + index, target.y + offset)
        if (position && isPositionWalkable(roomTerrain, position)) { positions.push(position) }
    }

    // left, we do not count corners
    for (let index = 0; index < (borderLength - 2); index++) {
        const position = room.getPositionAt(target.x - offset, target.y - offset + index + 1)
        if (position && isPositionWalkable(roomTerrain, position)) { positions.push(position) }
    }

    return positions
}
export class RoomScanner {
    /** Scans the room for static data, currently source nodes and miningpositions */
    scan(room: Room) {
        if (!room) {
            console.log('[Warning] room is not defined')
            return
        }
        var roomTerrain = new Room.Terrain(room.name);
        const sources = room.find(FIND_SOURCES);
        room.memory.miningPositions = 0
        sources.forEach(source => {

            let miningPositions: IMiningPosition[] = []
            const positions = getPositions(room, roomTerrain, source.pos)

            positions.forEach(pos => {
                miningPositions.push({ roomPosition: pos })
            });

            room.memory.miningPositions += miningPositions.length

            if (!room.memory.sources) { room.memory.sources = {} }

            let sourceMemory = room.memory.sources[source.id]

            if (!sourceMemory) {
                sourceMemory = { assignedCreepIds: [], miningPositions: [] } as ISourceMemory
                room.memory.sources[source.id] = sourceMemory
            }

            sourceMemory.assignedCreepIds = _.filter(sourceMemory.assignedCreepIds, (creepId) => Game.getObjectById(creepId))

            sourceMemory.miningPositions = miningPositions
        })
    }
}
