import { emoji } from '_lib/emoji';
import { IMemoryJob, JobType } from '_lib/interfaces';
import { Dictionary } from 'lodash';
import { Role } from 'role/roles';
import { ISourceMemory } from 'RoomScanner';
import { Job, JobPriority } from './Job';
import { PathStyle } from './MovementPathStyles';

/** The purpose of this job is to haul energy dropped from miners to spawn and extensions
 * could 1 hauler job support more than 1 node? depends on distance & miningspots & attached miners
 *
*/
export class MiningHaulingJob extends Job {
    public source: Source
    public sourceMemory: ISourceMemory;
    public memory: IMemoryJob;
    constructor(source: Source, memory: IMemoryJob, sourceMemory: ISourceMemory, creeps?: Dictionary<Creep>) {
        super(JobType.Hauling, source.id, creeps)
        this.source = source
        this.sourceMemory = sourceMemory
        this.memory = memory

        if (creeps) {
            this.memory.creeps = Object.keys(creeps)
        }
    }

    public run() {

        const assignedCreeps = Object.keys(this.Creeps).length;

        // We need to assign a hauler after we've assigned a miner, the behaviour of the creep should change depending on wether or not we have a hauler assigned
        // no need to fill  the rest of the mining positions before we have a hauler

        const maxHaulers = 1
        if (assignedCreeps === 0) {
            this.memory.priority = JobPriority.High
        }
        else {
            this.memory.priority = JobPriority.Medium
        }

        if (assignedCreeps < maxHaulers) {
            // find creep that can solve task currently all our creeps can solve all tasks, this needs to be specialized
            const neededWorkers = maxHaulers - assignedCreeps
            const unemployed = _.filter(Game.creeps, (creep) => creep.memory.unemployed)
            const creepsToEmploy = unemployed.slice(0, unemployed.length >= neededWorkers ? neededWorkers : unemployed.length);

            creepsToEmploy.forEach(creep => {
                if (!this.Creeps[creep.id]) {
                    creep.memory.role = Role.Larvae // should probably change this type, the role of the creep depends on its body configuration
                    creep.memory.unemployed = false
                    this.Creeps[creep.id] = creep
                    // persist to miningjob memory
                    if (this.memory.creeps) {
                        this.memory.creeps.push(creep.id)
                    }
                }
            })

            // if creep can't be found, request a creep that can to be constructed, should not keep piling on requests
            // TODO: what if creep expired and we need a new creep?
        }

        for (const name in this.Creeps) {
            if (this.Creeps.hasOwnProperty(name)) {
                const creep = this.Creeps[name];
                haulingCreep.run(this, creep, this.source)
            }
        }
    }
}


// tslint:disable-next-line: max-classes-per-file
class HaulingCreep {

    run(job: MiningHaulingJob, creep: Creep, source: Source) {

        // TODO: what if creep will expire before reaching source and another one is closer, should it go there?

        const collecting = creep.carry.energy < creep.carryCapacity

        if (collecting) {
            // creep.say('🔄');
            // find dropped resources near mine, put into container
            // when no more dropped resources or container full, pull from container and move back to spawn
            // first iteration we just pull from container and move to spawn & extensions, makes the initial spawn kinda broken though, cause I won't have containers as fast
            // we also need to make sure it does not pickup resources from a container, and then puts them back in, getting stuck, we could persist target in memory
            // const droppedResource
            let resource = source.pos.findClosestByRange(FIND_DROPPED_RESOURCES)
            if (resource) {
                if (resource && creep.pickup(resource) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(resource, { visualizePathStyle: PathStyle.Hauling });
                }
            }
            else {
                const target = source.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => {

                        switch (structure.structureType) {
                            case STRUCTURE_CONTAINER:
                                const container = structure as StructureContainer
                                const amount = _.sum(container.store)
                                return amount > container.storeCapacity / 2
                        }

                        return false
                    }
                });

                // job.memory.target = target ? target.id : undefined

                if (target && creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: PathStyle.Hauling });
                }
            }


        }
        else {
            const target: any = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => {

                    switch (structure.structureType) {
                        case STRUCTURE_EXTENSION:
                            const extension = structure as StructureExtension
                            return extension.energy < extension.energyCapacity
                        case STRUCTURE_SPAWN:
                            const spawn = structure as StructureSpawn
                            return spawn.energy < spawn.energyCapacity

                        // case STRUCTURE_TOWER:
                        //     const tower = structure as StructureTower
                        //     return tower.energy < tower.energyCapacity
                        // case STRUCTURE_CONTAINER:
                        //     const container = structure as StructureContainer
                        //     return structure.id !== job.memory.target && container.store[RESOURCE_ENERGY] < container.storeCapacity

                    }

                    return false
                }
            });

            if (target && creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: PathStyle.Deposit });
            }
        }
    }
};

const haulingCreep = new HaulingCreep();
