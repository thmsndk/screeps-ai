import { Dictionary } from "lodash"
import { Infrastructure } from "RoomPlanner/Infrastructure"
import { derefRoomPosition } from "task/utilities/utilities"
import { Tasks } from "../task/Tasks"
import { TaskWithdraw } from "./../task/Tasks/TaskWithdraw"
import { Mission, derefCreeps } from "./Mission"
import { RuneRequirement, RunePowers } from "Freya"
import { ErrorMapper } from "utils/ErrorMapper"
import { profile } from "_lib/Profiler"
import { log } from "_lib/Overmind/console/log"

interface InfraStructureMissionConstructor {
  room: Room | string
  infrastructure: Infrastructure
}

// Tslint:disable-next-line: max-classes-per-file
@profile
export class InfraStructureMission extends Mission {
  private room?: Room

  private roomName: string

  private roomMemory: RoomMemory

  private infrastructure: Infrastructure

  public constructor(parameters: InfraStructureMissionConstructor) {
    const { room, infrastructure } = parameters
    const roomMemory = typeof room === "string" ? Memory.rooms[room] : room.memory
    const roomName = typeof room === "string" ? room : room.name
    if (!roomMemory.infrastructureMission) {
      roomMemory.infrastructureMission = {
        id: "",
        creeps: {
          // TODO: how do we define a more explicit interface allowing to catch wrongly initialized memory?
          builders: []
        }
      }
    }

    super(roomMemory.infrastructureMission)
    this.infrastructure = infrastructure
    this.roomMemory = roomMemory
    this.roomName = roomName

    if (room instanceof Room) {
      this.room = room
    }
  }

  public getRequirements(): RuneRequirement[] {
    const requirements = [] as RuneRequirement[]
    const constructionSites = this.room?.find(FIND_MY_CONSTRUCTION_SITES)
    let neededWorkers = constructionSites?.length ?? 0 > 0 ? 2 : 0 // Currently a naive approach making us have 2 workers

    if (this.roomMemory.settlement && neededWorkers > 0) {
      neededWorkers *= 2 // This depends a lot on available capacity
    }

    const builderRunePowers: { [key: number]: { needed: number; powers: RunePowers } } = {
      300: { needed: 1, powers: { [WORK]: 1, [CARRY]: 2, [MOVE]: 2 } },
      400: { needed: 1, powers: { [WORK]: 1, [CARRY]: 3, [MOVE]: 3 } },
      500: { needed: 1, powers: { [WORK]: 1, [CARRY]: 5, [MOVE]: 3 } },
      600: { needed: 1, powers: { [WORK]: 2, [CARRY]: 5, [MOVE]: 3 } },
      700: { needed: 1, powers: { [WORK]: 3, [CARRY]: 5, [MOVE]: 3 } },
      800: { needed: 1, powers: { [WORK]: 3, [CARRY]: 6, [MOVE]: 4 } },
      900: { needed: 1, powers: { [WORK]: 3, [CARRY]: 5, [MOVE]: 3 } },
      1000: { needed: 1, powers: { [WORK]: 5, [CARRY]: 5, [MOVE]: 5 } },
      2000: { needed: 1, powers: { [WORK]: 10, [CARRY]: 10, [MOVE]: 10 } },
      3500: { needed: 1, powers: { [WORK]: 20, [CARRY]: 10, [MOVE]: 20 } }
    }

    // TODO: ask freya for potential capacity (loop spawn rooms and get energy. persist average in a cache and access that?) should probably also take travel time into account?
    const capacityAvailable = 300
    // TODO: solve issue where spawn has been build and should be used in settlement
    // // for (const spawnId in Game.spawns) {
    // //   if (Game.spawns.hasOwnProperty(spawnId)) {
    // //     const spawn = Game.spawns[spawnId]
    // //     capacityAvailable =
    // //       spawn.room.energyCapacityAvailable > capacityAvailable
    // //         ? spawn.room.energyCapacityAvailable
    // //         : capacityAvailable
    // //   }
    // // }
    const builderRequirementLookup = this.getMaxTierRunePowers(300, 700, capacityAvailable, builderRunePowers)

    // TODO: how do we know the state of the entire clan? e.g. do we got another village to support a settlement?, how do we determine the capacity we want to request?
    // If we define a valid range, but then freya needs a lookup table to determine if the spawn can sustain that request
    const builders = {
      rune: "builders",
      count: neededWorkers - (this.memory.creeps.builders.length || 0),
      // 300 energy
      runePowers: builderRequirementLookup.powers,
      priority: 1,
      mission: this.memory.id,
      missionRoom: this.roomName
    }

    if (builders.count > 0) {
      // // console.log(`[EnergyMission]: haulers ${haulers.count} ${this.sourceCount} ${this.memory.creeps.haulers.length} `)
      requirements.push(builders)
    }

    // Do we want a dedicated hauler per source?
    // I guess it all depends on some sort of math?
    // Also, how do we change the spawn priority of them? and is it important?

    return requirements
  }

  public distributeTasks(builders: Creep[]): void {
    const idleCreeps = builders.filter(creep => creep.isIdle)

    // We should probably have a PriortyQueue of construction sites
    const layers = this.infrastructure.Layers[this.roomName] ?? []
    for (let index = 0; index < layers.length; index++) {
      const layer = layers[index]
      // Validate if layer is valid
      const room = Game.rooms[layer.roomName]

      if (room && room.controller && room.controller.level < index) {
        break
      }

      // Get first unfinshed position and make sure it has a constructionsite
      // Should probably be sorted by priority
      const position = layer.Positions.find(p => !p.finished)
      if (!position) {
        log.debug(`layer ${index} has no unfished cSites in plan`)
      }

      if (room && position) {
        // By checking room we are kinda preventing constructions sites from rooms without vision to be built
        // Scan if construction exists on position
        // // log.debug(`layer ${index} verifying ${position.StructureType}`)

        const roomPosition = derefRoomPosition({ ...position.pos, roomName: layer.roomName })

        const structures = room.lookForAt(LOOK_STRUCTURES, roomPosition)
        const plannedStructure = structures.find(s => s.structureType === position.StructureType)

        if (plannedStructure) {
          position.structure = plannedStructure
          // TODO: we now need to "break" and find a new position, this solution means that it waits an additional tick to find the position
          log.info(`${position.StructureType} was finished building as ${roomPosition.print}`)
          break
        }

        if (!position.constructionSite) {
          log.debug(`layer ${index} ${position.StructureType} has no cSite at ${roomPosition.print}`)
          const constructionSites = room.lookForAt(LOOK_CONSTRUCTION_SITES, roomPosition)
          const constructionSite = constructionSites.find(c => c.structureType === position.StructureType)
          if (constructionSite) {
            position.constructionSite = constructionSite
          } else {
            const newConstructionSiteResult =
              position.StructureType === STRUCTURE_SPAWN
                ? // // ? room.createConstructionSite(roomPosition, position.StructureType, position.name) // this is broken :/ potentially cause the spawnName was already in use
                  // // roomPosition.createConstructionSite(position.StructureType, position.name) // this is broken :/ ^^ see above
                  room.createConstructionSite(
                    roomPosition.x,
                    roomPosition.y,
                    position.StructureType,
                    this.infrastructure.getSpawnName()
                  )
                : room.createConstructionSite(roomPosition, position.StructureType)
            if (newConstructionSiteResult !== OK) {
              // // log.warning(`name:${position.name} type: ${position.StructureType} pos: ${roomPosition.print}`)
              log.warning(`${roomPosition.print} plan cSite: ${newConstructionSiteResult}`)
            } else {
              log.info(`layer ${index} ${position.StructureType} new cSite at ${roomPosition.print}`)
            }

            // Assign creeps to move get energy and move to target
            if (position && position.constructionSite) {
              idleCreeps.forEach(creep => {
                creep.task = Tasks.goTo(roomPosition, { moveOptions: { range: 3 } })
                if (this.roomMemory.village) {
                  this.acquireEnergy(creep)
                }
              })

              break
            }
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
    try {
      const builders = this.memory.creeps.builders.reduce<Creep[]>(derefCreeps, [])

      this.distributeTasks(builders)

      Object.values(builders).forEach(creep => {
        this.acquireEnergy(creep)

        creep.run()
      })
    } catch (error) {
      console.log(
        `<span style='color:red'>[InfraStructureMission] ${_.escape(ErrorMapper.sourceMappedStackTrace(error))}</span>`
      )
    }
  }

  private acquireEnergy(creep: Creep): void {
    if (this.roomMemory.settlement && this.goToRoom(creep, this.roomName)) {
      return
    }

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
      } else {
        // Scavange for dropped resources
        const resourcesInRoom = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 25)
        if (resourcesInRoom.length > 0) {
          const pickUpTasks = resourcesInRoom.map(r => Tasks.pickup(r))
          creep.task = Tasks.chain(pickUpTasks)
        }
      }
    }
  }
}
