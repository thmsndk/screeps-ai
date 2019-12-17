import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement } from "Freya"
import { Mission, derefCreeps } from "./Mission"
import { ErrorMapper } from "utils/ErrorMapper"
@profile
export class ClaimMission extends Mission {
  private room?: Room

  private roomName: string

  private roomMemory: RoomMemory

    public constructor(room: Room | string) {
        const roomMemory = typeof room === "string" ? Memory.rooms[room] : room.memory
        const roomName = typeof room === "string" ? room : room.name
        if (!roomMemory.claimmission) {
            roomMemory.claimmission = {
                id: "",
                creeps: {
                // TODO: how do we define a more explicit interface allowing to catch wrongly initialized memory?
                    claimers: [],
            }
        }
    }

    super(roomMemory.claimmission)

    this.roomMemory = roomMemory
    this.roomName = roomName

    if (room instanceof Room) {
        this.room = room
        }
    }

    public getRequirements(): RuneRequirement[] {
    const requirements = []
    const neededWorkers = 1

    const claimers = {
      rune: "claimers",
      count: neededWorkers - (this.memory.creeps.claimers.length || 0),
      // 650 energy https://screeps.arcath.net/creep-designer/?share=1#0#0#0#0#0#1#0
      runePowers: { [MOVE]: 1, [CLAIM]: 1 },
      priority: 1, // TODO: change priorty perhaps it should be a tab-step?
      mission: this.memory.id
    }

    if (claimers.count > 0) {
      requirements.push(claimers)
    }

    return requirements
  }

  public run(): void {
    try {
        const claimers = this.memory.creeps.claimers.reduce<Creep[]>(derefCreeps, [])
        const idleclaimers = claimers.filter(creep => creep.isIdle)

        // TODO: Assign tasks
        const claimer = idleclaimers.pop() // TODO: We should pick the closest creep not just any idle creep

        if (claimer) {
            if (!this.goToRoom(claimer, this.roomName)) {
              const controller = this.room?.controller
              if (controller) {
                if (!claimer.task) {
                    claimer.task = Tasks.claim(controller)
                }
              }
            }
          }

        // Run claimers
        claimers.forEach(creep => creep.run())
        return
    } catch (error) {
        console.log(
        `<span style='color:red'>[ClaimMission] ${_.escape(ErrorMapper.sourceMappedStackTrace(error))}</span>`
        )
    }
    }
}