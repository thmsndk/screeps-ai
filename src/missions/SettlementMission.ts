import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement, RunePowers } from "Freya"
import { Mission, derefCreeps } from "./Mission"
import { ErrorMapper } from "utils/ErrorMapper"
import { log } from "_lib/Overmind/console/log"

/**
 * Should this mission be SettlementAid instead? e.g. aid from high lvl rooms?
 *
 * Settlement mission includes the following creeps & objectives
 * - claimer (Currently handled by claim mission)
 * - builders
 * - defenders
 * - upgraders
 *
 * The following objectives is the success criteria for this mission
 * - controller has been claimed
 * - room plan has been made.
 * - spawn has been built (15.000 energy) the following depends on how many rooms we have available that can assist in getting it up and running, how close they are, and whatnot
 *   - we can send miners 15000 / (3000*0.9) = 5.5 * 300ticks = 1666 ticks with 1 source, ~833 with two sources.
 *   - we can send haulers with energy to speed up building, 50 parter can contain ~1200 energy
 *     - 25M25C 2500 energy, RCL 7 can carry 1250 energy https://screeps.arcath.net/creep-designer/?share=25#0#0#0#0#0#0#25
 *   - we can send builders geared for working, having haulers supply builders with energy
 *     - 11M36W3C 4300 energy and RCL 7 https://screeps.arcath.net/creep-designer/?share=11#36#0#0#0#0#0#3
 * - how long should we bootstrap a room, untill storage is built?, tower?
 * - defender has defended (optional)
 * - settlement is marked as a vilage
 *   - if settlement was an outpost, it is no longer an outpost.
 */
@profile
export class SettlementMission extends Mission {
  private room?: Room

  private roomName: string

  private roomMemory: RoomMemory

  public constructor(room: Room | string) {
    const roomMemory = typeof room === "string" ? Memory.rooms[room] : room.memory
    const roomName = typeof room === "string" ? room : room.name
    if (!roomMemory.settlementmission) {
      roomMemory.settlementmission = {
        id: "",
        creeps: {
          // TODO: how do we define a more explicit interface allowing to catch wrongly initialized memory?
          settlers: []
        }
      }
    }

    super(roomMemory.settlementmission)

    this.roomMemory = roomMemory
    this.roomName = roomName

    if (room instanceof Room) {
      this.room = room
    }
  }

  public getRequirements(): RuneRequirement[] {
    const requirements = [] as RuneRequirement[]
    const settlersRunePowers: { [key: number]: { needed: number; powers: RunePowers } } = {
      300: { needed: 3, powers: { [WORK]: 2, [CARRY]: 1, [MOVE]: 1 } },
      400: { needed: 2, powers: { [WORK]: 3, [CARRY]: 1, [MOVE]: 1 } },
      500: { needed: 2, powers: { [WORK]: 4, [CARRY]: 1, [MOVE]: 1 } },
      600: { needed: 1, powers: { [WORK]: 5, [CARRY]: 1, [MOVE]: 1 } },
      700: { needed: 1, powers: { [WORK]: 6, [CARRY]: 1, [MOVE]: 1 } }
    }

    const capacityAvailable = this.room?.energyCapacityAvailable ?? 300
    const settlersRequirementLookup = this.getMaxTierRunePowers(300, 700, capacityAvailable, settlersRunePowers)
    const settlers = {
      rune: "settlers",
      count: settlersRequirementLookup.needed - (this.memory.creeps.settlers.length || 0),
      // 300 energy https://screeps.arcath.net/creep-designer/?share=1#2#0#0#0#0#0#1
      runePowers: { [WORK]: 2, [CARRY]: 1, [MOVE]: 1 },
      priority: 1, // TODO: change priorty perhaps it should be a tab-step?
      mission: this.memory.id
    }

    if (settlers.count > 0) {
      requirements.push(settlers)
    }

    return requirements
  }

  public run(): void {
    try {
      const settlers = this.memory.creeps.settlers.reduce<Creep[]>(derefCreeps, [])
      const idlesettlers = settlers.filter(creep => creep.isIdle)

      // TODO: Assign tasks
      const settler = idlesettlers.pop() // TODO: We should pick the closest creep not just any idle creep

      // TODO: how do we pre-assign a settlement buildingcrew to the infrastructure mission? - do we just run the roomplanner and then that happens?
      // TODO: haulers with the purpose of filling building creeps?
      // TODO: send miners to room and release them, letting the energy mission take over. - but that should just happen if we spawn an energy mission in the room.

      // Run settlers
      settlers.forEach(creep => creep.run())

      return
    } catch (error) {
      console.log(
        `<span style='color:red'>[SettlementMission] ${_.escape(ErrorMapper.sourceMappedStackTrace(error))}</span>`
      )
    }
  }
}
