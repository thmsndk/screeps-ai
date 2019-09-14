import { Dictionary } from "lodash"
import { Infrastructure } from "RoomPlanner/Infrastructure"
import { derefRoomPosition } from "task/utilities/utilities"
import { Tasks } from "../task/Tasks"
import { TaskWithdraw } from "./../task/Tasks/TaskWithdraw"
import { InfrastructureMissionMemory } from "./InfrastructureMissionMemory"
import { Mission } from "./Mission"

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

    // We should probably have a PriortyQueue of construction sites
    // todo needs to be a for loop
    for (const [index, layer] of this.infrastructure.Layers.entries()) {
      // validate if layer is valid
      const room = Game.rooms[layer.roomName]
      if (room && room.controller && room.controller.level < index) {
        break
      }

      // Get first unfinshed position and make sure it has a constructionsite
      // should probably be sorted by priority
      const position = layer.Positions.find(p => !p.finished)

      if (room && position) {
        // by checking room we are kinda preventing constructions sites from rooms without vision to be built
        // scan if construction exists on position

        const roomPosition = derefRoomPosition({ ...position.pos, roomName: layer.roomName })

        const structures = room.lookForAt(LOOK_STRUCTURES, roomPosition)
        const plannedStructure = structures.find(s => s.structureType === position.StructureType)

        if (plannedStructure) {
          position.structure = plannedStructure
          // TODO: we now need to "break" and find a new position, this solution means that it waits an additional tick to find the position
          console.log("structure was finished building")
          break
        }

        if (!position.constructionSite) {
          const constructionSites = room.lookForAt(LOOK_CONSTRUCTION_SITES, roomPosition)
          const constructionSite = constructionSites.find(c => c.structureType === position.StructureType)
          if (constructionSite) {
            position.constructionSite = constructionSite
          } else {
            const newConstructionSiteResult = room.createConstructionSite(roomPosition, position.StructureType)
            if (newConstructionSiteResult !== OK) {
              console.log("plan cSite:" + newConstructionSiteResult)
            }

            // assign creeps to move to target
            idleCreeps.forEach(creep => {
              if (position && position.constructionSite) {
                creep.task = Tasks.goTo(roomPosition, { moveOptions: { range: 3 } })
              }
            })

            break
          }
        }

        // assign creeps to constructionSite
        idleCreeps.forEach(creep => {
          // TODO: implement targetedBy and handle coop tasks, find closest creep, validate work parts, and other shenanigans
          // TODO: when construction site is done, we need to mark it as such with a reference to the structure instead
          if (position.constructionSite) {
            creep.task = Tasks.build(position.constructionSite)
          }
        })

        // bail out so only one cSite is constructed at a time.
        if (position.constructionSite) {
          break
        }
      }

      // should probably also check the "next" position allowing creeps to move to next position when finished

      // TODO: validate if finished construction site still exists
    }
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
