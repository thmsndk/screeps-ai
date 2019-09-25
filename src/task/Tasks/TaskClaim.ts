// TaskClaim: claims a new controller

import { deref } from "task/utilities/utilities"
import { Task } from "../Task"
import { register } from "../utilities/TaskFactory"

export type claimTargetType = StructureController

export class TaskClaim extends Task {
  public static taskName = "claim"
  public target!: claimTargetType

  constructor(target: claimTargetType, options = {} as TaskOptions) {
    super(TaskClaim.taskName, target, options)
    // Settings
  }

  public isValidTask() {
    return this.creep.getActiveBodyparts(CLAIM) > 0
  }

  public isValidTarget() {
    return this.target != null && (!this.target.room || !this.target.owner)
  }

  public work() {
    return this.creep.claimController(this.target)
  }
}

const registerClaim = (memory: TaskMemory) => {
  const target = deref(memory._target.ref)
  return new TaskClaim(target as claimTargetType)
}
register(registerClaim)
