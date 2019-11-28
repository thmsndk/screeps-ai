import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement } from "Freya"
import { Mission, derefCreeps } from "./Mission"
import { ErrorMapper } from "utils/ErrorMapper"

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
    const neededWorkers = 1

    // TODO: loop towers, validate energy.
    const haulers = {
      rune: "haulers",
      count: neededWorkers - (this.memory.creeps.haulers.length || 0),
      // 300 energy
      runePowers: { [WORK]: 2, [CARRY]: 1, [MOVE]: 1 },
      priority: 10,
      mission: this.memory.id
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

      // Assign tasks
      const hauler = idlehaulers.pop() // TODO: We should pick the closest creep not just any idle creep

      let usedEnergy = 0

      this.towers.forEach(tower => {
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
            const target = tower.pos.findClosestByRange<StructureContainer>(FIND_STRUCTURES, {
              filter: structure => {
                switch (structure.structureType) {
                  case STRUCTURE_CONTAINER:
                    const container = structure as StructureContainer
                    const amount = _.sum(container.store)

                    return amount > 0
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
          } else {
            // Refill towers lower than 50%
            const used = tower.store.getUsedCapacity() ?? 0
            // // const capacity = tower.store.getCapacity() ?? 0 // returns null for some reason
            const capacity = tower.store.getCapacity(RESOURCE_ENERGY) ?? 0
            // // console.log(`${used} / ${capacity}`)

            if (used / capacity <= 0.5) {
              // TODO: chain tower filling, tasks if we have surplus energy
              const neededEnergy = tower.store.getFreeCapacity()
              usedEnergy += neededEnergy
              // // console.log(`${usedEnergy} <= ${hauler.store.getUsedCapacity()}`)
              if (usedEnergy <= hauler.store.getUsedCapacity()) {
                hauler.task = Tasks.transfer(tower)
              }
            }
          }
        }

        // TODO: run tower logic
        // Prefer shooting enemies
        const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
        if (closestHostile) {
          tower.attack(closestHostile)
        } else {
          const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
            // Walls does not appear to be in "FIND_MY_STRUCTURES"
            filter: (structure: Structure) =>
              // Console.log(structure.structureType, structure.hits, structure.hitsMax, structure.hits / structure.hitsMax)
              (structure.hits < structure.hitsMax &&
                structure.structureType !== STRUCTURE_WALL &&
                structure.structureType !== STRUCTURE_RAMPART) ||
              structure.hits / structure.hitsMax < 0.0004
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

      // Run haulers
      haulers.forEach(creep => creep.run())

      return
    } catch (error) {
      console.log(
        `<span style='color:red'>[TowerMission] ${_.escape(ErrorMapper.sourceMappedStackTrace(error))}</span>`
      )
    }
  }
}