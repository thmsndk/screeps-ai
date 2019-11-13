import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement } from "Freya"
import { Mission } from "./Mission"

const derefCreeps = (result: Creep[], creepName: string): Creep[] => {
  const creep = Game.creeps[creepName] /* TODO: switch to deref */
  // // console.log("Found creep")
  // // console.log(JSON.stringify(creep))
  if (creep && !creep.spawning) {
    result.push(creep)
  }

  return result
}

/**
 * Responsible for mining in villages, should it also handle outposts?
 */
@profile
export class EnergyMission extends Mission {
  private room?: Room

  private roomName: string

  private roomMemory: RoomMemory

  private sourceCount: number

  public constructor(room: Room | string) {
    const roomMemory = typeof room === "string" ? Memory.rooms[room] : room.memory
    const roomName = typeof room === "string" ? room : room.name
    if (!roomMemory.energymission) {
      roomMemory.energymission = {
        id: "",
        creeps: {
          // TODO: how do we define a more explicit interface allowing to catch wrongly initialized memory?
          haulers: [],
          miners: []
        }
      }
    }

    super(roomMemory.energymission)

    this.roomMemory = roomMemory
    this.roomName = roomName

    if (room instanceof Room) {
      this.room = room
    }

    this.sourceCount = roomMemory.sources ? Object.keys(roomMemory.sources).length : 1
  }

  public getRequirements(): RuneRequirement[] {
    const requirements = []

    // TODO: clean up dead creeps from mission
    // TODO: early RCL, we want to spawn more miners to get more energy
    // TODO: should requirements also contain a memory payload for freya?
    const miners = {
      rune: "miners",
      count: this.sourceCount - (this.memory.creeps.miners.length || 0),
      // 300 energy
      runePowers: { [WORK]: 2, [CARRY]: 1, [MOVE]: 1 },
      priority: 10,
      mission: this.memory.id
    }

    if (miners.count > 0) {
      requirements.push(miners)
    }

    const haulers = {
      rune: "haulers",
      count: this.sourceCount - (this.memory.creeps.haulers.length || 0),
      // 300 energy
      runePowers: { [CARRY]: 3, [MOVE]: 3 },
      priority: 1,
      mission: this.memory.id
    }

    if (haulers.count > 0) {
      requirements.push(haulers)
    }

    // Do we want a dedicated hauler per source?
    // I guess it all depends on some sort of math?
    // Also, how do we change the spawn priority of them? and is it important?

    return requirements
  }

  /**
   * Run
   */
  public run(): void {
    try {
      // // if (!this.room) {
      // //   console.log("[Warning] room is not visible, skipping energy mission")

      // //   return
      // // }

      // Does this depend on stage / tier? e.g. if we have no haulers, we should be delivering energy
      const miners = this.memory.creeps.miners.reduce<Creep[]>(derefCreeps, [])
      const idleMiners = miners.filter(creep => creep.isIdle)
      const haulers = this.memory.creeps.haulers.reduce<Creep[]>(derefCreeps, [])
      const idleHaulers = haulers.filter(creep => creep.isIdle)

      // Cleanup old creeps where prayer is gone
      if (global.freya.prayers === 0) {
        // // console.log(`Freya prayers are gone, setting miners ${miners.length} and haulers ${haulers.length} `)
        // // console.log(JSON.stringify(miners))
        this.memory.creeps.miners = miners.map(creep => creep.name)
        this.memory.creeps.haulers = haulers.map(creep => creep.name)
      }

      const sources = this.roomMemory.sources || {}
      for (const sourceId in sources) {
        // Sort sources by range from spawn, give  closer spawns higher priority
        if (sources.hasOwnProperty(sourceId)) {
          const source = Game.getObjectById<Source>(sourceId)

          const miner = idleMiners.pop() // TODO: We should pick the closest creep not just any idle creep
          const hauler = idleHaulers.pop()
          // TODO: we should use target locking to determine how many creeps are assigned to a source.

          // Vision of source
          // Miner logic
          if (miner) {
            this.minerHarvestRoom(source, miner, haulers)
          }

          if (hauler) {
            this.haul(source, hauler)
          }
        }
      }
      // Assign miners tasks
      // Assign haulers tasks

      // Run miners
      miners.forEach(creep => creep.run())

      // Run haulers
      haulers.forEach(creep => creep.run())

      return
    } catch (error) {
      console.log(`[EnergyMission] ${error}`)
    }
  }

  private goToDropOff(creep: Creep): boolean {
    console.log(`${creep.name} ${creep.pos.roomName} => goal: ${creep.memory.home}`)
    if (creep.pos.roomName !== creep.memory.home) {
      console.log(`${creep.name} => dropoff: ${creep.memory.home}`)
      creep.task = Tasks.goToRoom(creep.memory.home)

      return true
    }

    return false
  }

  private goToGoal(creep: Creep): boolean {
    console.log(`${creep.name} ${creep.pos.roomName} => goal: ${this.roomName}`)
    if (creep.pos.roomName !== this.roomName) {
      console.log(`${creep.name} => goal: ${this.roomName}`)
      creep.task = Tasks.goToRoom(this.roomName)

      return true
    }

    return false
  }

  // This mission should live in room memory, what about remove mining missions, do they belong in the village, or the remote outpost?

  // EnergyMission is a mission for a specific room
  // E.g. could be our initial first room
  // It should prioritize all resource nodes in the room based on distance to nearest drop off location
  // In this prioritization it should consider how many miningspots there are present
  // Should we store a potential yield based on assigned creeps? on each resource node?

  // It should only be responsible for specific rooms where we want to harvest

  private minerHarvestRoom(source: Source | null, creep: Creep, haulers: Creep[]): void {
    // // console.log(`${creep.name} is idle capacity:${creep.store.getFreeCapacity()}`)
    if (creep.store.getFreeCapacity() === 0) {
      // TODO: are we in drop-off room?, if not go to drop-of room, should probable have a general resource management module to determine where to drop off
      // TODO: container?

      if (this.goToDropOff(creep)) {
        return
      }

      const target = creep.pos.findClosestByRange<StructureExtension | StructureSpawn>(FIND_STRUCTURES, {
        filter: structure => {
          switch (structure.structureType) {
            case STRUCTURE_EXTENSION:
              const extension = structure as StructureExtension

              return extension.energy < extension.energyCapacity && haulers.length === 0
            case STRUCTURE_SPAWN:
              const spawn = structure as StructureSpawn

              return spawn.energy < spawn.energyCapacity && haulers.length === 0
            // // case STRUCTURE_TOWER:
            // //   const tower = structure as StructureTower
            // //   return tower.energy < tower.energyCapacity && haulers.length === 0
          }

          return false
        }
      })

      if (target) {
        // // console.log(`${creep.name} transfer task for ${target.ref}`)
        creep.task = Tasks.transfer(target)
      } else if (haulers.length >= 1) {
        creep.drop(RESOURCE_ENERGY) // TODO: Task
      }
    } else {
      if (source) {
        creep.task = Tasks.harvest(source) // Harvest task might need options for harvesting while full on energy, e.g. drop-harvesting

        return
      }

      if (this.goToGoal(creep)) {
        return
      }
    }
  }

  private haul(source: Source | null, creep: Creep): void {
    // TODO: do we need to toggle a collection or delivery mode?, should probably check all sources, and not only 1?
    if (creep.store.getFreeCapacity() === 0) {
      if (this.goToDropOff(creep)) {
        return
      }
      // TODO: check source container
      // Find spawn or extensions to deposit
      const target = creep.pos.findClosestByRange<StructureSpawn | StructureExtension | StructureStorage>(
        FIND_STRUCTURES,
        {
          filter: structure => {
            // Console.log("MHJ", structure.structureType)
            switch (structure.structureType) {
              case STRUCTURE_EXTENSION:
                const extension = structure as StructureExtension

                return extension.energy < extension.energyCapacity
              case STRUCTURE_SPAWN:
                const spawn = structure as StructureSpawn

                return spawn.energy < spawn.energyCapacity
              case STRUCTURE_STORAGE:
                const storage = structure as StructureStorage

                return (
                  storage.store[RESOURCE_ENERGY] < storage.storeCapacity &&
                  creep.room.energyAvailable === creep.room.energyCapacityAvailable
                )
              // Case STRUCTURE_TOWER:
              //     Const tower = structure as StructureTower
              //     Return tower.energy < tower.energyCapacity
              // Case STRUCTURE_CONTAINER:
              //     Const container = structure as StructureContainer
              //     Return structure.id !== job.memory.target && container.store[RESOURCE_ENERGY] < container.storeCapacity
            }

            return false
          }
        }
      )

      if (target) {
        creep.task = Tasks.transfer(target)
      }
    } else {
      if (source) {
        // Find energy to haul
        // Container
        // // const targets = source.pos.findInRange(FIND_STRUCTURES, 2, {
        // //   filter: structure => {
        // //     switch (structure.structureType) {
        // //       case STRUCTURE_CONTAINER:
        // //         const container = structure as StructureContainer
        // //         const amount = _.sum(container.store)
        // //         return amount > 0 // container.storeCapacity / 4
        // //     }

        // //     return false
        // //   }
        // // })
        const resource = source.pos.findInRange(FIND_DROPPED_RESOURCES, 2)
        if (resource.length > 0) {
          creep.task = Tasks.pickup(resource[0])
        }

        return
      }

      if (this.goToGoal(creep)) {
        return
      }
    }
    // TODO: move creeps in the way?
  }
}
