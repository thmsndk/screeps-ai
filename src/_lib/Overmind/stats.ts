import { Mem } from "./Memory"
import { exponentialMovingAverage } from "./utils"
import { profile } from "_lib/Profiler"

/**
 * Operational statistics, stored in Memory.stats, will be updated every (this many) ticks
 */
export const LOG_STATS_INTERVAL = 8

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
    if (Game.time % LOG_STATS_INTERVAL === 0) {
      for (const roomName in Game.rooms) {
        if (Game.rooms.hasOwnProperty(roomName)) {
          const room = Game.rooms[roomName]
          if (room) {
            // Log energy and rcl
            Stats.log(`colonies.${room.name}.storage.energy`, room.storage?.store.getUsedCapacity(RESOURCE_ENERGY))
            Stats.log(`colonies.${room.name}.rcl.level`, room.controller?.level)
            Stats.log(`colonies.${room.name}.rcl.progress`, room.controller?.progress)
            Stats.log(`colonies.${room.name}.rcl.progressTotal`, room.controller?.progressTotal)
            // Log average miningSite usage and uptime and estimated colony energy income
            // // const numSites = _.keys(this.miningSites).length
            // // const avgDowntime = _.sum(this.miningSites, site => site.memory[_HARVEST_MEM_DOWNTIME]) / numSites
            // // const avgUsage = _.sum(this.miningSites, site => site.memory[_HARVEST_MEM_USAGE]) / numSites
            // // const energyInPerTick = _.sum(
            // //   this.miningSites,
            // //   site => site.overlords.mine.energyPerTick * site.memory[_HARVEST_MEM_USAGE]
            // // )
            // // Stats.log(`colonies.${this.name}.miningSites.avgDowntime`, avgDowntime)
            // // Stats.log(`colonies.${this.name}.miningSites.avgUsage`, avgUsage)
            // // Stats.log(`colonies.${this.name}.miningSites.energyInPerTick`, energyInPerTick)
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
