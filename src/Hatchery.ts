import { Larvae } from './Larvae';
import { Role } from 'role/roles';

const partcost = {
    [MOVE]: 50,
    [WORK]: 100
}

function calculateBodyCost(body: BodyPartConstant[]) {
    return body.reduce((cost, part) => {
        return cost + BODYPART_COST[part];
    }, 0);
}

export class Hatchery {
    public Spawn: StructureSpawn;

    constructor(spawn?: string) {
        if (!spawn) {
            spawn = "Spawn1"
        }
        this.Spawn = Game.spawns[spawn]
    }

    public run() {

        let spawning = !!this.Spawn.spawning; // code runs so fast that spawncreep does not update spawning in this tick?

        if (!spawning) {
            const creepName = Game.time.toString();
            // determine how much energy we have
            // determine what the next creep we need is, hatchery should have a job queued
            // determine what creep we can create for the job.
            let body = [WORK, CARRY, MOVE]
            let body2 = [WORK, WORK, CARRY, CARRY, MOVE, MOVE]
            let creepBody = body

            if (this.Spawn.room.energyAvailable >= calculateBodyCost(body2)) {
                creepBody = body2
            }

            const cost = calculateBodyCost(body)

            if (this.Spawn.room.energyAvailable >= cost) {
                const result = this.Spawn.spawnCreep(creepBody, creepName,
                    { memory: { role: Role.Larvae, cost, unemployed: true } } as SpawnOptions);

                if (result === OK) {
                    console.log('Spawning new Larvae: ' + creepName);
                }
            }
        }

        // * OK	0 The operation has been scheduled successfully.
        // * ERR_NOT_OWNER - 1 You are not the owner of this spawn.
        // * ERR_NAME_EXISTS - 3 There is a creep with the same name already.
        // * ERR_BUSY - 4 The spawn is already in process of spawning another creep.
        // * ERR_NOT_ENOUGH_ENERGY - 6 The spawn and its extensions contain not enough energy to create a creep with the given body.
        // * ERR_INVALID_ARGS - 10 Body is not properly described or name was not provided.
        // * ERR_RCL_NOT_ENOUGH - 14 Your Room Controller level is insufficient to use this spawn.

        // https://docs.screeps.com/api/#Creep

        if (this.Spawn && this.Spawn.spawning) {
            const spawningCreep = Game.creeps[this.Spawn.spawning.name];
            const progress = Math.floor(((this.Spawn.spawning.needTime - this.Spawn.spawning.remainingTime) / this.Spawn.spawning.needTime) * 100)
            this.Spawn.room.visual.text(
                `🛠️ ${spawningCreep.memory.cost} ${progress}%`,
                this.Spawn.pos.x + 1,
                this.Spawn.pos.y,
                { align: 'left', opacity: 0.8 });
        }
        else {

            this.Spawn.room.visual.text(
                `⚡ ${this.Spawn.room.energyAvailable} / ${this.Spawn.room.energyCapacityAvailable}`,
                this.Spawn.pos.x + 1,
                this.Spawn.pos.y,
                { align: 'left', opacity: 0.8 });
        }
    }
}
