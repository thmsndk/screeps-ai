import { PathStyle } from './MovementPathStyles';
import { IMemoryJob, JobType } from '_lib/interfaces';
import { Dictionary } from 'lodash';
import { Job } from './Job';
import { Role } from 'role/roles';
import { emoji } from '_lib/emoji';



export class UpgradeControllerJob extends Job {
    public controller: StructureController
    public memory: IMemoryJob;
    constructor(controller: StructureController, memory: IMemoryJob, creeps?: Dictionary<Creep>) {
        super(JobType.UpgradeController, controller.id, creeps)
        this.controller = controller
        this.memory = memory

        if (creeps) {
            this.memory.creeps = Object.keys(creeps)
        }
    }

    public run() {

        const assignedCreeps = Object.keys(this.Creeps).length;

        const maxCreeps = 10
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
                upgradeControllerCreep.run(this.controller, creep)
                // creep.say(emoji.lightning)
            }
        }
    }
}

// tslint:disable-next-line: max-classes-per-file
class UpgradeControllerCreep {
    run(controller: StructureController, creep: Creep) {
        // TODO: General upgrade logic should perhaps exist in a base class?
        if (creep.memory.upgrading && creep.carry.energy === 0) {
            creep.memory.upgrading = false;
            creep.say('🔄 withdraw');
        }
        if (!creep.memory.upgrading && creep.carry.energy === creep.carryCapacity) {
            creep.memory.upgrading = true;
            creep.say('⚡ upgrade');
        }

        if (creep.memory.upgrading && controller) {
            if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, { visualizePathStyle: PathStyle.UpgradeController });
            }
        }
        else {
            var target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => {
                    switch (structure.structureType) {
                        case STRUCTURE_CONTAINER:
                            const container = structure as StructureContainer
                            return container.store[RESOURCE_ENERGY] >= creep.carryCapacity
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
            // DO NOT FALL BACK TO harvesting from sources
            // else {
            //     //creep.say('🔄 harvest');
            //     var sources = creep.room.find(FIND_SOURCES);
            //     if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
            //         creep.moveTo(sources[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            //     }
            // }
        }
    }

}

const upgradeControllerCreep = new UpgradeControllerCreep();
