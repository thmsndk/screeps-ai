declare global { interface CreepMemory { harvest: boolean } }

export class RoleHarvester {

    run(creep: Creep) {

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

            const sources = creep.room.find(FIND_SOURCES, {
                filter: (source) => {
                    if (creep.memory.target) {
                        return source.id === creep.memory.target
                    }

                    return true
                }
            })

            if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(sources[0], { visualizePathStyle: { stroke: '#ffaa00' } });
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
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
        }
    }
};
