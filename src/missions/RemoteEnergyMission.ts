import { JobPriority } from "jobs/Job"
import { IRemoteEnergyMissionMemory } from "types"
import { Mission, IMissionMemory } from "./Mission"
import { getPositions, RoomScanner } from "RoomScanner"
import { Hatchery, CreepMutations } from "Hatchery"

/**
 * Remote Energy mission
 *  Initially, we know nothing about the room
 *      Flag based intel - I manually place flags at the sources
 *      Scout intel - we send a scout to gather intel in the room
 *
 *  1 Flag Approach
 *      place remote flag in room
 *      Do we have terrain info and sources?
 *          No? Send scout
 *      ... Profit
 *
 *  Multiple Flag Approach
 *      Place flag on each source name it REMOTE{#}
 *      Get room terrain around each flag e.g. mining positions
 *      Get distance from flag to nearest container / spawn to prioritize jobs
 *      spawn RemoteMiningJobs per flag
 *      request harvesters (what about haulers?)
 *
 *  Combination
 *      Place source flags
 *      Place RMM Flag
 *          No source flags => send scout
 *          Else calculate mining positions => persist on source flags
 *      Request harvesters, at minimum 1 high priority harvester if we never had vision on room
 *      Do we have vision?
 *          Yes => scan room once => delete source flags => turn flag green
 *
 *
 *
 *      Disable / pause mission by turning flag red?
 *
 */

interface RemoteEnergyMissionConstructor {
  roomName: string
  memory?: IRemoteEnergyMissionMemory
  flags?: Flag[]
}

export class RemoteEnergyMission extends Mission {
  private roomName: string
  private roomMemory: RoomMemory
  public memory?: IRemoteEnergyMissionMemory

  constructor(params: RemoteEnergyMissionConstructor) {
    const roomMemory = Memory.rooms[params.roomName]

    if (!params.memory) {
      console.log("memoery null", params.memory)
      if (params.flags) {
        const remoteFlag = params.flags.find(flag => flag.name.startsWith("remote"))
        if (remoteFlag) {
          const sourceFlags = params.flags.filter(flag => flag.name.startsWith("source"))

          if (!roomMemory.remoteEnergyMission) {
            roomMemory.remoteEnergyMission = {
              flagId: remoteFlag.name,
              jobs: {},
              sourceFlags: sourceFlags.map(flag => flag.name)
            }
          }

          params.memory = roomMemory.remoteEnergyMission

          const roomTerrain = new Room.Terrain(params.roomName)

          // calculate mining positions
          sourceFlags.forEach(sourceFlag => {
            const miningPositions = getPositions(roomTerrain, sourceFlag.pos)
            sourceFlag.memory.miningPositions = miningPositions.length
          })
        }
      }
    }

    super(params.memory)
    this.memory = roomMemory.remoteEnergyMission
    this.roomName = params.roomName
    this.roomMemory = roomMemory
  }

  /**
   * run
   */
  public run() {
    // have we scanned the room?
    // yes => have we queued miningjobs for sources? (move assigned creeps from flag to source)
    // no => have we calculates source flags?
    //  yes => have we requested enough creeps?

    if (this.memory) {
      const flagId = this.memory.flagId
      const remoteFlag = Game.flags[flagId]

      const roomHasBeenScanned = !!this.roomMemory.sources
      if (!roomHasBeenScanned) {
        // check requested creeps
        const missionCreeps = this.getMissionCreeps(flagId)

        const hatchery = new Hatchery(Game.spawns.Spawn1) // TODO: Hatchery should be a singleton?
        let requestedHarvesters = hatchery.getRequests(flagId, CreepMutations.HARVESTER)
        const miningPositions = this.getMiningPositionsFromFlags()

        if (miningPositions > requestedHarvesters + missionCreeps.length) {
          requestedHarvesters = requestPriorityHarvester(requestedHarvesters, hatchery, flagId)

          requestRemainingHarvesters(requestedHarvesters, miningPositions, hatchery, flagId)
        }

        // make creeps move to target
        // create move to remote location job?
        missionCreeps.forEach(creep => {
          creep.moveTo(remoteFlag.pos)
        })

        // room is visible
        isRoomVisible(remoteFlag)
      } else {
        // console.log("scanned room!!")
        // room has been scanned, do we have remote mining jobs?
        /* no => create mining jobs for each sourceFlag
              => grab creeps assigned to remote mining mission
                => assign to sources
                  => delete source flags
        yes => run job
      */
        // temporary untill migration is implemented
        const missionCreeps = this.getMissionCreeps(flagId)
        missionCreeps.forEach(creep => {
          creep.moveTo(remoteFlag.pos)
        })
      }
    }
  }

  private getMissionCreeps(flagId: string) {
    return _.filter(Game.creeps, creep => creep.memory.target === flagId)
  }

  private getMiningPositionsFromFlags() {
    let miningPositions = 0
    if (this.memory && this.memory.sourceFlags) {
      miningPositions = this.memory.sourceFlags
        .map(flagName => Game.flags[flagName].memory.miningPositions)
        .reduce((sum, positions) => {
          return sum + positions
        })
    }
    return miningPositions
  }
}

function requestRemainingHarvesters(
  requestedHarvesters: number,
  miningPositions: number,
  hatchery: Hatchery,
  flagId: string
) {
  for (let index = requestedHarvesters; index < miningPositions; index++) {
    hatchery.queue({
      target: flagId,
      mutation: CreepMutations.HARVESTER,
      priority: JobPriority.Medium,
      employed: true
    })
  }
}

function requestPriorityHarvester(requestedHarvesters: number, hatchery: Hatchery, flagId: string) {
  if (requestedHarvesters === 0) {
    hatchery.queue({
      target: flagId,
      mutation: CreepMutations.HARVESTER,
      priority: JobPriority.High
    })
    requestedHarvesters += 1
  }
  return requestedHarvesters
}

function isRoomVisible(remoteFlag: Flag) {
  if (remoteFlag.room) {
    new RoomScanner().scan(remoteFlag.room)
  }
}
