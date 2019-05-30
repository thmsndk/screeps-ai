import { MemoryHatchRequest } from './Hatchery';
import PriorityQueue from "ts-priority-queue";
import { Role } from 'role/roles';
import { Dictionary } from 'lodash';



// Hatchery"Job"?
// We need a list of hatcheries accessable by ?? roomName? what if there are multiple hatcheries in a room
// Do we have one global hatchery, or a hatchery per spawn? how do they coordinate? If we can have multiple spawns in a room, how do we handle that?

const comparePriority = (a: Priority, b: Priority) => b.priority - a.priority

export class Hatchery {
    public Spawn: StructureSpawn;
    private requests: PriorityQueue<HatchRequest>

    private memory?: Dictionary<MemoryHatchRequest[]>

    constructor(spawn?: StructureSpawn | string) {
        if (!spawn) {
            throw new Error("spawn can not be undefined");
        }

        if (typeof spawn === "string") {
            this.Spawn = Game.spawns[spawn]
        } else {
            this.Spawn = spawn
        }

        this.memory = this.Spawn.memory.requests

        let allRequests: MemoryHatchRequest[] = []
        if (this.memory) {
            for (const target in this.memory) {
                if (this.memory.hasOwnProperty(target)) {
                    const requests = this.memory[target];
                    allRequests = allRequests.concat(_.values(requests))
                }
            }
        }


        this.requests = new PriorityQueue({ comparator: comparePriority, initialValues: allRequests })
    }

    public queue(request: HatchRequest) {
        this.requests.queue(request)

        if (!this.Spawn.memory.requests) {
            this.Spawn.memory.requests = {}
        }

        let target = this.Spawn.memory.requests[request.target]
        if (!target) {
            target = this.Spawn.memory.requests[request.target] = []
        }

        target.push(request)
    }

    public dequeue(): HatchRequest | null {
        if (this.requests.length > 0) {
            const request = this.requests.dequeue()

            if (!this.Spawn.memory.requests) {
                this.Spawn.memory.requests = {}
            }

            if (this.memory) {
                for (const target in this.memory) {
                    if (this.memory.hasOwnProperty(target)) {
                        const requests = this.memory[target];
                        const index = requests.findIndex(r => r.mutation === request.mutation && r.priority === request.priority)
                        this.memory[target] = requests.splice(index, 1)
                    }
                }
            }

            return request
        }

        return null
    }

    /**
     * Get current requests for the specific mutation for the specific target
     */
    public getRequests(target: string, mutation: CreepMutations) {
        if (this.memory) {
            const requests = this.memory[target];
            if (requests) {
                return requests.filter(r => r.mutation === mutation).length
            }

        }

        return 0
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

export const CLAIMER = 'claimer'
export const DEFENDER = 'defender'
export const HARVESTER = 'harvester'
export const HOLD = 'hold'
export const MOVER = 'mover'
export const RANGER = 'ranger'
export const WORKER = 'worker'
export const HAULER = 'hauler'
export const UPGRADER = 'upgrader'

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
        requests?: Dictionary<MemoryHatchRequest[]>
    }
}

// TODO: move to somewhere common
interface Priority {
    priority: number
}

// TODO: unit tests for hatchery
export interface MemoryHatchRequest extends Priority {
    mutation: CreepMutations
    target: string

}

export interface HatchRequest extends MemoryHatchRequest {
    // new (memory: MemoryHatchRequest): any;

}
