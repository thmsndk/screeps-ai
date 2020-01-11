import { deref } from "task/utilities/utilities"
import { Task } from "../Task"
import { register } from "../utilities/TaskFactory"

export type healTargetType = Creep

export class TaskHeal extends Task {
  public static taskName = "heal"

  target!: healTargetType

  public constructor(target: healTargetType, options = {} as TaskOptions) {
    super(TaskHeal.taskName, target, options)
    // Settings
    this.settings.targetRange = 3
  }

  public isValidTask(): boolean {
    return this.creep.getActiveBodyparts(HEAL) > 0
  }

  public isValidTarget(): boolean {
    return this.target && this.target.hits < this.target.hitsMax && this.target.my
  }

  public work(): CreepActionReturnCode | ScreepsReturnCode {
    if (this.creep.pos.isNearTo(this.target)) {
      return this.creep.heal(this.target)
    } else {
      this.moveToTarget(1)
    }

    return this.creep.rangedHeal(this.target)
  }
}

const registerHeal = (memory: TaskMemory): TaskHeal => {
  const target = deref(memory._target.ref)

  return new TaskHeal(target as healTargetType, memory.options)
}
register(registerHeal)
