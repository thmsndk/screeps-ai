import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement, RunePowers, calculateRunePowers } from "Freya"
import { Mission, derefCreeps, haulerTieredRunePowers } from "./Mission"
import { ErrorMapper } from "utils/ErrorMapper"
import { deref } from "task/utilities/utilities"
import { log } from "_lib/Overmind/console/log"
// TODO: we have an issue with remote miners not navigating when there are no haulers?
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
    const requirements = [] as RuneRequirement[]

    // TODO: early RCL, we want to spawn more miners to get more energy
    // TODO: calculate  potential energy income based on mining positions.
    // Also assign amount of miners pr source, this allows the task assignment to know how many miners are allowed.

    const minerRunePowers: { [key: number]: { needed: number; powers: RunePowers } } = {
      300: { needed: 3, powers: { [WORK]: 2, [CARRY]: 1, [MOVE]: 1 } },
      400: { needed: 2, powers: { [WORK]: 3, [CARRY]: 1, [MOVE]: 1 } },
      500: { needed: 2, powers: { [WORK]: 4, [CARRY]: 1, [MOVE]: 1 } },
      600: { needed: 1, powers: { [WORK]: 5, [CARRY]: 1, [MOVE]: 1 } },
      700: { needed: 1, powers: { [WORK]: 6, [CARRY]: 1, [MOVE]: 1 } }
    }

    // Remote missions should be checking home room for capacity, not their minig room,
    // TODO: this lookup should be done once per tick per home room, and what about requesting a spawn from another village than home?
    const roomToCheckCapacity = this.roomMemory.outpost
      ? Game.rooms[Game.creeps[this.memory.creeps.miners[0]]?.memory?.home]
      : this.room

    // TODO: should do this in a "hydrate" method, so we don't do it both in requirements and in run, and this is only really needed for villages to bootstrap 'em
    const actualMiners = this.memory.creeps.miners.reduce<Creep[]>(derefCreeps, [])
    const availableEnergy = roomToCheckCapacity?.energyAvailable ?? 300
    const capacityAvailable = roomToCheckCapacity?.energyCapacityAvailable ?? 300

    const enableBootstrapPhase =
      this.roomMemory.village &&
      actualMiners.length === 0 &&
      availableEnergy < 700 &&
      !this.roomMemory.bootstrap?.enabled

    if (enableBootstrapPhase) {
      log.warning(`${this.roomName} bootstrapping started`)
      this.roomMemory.bootstrap = { enabled: true, tick: Game.time }
      // 0 miners, request a single bootstrap miner
      const bootstrapMiners = {
        rune: "miners",
        count: this.sourceCount,
        // 300 energy
        runePowers: minerRunePowers[300].powers,
        priority: this.roomMemory.village ? 666 : 5,
        mission: this.memory.id,
        missionRoom: this.roomName
      }

      requirements.push(bootstrapMiners)
    }

    // // if (this.roomMemory.outpost) {
    // //   log.debug(`${availableEnergy} ${capacityAvailable}`) // Need to be able to toggle log level per module
    // // }

    if (!this.roomMemory.bootstrap?.enabled) {
      const minerRequirementLookup = this.getMaxTierRunePowers(300, 700, capacityAvailable, minerRunePowers)

      // TODO: TTL of creeps, to prespawn
      const neededMiners =
        Math.min(
          minerRequirementLookup.needed,
          (this.roomMemory.miningPositions ?? this.sourceCount) / this.sourceCount
        ) * this.sourceCount
      const miners = {
        rune: "miners",
        count: neededMiners - (this.memory.creeps.miners.length || 0),
        // 300 energy
        runePowers: minerRequirementLookup.powers,
        priority: this.roomMemory.village ? 10 : 5,
        mission: this.memory.id,
        missionRoom: this.roomName
      }

      if (miners.count > 0) {
        // // console.log(`[EnergyMission]: miners ${miners.count} ${this.sourceCount} ${this.memory.creeps.miners.length} `)
        requirements.push(miners)
      }
    }

    if (enableBootstrapPhase) {
      // 0 miners, request a single bootstrap miner
      const bootstrapHaulers = {
        rune: "haulers",
        count: this.sourceCount,
        // 300 energy
        runePowers: haulerTieredRunePowers[300].powers,
        priority: 555,
        mission: this.memory.id,
        missionRoom: this.roomName
      }

      requirements.push(bootstrapHaulers)
    }

    if (!this.roomMemory.bootstrap?.enabled) {
      const haulerRequirementLookup = this.getMaxTierRunePowers(300, 1000, capacityAvailable, haulerTieredRunePowers)

      const haulers = {
        rune: "haulers",
        count: this.sourceCount * 2 - (this.memory.creeps.haulers.length || 0),
        // 300 energy
        runePowers: haulerRequirementLookup.powers,
        priority: this.roomMemory.village ? 5 : 2,
        mission: this.memory.id,
        missionRoom: this.roomName
      }

      if (haulers.count > 0) {
        // // console.log(`[EnergyMission]: haulers ${haulers.count} ${this.sourceCount} ${this.memory.creeps.haulers.length} `)
        requirements.push(haulers)
      }
    }
    // Do we want a dedicated hauler per source?
    // I guess it all depends on some sort of math?
    // Also, how do we change the spawn priority of them? and is it important?

    if (
      this.roomMemory.bootstrap?.enabled &&
      actualMiners.length > 0 &&
      Game.time - this.roomMemory.bootstrap?.tick > 10
    ) {
      log.warning(`${this.roomName} bootstrapping finished`)
      this.roomMemory.bootstrap.enabled = false
    }

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

      // // if (Game.time % 10000) {
      // //   log.info(`======= ${this.memory.id} ${this.roomName} ========`)
      // //   log.info(`== miners: ${this.memory.creeps.miners.length} `)
      // //   miners.forEach(miner => log.info(`${miner.name} ${miner.body.length}`))
      // //   log.info(`== haulers: ${this.memory.creeps.haulers.length} `)
      // //   haulers.forEach(hauler => log.info(`${hauler.name} ${hauler.body.length}`))
      // // }

      // Cleanup old creeps where prayer is gone
      // TODO: this removes the last queued creep and queues a new one, it was an attempt at fixing sim, and remove old creeps from missions, when we spawn the last creep, we then reset the assigned creep....
      // // if (global.freya.prayers === 0) {
      // //   // // console.log(`Freya prayers are gone, setting miners ${miners.length} and haulers ${haulers.length} `)
      // //   // // console.log(JSON.stringify(miners))
      // //   this.memory.creeps.miners = miners.map(creep => creep.name)
      // //   this.memory.creeps.haulers = haulers.map(creep => creep.name)
      // // }

      const sources = this.roomMemory.sources || { dummyForceMiningScout: "" }
      type runes = "miners" | "haulers" // Could use this with generics for memory to descripe the types of creeps?
      type EnergyMissionCreeps = {
        [key in runes]: Creep[]
      }
      interface PotentialSource {
        source: Source | null
        targetedBy: EnergyMissionCreeps
        miningPositions: number
      }

      const potentialSources: PotentialSource[] = []

      for (const sourceId in sources) {
        // Sort sources by range from spawn, give  closer spawns higher priority
        if (sources.hasOwnProperty(sourceId)) {
          const targetedBy = _.groupBy(
            _.map(Game.TargetCache.targets[sourceId], name => Game.creeps[name]),
            "memory.rune"
          ) as EnergyMissionCreeps

          const source = Game.getObjectById<Source>(sourceId)
          const sourceScan = this.roomMemory?.sources
            ? this.roomMemory.sources[sourceId]
            : null ?? ({} as ISourceMemory)

          const miningPositions = sourceScan.miningPositions ? Object.keys(sourceScan.miningPositions) : []
          const potentialSource = {
            source,
            targetedBy,
            miningPositions: miningPositions.length
          }

          if (!potentialSource.targetedBy.miners) {
            potentialSource.targetedBy.miners = []
          }

          if (!potentialSource.targetedBy.haulers) {
            potentialSource.targetedBy.haulers = []
          }

          potentialSources.push(potentialSource)

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
        }
      }

      // // log.info(`${idleMiners.length} needs a harvest job`)
      idleMiners.forEach(miner => {
        this.relocateCreepHome(this.roomName, this.roomMemory, miner)

        let target: PotentialSource | null = null

        for (const potentialSource of potentialSources) {
          if (potentialSource.source?.energy === 0 && potentialSource.source?.ticksToRegeneration > 15) {
            continue
          }

          if (potentialSource.miningPositions === potentialSource.targetedBy.miners.length) {
            continue
          }

          if (!target) {
            target = potentialSource
          }

          if (target.targetedBy.miners.length < potentialSource.targetedBy.miners.length) {
            continue
          }

          // // log.info(`${target.targetedBy.miners?.length} < ${potentialSource.targetedBy.miners?.length}`)
          target = potentialSource
        }

        if (target) {
          target.targetedBy.miners.push(miner)

          this.assignMinerTasks(target.source, miner, haulers)
        }
      })

      idleHaulers.forEach(hauler => {
        this.relocateCreepHome(this.roomName, this.roomMemory, hauler)

        let target: PotentialSource | null = null
        // TODO: dedicated source haulers should really target the source, or perhaps the container? this solution might end up sending alternating haulers to one source letting the other rot.
        for (const potentialSource of potentialSources) {
          if (!target) {
            target = potentialSource
          }

          if (target.targetedBy.haulers?.length < potentialSource.targetedBy.haulers?.length) {
            continue
          }

          target = potentialSource
        }

        if (target) {
          target.targetedBy.haulers.push(hauler)
          this.assignHaulTask(target.source, hauler)
        }
      })

      // Run miners
      miners.forEach(creep => {
        const result = creep.run()
        if (result === ERR_NO_PATH) {
          // TODO: scan for idle creeps near source, move 'em, perhaps "park" is an option for idle creeps?
          // // log.warning(`${creep.name} is stuck getting to source near ${creep.pos.print}`)
          const closestBlockingCreeps = creep.pos.findInRange(FIND_MY_CREEPS, 1)
          if (closestBlockingCreeps.length > 0) {
            const closestBlockingCreep = closestBlockingCreeps[0]
            creep.moveTo(closestBlockingCreep.pos)
            closestBlockingCreep.moveTo(creep.pos)
            // Log.warning(`${creep.pos.print} swapping position with ${closestBlockingCreep.pos.print}`)
          }
        } else if (result === ERR_NOT_OWNER) {
          // TODO: Scan for invadercore, put mission on cooldown untill collapse -25 ticks if invadercore, should defcon indicate this?
        }
      })

      // Run haulers
      haulers.forEach(creep => {
        const result = creep.run()
        if (result === ERR_NO_PATH) {
          // TODO: scan for idle creeps near source, move 'em, perhaps "park" is an option for idle creeps?
          // // log.warning(`${creep.name} is stuck near ${creep.pos.print}`)
          const closestBlockingCreeps = creep.pos.findInRange(FIND_MY_CREEPS, 1)
          if (closestBlockingCreeps.length > 0) {
            const closestBlockingCreep = closestBlockingCreeps[0]
            creep.moveTo(closestBlockingCreep.pos)
            closestBlockingCreep.moveTo(creep.pos)
            // Log.warning(`${creep.pos.print} swapping position with ${closestBlockingCreep.pos.print}`)
          }
        }
      })

      return
    } catch (error) {
      console.log(
        `<span style='color:red'>[EnergyMission] ${_.escape(ErrorMapper.sourceMappedStackTrace(error))}</span>`
      )
    }
  }

  private goToDropOff(creep: Creep): boolean {
    return this.goToHome(creep)
  }

  private goToGoal(creep: Creep): boolean {
    return this.goToRoom(creep, this.roomName)
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
      if (this.goToGoal(creep)) {
        return
      }

      if (source) {
        creep.task = Tasks.harvest(source) // Harvest task might need options for harvesting while full on energy, e.g. drop-harvesting

        const sources = this.roomMemory?.sources
        const sourceMemory = sources ? sources[source?.id as string] : null

        const sourceContainer = deref(sourceMemory?.containerId as string) as StructureContainer

        if (sourceContainer) {
          // Do we potentially have an issue if someone is blocking the position?, we can't have all creeps go to that position either.
          const runePowers = calculateRunePowers(creep.body.map(body => body.type))
          const staticMiner = ((runePowers && runePowers[WORK]) ?? 0) >= 5
          if (staticMiner) {
            creep.task.fork(Tasks.goTo(sourceContainer, { moveOptions: { range: 0 } }))
          }
        }

        return
      }
    }
  }

  private assignHaulTask(source: Source | null, creep: Creep): void {
    // TODO: do we need to toggle a collection or delivery mode?, should probably check all sources, and not only 1?
    if (!creep.memory.mode || creep.memory.mode === HaulingMode.collecting) {
      if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.mode = HaulingMode.delivering
      }
    } else if (creep.memory.mode === HaulingMode.delivering) {
      if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === creep.store.getCapacity(RESOURCE_ENERGY)) {
        creep.memory.mode = HaulingMode.collecting
      }
    }

    const sources = this.roomMemory?.sources
    const sourceMemory = sources ? sources[source?.id as string] : null

    if (creep.memory.mode === HaulingMode.delivering) {
      delete creep.memory.target

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

                return extension.room.controller?.my && extension.energy < extension.energyCapacity
              case STRUCTURE_SPAWN:
                const spawn = structure as StructureSpawn

                return spawn.room.controller?.my && spawn.energy < spawn.energyCapacity
              case STRUCTURE_STORAGE:
                const storage = structure as StructureStorage

                return (
                  storage.room.controller?.my &&
                  storage.store[RESOURCE_ENERGY] < storage.storeCapacity &&
                  creep.room.energyAvailable === creep.room.energyCapacityAvailable
                )
              // Case STRUCTURE_TOWER:
              //     Const tower = structure as StructureTower
              //     Return tower.energy < tower.energyCapacity
              case STRUCTURE_CONTAINER:
                const container = structure as StructureContainer

                return (
                  (!sources || !_.some(sources, mem => container.id === mem.containerId)) &&
                  // // structure.id !== sourceMemory?.containerId
                  container.store[RESOURCE_ENERGY] < container.storeCapacity
                )
            }

            return false
          }
        }
      )

      if (target) {
        creep.task = Tasks.transfer(target)

        return
      }

      // Find a builder to transfer too
      const builders = creep.pos.findInRange(FIND_MY_CREEPS, 10, {
        filter: builder => builder.memory.rune === "builders" && builder.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      })

      if (builders.length > 0) {
        const transferTasks = builders.map(builder => {
          const neededAmount = builder.store.getFreeCapacity(RESOURCE_ENERGY)

          return Tasks.transfer(builder, RESOURCE_ENERGY, neededAmount)
        })

        creep.task = Tasks.chain(transferTasks)

        return
      }

      // Find an upgrader to transfer too
      const upgraders = creep.pos.findInRange(FIND_MY_CREEPS, 10, {
        filter: upgrader => upgrader.memory.rune === "upgraders" && upgrader.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      })

      if (upgraders.length > 0) {
        const transferTasks = upgraders.map(upgrader => {
          const neededAmount = upgrader.store.getFreeCapacity(RESOURCE_ENERGY)

          return Tasks.transfer(upgrader, RESOURCE_ENERGY, neededAmount)
        })

        creep.task = Tasks.chain(transferTasks)

        return
      }
    } else {
      creep.memory.target = source?.id
      if (this.goToGoal(creep)) {
        return
      }

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

        if (sourceContainer && sourceContainer.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
          creep.task = Tasks.withdraw(sourceContainer)

          return
        }

        const resources = source.pos.findInRange(FIND_DROPPED_RESOURCES, 2)
        if (resources.length > 0) {
          const pickUpTasks = resources.map(r => Tasks.pickup(r))
          creep.task = Tasks.chain(pickUpTasks)

          return
        }

        const resourcesInRoom = source.pos.findInRange(FIND_DROPPED_RESOURCES, 25)
        if (resourcesInRoom.length > 0) {
          const pickUpTasks = resourcesInRoom.map(r => Tasks.pickup(r))
          creep.task = Tasks.chain(pickUpTasks)

          return
        }

        // Do we have storage? fill extensions with energy from that then
        if (
          creep.room.controller?.my && // TODO: hostile ramparts prevents pulling from storage
          creep.room.storage &&
          creep.room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        ) {
          creep.task = Tasks.withdraw(creep.room.storage)

          return
        }

        // This results in all haulers wanting to stand the same place? basicly dancing near the source in a range of 2, task never finishes, thus never bercomes idle
        // Go stand near the source
        if (creep.pos.getRangeTo(source.pos) > 6) {
          creep.task = Tasks.goTo(source, { moveOptions: { range: 2 } })

          return
        }
      }
    }
    // TODO: move creeps in the way?
  }
}
