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

// Tslint:disable-next-line: max-classes-per-file
export class InfraStructureMission extends Mission {
  public memory?: InfrastructureMissionMemory // TODO: Private

  public creeps!: Dictionary<Creep>

  private infrastructure: Infrastructure

  public constructor(parameters: InfraStructureMissionConstructor) {
    super(parameters ? parameters.memory : undefined)
    this.infrastructure = parameters.infrastructure

    const creeps = {} as Dictionary<Creep>
    if (parameters.memory) {
      if (parameters.memory.creeps) {
        Object.keys(parameters.memory.creeps.builders).forEach(creepName => {
          const creep = Game.creeps[creepName]
          if (creep) {
            creeps[creepName] = creep
          }
        })
      }
    }

    this.creeps = creeps
  }

  public addCreep(creep: Creep): void {
    if (this.memory) {
      this.memory.creeps.builders.push(creep.name)
    }

    this.creeps[creep.name] = creep
  }

  public distributeTasks(): void {
    const idleCreeps = _.filter(this.creeps, creep => creep.isIdle)

    // We should probably have a PriortyQueue of construction sites
    for (let index = 0; index < this.infrastructure.Layers.length; index++) {
      const layer = this.infrastructure.Layers[index]
      // Validate if layer is valid
      const room = Game.rooms[layer.roomName]

      if (room && room.controller && room.controller.level < index) {
        break
      }

      // Get first unfinshed position and make sure it has a constructionsite
      // Should probably be sorted by priority
      const position = layer.Positions.find(p => !p.finished)

      if (room && position) {
        // By checking room we are kinda preventing constructions sites from rooms without vision to be built
        // Scan if construction exists on position

        const roomPosition = derefRoomPosition({ ...position.pos, roomName: layer.roomName })

        const structures = room.lookForAt(LOOK_STRUCTURES, roomPosition)
        const plannedStructure = structures.find(s => s.structureType === position.StructureType)

        if (plannedStructure) {
          position.structure = plannedStructure
          // TODO: we now need to "break" and find a new position, this solution means that it waits an additional tick to find the position
          console.log("structure was finished building" + JSON.stringify(position.pos))
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

            // Assign creeps to move to target
            idleCreeps.forEach(creep => {
              if (position && position.constructionSite) {
                creep.task = Tasks.goTo(roomPosition, { moveOptions: { range: 3 } })
              }
            })

            break
          }
        }

        // Assign creeps to constructionSite
        idleCreeps.forEach(creep => {
          // TODO: implement targetedBy and handle coop tasks, find closest creep, validate work parts, and other shenanigans
          // TODO: when construction site is done, we need to mark it as such with a reference to the structure instead
          if (position.constructionSite) {
            creep.task = Tasks.build(position.constructionSite)
          }
        })

        // Bail out so only one cSite is constructed at a time.
        if (position.constructionSite) {
          break
        }
      }

      // Should probably also check the "next" position allowing creeps to move to next position when finished

      // TODO: validate if finished construction site still exists
    }
  }

  public run(): void {
    Object.values(this.creeps).forEach(creep => {
      if (creep.carry.energy === 0) {
        // Const resource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES)
        // Chain dropped resources in a close quarter
        //

        // If (resource) {
        //   If (resource && creep.pickup(resource) === ERR_NOT_IN_RANGE) {
        //     Creep.moveTo(resource, { visualizePathStyle: PathStyle.Hauling })
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
