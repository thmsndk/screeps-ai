import { register } from "../utilities/TaskFactory"
import { Task } from "../Task"

export type goToRoomTargetType = string

/**
 * There's some ways to still get it to path, for example you could use Game.map.findRoute
 * to get the rooms you'd want to move through, then move through them a couple of rooms at a time,
 * so you don't have compute the whole expensive path immediately.
 *
 * You could also set maxOps to something very large but that might tax your cpu more
 *
 * https://docs.screeps.com/api/#Game.map.findRoute
 */
export class TaskGoToRoom extends Task {
  public static taskName = "goToRoom"

  public target: null

  public constructor(roomName: goToRoomTargetType, options = {} as TaskOptions) {
    super(TaskGoToRoom.taskName, { ref: "", pos: new RoomPosition(25, 25, roomName) }, options)
    // Settings
    this.settings.targetRange = 24 // Target is almost always controller flag, so range of 2 is acceptable
  }

  public isValidTask(): boolean {
    return !this.creep.pos.inRangeTo(this.targetPos, this.settings.targetRange)
  }

  public isValidTarget(): boolean {
    return true
  }

  public isValid(): boolean {
    // It's necessary to override task.isValid() for tasks which do not have a RoomObject target
    let validTask = false
    if (this.creep) {
      validTask = this.isValidTask()
    }
    // Return if the task is valid; if not, finalize/delete the task and return false
    if (validTask) {
      return true
    } else {
      // Switch to parent task if there is one
      let isValid = false
      if (this.parent) {
        isValid = this.parent.isValid()
      }
      this.finish()

      return isValid
    }
  }

  public work(): ScreepsReturnCode {
    return OK
  }
}

const registerGoToRoom = (memory: TaskMemory): TaskGoToRoom => {
  const target = memory._target._pos.roomName

  return new TaskGoToRoom(target as goToRoomTargetType, memory.options)
}
register(registerGoToRoom)
