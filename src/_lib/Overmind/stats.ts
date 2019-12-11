import { Mem } from "./Memory"
import { exponentialMovingAverage } from "./utils"
import { profile } from "_lib/Profiler"
import { deref } from "task/utilities/utilities"

/**
 * Operational statistics, stored in Memory.stats, will be updated every (this many) ticks
 */
export const LOG_STATS_INTERVAL = 8
const HARVEST_MEM_PATHING = "P"
const HARVEST_MEM_USAGE = "u"
const HARVEST_MEM_DOWNTIME = "d"
const SOURCE_MEM_ENERGY_PER_TICK = "e"

@profile
export class Stats {
  public static clean(): void {
    if (Game.time % LOG_STATS_INTERVAL == 0) {
      const protectedKeys = ["persistent"]
      for (const key in Memory.stats) {
        if (!protectedKeys.includes(key)) {
          delete Memory.stats[key]
        }
      }
    }
  }

  public static log(key: string, value: number | { [key: string]: number } | undefined, truncateNumbers = true): void {
    if (Game.time % LOG_STATS_INTERVAL == 0) {
      if (truncateNumbers && value != undefined) {
        const decimals = 5
        if (typeof value == "number") {
          value = value.truncate(decimals)
        } else {
          for (const i in value) {
            value[i] = value[i].truncate(decimals)
          }
        }
      }
      Mem.setDeep(Memory.stats, key, value)
    }
  }

  // Static accumulate(key: string, value: number): void {
  // 	If (!Memory.stats[key]) {
  // 		Memory.stats[key] = 0;
  // 	}
  // 	Memory.stats[key] += value;
  // }

  public static run(): void {
    if (Game.time % LOG_STATS_INTERVAL === 0) {
      // Record IVM heap statistics
      Memory.stats["cpu.heapStatistics"] = (Game.cpu as any).getHeapStatistics()
      // Log GCL
      this.log("gcl.progress", Game.gcl.progress)
      this.log("gcl.progressTotal", Game.gcl.progressTotal)
      this.log("gcl.level", Game.gcl.level)
      // Log memory usage
      this.log("memory.used", RawMemory.get().length)
      // Log CPU
      this.log("cpu.limit", Game.cpu.limit)
      this.log("cpu.bucket", Game.cpu.bucket)
    }
    const used = Game.cpu.getUsed()
    this.log("cpu.getUsed", used)
    Memory.stats.persistent.avgCPU = exponentialMovingAverage(used, Memory.stats.persistent.avgCPU, 100)
  }

  public static colonyStats(): void {
    // If (Game.time % LOG_STATS_INTERVAL === 0) {
    for (const roomName in Game.rooms) {
      if (Game.rooms.hasOwnProperty(roomName)) {
        const room = Game.rooms[roomName]
        if (room) {
          const miningSites = Stats.updateMiningSitesStats(room) // We want to do this each tick, should probably be in the energy mission "stats" collection method

          if (Game.time % LOG_STATS_INTERVAL !== 0) {
            continue
          }

          // Log energy and rcl
          Stats.log(`colonies.${room.name}.storage.energy`, room.storage?.store.getUsedCapacity(RESOURCE_ENERGY))
          Stats.log(`colonies.${room.name}.rcl.level`, room.controller?.level)
          Stats.log(`colonies.${room.name}.rcl.progress`, room.controller?.progress)
          Stats.log(`colonies.${room.name}.rcl.progressTotal`, room.controller?.progressTotal)
          // Log average miningSite usage and uptime and estimated colony energy income
          const numSites = _.keys(miningSites).length
          const avgDowntime = _.sum(miningSites, site => site[HARVEST_MEM_DOWNTIME]) / numSites
          const avgUsage = _.sum(miningSites, site => site[HARVEST_MEM_USAGE]) / numSites
          const energyInPerTick = _.sum(miningSites, site => site[SOURCE_MEM_ENERGY_PER_TICK] * site[HARVEST_MEM_USAGE])
          Stats.log(`colonies.${room.name}.miningSites.avgDowntime`, avgDowntime)
          Stats.log(`colonies.${room.name}.miningSites.avgUsage`, avgUsage)
          Stats.log(`colonies.${room.name}.miningSites.energyInPerTick`, energyInPerTick)
          // // Stats.log(`colonies.${this.name}.assets`, this.getAllAssets())
          // Log defensive properties
          // // Stats.log(`colonies.${this.name}.defcon`, this.defcon)
          const barriers = room.find(FIND_STRUCTURES, {
            filter: structure =>
              structure.structureType === STRUCTURE_RAMPART || structure.structureType === STRUCTURE_WALL
          })
          const avgBarrierHits = _.sum(barriers, barrier => barrier.hits) / barriers.length
          Stats.log(`colonies.${room.name}.avgBarrierHits`, avgBarrierHits)
        }
      }
    }
  }

  // TODO: theese stats needs to be moved somewhere, elders needs theese stats to determine if an outpost is a good outpost or not
  public static updateMiningSitesStats(room: Room): ISourceMemory[] {
    return Object.keys(room.memory.sources ?? {}).reduce<ISourceMemory[]>(
      (result: ISourceMemory[], sourceId: string): ISourceMemory[] => {
        const source = deref(sourceId) as Source
        if (source) {
          const sourceMemory = room.memory?.sources ? room.memory?.sources[sourceId] : null

          if (!sourceMemory) {
            return result
          }

          if (source.ticksToRegeneration === 1) {
            sourceMemory[HARVEST_MEM_USAGE] = (source.energyCapacity - source.energy) / source.energyCapacity
          }

          // https://github.com/bencbartlett/Overmind/blob/5eca49a0d988a1f810a11b9c73d4d8961efca889/src/overlords/mining/miner.ts#L60-L67
          // When we reserve a controller this changes energy per tick, and with a 1 claim reserver, this resets the total capacity sometimes, can we be smart about that? we only persist usage at the last tick, so the capacity might be skewed?
          if (!sourceMemory[SOURCE_MEM_ENERGY_PER_TICK]) {
            // Calculate at scan? but what when we reserve then ?
            sourceMemory[SOURCE_MEM_ENERGY_PER_TICK] = source.energyCapacity / ENERGY_REGEN_TIME
          }

          const container = sourceMemory?.containerId ? (deref(sourceMemory?.containerId) as StructureContainer) : null

          sourceMemory[HARVEST_MEM_DOWNTIME] = +exponentialMovingAverage(
            container ? +(container.store.getFreeCapacity(RESOURCE_ENERGY) === 0) : 0,
            sourceMemory[HARVEST_MEM_DOWNTIME],
            CREEP_LIFE_TIME
          ).toFixed(5)

          result.push(sourceMemory)
        }

        return result
      },
      []
    )
  }

  // //   /**
  // //    * Summarizes the total of all resources in colony store structures, labs, and some creeps
  // //    */
  // //   private static getAllAssets(verbose = false): { [resourceType: string]: number } {
  // //     // If (this.name == 'E8S45') verbose = true; // 18863
  // //     // Include storage structures, lab contents, and manager carry
  // //     const stores = _.map(_.compact([this.storage, this.terminal]) as StoreStructure[], s => s.store)
  // //     const creepCarriesToInclude = _.map(Game.creeps.filter(c => c.memory.home == Room.name), creep => creep.carry) as { [resourceType: string]: number }[]
  // //     const labContentsToInclude = _.map(
  // //       _.filter(this.labs, lab => !!lab.mineralType),
  // //       lab => ({ [<string>lab.mineralType]: lab.mineralAmount })
  // //     ) as { [resourceType: string]: number }[]
  // //     const allAssets: { [resourceType: string]: number } = mergeSum([
  // //       ...stores,
  // //       ...creepCarriesToInclude,
  // //       ...labContentsToInclude
  // //     ])
  // //     if (verbose) {log.debug(`${this.room.print} assets: ` + JSON.stringify(allAssets))}

  // //     return allAssets
  // //   }
}
