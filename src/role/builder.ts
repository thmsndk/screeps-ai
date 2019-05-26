// https://github.com/screepers/typed-screeps/issues/27
declare global { interface CreepMemory { building: boolean } }

export class RoleBuilder {

    public run(creep: Creep): void {

        if (creep.memory.building && creep.carry.energy === 0) {
            creep.memory.building = false;
            creep.say('🔄 withdraw ');
        }
        if (!creep.memory.building && creep.carry.energy === creep.carryCapacity) {
            creep.memory.building = true;
            creep.say('🚧 build');
        }

        if (creep.memory.building) {
            const targets = creep.room.find(FIND_CONSTRUCTION_SITES);
            if (targets.length) {
                if (creep.build(targets[0]) === ERR_NOT_IN_RANGE) {
                    creep.say('🚧');
                    creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
        }
        else {

            // TODO pull energy from spawn?
            // http://docs.screeps.com/api/#Creep.withdraw

            // todo find closest source
            // http://docs.screeps.com/api/#PathFinder
            const targets = creep.room.find(FIND_STRUCTURES, {
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

            if (targets.length > 0) {
                if (creep.withdraw(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
            // do not fallback mining
            // else {
            //     // creep.say('🔄 harvest');
            //     let sources = creep.room.find(FIND_SOURCES);
            //     if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
            //         creep.moveTo(sources[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            //     }
            // }
        }
    }
};
