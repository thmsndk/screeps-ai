import { CreepMutations } from './Hatchery';
import PriorityQueue from "ts-priority-queue";
import { Role } from 'role/roles';



// Hatchery"Job"?
// We need a list of hatcheries accessable by ?? roomName? what if there are multiple hatcheries in a room
// Do we have one global hatchery, or a hatchery per spawn? how do they coordinate? If we can have multiple spawns in a room, how do we handle that?

const comparePriority = (a: Priority, b: Priority) => b.priority - a.priority

export class Hatchery {
    public Spawn: StructureSpawn;
    private requests: PriorityQueue<HatchRequest>

    constructor(spawn?: string) {
        if (!spawn) {
            spawn = "Spawn1"
        }

        this.Spawn = Game.spawns[spawn]

        this.requests = new PriorityQueue({ comparator: comparePriority, initialValues: this.Spawn.memory.requests })
    }

    public queue(request: HatchRequest) {
        this.requests.queue(request)

        if (!this.Spawn.memory.requests) {
            this.Spawn.memory.requests = []
        }

        this.Spawn.memory.requests.push(request)
    }

    public dequeue(): HatchRequest | null {
        if (this.requests.length > 0) {
            const request = this.requests.dequeue()

            if (!this.Spawn.memory.requests) {
                this.Spawn.memory.requests = []
            }

            const index = this.Spawn.memory.requests.findIndex(r => r.mutation !== request.mutation && r.priority !== request.priority)
            delete this.Spawn.memory.requests[index]

            return request
        }

        return null
    }

    public run() {
        // TODO: cancelation of in progress spawn if next order is a HIGH priority order?

        let spawning = !!this.Spawn.spawning; // code runs so fast that spawncreep does not update spawning in this tick?
        // const maxPopulation = 45
        // const population = Object.keys(Game.creeps).length
        if (!spawning /*&& population < maxPopulation*/) {

            const next = this.dequeue()
            if (next && !this.hatch(next.mutation)) {
                this.queue(next)
            }
        }

        // RoomVisual
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

    private hatch(mutation: CreepMutations) {

        const body = this.mutate(mutation)

        if (this.Spawn.room.energyAvailable >= body.cost) {

            const creepName = `${this.Spawn.room.name} ${mutation} ${Game.time}`;
            const result = this.Spawn.spawnCreep(body.parts, creepName,
                { memory: { role: Role.Larvae, cost: body.cost, unemployed: true } } as SpawnOptions);

            if (result === OK) {
                console.log('Spawning new Larvae: ' + creepName + ' ' + body.cost);
                return true
            }
        }

        return false

        // * OK	0 The operation has been scheduled successfully.
        // * ERR_NOT_OWNER - 1 You are not the owner of this spawn.
        // * ERR_NAME_EXISTS - 3 There is a creep with the same name already.
        // * ERR_BUSY - 4 The spawn is already in process of spawning another creep.
        // * ERR_NOT_ENOUGH_ENERGY - 6 The spawn and its extensions contain not enough energy to create a creep with the given body.
        // * ERR_INVALID_ARGS - 10 Body is not properly described or name was not provided.
        // * ERR_RCL_NOT_ENOUGH - 14 Your Room Controller level is insufficient to use this spawn.

        // https://docs.screeps.com/api/#Creep
    }

    private mutate(mutation: CreepMutations, spendingCap?: number): MutatedBody {

        if (!spendingCap) {
            spendingCap = this.Spawn.room.energyCapacityAvailable
        }

        let body = [].concat(bodyMutations[mutation] as never[]) as BodyPartConstant[]

        // how much energy do we have? how much can we mutate?

        let cost = bodyCost(body)

        const extension = bodyExtensions[mutation]
        const extensionCost = bodyCost(extension)

        // (Max - bodyCost) / extensionCost = possible extensions
        const possibleExtensions = Math.floor((spendingCap - cost) / extensionCost)

        for (let index = 0; index < possibleExtensions; index++) {
            body = body.concat(extension)
        }

        // Make patterns with the body parts when inspecting them in the ui? xD

        return { parts: body, cost: cost + (extensionCost * possibleExtensions) }
    }
}

interface MutatedBody {
    parts: BodyPartConstant[]
    cost: number
}

function bodyCost(body: BodyPartConstant[]) {
    return body.reduce((cost, part) => {
        return cost + BODYPART_COST[part];
    }, 0);
}

export type CreepMutations =
    CLAIMER
    | DEFENDER
    | HARVESTER
    | HOLD
    | MOVER
    | RANGER
    | WORKER
    | HAULER
    | UPGRADER

type CLAIMER = 'claimer'
type DEFENDER = 'defender'
type HARVESTER = 'harvester'
type HOLD = 'hold'
type MOVER = 'mover'
type RANGER = 'ranger'
type WORKER = 'worker'
type HAULER = 'hauler'
type UPGRADER = 'upgrader'

interface BodyMutations {
    [mutation: string]: BodyPartConstant[]
}

const bodyMutations = {
    'claimer': [CLAIM, MOVE],
    'defender': [RANGED_ATTACK, MOVE],
    'harvester': [WORK, WORK, CARRY, MOVE],
    // 'hold': [CLAIM, CLAIM, MOVE, MOVE],
    'mover': [CARRY, MOVE],
    // 'bunkerMover': [MOVE, CARRY],
    'ranger': [RANGED_ATTACK, TOUGH, MOVE, MOVE],
    'worker': [WORK, CARRY, MOVE, MOVE],
    'hauler': [CARRY, MOVE],
    'upgrader': [WORK, CARRY, MOVE, MOVE]
} as BodyMutations

const bodyExtensions = {
    'claimer': [MOVE],
    'defender': [RANGED_ATTACK, MOVE],
    'harvester': [WORK, MOVE],
    // 'hold': [],
    'mover': [CARRY, MOVE],
    // 'bunkerMover': [CARRY],
    'ranger': [RANGED_ATTACK, TOUGH, MOVE, MOVE, HEAL],
    'worker': [WORK, CARRY, MOVE, MOVE],
    'hauler': [CARRY, MOVE],
    'upgrader': [WORK, CARRY, MOVE]
} as BodyMutations

declare global {
    interface SpawnMemory {
        requests?: MemoryHatchRequest[]
    }
}

// TODO: move to somewhere common
interface Priority {
    priority: number
}

// TODO: unit tests for hatchery
export interface MemoryHatchRequest extends Priority {
    mutation: CreepMutations

}

export interface HatchRequest extends MemoryHatchRequest {
    // new (memory: MemoryHatchRequest): any;

}
