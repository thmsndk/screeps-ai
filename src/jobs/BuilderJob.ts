import { PathStyle } from './MovementPathStyles';
import { IMemoryJob, JobType } from '_lib/interfaces';
import { Dictionary } from 'lodash';
import { Job } from './Job';
import { Role } from 'role/roles';
import { emoji } from '_lib/emoji';



export class BuilderJob extends Job {
    public constructionSite: ConstructionSite
    public memory: IMemoryJob;
    constructor(constructionSite: ConstructionSite, memory?: IMemoryJob, creeps?: Dictionary<Creep>) {
        super(JobType.Building, constructionSite.id, creeps)
        this.constructionSite = constructionSite

        if (!memory) {
            memory = { type: JobType.Building, target: constructionSite.id, creeps: [] }; // TODO: move down into job, requires refactoring of other stuff
            Memory.jobs.push(memory); // "Seralize job" TODO: change structure to a dictionary per jobType and a list
        }

        this.memory = memory



        if (creeps) {
            this.memory.creeps = Object.keys(creeps)
        }
    }

    public run() {

        const assignedCreeps = Object.keys(this.Creeps).length;

        const maxCreeps = 100
        if (assignedCreeps < maxCreeps) {
            // TODO: should the job be responsible for finding creeps to solve the task? I don't think so
            // find creep that can solve task currently all our creeps can solve all tasks, this needs to be specialized
            const neededWorkers = maxCreeps - assignedCreeps
            const unemployed = _.filter(Game.creeps, (creep) => creep.memory.unemployed)
            const creepsToEmploy = unemployed.slice(0, unemployed.length >= neededWorkers ? neededWorkers : unemployed.length);

            creepsToEmploy.forEach(creep => {
                if (!this.Creeps[creep.id]) {
                    creep.memory.role = Role.upgrader
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
                jobCreep.run(this.constructionSite, creep)
                // creep.say(emoji.lightning)
                // TODO: when job is finished release creep
            }
        }
    }
}

// tslint:disable-next-line: max-classes-per-file
class BuilderCreep {
    run(constructionSite: ConstructionSite, creep: Creep) {

        // TODO:
        if (creep.memory.building && creep.carry.energy === 0) {
            creep.memory.building = false;
            creep.say('🔄 withdraw ');
        }

        if (!creep.memory.building && creep.carry.energy === creep.carryCapacity) {
            creep.memory.building = true;
            creep.say('🚧 build');
        }

        if (creep.memory.building) {
            if (creep.build(constructionSite) === ERR_NOT_IN_RANGE) {
                creep.say('🚧');
                creep.moveTo(constructionSite, { visualizePathStyle: PathStyle.Construction });
            }
        }
        else {

            const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => {
                    switch (structure.structureType) {
                        case STRUCTURE_CONTAINER:
                            const container = structure as StructureContainer
                            return _.sum(container.store) >= creep.carryCapacity
                        case STRUCTURE_EXTENSION:
                            const extension = structure as StructureExtension
                            return extension.energy >= creep.carryCapacity
                        case STRUCTURE_SPAWN:
                            const spawn = structure as StructureSpawn
                            return spawn.energy >= creep.carryCapacity
                        case STRUCTURE_TOWER:
                            const tower = structure as StructureTower
                            return tower.energy >= creep.carryCapacity
                    }

                    return false
                }
            });

            if (target) {
                if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: PathStyle.Collection });
                }
            }
            // do not fallback to mining
            // else {
            //     // creep.say('🔄 harvest');
            //     let sources = creep.room.find(FIND_SOURCES);
            //     if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
            //         creep.moveTo(sources[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            //     }
            // }
        }
    }

}

const jobCreep = new BuilderCreep();
