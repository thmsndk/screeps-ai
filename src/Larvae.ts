import { Role, RoleConstant } from 'role/roles'
import { Hatchery } from './Hatchery'
import { emoji } from '_lib/emoji'

declare global {
  interface CreepMemory {
    role: string
    target: string
  }
} // TODO: Role.x,y,z

export class Larvae {
  Creep: Creep | undefined

  constructor(hatchery: Hatchery, creep?: Creep) {
    if (!creep) {
      const creepName = Game.time.toString()
      const result = hatchery.Spawn.spawnCreep([WORK, CARRY, MOVE], creepName, {
        memory: { role: Role.Larvae },
      } as SpawnOptions)

      if (result === OK) {
        console.log('Spawning new Larvae: ' + creepName)
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
      // Let the hatcherydriven and job driven system coexist
      if (this.Creep.memory.role === Role.Worker) {
        return
      }

      let newRole: RoleConstant = this.Creep.memory.role as RoleConstant

      const harvesters = _.filter(
        Game.creeps,
        creep => creep.memory.role === Role.harvester
      )
      const upgraders = _.filter(
        Game.creeps,
        creep => creep.memory.role === Role.upgrader
      )
      const builders = _.filter(
        Game.creeps,
        creep => creep.memory.role === Role.builder
      )

      // TODO: we need to mutate based on genereal missions / priorities not a split population, what happens when a creep moves to another room, and then gets mutated to a builder?
      // We also need to mutate depending on what body the creep has, we also need to determine what kind of body it should have when we spawn it
      // determine if we need more harvesters
      // 1 harvester on each node, as minimum
      // builders if anything needs to be build
      // upgraders should always be upgrading spawn?
      // we should only mutate if there is nothing to do as our current role
      // if we are at max energy, we definately need upgrades and other things to utilize it
      // room.energyAvailable,  do some math based on the builders and how much energy they can extract
      // TODO: how many creeps can harvest each source node?

      // Look at directives / missions, what missions needs agents, and what do they need?

      // Mining mission for each source? analyse each node and determine how many harvesters we can have on it
      for (const sourceId in this.Creep.room.memory.sources) {
        if (this.Creep.room.memory.sources.hasOwnProperty(sourceId)) {
          const sourceMemory = this.Creep.room.memory.sources[sourceId]

          if (
            sourceMemory &&
            sourceMemory.miningPositions &&
            sourceMemory.assignedCreepIds &&
            sourceMemory.miningPositions.length >
              sourceMemory.assignedCreepIds.length &&
            !this.Creep.memory.target
          ) {
            console.log(
              `${this.Creep.name} is becoming a harvester for ${sourceId}`
            )
            this.Creep.say(`harvester for ${sourceId}`)
            sourceMemory.assignedCreepIds.push(this.Creep.id)
            newRole = Role.harvester
            this.Creep.memory.target = sourceId
            break
          }
        }
      }

      // get total population, compare it with required harvesters, split the rest of the population between builders and upgraders

      // Convert from harvester to builder
      if (this.Creep.memory.target) {
        const sourceMemory = this.Creep.room.memory.sources[
          this.Creep.memory.target
        ]
        if (
          !_.any(
            sourceMemory.assignedCreepIds,
            creepId => this.Creep && creepId === this.Creep.id
          )
        ) {
          // What criteria defines how many builders we need?
          // if (builders.length < 2) {
          delete this.Creep.memory.target
          newRole = Role.builder
          // }
        }
      }
      const populationWithoutHarvester =
        Object.keys(Game.creeps).length - this.Creep.room.memory.miningPositions
      const upgraderCount = populationWithoutHarvester / 2
      const builderCount = populationWithoutHarvester / 2

      if (
        upgraders.length < upgraderCount &&
        this.Creep.memory.role !== Role.harvester
      ) {
        newRole = Role.upgrader
      } else if (
        builders.length < builderCount &&
        this.Creep.memory.role !== Role.harvester
      ) {
        newRole = Role.builder
      }

      if (this.Creep.memory.role !== newRole) {
        // console.log(`Mutating to ${newRole} from ${this.Creep.memory.role}`)
        this.Creep.memory.role = newRole
      }

      if (this.Creep.memory.role === Role.Larvae) {
        this.Creep.say(`${emoji.bug}`)
      }
    }
  }
}
