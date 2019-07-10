import { Task } from "../Task"

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
