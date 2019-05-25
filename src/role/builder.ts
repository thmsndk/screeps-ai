﻿// https://github.com/screepers/typed-screeps/issues/27
declare global { interface CreepMemory { building: boolean } }

export class RoleBuilder {

    run(creep: Creep): void {

        if (creep.memory.building && creep.carry.energy == 0) {
            creep.memory.building = false;
            creep.say('🔄 withdraw');
        }
        if (!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
            creep.memory.building = true;
            creep.say('🚧 build');
        }

        if (creep.memory.building) {
            let targets = creep.room.find(FIND_CONSTRUCTION_SITES);
            if (targets.length) {
                if (creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
        }
        else {

            // TODO pull energy from spawn?
            // http://docs.screeps.com/api/#Creep.withdraw

            // todo find closest source
            // http://docs.screeps.com/api/#PathFinder
            let targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure: StructureExtension | StructureSpawn) => {
                    return (
                        (structure.structureType == STRUCTURE_EXTENSION && structure.energy >= creep.carryCapacity) ||
                        (structure.structureType == STRUCTURE_SPAWN && structure.energy == structure.energyCapacity)
                    );
                }
            });

            if (targets.length > 0) {
                if (creep.withdraw(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
            else {
                //creep.say('🔄 harvest');
                var sources = creep.room.find(FIND_SOURCES);
                if (creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(sources[0], { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }
        }
    }
};