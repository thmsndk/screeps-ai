import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement, RunePowers } from "Freya"
import { Mission, derefCreeps } from "./Mission"
import { ErrorMapper } from "utils/ErrorMapper"
import { log } from "_lib/Overmind/console/log"
import { Thor, DEFCON } from "Thor"

@profile
export class DEFCONMission extends Mission {
  private room?: Room

  private roomName: string

  private roomMemory: RoomMemory

  private thor: Thor

  public constructor(room: Room | string, thor: Thor) {
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

    this.thor = thor
    this.roomMemory = roomMemory
    this.roomName = roomName

    if (room instanceof Room) {
      this.room = room
      this.thor.scan(this.room) // TODO: this only works as long as we new up a mission every tick.
    }
  }

  public getRequirements(): RuneRequirement[] {
    const requirements = [] as RuneRequirement[]

    // Disable defcon units for now
    return requirements

    // // // eslint-disable-next-line no-bitwise
    // // if (this.roomMemory.DEFCON && this.roomMemory.DEFCON.level & DEFCON.safe) {
    // //   return requirements
    // // }

    // // // TODO: determine squads needed

    // // const defconRunePowers: { [key: number]: { needed: number; powers: RunePowers } } = {
    // //   300: { needed: 3, powers: { [RANGED_ATTACK]: 2, [HEAL]: 1, [MOVE]: 1 } },
    // //   400: { needed: 2, powers: { [RANGED_ATTACK]: 3, [HEAL]: 1, [MOVE]: 1 } },
    // //   500: { needed: 2, powers: { [RANGED_ATTACK]: 4, [HEAL]: 1, [MOVE]: 1 } },
    // //   600: { needed: 1, powers: { [RANGED_ATTACK]: 5, [HEAL]: 1, [MOVE]: 1 } },
    // //   700: { needed: 1, powers: { [RANGED_ATTACK]: 6, [HEAL]: 1, [MOVE]: 1 } }
    // // }

    // // const capacityAvailable = this.room?.energyCapacityAvailable ?? 300
    // // const defconRequirementLookup = this.getMaxTierRunePowers(300, 700, capacityAvailable, defconRunePowers)
    // // const defcon = {
    // //   rune: "defcon",
    // //   count: defconRequirementLookup.needed - (this.memory.creeps.defcon.length || 0),
    // //   // 300 energy https://screeps.arcath.net/creep-designer/?share=1#2#0#0#0#0#0#1
    // //   runePowers: defconRequirementLookup.powers,
    // //   priority: 1, // TODO: change priorty perhaps it should be a tab-step?
    // //   mission: this.memory.id,
    // //   missionRoom: this.roomName
    // // }

    // // if (defcon.count > 0) {
    // //   requirements.push(defcon)
    // // }

    // // return requirements
  }

  public run(): void {
    try {
      const defcon = this.memory.creeps.defcon.reduce<Creep[]>(derefCreeps, [])
      const idledefcon = defcon.filter(creep => creep.isIdle)

      const attackTasks = this.thor.dangerousHostiles[this.roomName].map(hostile => Tasks.attack(hostile))

      idledefcon.forEach(creep => {
        if (this.goToRoom(creep, this.roomName)) {
          return
        }

        creep.task = Tasks.chain(attackTasks)

        // // TODO: attack tasks
        // Defcon.forEach(creep => creep.rangedMassAttack())
      })

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
