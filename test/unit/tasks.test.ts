import "../constants"
import { Game, Memory } from "./mock"
import { assert } from "chai"
import { Task } from "tasks/Task"
import { Substitute, Arg } from "@fluffy-spoon/substitute"
import "../../src/tasks/prototypes"

describe("tasks", () => {
  before(() => {
    // runs before all test in this block
  })

  beforeEach(() => {
    // runs before each test in this block
    // @ts-ignore : allow adding Game to global
    // global.Game = _.clone(Game) as Game
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
    const creep = new Creep("test")
    creep.memory = {
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
        name: "dummy",
        _creep: {
          name: "test"
        },
        _target: {
          ref: "test",
          _pos: { x: 1, y: 2, roomName: "test" }
        }
      }
    }

    console.log("instance", creep.task)

    const task = creep.task
    assert.isNotNull(task)
    if (task && creep.memory.task) {
      assert.isString(task.memory.name)
      assert.equal(task.memory.name, creep.memory.task.name)
    }
  })
})

// but do we want to deseralize the memory each time we want to run a task?

// should define tests for different type of tasks and verify target acquisition and such
