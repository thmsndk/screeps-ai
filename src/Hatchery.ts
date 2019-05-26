import { RoomScanner } from './RoomScanner';
import { Larvae } from './Larvae';

const roomScanner = new RoomScanner()

export class Hatchery {
    public Spawn: StructureSpawn;

    constructor(spawn?: string) {
        if (!spawn) {
            spawn = "Spawn1"
        }
        this.Spawn = Game.spawns[spawn]
    }

    public run() {

        roomScanner.scan(this.Spawn.room)

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
        if (/*Object.keys(Game.creeps).length < population && */!spawning) {
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
