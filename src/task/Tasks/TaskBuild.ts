// TaskBuild: builds a construction site until creep has no energy or site is complete

import { register } from "../utilities/TaskFactory"
import { Task } from "../Task"
import { deref } from "task/utilities/utilities"

export type buildTargetType = ConstructionSite

export class TaskBuild extends Task {
  public static taskName = "build"

  public target!: buildTargetType

  public constructor(target: buildTargetType, options = {} as TaskOptions) {
    super(TaskBuild.taskName, target as any, options)
    // Settings
    this.settings.targetRange = 3
    this.settings.workOffRoad = true
  }

  public isValidTask(): boolean {
    return this.creep.carry.energy > 0
  }

  public isValidTarget(): boolean {
    return this.target && this.target.my && this.target.progress < this.target.progressTotal
  }

  public work(): CreepActionReturnCode | ERR_NOT_ENOUGH_RESOURCES | ERR_RCL_NOT_ENOUGH {
    return this.creep.build(this.target)
  }
}
const registerBuild = (memory: TaskMemory): TaskBuild => {
  const target = deref(memory._target.ref)

  return new TaskBuild(target as buildTargetType, memory.options)
}
register(registerBuild)
