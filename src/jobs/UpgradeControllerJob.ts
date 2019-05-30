import { UPGRADER } from './../Hatchery';
import { PathStyle } from './MovementPathStyles';
import { IMemoryJob, JobType } from '_lib/interfaces';
import { Dictionary } from 'lodash';
import { Job, JobPriority } from './Job';
import { Role } from 'role/roles';
import { emoji } from '_lib/emoji';
import { getPositions } from 'RoomScanner';



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


        const positions = getPositions(this.controller.room, new Room.Terrain(this.controller.room.name), this.controller.pos, 3)

        const maxCreeps = positions.length + 2 // max potential upgrade positions is 22, so we need to be smart about filling them and how many upgraders we have

        const progress = Math.floor(((this.controller.progress) / this.controller.progressTotal) * 100)
        if (this.controller.room) {
            this.controller.room.visual.text(
                `${assignedCreeps} / ${maxCreeps} ⚡ ${progress}%`,
                this.controller.pos.x + 1,
                this.controller.pos.y,
                { align: 'center', opacity: 0.8 });
        }

        const energyPercentage = this.controller.room.energyAvailable / this.controller.room.energyCapacityAvailable
        if (assignedCreeps < maxCreeps && energyPercentage > 0.25) {
            if (assignedCreeps === 0) {
                this.memory.priority = JobPriority.High
            }
            else {
                // if ((assignedCreeps / maxCreeps) >= 0.25 && this.memory.priority >= JobPriority.Medium) {
                this.memory.priority = JobPriority.Low
                // }
            }

            // TODO: should the job be responsible for finding creeps to solve the task? I don't think so
            // find creep that can solve task currently all our creeps can solve all tasks, this needs to be specialized
            // when suddenly ~90 workers are needed because of the high max, everything gets converted to upgraders
            let neededWorkers = maxCreeps - assignedCreeps

            // should probably change role, the role of the creep depends on its body configuration?
            neededWorkers = super.assign(neededWorkers, this.memory, Role.upgrader)

            // Do we already have requests for this?
            super.requestHatch(neededWorkers, UPGRADER, this.memory.priority)
        }

        super.run((creep) => {
            upgradeControllerCreep.run(this.controller, creep)
            // This was a silly idea, to handle the emergency of having no harvesters, we also need to check if we in fact have no harvesters, not just if our energy is low
            //
            // creep.say(emoji.lightning)
            // if (energyPercentage < 0.30 && released < maxRelease) {
            //     creep.memory.role = Role.Larvae // do we need something else than roles to describe the purpose of the creep?
            //     creep.memory.unemployed = true
            //     creep.say("U Released")
            //     this.memory.creeps = this.memory.creeps.filter(creepId => creepId !== creep.id);
            //     // delete this.Creeps[creep.id]
            //     released++
            // }
        })
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
