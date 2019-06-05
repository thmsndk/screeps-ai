import { IRemoteEnergyMissionMemory } from "types"
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
  }
}
