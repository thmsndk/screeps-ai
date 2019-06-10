import { profile } from "_lib/Profiler"

export interface IMemoryDefcon {
  level: number
  // hostiles: RoomPosition[]
}

export enum DEFCONLEVEL {
  NONE,
  HOSTILES,
  POSSIBLE_ATTACK
}

@profile
export class DEFCON {
  /**
   * scan
   */
  public scan(room: Room) {
    const hostiles = room.find(FIND_HOSTILE_CREEPS)
    const possibleAttackers = hostiles.filter(
      c => c.getActiveBodyparts(ATTACK) > 0 || c.getActiveBodyparts(RANGED_ATTACK) > 0
    )
    let level = DEFCONLEVEL.NONE
    if (!room.memory.DEFCON) {
      room.memory.DEFCON = {
        level: level
        // hostiles: 0
      }
    }

    if (hostiles.length > 1) {
      level = DEFCONLEVEL.HOSTILES
    }

    if (possibleAttackers.length > 0) {
      level = DEFCONLEVEL.POSSIBLE_ATTACK
    }

    room.memory.DEFCON.level = level
  }
}

export default new DEFCON()
