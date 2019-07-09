import { Task } from "./Task"
import { deref } from "./utilities"
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

export const deseralize = (memory: TaskMemory): Task | null => {
  let taskName = memory.name
  let target = deref(memory._target.ref)
  let task: Task
  // Create a task object of the correct type
  switch (taskName) {
    default:
      // console.log(`Invalid task name: ${taskName}! task.creep: ${memory._creep.name}. Deleting from memory!`)
      task = new DummyTask(target as any)
      break
  }

  task.memory = memory

  return task
}
