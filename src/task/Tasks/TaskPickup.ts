import { register } from "../utilities/TaskFactory"
import { Task } from "../Task"
import { deref } from "task/utilities/utilities"

export type pickupTargetType = Resource

export class TaskPickup extends Task {
  public static taskName = "pickup"
  public target!: pickupTargetType

  public constructor(target: pickupTargetType, options = {} as TaskOptions) {
    super(TaskPickup.taskName, target, options)
    this.settings.oneShot = true
  }

  public isValidTask(): boolean {
    return _.sum(this.creep.carry) < this.creep.carryCapacity
  }

  public isValidTarget(): boolean {
    return this.target && this.target.amount > 0
  }

  public work(): CreepActionReturnCode | ERR_FULL {
    return this.creep.pickup(this.target)
  }
}

const registerPickup = (memory: TaskMemory): TaskPickup => {
  const target = deref(memory._target.ref)
  return new TaskPickup(target as pickupTargetType)
}
register(registerPickup)
