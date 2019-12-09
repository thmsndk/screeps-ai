import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement } from "Freya"
import { Mission, derefCreeps } from "./Mission"
import { ErrorMapper } from "utils/ErrorMapper"
@profile
export class ReserveMission extends Mission {
  private room?: Room

  private roomName: string

  private roomMemory: RoomMemory

  public constructor(room: Room | string) {
    const roomMemory = typeof room === "string" ? Memory.rooms[room] : room.memory
    const roomName = typeof room === "string" ? room : room.name
    if (!roomMemory.reservemission) {
      roomMemory.reservemission = {
        id: "",
        creeps: {
          // TODO: how do we define a more explicit interface allowing to catch wrongly initialized memory?
          reservers: []
        }
      }
    }

    super(roomMemory.reservemission)

    this.roomMemory = roomMemory
    this.roomName = roomName

    if (room instanceof Room) {
      this.room = room
    }
  }

  public getRequirements(): RuneRequirement[] {
    const requirements = []
    const neededWorkers = 1

    const reservers = {
      rune: "reservers",
      count: neededWorkers - (this.memory.creeps.reservers.length || 0),
      // 650 energy https://screeps.arcath.net/creep-designer/?share=1#0#0#0#0#0#1#0
      runePowers: { [MOVE]: 1, [CLAIM]: 1 },
      priority: 1, // TODO: change priorty perhaps it should be a tab-step?
      mission: this.memory.id
    }

    if (reservers.count > 0) {
      requirements.push(reservers)
    }

    return requirements
  }

  public run(): void {
    try {
      const reservers = this.memory.creeps.reservers.reduce<Creep[]>(derefCreeps, [])
      const idlereservers = reservers.filter(creep => creep.isIdle)

      // Find controller
      // TODO: Assign tasks
      const reserver = idlereservers.pop() // TODO: We should pick the closest creep not just any idle creep

      if (reserver) {
        if (!this.goToRoom(reserver, this.roomName)) {
          const controller = this.room?.controller
          if (controller) {
            if (!reserver.task) {
              reserver.task = Tasks.reserve(controller)
            }
          }
        }
      }

      // Run reservers
      reservers.forEach(creep => creep.run())

      return
    } catch (error) {
      console.log(
        `<span style='color:red'>[ReserveMission] ${_.escape(ErrorMapper.sourceMappedStackTrace(error))}</span>`
      )
    }
  }
}
