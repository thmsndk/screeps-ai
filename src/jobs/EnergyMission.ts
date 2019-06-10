import { Job, JobPriority } from "./Job"
import { RoomScanner } from "RoomScanner"
import { MiningHaulingJob } from "./MiningHaulingJob"
import { MiningJob } from "./MiningJob"
import { deseralizeJobCreeps } from "utils/MemoryUtil"
import { profile } from "_lib/Profiler"
const roomScanner = new RoomScanner()

/**
 * Responsible for mining in visible rooms
 */
@profile
export class EnergyMission {
  private room: Room
  private memory: IEnergyMission

  constructor(room: Room) {
    this.room = room
    if (!this.room.memory.energymission) {
      this.room.memory.energymission = { jobs: {} }
    }
    this.memory = this.room.memory.energymission
  }

  /**
   * run
   */
  public run() {
    // TODO: only run the static scan once per new room
    roomScanner.scan(this.room)

    // generate mining jobs
    // prioritize mining jobs
    const jobs: Array<MiningJob | MiningHaulingJob> = []
    const sources = this.room.memory.sources || {}
    for (const sourceId in sources) {
      // sort sources by range from spawn, give  closer spawns higher priority
      if (sources.hasOwnProperty(sourceId)) {
        const source = Game.getObjectById<Source>(sourceId)

        if (source) {
          const sourceMemory = sources[sourceId]

          // TODO: if there is no container, or miners do not drop resources, there is no point in haulers for this
          // Should haulingjob be a subroutine/job for miningjob aswell, so mining job knows it has a hauler? Creeps should could be split into Haulers and Miners?
          if (!this.memory.jobs[sourceId]) {
            // TODO: this need to be refactored, HaulerJob should initialize it's memory, but what when we deseralize it?

            const distanceWeight = 0.3
            const miningPositionsWeight = 1
            const missionPriroty =
              sourceMemory.distanceToSpawn * distanceWeight +
              sourceMemory.miningPositions.length * miningPositionsWeight

            const haulingJob = new MiningHaulingJob(source, sourceMemory)
            const miningJob = new MiningJob(source, sourceMemory, haulingJob)

            miningJob.memory.missionPriority = missionPriroty
            haulingJob.memory.missionPriority = missionPriroty

            this.memory.jobs[sourceId] = miningJob.memory
            jobs.push(miningJob)
            jobs.push(haulingJob)
          } else {
            const miningMemory = this.memory.jobs[sourceId]
            if (miningMemory) {
              if (miningMemory.jobs) {
                const haulerMemory = miningMemory.jobs[0]
                const haulers = deseralizeJobCreeps(haulerMemory)
                const miners = deseralizeJobCreeps(miningMemory)

                const haulingJob = new MiningHaulingJob(source, sourceMemory, haulerMemory, haulers)
                const miningJob = new MiningJob(source, sourceMemory, haulingJob, miningMemory, miners)

                jobs.push(miningJob)
                jobs.push(haulingJob)
              }
            }
          }
        }
      }
    }

    // run mining jobs
    // sort by priority
    jobs.sort((a, b) => {
      const aPriority = a.memory.missionPriority ? a.memory.missionPriority : -1
      const bPriority = b.memory.missionPriority ? b.memory.missionPriority : -1
      //
      return aPriority - bPriority
    })

    jobs.forEach(job => {
      job.run()
    })
  }

  // this mission should live in room memory

  // EnergyMission is a mission for a specific room
  // e.g. could be our initial first room
  // it should prioritize all resource nodes in the room based on distance to nearest drop off location
  // in this prioritization it should consider how many miningspots there are present
  // should we store a potential yield based on assigned creeps? on each resource node?

  // it should only be responsible for specific rooms where we want to harvest

  // it should be responsible for
  // collection of resource nodes
  // collection of jobs per resource node?
}
