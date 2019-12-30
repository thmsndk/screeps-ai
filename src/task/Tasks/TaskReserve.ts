import { register } from "../utilities/TaskFactory"
import { Task } from "../Task"
import { deref } from "task/utilities/utilities"

export type reserveTargetType = StructureController

export class TaskReserve extends Task {
  public static taskName = "reserve"

  public target!: reserveTargetType

  public constructor(target: reserveTargetType, options = {} as TaskOptions) {
    super(TaskReserve.taskName, target, options)
  }

  public isValidTask(): boolean {
    return this.creep.getActiveBodyparts(CLAIM) > 0
  }

  public isValidTarget(): boolean {
    const target = this.target

    return target != null && !target.owner && (!target.reservation || target.reservation.ticksToEnd < 4999)
  }

  public work(): CreepActionReturnCode {
    return this.creep.reserveController(this.target)
  }
}

const registerReserve = (memory: TaskMemory): TaskReserve => {
  const target = deref(memory._target.ref)

  return new TaskReserve(target as reserveTargetType, memory.options)
}

register(registerReserve)
