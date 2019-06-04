import { Mission, IMissionMemory } from "./Mission"
import { getPositions } from "RoomScanner"

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
  memory?: IMissionMemory
  flags?: Flag[]
}

export class RemoteEnergyMission extends Mission {
  private roomName: string
  private roomMemory: RoomMemory

  constructor(params: RemoteEnergyMissionConstructor) {
    let roomMemory = Memory.rooms[params.roomName]

    if (!params.memory) {
      // no memory, we need to initialize it
      if (params.flags) {
        // extract out "remote" flag, we need an id in memory to determine if we should create a new mission
        const remoteFlag = params.flags.find(flag => flag.name.startsWith("remote"))
        if (remoteFlag) {
          const sourceFlags = params.flags.filter(flag => flag.name.startsWith("source"))

          params.memory = roomMemory.remoteEnergyMission = {
            flagId: remoteFlag.name,
            jobs: {},
            sourceFlags: sourceFlags.map(flag => flag.name)
          }

          const roomTerrain = new Room.Terrain(params.roomName)
          // foreach source flag, calculate positions
          sourceFlags.forEach(sourceFlag => {
            const miningPositions = getPositions(roomTerrain, sourceFlag.pos)
            sourceFlag.memory.miningPositions = miningPositions.length
          })
        }
      }
    }

    super(params.memory)
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
  }
}
