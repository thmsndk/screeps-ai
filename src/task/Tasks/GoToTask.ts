import { register } from "../utilities/TaskFactory"
import { Task } from "../Task"
import { derefRoomPosition } from "task/utilities/utilities"
import { log } from "_lib/Overmind/console/log"

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
    this.settings.targetRange = options.moveOptions?.range ?? 1
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
      this.finish()

      return this.parent ? this.parent.isValid() : false
    }
  }

  public work(): ScreepsReturnCode {
    return OK
  }
}

const registerGoTo = (memory: TaskMemory): GoToTask => {
  const target = derefRoomPosition(memory._target._pos) as goToTargetType

  return new GoToTask(target, memory.options)
}

register(registerGoTo)
