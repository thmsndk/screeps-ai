import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement } from "Freya"
import { Mission, derefCreeps, haulerTieredRunePowers } from "./Mission"
import { ErrorMapper } from "utils/ErrorMapper"
import { Task } from "task/Task"

enum HaulingMode {
  collecting,
  delivering
}

@profile
export class TowerMission extends Mission {
  private room?: Room

  private roomName: string

  private roomMemory: RoomMemory

  private towers: StructureTower[]

  public constructor(room: Room | string) {
    const roomMemory = typeof room === "string" ? Memory.rooms[room] : room.memory
    const roomName = typeof room === "string" ? room : room.name
    if (!roomMemory.towermission) {
      roomMemory.towermission = {
        id: "",
        creeps: {
          // TODO: how do we define a more explicit interface allowing to catch wrongly initialized memory?
          haulers: []
        }
      }
    }

    super(roomMemory.towermission)

    this.roomMemory = roomMemory
    this.roomName = roomName
    this.towers = []
    if (room instanceof Room) {
      this.room = room

      // TODO: if missions are placed on the heap, how do we rehydrate this?
      this.towers = room.find<StructureTower>(FIND_MY_STRUCTURES, {
        filter: (structure: Structure) => structure.structureType === STRUCTURE_TOWER
      })
    }
  }

  public getRequirements(): RuneRequirement[] {
    const requirements = []
    const neededWorkers = Math.ceil(this.towers.length / 2)

    // TODO: loop towers, validate energy.
    // TODO: rune power scaling based on available energy.

    const capacityAvailable = this.room?.energyCapacityAvailable ?? 300

    const requirementLookup = this.getMaxTierRunePowers(300, 2400, capacityAvailable, haulerTieredRunePowers)

    const haulers = {
      rune: "haulers",
      count: neededWorkers - (this.memory.creeps.haulers.length || 0),
      // 300 energy
      runePowers: requirementLookup.powers,
      priority: 2,
      mission: this.memory.id,
      missionRoom: this.roomName
    }

    if (haulers.count > 0) {
      requirements.push(haulers)
    }

    return requirements
  }

  public run(): void {
    try {
      const haulers = this.memory.creeps.haulers.reduce<Creep[]>(derefCreeps, [])
      const idlehaulers = haulers.filter(creep => creep.isIdle)

      // TODO: loop towers, target stuffs, calculate energyusage and assign tasks to idle haulers, currently towers aint doign anything unless they have a tower hauler

      // Assign tasks
      idlehaulers.forEach(hauler => {
        const tasks = [] as Task[]

        let usedEnergy = 0
        const haulerEnergy = hauler.store.getUsedCapacity(RESOURCE_ENERGY)

        let nextCreep = false
        this.towers.forEach(tower => {
          if (nextCreep) {
            return
          }

          if (hauler) {
            if (!hauler.memory.mode) {
              // Just spawned, let's get hauling
              hauler.memory.mode = HaulingMode.collecting
            }

            if (hauler.memory.mode === HaulingMode.collecting) {
              if (hauler.store.getFreeCapacity() === 0) {
                hauler.memory.mode = HaulingMode.delivering
              }
            } else if (hauler.memory.mode === HaulingMode.delivering) {
              if (hauler.store.getFreeCapacity() === hauler.store.getCapacity()) {
                hauler.memory.mode = HaulingMode.collecting
              }
            }

            if (hauler.memory.mode === HaulingMode.collecting) {
              // Find energy to haul
              const target = tower.pos.findClosestByRange<StructureContainer | StructureStorage>(FIND_STRUCTURES, {
                filter: structure => {
                  switch (structure.structureType) {
                    case STRUCTURE_CONTAINER:
                      const container = structure as StructureContainer
                      const amount = container.store.getUsedCapacity(RESOURCE_ENERGY)

                      return amount > 0
                    case STRUCTURE_STORAGE:
                      const storage = structure as StructureStorage

                      return storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0
                    // // storage.store[RESOURCE_ENERGY] < storage.storeCapacity
                    // // && storage.room.energyAvailable === storage.room.energyCapacityAvailable
                  }

                  return false
                }
              })

              if (target) {
                hauler.task = Tasks.withdraw(target)
              } else {
                const resource = hauler.pos.findClosestByRange(FIND_DROPPED_RESOURCES)
                if (resource) {
                  hauler.task = Tasks.pickup(resource)
                }
              }

              nextCreep = true
            } else {
              // Refill towers lower than 50%
              const currentEnergy = tower.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0
              // // const capacity = tower.store.getCapacity() ?? 0 // returns null for some reason
              const capacity = tower.store.getCapacity(RESOURCE_ENERGY) ?? 0
              // // console.log(`${currentEnergy} / ${capacity} = ${currentEnergy / capacity}`)

              if (currentEnergy / capacity <= 0.5) {
                // TODO: chain tower filling, tasks if we have surplus energy
                const neededEnergy = tower.store.getFreeCapacity(RESOURCE_ENERGY)

                usedEnergy += Math.min(neededEnergy, haulerEnergy)
                // // console.log(`${usedEnergy} <= ${hauler.store.getUsedCapacity()}`)
                if (usedEnergy <= hauler.store.getUsedCapacity()) {
                  // // console.log(`${tower.id} => ${neededEnergy}`)
                  tasks.push(Tasks.transfer(tower))
                }
              }
            }

            if (!nextCreep) {
              hauler.task = Tasks.chain(tasks)
            }
          }
        })
      })

      // Run haulers
      haulers.forEach(creep => creep.run())

      // Run tower logic
      this.towers.forEach(tower => {
        // Prefer shooting enemies
        const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
        if (closestHostile) {
          tower.attack(closestHostile)
        } else {
          const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
            // Walls does not appear to be in "FIND_MY_STRUCTURES"
            filter: (structure: Structure) => {
              const energy = this.room?.storage?.store.getUsedCapacity(RESOURCE_ENERGY)
              const energyCapacity = this.room?.storage?.store.getCapacity(RESOURCE_ENERGY)
              const repairPercentage = (energy ?? 0) / (energyCapacity ?? 1) > 0.5 ? 0.001 : 0.0004

              // Console.log(structure.structureType, structure.hits, structure.hitsMax, structure.hits / structure.hitsMax)
              return (
                (structure.hits < structure.hitsMax &&
                  structure.structureType !== STRUCTURE_WALL &&
                  structure.structureType !== STRUCTURE_RAMPART) ||
                structure.hits / structure.hitsMax < repairPercentage
              )
            }
          })
          if (closestDamagedStructure) {
            tower.repair(closestDamagedStructure)
          } else {
            const closestCreep = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
              // Walls does not appear to be in "FIND_MY_STRUCTURES"
              filter: (creep: Creep) =>
                // Console.log(structure.structureType, structure.hits, structure.hitsMax, structure.hits / structure.hitsMax)
                creep.hits < creep.hitsMax
            })
            if (closestCreep) {
              tower.heal(closestCreep)
            }
          }
        }
      })

      return
    } catch (error) {
      console.log(
        `<span style='color:red'>[TowerMission] ${_.escape(ErrorMapper.sourceMappedStackTrace(error))}</span>`
      )
    }
  }
}
