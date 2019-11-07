import { profile } from "_lib/Profiler"
import { deseralizeJobCreeps } from "utils/MemoryUtil"
import { Job, JobPriority } from "./Job"
import { MiningHaulingJob } from "./MiningHaulingJob"
import { MiningJob } from "./MiningJob"
import { RunePowers, RuneRequirement } from "Freya"

/**
 * Responsible for mining in villages, should it also handle outposts?
 */
@profile
export class EnergyMission {
  private room: Room
  private memory: IEnergyMission
  private sourceCount: number

  constructor(room: Room) {
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

  public addCreep(creep: Creep | string, rune: string) {
    const name = typeof creep === "string" ? creep : creep.name
    this.addCreepByName(name, rune)
  }

  public addCreepByName(creepName: string, rune: string) {
    this.memory.creeps[rune].push(creepName)
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
      runePowers: { [WORK]: 2, [CARRY]: 1, [MOVE]: 1 }
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
  public run() {
    if (!this.room) {
      console.log("[Warning] room is not visible, skipping energy mission")
      return
    }

    console.log("[Warning] energy mission not implemented")
    return

    // Assign miners tasks
    // Assign haulers tasks

    // Run miners
    // Run haulers

    // // TODO determine if it should be the cheapest harvesters?
    // // const harvesters = _.filter(Game.creeps, creep => creep.memory.role === Role.harvester)
    // // if (harvesters.length === 0) {
    // //   spendingCap = 300
    // // }

    // // should energy reservations have a priority? should we reserve energy for the spawn?
    // // hatchery.queue({
    // //   CreepMutations.HARVESTER,
    // //   target: this.target,
    // //   priority
    // // })

    // // TODO: We need to calculate our current energy consumption rate vs what energy harvest rate we need
    // // based on this calculation we should adjust how many harvesters we want and what spending cap they should have

    // // generate mining jobs
    // // prioritize mining jobs
    // Const jobs: Array<MiningJob | MiningHaulingJob> = []
    // Const sources = this.room.memory.sources || {}
    // For (const sourceId in sources) {
    //   // sort sources by range from spawn, give  closer spawns higher priority
    //   If (sources.hasOwnProperty(sourceId)) {
    //     Const source = Game.getObjectById<Source>(sourceId)

    //     If (source) {
    //       Const sourceMemory = sources[sourceId]

    //       // TODO: if there is no container, or miners do not drop resources, there is no point in haulers for this
    //       // Should haulingjob be a subroutine/job for miningjob aswell, so mining job knows it has a hauler? Creeps should could be split into Haulers and Miners?
    //       If (!this.memory.jobs[sourceId]) {
    //         // TODO: this need to be refactored, HaulerJob should initialize it's memory, but what when we deseralize it?

    //         Const distanceWeight = 0.3
    //         Const miningPositionsWeight = 1
    //         Const missionPriroty =
    //           SourceMemory.distanceToSpawn * distanceWeight +
    //           SourceMemory.miningPositions.length * miningPositionsWeight

    //         Const haulingJob = new MiningHaulingJob(source, sourceMemory)
    //         Const miningJob = new MiningJob(source, sourceMemory, haulingJob)

    //         MiningJob.memory.missionPriority = missionPriroty
    //         HaulingJob.memory.missionPriority = missionPriroty

    //         This.memory.jobs[sourceId] = miningJob.memory
    //         Jobs.push(miningJob)
    //         Jobs.push(haulingJob)
    //       } else {
    //         Const miningMemory = this.memory.jobs[sourceId]
    //         // console.log("miningMemeory", JSON.stringify(miningMemory))
    //         If (miningMemory) {
    //           If (miningMemory.jobs) {
    //             Const haulerMemory = miningMemory.jobs[0]
    //             Const haulers = deseralizeJobCreeps(haulerMemory)
    //             Const miners = deseralizeJobCreeps(miningMemory)

    //             Const haulingJob = new MiningHaulingJob(source, sourceMemory, haulerMemory, haulers)
    //             Const miningJob = new MiningJob(source, sourceMemory, haulingJob, miningMemory, miners)

    //             Jobs.push(miningJob)
    //             Jobs.push(haulingJob)
    //           }
    //         }
    //       }
    //     }
    //   }
    // }

    // // run mining jobs
    // // sort by priority
    // Jobs.sort((a, b) => {
    //   Const aPriority = a.memory.missionPriority ? a.memory.missionPriority : -1
    //   Const bPriority = b.memory.missionPriority ? b.memory.missionPriority : -1
    //   //
    //   Return aPriority - bPriority
    // })

    // Jobs.forEach(job => {
    //   Job.run()
    // })
  }

  // This mission should live in room memory

  // EnergyMission is a mission for a specific room
  // E.g. could be our initial first room
  // It should prioritize all resource nodes in the room based on distance to nearest drop off location
  // In this prioritization it should consider how many miningspots there are present
  // Should we store a potential yield based on assigned creeps? on each resource node?

  // It should only be responsible for specific rooms where we want to harvest

  // It should be responsible for
  // Collection of resource nodes
  // Collection of jobs per resource node?
}
