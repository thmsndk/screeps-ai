import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement, RunePowers } from "Freya"
import { Mission, derefCreeps } from "./Mission"
import { ErrorMapper } from "utils/ErrorMapper"
import { log } from "_lib/Overmind/console/log"

@profile
export class DEFCONMission extends Mission {
  private room?: Room

  private roomName: string

  private roomMemory: RoomMemory

  public constructor(room: Room | string) {
    const roomMemory = typeof room === "string" ? Memory.rooms[room] : room.memory
    const roomName = typeof room === "string" ? room : room.name
    if (!roomMemory.defconmission) {
      roomMemory.defconmission = {
        id: "",
        creeps: {
          // TODO: how do we define a more explicit interface allowing to catch wrongly initialized memory?
          defcon: []
        }
      }
    }

    super(roomMemory.defconmission)

    this.roomMemory = roomMemory
    this.roomName = roomName

    if (room instanceof Room) {
      this.room = room
    }
  }

  public getRequirements(): RuneRequirement[] {
    const requirements = [] as RuneRequirement[]
    const defconRunePowers: { [key: number]: { needed: number; powers: RunePowers } } = {
      300: { needed: 3, powers: { [RANGED_ATTACK]: 2, [HEAL]: 1, [MOVE]: 1 } },
      400: { needed: 2, powers: { [RANGED_ATTACK]: 3, [HEAL]: 1, [MOVE]: 1 } },
      500: { needed: 2, powers: { [RANGED_ATTACK]: 4, [HEAL]: 1, [MOVE]: 1 } },
      600: { needed: 1, powers: { [RANGED_ATTACK]: 5, [HEAL]: 1, [MOVE]: 1 } },
      700: { needed: 1, powers: { [RANGED_ATTACK]: 6, [HEAL]: 1, [MOVE]: 1 } }
    }

    const capacityAvailable = this.room?.energyCapacityAvailable ?? 300
    const defconRequirementLookup = this.getMaxTierRunePowers(300, 700, capacityAvailable, defconRunePowers)
    const defcon = {
      rune: "defcon",
      count: defconRequirementLookup.needed - (this.memory.creeps.defcon.length || 0),
      // 300 energy https://screeps.arcath.net/creep-designer/?share=1#2#0#0#0#0#0#1
      runePowers: defconRequirementLookup.powers,
      priority: 1, // TODO: change priorty perhaps it should be a tab-step?
      mission: this.memory.id,
      missionRoom: this.roomName
    }

    if (defcon.count > 0) {
      requirements.push(defcon)
    }

    return requirements
  }

  public run(): void {
    try {
      const defcon = this.memory.creeps.defcon.reduce<Creep[]>(derefCreeps, [])
      const idledefcon = defcon.filter(creep => creep.isIdle)

      // TODO: Assign tasks
      const defconCreep = idledefcon.pop() // TODO: We should pick the closest creep not just any idle creep

      // TODO: attack tasks
      defcon.forEach(creep => creep.rangedMassAttack())
      // Run defcon
      defcon.forEach(creep => creep.run())

      return
    } catch (error) {
      console.log(
        `<span style='color:red'>[DEFCONMission] ${_.escape(ErrorMapper.sourceMappedStackTrace(error))}</span>`
      )
    }
  }
}
