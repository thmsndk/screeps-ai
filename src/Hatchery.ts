import { Dictionary } from 'lodash';
import { Larvae } from './Larvae';
declare global { interface RoomMemory { sources: Dictionary<ISourceMemory> } } // TODO: in use / unused mining position?
interface IMiningPosition {
    roomPosition: RoomPosition,
}
interface ISourceMemory {
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

export class Hatchery {
    Spawn: StructureSpawn;

    constructor(spawn?: string) {
        if (!spawn) {
            spawn = "Spawn1"
        }
        this.Spawn = Game.spawns[spawn]
    }

    public run() {



        var roomTerrain = new Room.Terrain(this.Spawn.room.name);
        const sources = this.Spawn.room.find(FIND_SOURCES);
        sources.forEach(source => {

            if (this.Spawn) {
                let miningPositions: IMiningPosition[] = []
                const top = isPositionMinable(roomTerrain, this.Spawn.room.getPositionAt(source.pos.x, source.pos.y + 1))
                if (top) { miningPositions.push(top) }

                const topRight = isPositionMinable(roomTerrain, this.Spawn.room.getPositionAt(source.pos.x + 1, source.pos.y + 1))
                if (topRight) { miningPositions.push(topRight) }

                const right = isPositionMinable(roomTerrain, this.Spawn.room.getPositionAt(source.pos.x + 1, source.pos.y))
                if (right) { miningPositions.push(right) }

                const bottomRight = isPositionMinable(roomTerrain, this.Spawn.room.getPositionAt(source.pos.x + 1, source.pos.y - 1))
                if (bottomRight) { miningPositions.push(bottomRight) }

                const bottom = isPositionMinable(roomTerrain, this.Spawn.room.getPositionAt(source.pos.x, source.pos.y - 1))
                if (bottom) { miningPositions.push(bottom) }

                const bottomLeft = isPositionMinable(roomTerrain, this.Spawn.room.getPositionAt(source.pos.x - 1, source.pos.y - 1))
                if (bottomLeft) { miningPositions.push(bottomLeft) }

                const left = isPositionMinable(roomTerrain, this.Spawn.room.getPositionAt(source.pos.x - 1, source.pos.y))
                if (left) { miningPositions.push(left) }

                const topLeft = isPositionMinable(roomTerrain, this.Spawn.room.getPositionAt(source.pos.x - 1, source.pos.y + 1))
                if (topLeft) { miningPositions.push(topLeft) }

                if (!this.Spawn.room.memory.sources) { this.Spawn.room.memory.sources = {} }
                const sourceMemory = this.Spawn.room.memory.sources[source.id]
                sourceMemory.assignedCreepIds = _.filter(sourceMemory.assignedCreepIds, (creepId) => Game.getObjectById(creepId))

                this.Spawn.room.memory.sources[source.id] = { assignedCreepIds: [], ...sourceMemory, miningPositions } as ISourceMemory
            }
        })

        for (const creepName in Game.creeps) {
            if (Game.creeps.hasOwnProperty(creepName)) {
                const creep = Game.creeps[creepName];
                let larvae = new Larvae(this, creep)
                larvae.mutate()
            }
        }

        let spawning = !!this.Spawn.spawning; // code runs so fast that spawncreep does not update spawning in this tick?

        // TODO: we need to determine if we can grow our population
        const population = 10
        if (Object.keys(Game.creeps).length < population && !spawning) {
            new Larvae(this)
        }



        if (this.Spawn && this.Spawn.spawning) {
            const spawningCreep = Game.creeps[this.Spawn.spawning.name];
            this.Spawn.room.visual.text(
                '🛠️' + spawningCreep.memory.role,
                this.Spawn.pos.x + 1,
                this.Spawn.pos.y,
                { align: 'left', opacity: 0.8 });
        }
    }
}
