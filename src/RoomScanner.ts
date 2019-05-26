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
            const top = isPositionMinable(roomTerrain, room.getPositionAt(source.pos.x, source.pos.y + 1))
            if (top) { miningPositions.push(top) }

            const topRight = isPositionMinable(roomTerrain, room.getPositionAt(source.pos.x + 1, source.pos.y + 1))
            if (topRight) { miningPositions.push(topRight) }

            const right = isPositionMinable(roomTerrain, room.getPositionAt(source.pos.x + 1, source.pos.y))
            if (right) { miningPositions.push(right) }

            const bottomRight = isPositionMinable(roomTerrain, room.getPositionAt(source.pos.x + 1, source.pos.y - 1))
            if (bottomRight) { miningPositions.push(bottomRight) }

            const bottom = isPositionMinable(roomTerrain, room.getPositionAt(source.pos.x, source.pos.y - 1))
            if (bottom) { miningPositions.push(bottom) }

            const bottomLeft = isPositionMinable(roomTerrain, room.getPositionAt(source.pos.x - 1, source.pos.y - 1))
            if (bottomLeft) { miningPositions.push(bottomLeft) }

            const left = isPositionMinable(roomTerrain, room.getPositionAt(source.pos.x - 1, source.pos.y))
            if (left) { miningPositions.push(left) }

            const topLeft = isPositionMinable(roomTerrain, room.getPositionAt(source.pos.x - 1, source.pos.y + 1))
            if (topLeft) { miningPositions.push(topLeft) }

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
