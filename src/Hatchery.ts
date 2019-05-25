import { Role } from "role/roles";

export class Hatchery {
    run() {
        const harvesters = _.filter(Game.creeps, (creep) => creep.memory.role === Role.harvester);
        const upgraders = _.filter(Game.creeps, (creep) => creep.memory.role === Role.upgrader);
        const builders = _.filter(Game.creeps, (creep) => creep.memory.role === Role.builder);

        const spawn = Game.spawns.Spawn1

        let spawn1Spawning = !!spawn.spawning; // code runs so fast that spawncreep does not update spawning in this tick?

        if (harvesters.length < 3 && !spawn1Spawning) {
            const newName = 'Harvester' + Game.time;

            spawn1Spawning = true;
            const result = spawn.spawnCreep([WORK, CARRY, MOVE], newName,
                { memory: { role: Role.harvester } } as SpawnOptions);

            if (result === OK) {
                console.log('Spawning new harvester: ' + newName);
            }
        }

        if (upgraders.length < 5 && !spawn1Spawning) {

            spawn1Spawning = true;

            const newName = 'Upgrader' + Game.time;
            const result = spawn.spawnCreep([WORK, CARRY, MOVE], newName,
                { memory: { role: Role.upgrader } } as SpawnOptions);

            if (result === OK) {
                console.log('Spawning new upgrader: ' + newName);
            }

            // * OK	0 The operation has been scheduled successfully.
            // * ERR_NOT_OWNER - 1 You are not the owner of this spawn.
            // * ERR_NAME_EXISTS - 3 There is a creep with the same name already.
            // * ERR_BUSY - 4 The spawn is already in process of spawning another creep.
            // * ERR_NOT_ENOUGH_ENERGY - 6 The spawn and its extensions contain not enough energy to create a creep with the given body.
            // * ERR_INVALID_ARGS - 10 Body is not properly described or name was not provided.
            // * ERR_RCL_NOT_ENOUGH - 14 Your Room Controller level is insufficient to use this spawn.
        }

        if (builders.length < 2 && !spawn1Spawning) {

            spawn1Spawning = true;

            // TODO: no reason to spawn builders if there are nothing to construct
            const newName = 'Builder' + Game.time;

            const result = spawn.spawnCreep([WORK, CARRY, MOVE], newName,
                { memory: { role: Role.builder } } as SpawnOptions);

            if (result === OK) {
                console.log('Spawning new builder: ' + newName);
            }

        }

        const spawn1 = Game.spawns.Spawn1
        if (spawn1 && spawn1.spawning) {
            const spawningCreep = Game.creeps[spawn1.spawning.name];
            spawn1.room.visual.text(
                '🛠️' + spawningCreep.memory.role,
                spawn1.pos.x + 1,
                spawn1.pos.y,
                { align: 'left', opacity: 0.8 });
        }
    }
}
