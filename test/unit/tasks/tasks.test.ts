import { DummyTask } from "task/TaskFactory"
import "../../constants"
import { Game, Memory } from "../mock"
import { assert } from "chai"
import { Task } from "task/Task"
import { Substitute, Arg } from "@fluffy-spoon/substitute"
import "../../../src/task/prototypes"

describe("tasks", () => {
  before(() => {
    // runs before all test in this block
  })

  beforeEach(() => {
    // runs before each test in this block
    // @ts-ignore : allow adding Memory to global
    global.Memory = _.clone(Memory)
  })

  // can creeps share tasks? co-op tasks? where do we persist tasks?
  it("should be able to fork task to creep" /*, () => {}*/)
  it("should be able to chain task to creep" /*, () => {}*/)
  it("should be able to disrupt current task" /*, () => {}*/)

  it("should be persisted to creep memory", () => {
    const creep = new Creep("test")
    creep.memory = {} as any
    creep.task = new DummyTask(null)

    assert.isNotNull(creep.memory.task)
    if (creep.memory.task) {
      assert.equal(creep.memory.task.name, DummyTask.taskName)
    }
  })

  it("should be loaded from creep memory", () => {
    const creep = new Creep("test")
    creep.memory = {
      task: {
        tick: 123,
        name: "dummy",
        _creep: {
          name: "test"
        },
        _target: {
          ref: "test",
          _pos: { x: 1, y: 2, roomName: "test" }
        }
      }
    } as any

    const task = creep.task
    assert.isNotNull(task)

    if (task) {
      assert.equal(task.name, "dummy")
    }

    if (task && creep.memory.task) {
      assert.isString(task.memory.name)
      assert.equal(task.memory.name, creep.memory.task.name)
    }
  })
})

// but do we want to deseralize the memory each time we want to run a task?

// should define tests for different type of tasks and verify target acquisition and such
