import { IMemoryJob, JobType } from '_lib/interfaces';
import { Dictionary } from 'lodash';
import { ISourceMemory } from 'RoomScanner';
import { Job } from './Job';
import { Role } from 'role/roles';
import { emoji } from '_lib/emoji';

export class MiningJob extends Job {
    public source: Source
    public sourceMemory: ISourceMemory;
    public memory: IMemoryJob;
    constructor(source: Source, memory: IMemoryJob, sourceMemory: ISourceMemory, creeps?: Dictionary<Creep>) {
        super(JobType.Mining, source.id, creeps)
        this.source = source
        this.sourceMemory = sourceMemory
        this.memory = memory

        if (creeps) {
            this.memory.creeps = Object.keys(creeps)
        }
    }

    public run() {

        const assignedCreeps = Object.keys(this.Creeps).length;

        if (assignedCreeps < this.sourceMemory.miningPositions.length) {// TODO memory should be private and we should store it in object
            // find creep that can solve task currently all our creeps can solve all tasks, this needs to be specialized
            const neededWorkers = this.sourceMemory.miningPositions.length - assignedCreeps
            const unemployed = _.filter(Game.creeps, (creep) => (creep.memory.unemployed === undefined && creep.memory.role === Role.harvester) || creep.memory.unemployed)
            const creepsToEmploy = unemployed.slice(0, unemployed.length >= neededWorkers ? neededWorkers : unemployed.length);

            creepsToEmploy.forEach(creep => {
                if (!this.Creeps[creep.id]) {
                    creep.memory.role = Role.Worker
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
                // TODO Migrate logic to the job
                roleHarvester.run(creep, this.source)
                creep.say(emoji.construction_worker)
            }
        }
    }
}


// tslint:disable-next-line: max-classes-per-file
class RoleHarvester {

    run(creep: Creep, source: Source) {

        // TODO: what if creep will expire before reaching source and another one is closer, should it go there?

        if (creep.carry.energy < creep.carryCapacity) {
            creep.memory.harvest = true;
            //creep.say('🔄 Harvest');
        }
        else {
            creep.memory.harvest = false;
            //creep.say('🔄 Transfer');
        }

        if (creep.memory.harvest) {
            creep.say('🔄');

            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, { visualizePathStyle: { stroke: '#0000FF' } });
            }
        }
        else {
            var target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => {

                    switch (structure.structureType) {
                        case STRUCTURE_CONTAINER:
                            const container = structure as StructureContainer
                            return _.sum(container.store) < container.storeCapacity
                        case STRUCTURE_EXTENSION:
                            const extension = structure as StructureExtension
                            return extension.energy < extension.energyCapacity
                        case STRUCTURE_SPAWN:
                            const spawn = structure as StructureSpawn
                            return spawn.energy < spawn.energyCapacity
                        case STRUCTURE_TOWER:
                            const tower = structure as StructureTower
                            return tower.energy < tower.energyCapacity
                    }

                    return false
                }
            });

            if (target) {

                if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#FFFF00' } });
                }
            }
        }
    }
};

const roleHarvester = new RoleHarvester();