import { register } from "../utilities/TaskFactory"
import { Task } from "../Task"
import { deref } from "task/utilities/utilities"

export class DummyTask extends Task {
  public static taskName = "dummy"
  public target: any

  constructor(target: any, options = {} as TaskOptions) {
    super(DummyTask.taskName, target, options)
  }

  public isValidTask(): boolean {
    throw new Error("Method not implemented.")
  }
  public isValidTarget(): boolean {
    throw new Error("Method not implemented.")
  }
  public work(): number {
    throw new Error("Method not implemented.")
  }
}

const registerDummy = (memory: TaskMemory) => {
  const target = deref(memory._target.ref)
  return new DummyTask(target as any)
}
register(registerDummy)
