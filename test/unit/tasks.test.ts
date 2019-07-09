import "../constants"
import { Game, Memory } from "./mock"
import { assert } from "chai"
import { Task } from "tasks/Task"
import { Substitute, Arg } from "@fluffy-spoon/substitute"

class DummyTask extends Task {
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

describe("tasks", () => {
  before(() => {
    // runs before all test in this block
  })

  beforeEach(() => {
    // runs before each test in this block
    // @ts-ignore : allow adding Game to global
    global.Game = _.clone(Game) as Game
    // @ts-ignore : allow adding Memory to global
    global.Memory = _.clone(Memory)
  })

  // can creeps share tasks? co-op tasks? where do we persist tasks?
  // creeps have memory, we could persist it there
  it("should be able to add task to creep" /*, () => {}*/)
  it("should be able to chain task to creep" /*, () => {}*/)
  it("should be able to disrupt current task" /*, () => {}*/)

  it("should be persisted to creep memory" /*, () => {}*/)

  it("should be loaded from creep memory", () => {
    const testCreep = Substitute.for<Creep>()
    console.log(testCreep.memory)
    testCreep.memory = {
      role: "thrall",
      cost: 200,
      unemployed: true,
      target: "",
      upgrading: false,
      harvest: false,
      building: false,
      working: false,
      task: {
        tick: 123,
        name: "testTask",
        _creep: {
          name: "test"
        },
        _target: {
          ref: "test",
          _pos: { x: 1, y: 2, roomName: "test" }
        }
      }
    }
    console.log(testCreep.memory)
    assert.isNotFunction(testCreep.memory)

    const task = testCreep.task
    assert.isNotNull(task)

    assert.isNotNull(testCreep.memory.task)
    if (task && testCreep.memory.task) {
      console.log(task)
      console.log(testCreep.memory)
      assert.equal(task.memory.name, testCreep.memory.task.name)
    }
  })
})

// but do we want to deseralize the memory each time we want to run a task?

// should define tests for different type of tasks and verify target acquisition and such
