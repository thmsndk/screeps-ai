import { register } from "../utilities/TaskFactory"
import { Task } from "../Task"
import { deref } from "task/utilities/utilities"

export type upgradeTargetType = StructureController

export class TaskUpgrade extends Task {
  public static taskName = "upgrade"

  public target!: upgradeTargetType // TODO: generics like MemoryMission

  public constructor(target: upgradeTargetType, options = {} as TaskOptions) {
    super(TaskUpgrade.taskName, target, options)
    // Settings
    this.settings.targetRange = 3
    this.settings.workOffRoad = true
  }

  public isValidTask(): boolean {
    return this.creep.carry.energy > 0
  }

  public isValidTarget(): boolean {
    return this.target && this.target.my
  }

  public work(): ScreepsReturnCode {
    return this.creep.upgradeController(this.target)
  }
}

const registerUpgrade = (memory: TaskMemory): TaskUpgrade => {
  const target = deref(memory._target.ref)

  return new TaskUpgrade(target as any)
}
register(registerUpgrade)
