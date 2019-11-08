import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement } from "Freya"

/**
 * Responsible for mining in villages, should it also handle outposts?
 */
@profile
export class EnergyMission {
  private room: Room
  private memory: IEnergyMission
  private sourceCount: number

  public constructor(room: Room) {
    this.room = room
    if (!this.room.memory.energymission) {
      this.room.memory.energymission = {
        creeps: {
          // TODO: how do we define a more explicit interface allowing to catch wrongly initialized memory?
          haulers: [],
          miners: []
        }
      }
    }
    this.memory = this.room.memory.energymission

    this.sourceCount = this.room.memory.sources ? Object.keys(this.room.memory.sources).length : 0
  }

  public addCreep(creep: Creep | string, rune: string): void {
    const name = typeof creep === "string" ? creep : creep.name
    this.addCreepByName(name, rune)
  }

  public addCreepByName(creepName: string, rune: string): void {
    this.memory.creeps[rune].push(creepName)
  }

  public hasCreep(creep: Creep): boolean {
    const isMiner = this.memory.creeps.miners.indexOf(creep.name) >= 0
    const isHauler = this.memory.creeps.haulers.indexOf(creep.name) >= 0
    console.log(`${isMiner} ${isHauler}`)
    return isMiner || isHauler
  }

  /**
   * GetRequirements
   */
  public getRequirements(): RuneRequirement[] {
    const requirements = []

    // TODO: clean up dead creeps from mission
    // TODO: early RCL, we want to spawn more miners to get more energy
    // TODO: should requirements also contain a memory payload for freya?
    const miners = {
      rune: "miners",
      count: this.sourceCount - (this.memory.creeps.miners.length || 0),
      // 300 energy
      runePowers: { [WORK]: 2, [CARRY]: 1, [MOVE]: 1 }
    }
    /**
     * You could define something like this though, which is the same idea but a little cleaner:
      export type RunePower = Array<[BodyPartConstant, number]>
      let runes: RunePower = [[WORK, 2], [CARRY, 1], [MOVE, 1]]
    */
    if (miners.count > 0) {
      requirements.push(miners)
    }

    const haulers = {
      rune: "haulers",
      count: this.sourceCount - (this.memory.creeps.haulers.length || 0),
      // 300 energy
      runePowers: { [CARRY]: 3, [MOVE]: 3 }
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
    if (!this.room) {
      console.log("[Warning] room is not visible, skipping energy mission")
      return
    }
    const derefCreeps = (result: Creep[], creepName: string): Creep[] => {
      const creep = Game.creeps[creepName] /* TODO: switch to deref */
      // // console.log("Found creep")
      // // console.log(JSON.stringify(creep))
      if (creep) {
        result.push(creep)
      }
      return result
    }

    // Does this depend on stage / tier? e.g. if we have no haulers, we should be delivering energy
    const miners = this.memory.creeps.miners.reduce<Creep[]>(derefCreeps, [])
    const idleMiners = miners.filter(creep => creep.isIdle)
    const haulers = this.memory.creeps.haulers.reduce<Creep[]>(derefCreeps, [])
    const idleHaulers = haulers.filter(creep => creep.isIdle)

    // Cleanup old creeps where prayer is gone
    if (global.freya.prayers === 0) {
      console.log(`Freya prayers are gone, setting miners ${miners.length} and haulers ${haulers.length} `)
      // // console.log(JSON.stringify(miners))
      this.memory.creeps.miners = miners.map(creep => creep.name)
      this.memory.creeps.haulers = haulers.map(creep => creep.name)
    }

    const sources = this.room.memory.sources || {}
    for (const sourceId in sources) {
      // Sort sources by range from spawn, give  closer spawns higher priority
      if (sources.hasOwnProperty(sourceId)) {
        const source = Game.getObjectById<Source>(sourceId)

        if (source) {
          // Vision of source
          const miner = idleMiners.pop() // TODO: We should pick the closest creep not just any idle creep
          // Miner logic
          if (miner) {
            this.minerHarvestRoom(source, miner, haulers)
          }

          const hauler = idleHaulers.pop()
          if (hauler) {
            this.haul(source, hauler)
          }
        } else {
          // Go to source?
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
  }

  // This mission should live in room memory, what about remove mining missions, do they belong in the village, or the remote outpost?

  // EnergyMission is a mission for a specific room
  // E.g. could be our initial first room
  // It should prioritize all resource nodes in the room based on distance to nearest drop off location
  // In this prioritization it should consider how many miningspots there are present
  // Should we store a potential yield based on assigned creeps? on each resource node?

  // It should only be responsible for specific rooms where we want to harvest

  private minerHarvestRoom(source: Source, creep: Creep, haulers: Creep[]): void {
    // // console.log(`${creep.name} is idle capacity:${creep.store.getFreeCapacity()}`)
    if (creep.store.getFreeCapacity() === 0) {
      // TODO: are we in drop-off room?, if not go to drop-of room, should probable have a general resource management module to determine where to drop off
      // TODO: container?

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
      creep.task = Tasks.harvest(source) // Harvest task might need options for harvesting while full on energy, e.g. drop-harvesting
    }
  }
  private haul(source: Source, creep: Creep): void {
    // TODO: do we need to toggle a collection or delivery mode?, should probably check all sources, and not only 1?
    if (creep.store.getFreeCapacity() === 0) {
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
    }
    // TODO: move creeps in the way?
  }
}
