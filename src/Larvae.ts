import { Role, RoleConstant } from 'role/roles';
import { Hatchery } from './Hatchery';

declare global { interface CreepMemory { role: string } } // TODO: Role.x,y,z

export class Larvae {
    Creep: Creep | undefined;

    constructor(hatchery: Hatchery, creep?: Creep) {
        if (!creep) {
            const creepName = Game.time.toString();
            const result = hatchery.Spawn.spawnCreep([WORK, CARRY, MOVE], creepName,
                { memory: { role: Role.Larvae } } as SpawnOptions);

            if (result === OK) {
                console.log('Spawning new Larvae: ' + creepName);
            }

            // * OK	0 The operation has been scheduled successfully.
            // * ERR_NOT_OWNER - 1 You are not the owner of this spawn.
            // * ERR_NAME_EXISTS - 3 There is a creep with the same name already.
            // * ERR_BUSY - 4 The spawn is already in process of spawning another creep.
            // * ERR_NOT_ENOUGH_ENERGY - 6 The spawn and its extensions contain not enough energy to create a creep with the given body.
            // * ERR_INVALID_ARGS - 10 Body is not properly described or name was not provided.
            // * ERR_RCL_NOT_ENOUGH - 14 Your Room Controller level is insufficient to use this spawn.
        }

        this.Creep = creep
    }

    public mutate() {
        if (this.Creep) {
            let newRole: RoleConstant = Role.Larvae

            const harvesters = _.filter(Game.creeps, (creep) => creep.memory.role === Role.harvester);
            const upgraders = _.filter(Game.creeps, (creep) => creep.memory.role === Role.upgrader);
            const builders = _.filter(Game.creeps, (creep) => creep.memory.role === Role.builder);

            if (harvesters.length < 3) {
                newRole = Role.harvester
            }

            if (upgraders.length < 5) {
                newRole = Role.upgrader
            }

            if (builders.length < 2) {
                newRole = Role.builder
            }


            if (this.Creep.memory.role !== newRole) {
                console.log(`Mutating to ${newRole}`)
                this.Creep.memory.role = newRole
            }

        }
    }
}
