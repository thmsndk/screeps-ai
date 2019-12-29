import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement, RunePowers } from "Freya"
import { Mission, derefCreeps } from "./Mission"
import { ErrorMapper } from "utils/ErrorMapper"

@profile
export class UpgradeControllerMission extends Mission {
  private room?: Room

  private roomName: string

  private roomMemory: RoomMemory

  private assignedCreeps: number

  private maxCreeps: number

  public constructor(room: Room | string) {
    const roomMemory = typeof room === "string" ? Memory.rooms[room] : room.memory
    const roomName = typeof room === "string" ? room : room.name
    if (!roomMemory.upgradecontrollermission) {
      roomMemory.upgradecontrollermission = {
        id: "",
        creeps: {
          // TODO: how do we define a more explicit interface allowing to catch wrongly initialized memory?
          upgraders: []
        }
      }
    }

    super(roomMemory.upgradecontrollermission)

    this.roomMemory = roomMemory
    this.roomName = roomName

    this.assignedCreeps = roomMemory.upgradecontrollermission.creeps.upgraders.length
    this.maxCreeps = 1

    if (room instanceof Room) {
      this.room = room
    }
  }

  public getRequirements(): RuneRequirement[] {
    const requirements = []

    const creeps = this.memory.creeps.upgraders.reduce<Creep[]>(derefCreeps, [])
    this.assignedCreeps = creeps.length

    // // const averageEnergyUsage =
    // //   creeps.reduce(
    // //     (energyUsage, creep) =>
    // //       energyUsage +
    // //       creep.body.filter(part => part.type === WORK).length +
    // //       CARRY_CAPACITY * creep.body.filter(part => part.type === CARRY).length,
    // //     0
    // //   ) / this.assignedCreeps
    // // const averageEnergy = this.roomMemory.averageEnergy?.average ?? 0
    // // // // console.log("averageEnergyUsage:" + averageEnergyUsage)
    // // // // console.log("averageEnergy:" + averageEnergy)
    // // this.maxCreeps = Math.min(
    // //   Math.floor(averageEnergy / (averageEnergyUsage || averageEnergy)),
    // //   this.room?.controller?.level === 8 ? 1 : 10 // TODO: persist controller level
    // // )
    // // // // console.log(this.maxCreeps)

    const minerRunePowers: { [key: number]: { needed: number; powers: RunePowers } } = {
      300: { needed: 10, powers: { [WORK]: 2, [CARRY]: 1, [MOVE]: 1 } },
      400: { needed: 10, powers: { [WORK]: 2, [CARRY]: 3, [MOVE]: 1 } },
      500: { needed: 10, powers: { [WORK]: 2, [CARRY]: 5, [MOVE]: 1 } },
      600: { needed: 10, powers: { [WORK]: 3, [CARRY]: 5, [MOVE]: 1 } },
      700: { needed: 8, powers: { [WORK]: 4, [CARRY]: 5, [MOVE]: 1 } }
    }
    const capacityAvailable = this.room?.energyCapacityAvailable ?? 300
    const minerRequirementLookup = this.getMaxTierRunePowers(300, 700, capacityAvailable, minerRunePowers)

    let neededWorkers = this.room?.controller?.level === 8 ? 1 : minerRequirementLookup.needed
    this.maxCreeps = neededWorkers

    if (this.roomMemory.settlement) {
      neededWorkers = 2
    }

    const upgraders = {
      rune: "upgraders",
      count: neededWorkers - (this.memory.creeps.upgraders.length || 0),
      // 300 energy
      runePowers: minerRequirementLookup.powers,
      priority: 1,
      mission: this.memory.id,
      missionRoom: this.roomName
    }

    if (upgraders.count > 0) {
      requirements.push(upgraders)
    }

    return requirements
  }

  public run(): void {
    try {
      const upgraders = this.memory.creeps.upgraders.reduce<Creep[]>(derefCreeps, [])
      const idleupgraders = upgraders.filter(creep => creep.isIdle)

      // TODO: get container dedicated to upgrade

      // TODO: Assign tasks
      // Iterate each idle upgrader and assign it energy collection task or upgrade controller task
      idleupgraders.forEach(creep => {
        if (creep.store.getFreeCapacity() === 0) {
          // TODO: this prevents remote upgrading...
          if (!this.room || !this.room.controller) {
            return
          }

          // Upgrade
          creep.task = Tasks.upgrade(this.room.controller) // TODO: import upgrade task
        } else {
          // Find energy
          if (!this.room || !this.room.controller) {
            return
          }

          if (this.room.storage) {
            if (this.room.storage.store.getUsedCapacity(RESOURCE_ENERGY) >= creep.store.getCapacity(RESOURCE_ENERGY)) {
              creep.task = Tasks.withdraw(this.room.storage)

              return
            }
          }

          // TODO: should probably check assigned upgrade container for energy before theese fallbacks
          const resource = this.room.controller.pos.findClosestByRange(FIND_DROPPED_RESOURCES)
          if (resource) {
            creep.task = Tasks.pickup(resource)
            // // if (resource && creep.pickup(resource) === ERR_NOT_IN_RANGE) {
            // //   creep.moveTo(resource, { visualizePathStyle: PathStyle.Hauling })
            // // }
          } else {
            const target = creep.pos.findClosestByRange<StructureContainer>(FIND_STRUCTURES, {
              filter: structure => {
                switch (structure.structureType) {
                  case STRUCTURE_CONTAINER:
                    const container = structure as StructureContainer

                    return container.store.getUsedCapacity(RESOURCE_ENERGY) >= creep.store.getCapacity(RESOURCE_ENERGY)
                  // Case STRUCTURE_EXTENSION:
                  //   Const extension = structure as StructureExtension
                  //   Return extension.energy >= creep.carryCapacity
                  // Case STRUCTURE_SPAWN:
                  //   Const spawn = structure as StructureSpawn
                  //   Return spawn.energy >= creep.carryCapacity
                  // Case STRUCTURE_TOWER: // not sure it should get from there
                  //   Const tower = structure as StructureTower
                  //   Return tower.energy >= creep.carryCapacity
                }

                return false
              }
            })

            if (target) {
              creep.task = Tasks.withdraw(target)
              // // if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              // //   creep.moveTo(target, { visualizePathStyle: PathStyle.Collection })
              // // }
            }
          }
        }
      })

      // Run upgraders
      upgraders.forEach(creep => creep.run())

      this.visualizeProgress(this.assignedCreeps, this.maxCreeps)

      return
    } catch (error) {
      console.log(
        `<span style='color:red'>[UpgradeControllerMission] ${_.escape(
          ErrorMapper.sourceMappedStackTrace(error)
        )}</span>`
      )
    }
  }

  private visualizeProgress(assignedCreeps: number, maxCreeps: number): void {
    if (this.room?.controller) {
      const progress = Math.floor((this.room.controller.progress / this.room.controller.progressTotal) * 100)
      this.room.controller.room.visual.text(
        `${assignedCreeps} / ${maxCreeps} ⚡ ${progress}%`,
        this.room.controller.pos.x,
        this.room.controller.pos.y - 1,
        { align: "center", opacity: 0.8 }
      )
    }
  }
}
