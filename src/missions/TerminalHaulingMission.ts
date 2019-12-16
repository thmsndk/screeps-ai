import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement } from "Freya"
import { Mission, derefCreeps } from "./Mission"
import { ErrorMapper } from "utils/ErrorMapper"

enum HaulingMode {
    collecting,
    delivering
  }

/**
 * Game.market.deal(orderId, amount, [yourRoomName])
 */

@profile
export class TerminalHaulingMission extends Mission {
  private room?: Room

  private roomName: string

  private roomMemory: RoomMemory

    public constructor(room: Room | string) {
        const roomMemory = typeof room === "string" ? Memory.rooms[room] : room.memory
        const roomName = typeof room === "string" ? room : room.name
        if (!roomMemory.terminalhaulingmission) {
            roomMemory.terminalhaulingmission = {
                id: "",
                creeps: {
                // TODO: how do we define a more explicit interface allowing to catch wrongly initialized memory?
                    haulers: [],
            }
        }
    }

    super(roomMemory.terminalhaulingmission)

    this.roomMemory = roomMemory
    this.roomName = roomName

    if (room instanceof Room) {
        this.room = room
        }
    }

    public getRequirements(): RuneRequirement[] {
    const requirements = []
    const neededWorkers = this.room?.terminal ? 1: 0

    const haulers = {
      rune: "haulers",
      count: neededWorkers - (this.memory.creeps.haulers.length || 0),
      // 300 energy
      runePowers: { [CARRY]: 3, [MOVE]: 3 },
      priority: 1, // TODO: change priorty perhaps it should be a tab-step?
      mission: this.memory.id
    }

    if (haulers.count > 0) {
      requirements.push(haulers)
    }

    return requirements
  }

  public run(): void {
    try {
        const haulers = this.memory.creeps.haulers.reduce<Creep[]>(derefCreeps, [])
        const idlehaulers = haulers.filter(creep => creep.isIdle)

        // TODO: Assign tasks
        const hauler = idlehaulers.pop() // TODO: We should pick the closest creep not just any idle creep

        if(hauler){
            this.assignHaulTask(hauler)
        }

        // Run haulers
        haulers.forEach(creep => creep.run())
        return
    } catch (error) {
        console.log(
        `<span style='color:red'>[TerminalHaulingMission] ${_.escape(ErrorMapper.sourceMappedStackTrace(error))}</span>`
        )
    }
    }

    private assignHaulTask(creep: Creep): void {
        // TODO: do we need to toggle a collection or delivery mode?, should probably check all sources, and not only 1?
        if (!creep.memory.mode || creep.memory.mode === HaulingMode.collecting) {
          if (creep.store.getFreeCapacity() === 0) {
            creep.memory.mode = HaulingMode.delivering
          }
        } else if (creep.memory.mode === HaulingMode.delivering) {
          if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
            creep.memory.mode = HaulingMode.collecting
          }
        }

        if (creep.memory.mode === HaulingMode.delivering) {
          if (this.goToHome(creep)) {
            return
          }

          if(this.room?.terminal){
              creep.task = Tasks.transfer(this.room?.terminal)
              return
          }
        } else {

            if(this.room?.storage){
                creep.task = Tasks.withdraw(this.room.storage)
                return
            }

        // //   if (this.goToGoal(creep)) {
        // //     return
        // //   }
        }
        // TODO: move creeps in the way?
      }
}
