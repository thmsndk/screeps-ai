import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement } from "Freya"
import { Mission, derefCreeps } from "./Mission"
import { ErrorMapper } from "utils/ErrorMapper"
import { deref } from "task/utilities/utilities"

enum HaulingMode {
  collecting,
  delivering
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

    // TODO: early RCL, we want to spawn more miners to get more energy
    // TODO: calculate  potential energy income based on mining positions.
    // Also assign amount of miners pr source, this allows the task assignment to know how many miners are allowed.

    const neededMiners = this.roomMemory.miningPositions ?? this.sourceCount
    const miners = {
      rune: "miners",
      count: neededMiners - (this.memory.creeps.miners.length || 0),
      // 300 energy
      runePowers: { [WORK]: 2, [CARRY]: 1, [MOVE]: 1 },
      priority: this.roomMemory.village ? 10 : 5,
      mission: this.memory.id
    }

    if (miners.count > 0) {
      // // console.log(`[EnergyMission]: miners ${miners.count} ${this.sourceCount} ${this.memory.creeps.miners.length} `)
      requirements.push(miners)
    }

    const haulers = {
      rune: "haulers",
      count: this.sourceCount * 2 - (this.memory.creeps.haulers.length || 0),
      // 300 energy
      runePowers: { [CARRY]: 3, [MOVE]: 3 },
      priority: this.roomMemory.village ? 5 : 2,
      mission: this.memory.id
    }

    if (haulers.count > 0) {
      // // console.log(`[EnergyMission]: haulers ${haulers.count} ${this.sourceCount} ${this.memory.creeps.haulers.length} `)
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
      // TODO: this removes the last queued creep and queues a new one, it was an attempt at fixing sim, and remove old creeps from missions, when we spawn the last creep, we then reset the assigned creep....
      // // if (global.freya.prayers === 0) {
      // //   // // console.log(`Freya prayers are gone, setting miners ${miners.length} and haulers ${haulers.length} `)
      // //   // // console.log(JSON.stringify(miners))
      // //   this.memory.creeps.miners = miners.map(creep => creep.name)
      // //   this.memory.creeps.haulers = haulers.map(creep => creep.name)
      // // }

      const sources = this.roomMemory.sources || { dummyForceMiningScout: "" }

      for (const sourceId in sources) {
        // Sort sources by range from spawn, give  closer spawns higher priority
        if (sources.hasOwnProperty(sourceId)) {
          const targetedBy = _.groupBy(
            _.map(Game.TargetCache.targets[sourceId], name => Game.creeps[name]),
            "memory.rune"
          )

          const source = Game.getObjectById<Source>(sourceId)

          const sourceScan = this.roomMemory?.sources ? this.roomMemory.sources[sourceId] : ({} as ISourceMemory)

          if (!sourceScan.containerId || !deref(sourceScan.containerId as string)) {
            sourceScan.containerId = source?.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 2, {
              filter: structure => {
                switch (structure.structureType) {
                  case STRUCTURE_CONTAINER:
                    const container = structure as StructureContainer

                    return true
                }

                return false
              }
            })[0]?.id
          }

          if (!targetedBy.miners || targetedBy.miners.length < Object.keys(sourceScan.miningPositions).length) {
            const miner = idleMiners.pop() // TODO: We should pick the closest creep not just any idle creep
            // Miner logic
            if (miner) {
              this.assignMinerTasks(source, miner, haulers)
            }
          }

          // TargetBy should always be 0? a hauler never targets the source with a task?
          if (!targetedBy.haulers || targetedBy.haulers.length === 0) {
            const hauler = idleHaulers.pop()

            if (hauler) {
              this.assignHaulTask(source, hauler)
            }
          }
        }
      }

      // Run miners
      miners.forEach(creep => creep.run())

      // Run haulers
      haulers.forEach(creep => creep.run())

      return
    } catch (error) {
      console.log(
        `<span style='color:red'>[EnergyMission] ${_.escape(ErrorMapper.sourceMappedStackTrace(error))}</span>`
      )
    }
  }

  private goToDropOff(creep: Creep): boolean {
    if (creep.pos.roomName !== creep.memory.home && creep.memory.home /* In case of amnesia */) {
      // // console.log(`${creep.name} => dropoff: ${creep.memory.home}`)
      creep.task = Tasks.goToRoom(creep.memory.home)

      return true
    }

    return false
  }

  private goToGoal(creep: Creep): boolean {
    if (creep.pos.roomName !== this.roomName) {
      // // console.log(`${creep.name} => goal: ${this.roomName}`)
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

  private assignMinerTasks(source: Source | null, creep: Creep, haulers: Creep[]): void {
    // // console.log(`${creep.name} is idle capacity:${creep.store.getFreeCapacity()}`)
    if (creep.store.getFreeCapacity() === 0) {
      // TODO: are we in drop-off room?, if not go to drop-of room, should probable have a general resource management module to determine where to drop off
      // TODO: container?

      if (haulers.length === 0 && this.goToDropOff(creep)) {
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

  private assignHaulTask(source: Source | null, creep: Creep): void {
    // TODO: do we need to toggle a collection or delivery mode?, should probably check all sources, and not only 1?
    if (!creep.memory.mode || creep.memory.mode === HaulingMode.collecting) {
      if (creep.store.getFreeCapacity() === 0) {
        creep.memory.mode = HaulingMode.delivering
      }
    } else if (creep.memory.mode === HaulingMode.delivering) {
      if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
        creep.memory.mode = HaulingMode.collecting
      }
    }

    const sources = this.roomMemory?.sources
    const sourceMemory = sources ? sources[source?.id as string] : null

    if (creep.memory.mode === HaulingMode.delivering) {
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
              case STRUCTURE_CONTAINER:
                const container = structure as StructureContainer

                return (
                  structure.id !== sourceMemory?.containerId &&
                  container.store[RESOURCE_ENERGY] < container.storeCapacity
                )
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
        // Source container
        const sourceContainer = deref(sourceMemory?.containerId as string) as StructureContainer
        // // const targets = source.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 2, {
        // //   filter: structure => {
        // //     switch (structure.structureType) {
        // //       case STRUCTURE_CONTAINER:
        // //         const container = structure as StructureContainer
        // //         const amount = _.sum(container.store)

        // //         return amount > 0 // Container.storeCapacity / 4
        // //     }

        // //     return false
        // //   }
        // // })

        if (sourceContainer) {
          creep.task = Tasks.withdraw(sourceContainer)
        }

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
