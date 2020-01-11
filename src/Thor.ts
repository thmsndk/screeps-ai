import { profile } from "_lib/Profiler"

export interface IMemoryDefcon {
  level: number
  tick: number
  // Hostiles: RoomPosition[]
  [key: string]: number
}

export enum DEFCON {
  safe = 0,
  // eslint-disable-next-line no-bitwise
  invasionNPC = 1 << 0,
  // eslint-disable-next-line no-bitwise
  boosted = 1 << 1,
  // eslint-disable-next-line no-bitwise
  playerInvasion = 1 << 2,
  // eslint-disable-next-line no-bitwise
  bigPlayerInvasion = 1 << 3,
  // eslint-disable-next-line no-bitwise
  invadercore = 1 << 4,
  // eslint-disable-next-line no-bitwise
  nuke = 1 << 5

  // TODO: invadercores , nukes, scouts scanning hostiles moving towards a village
}

// // export enum DEFCONLEVEL {
// //   NONE,
// //   HOSTILES,
// //   POSSIBLE_ATTACK
// // }

/**
 * Thor should be the god of war, not responsible for defense / determining defcon, should they?
 */
@profile
export class Thor {
  public dangerousHostiles: { [index: string]: Creep[] }

  public constructor() {
    this.dangerousHostiles = {}
  }

  /**
   * Scan
   */
  public scan(room: Room): void {
    // Set DEFCON level
    const dangerousHostiles = (this.dangerousHostiles[room.name] = this.getDangerousHostiles(room)) // TODO: filter out allies?

    let defcon = DEFCON.safe
    const defconDecayTime = 200
    if (dangerousHostiles.length > 0 && !room.controller?.safeMode) {
      const effectiveHostileCount = _.sum(
        _.map(dangerousHostiles, hostile => (this.getCreepBoosts(hostile).length > 0 ? 2 : 1))
      )

      const npcUserNames = ["Invader", "Source Keeper"]
      const playerInvasion = !npcUserNames.some(npc => dangerousHostiles[0].owner.username === npc)

      defcon = playerInvasion ? DEFCON.playerInvasion : DEFCON.invasionNPC

      if (effectiveHostileCount >= 3) {
        // eslint-disable-next-line no-bitwise
        defcon |= DEFCON.boosted
      }
    }

    if (room.memory.DEFCON) {
      if (defcon < room.memory.DEFCON.level) {
        // Decay defcon level over time if defcon less than memory value
        if (room.memory.DEFCON.tick + defconDecayTime < Game.time) {
          room.memory.DEFCON.level = defcon
          room.memory.DEFCON.tick = Game.time
        }
      } else if (defcon > room.memory.DEFCON.level) {
        // Refresh defcon time if it increases by a level
        room.memory.DEFCON.level = defcon
        room.memory.DEFCON.tick = Game.time
      }
    } else {
      room.memory.DEFCON = {
        level: defcon,
        tick: Game.time
      }
    }

    // // this.breached = (this.room.dangerousHostiles.length > 0 &&
    // //   this.creeps.length == 0 &&
    // //   !this.controller.safeMode);
  }

  public getDangerousHostiles(room: Room): Creep[] {
    const hostiles = room.find(FIND_HOSTILE_CREEPS)
    if (room.controller?.my) {
      return _.filter(
        hostiles,
        (creep: Creep) =>
          creep.getActiveBodyparts(ATTACK) > 0 ||
          creep.getActiveBodyparts(WORK) > 0 ||
          creep.getActiveBodyparts(RANGED_ATTACK) > 0 ||
          creep.getActiveBodyparts(HEAL) > 0
      )
    } else {
      return _.filter(
        hostiles,
        (creep: Creep) =>
          creep.getActiveBodyparts(ATTACK) > 0 ||
          creep.getActiveBodyparts(RANGED_ATTACK) > 0 ||
          creep.getActiveBodyparts(HEAL) > 0
      )
    }
  }

  public getCreepBoosts(creep: Creep): _ResourceConstantSansEnergy[] {
    return _.compact(
      _.unique(_.map(creep.body as BodyPartDefinition[], bodyPart => bodyPart.boost))
    ) as _ResourceConstantSansEnergy[]
  }
}

export default new Thor()
