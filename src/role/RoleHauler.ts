declare global { interface CreepMemory { harvest: boolean } }

export class RoleHauler {

    run(creep: Creep) {

        // Haul from container to spawn

        if (creep.carry.energy < creep.carryCapacity) {
            if (creep.memory.harvest === false) {
                creep.memory.harvest = true;
                creep.say('🔄 Withdraw');
            }
        }
        else {
            if (creep.memory.harvest === true) {
                creep.memory.harvest = false;
                creep.say('🔄 Transfer');
            }
        }

        if (creep.memory.harvest) {
            // creep.say('🔄');
            const targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {

                    switch (structure.structureType) {
                        case STRUCTURE_CONTAINER:
                            const container = structure as StructureContainer
                            const amount = _.sum(container.store)
                            return amount === container.storeCapacity || amount > container.storeCapacity / 2
                    }

                    return false
                }
            });

            if (creep.withdraw(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
        else {
            const targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {

                    switch (structure.structureType) {
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

            if (targets.length > 0) {

                if (creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
        }
    }
};
