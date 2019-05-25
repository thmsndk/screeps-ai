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
            var sources = creep.room.find(FIND_SOURCES);
            if (creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
                creep.moveTo(sources[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
        else {
            var targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType == STRUCTURE_EXTENSION ||
                        structure.structureType == STRUCTURE_SPAWN ||
                        structure.structureType == STRUCTURE_TOWER) && structure.energy < structure.energyCapacity;
                }
            });

            if (targets.length > 0) {

                if (creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
        }
    }
};
