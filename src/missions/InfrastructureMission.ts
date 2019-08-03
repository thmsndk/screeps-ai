import { TaskWithdraw } from "./../task/Tasks/TaskWithdraw"
import { getPositions } from "RoomScanner"
import { Tasks } from "../task/Tasks"
import { Mission } from "./Mission"
import { Dictionary } from "lodash"
import { InfraStructurePositionMemory } from "../RoomPlanner/InfraStructurePositionMemory"
import { InfraStructureLayerMemory } from "../RoomPlanner/InfraStructureLayerMemory"
import { InfrastructureMissionMemory } from "./InfrastructureMissionMemory"
import { InfrastructureLayer } from "../RoomPlanner/InfrastructureLayer"
import { Infrastructure } from "RoomPlanner/Infrastructure"

interface InfraStructureMissionConstructor {
  memory?: InfrastructureMissionMemory
  infrastructure: Infrastructure
}

// tslint:disable-next-line: max-classes-per-file
export class InfraStructureMission extends Mission {
  public memory?: InfrastructureMissionMemory // TODO: Private

  public creeps!: Dictionary<Creep>

  private infrastructure: Infrastructure

  constructor(parameters: InfraStructureMissionConstructor) {
    super(parameters ? parameters.memory : undefined)
    this.infrastructure = parameters.infrastructure

    const creeps = {} as Dictionary<Creep>
    if (parameters.memory) {
      if (parameters.memory.creeps) {
        Object.values(parameters.memory.creeps).forEach(creepId => {
          const creep = Game.getObjectById<Creep>(creepId)
          if (creep) {
            creeps[creepId] = creep
          }
        })
      }
    }

    this.creeps = creeps
  }

  public addCreep(creep: Creep) {
    if (this.memory) {
      this.memory.creeps.push(creep.id)
    }

    this.creeps[creep.id] = creep
  }

  public distributeTasks() {
    const idleCreeps = _.filter(this.creeps, creep => creep.isIdle)
    idleCreeps.forEach(creep => {
      // We should probably have a PriortyQueue of construction sites
      this.infrastructure.Layers.forEach((layer, index) => {
        // TODO: implement targetedBy and handle coop tasks, find closest creep, validate work parts, and other shenanigans
        // TODO: when construction site is done, we need to mark it as such with a reference to the structure instead
        const position = layer.Positions.find(p => !!p.id && !!Game.getObjectById(p.id))
        if (position && position.constructionSite) {
          creep.task = Tasks.build(position.constructionSite)
        }
      })
    })
  }

  public run() {
    Object.values(this.creeps).forEach(creep => {
      if (creep.carry.energy === 0) {
        // const resource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES)
        // chain dropped resources in a close quarter
        //

        // if (resource) {
        //   if (resource && creep.pickup(resource) === ERR_NOT_IN_RANGE) {
        //     creep.moveTo(resource, { visualizePathStyle: PathStyle.Hauling })
        //   }
        // } else {
        const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
          filter: structure => {
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
              case STRUCTURE_STORAGE:
                const storage = structure as StructureStorage
                return storage.store[RESOURCE_ENERGY] < storage.storeCapacity
            }

            return false
          }
        }) as StructureContainer | StructureExtension | StructureSpawn | StructureTower | StructureStorage

        if (target) {
          const withdraw = Tasks.withdraw(target, RESOURCE_ENERGY, creep.carryCapacity - creep.carry.energy)

          if (creep.task && creep.task.name !== TaskWithdraw.taskName) {
            creep.task = Tasks.chain([withdraw, creep.task])
          } else if (withdraw) {
            creep.task = withdraw
          }
        }
      }

      creep.run()
    })
  }
}
