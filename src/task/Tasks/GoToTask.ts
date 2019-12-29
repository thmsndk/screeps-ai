import { register } from "../utilities/TaskFactory"
import { Task } from "../Task"
import { derefRoomPosition } from "task/utilities/utilities"

export type goToTargetType = { pos: RoomPosition } | RoomPosition

function hasPos(obj: { pos: RoomPosition } | RoomPosition): obj is { pos: RoomPosition } {
  return (obj as { pos: RoomPosition }).pos !== undefined
}

export class GoToTask extends Task {
  public static taskName = "goTo"

  public target: null

  public constructor(target: goToTargetType, options = {} as TaskOptions) {
    if (hasPos(target)) {
      super(GoToTask.taskName, { ref: "", pos: target.pos }, options)
    } else {
      super(GoToTask.taskName, { ref: "", pos: target }, options)
    }
    // Settings
    this.settings.targetRange = 1
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

const registerGoTo = (memory: TaskMemory): GoToTask => {
  const target = derefRoomPosition(memory._target._pos) as goToTargetType

  return new GoToTask(target)
}

register(registerGoTo)
