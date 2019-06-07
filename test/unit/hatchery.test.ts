import { Hatchery, CreepMutations } from "./../../src/Hatchery"
import { assert } from "chai"
import { Game, Memory } from "./mock"

describe("hatchery", () => {
  before(() => {
    // runs before all test in this block
    Memory.spawns.Spawn1 = {
      requests: {
        test: [
          { mutation: CreepMutations.UPGRADER, priority: 10, target: "" },
          { mutation: CreepMutations.HAULER, priority: 20, target: "" },
          { mutation: CreepMutations.WORKER, priority: 30, target: "" }
        ]
      }
    }

    Game.spawns.Spawn1 = { room: Game.rooms.TEST, memory: Memory.spawns.Spawn1 }
  })

  beforeEach(() => {
    // runs before each test in this block
    // @ts-ignore : allow adding Game to global
    global.Game = _.clone(Game) as Game
    // @ts-ignore : allow adding Memory to global
    global.Memory = _.clone(Memory)
  })

  it("should import spawn requests ", () => {
    const hatchery = new Hatchery("Spawn1")
    assert.equal(hatchery.getRequests("test", CreepMutations.UPGRADER), 1)
    assert.equal(hatchery.getRequests("test", CreepMutations.HAULER), 1)
    assert.equal(hatchery.getRequests("test", CreepMutations.WORKER), 1)
  })

  it("should prioritize requests ", () => {
    const hatchery = new Hatchery("Spawn1")
    let nextRequest = hatchery.dequeue()
    if (!nextRequest) {
      assert.fail("nextRequest is null")
      return
    }
    assert.equal(nextRequest.mutation, "worker")
  })

  it("should re-prioritize requests ", () => {
    const hauler = Memory.spawns.Spawn1.requests && Memory.spawns.Spawn1.requests.test[1]

    assert.isOk(hauler)

    if (hauler) {
      hauler.priority = 100
    }

    const hatchery = new Hatchery("Spawn1")
    let nextRequest = hatchery.dequeue()
    if (!nextRequest) {
      assert.fail("nextRequest is null")
      return
    }
    assert.equal(nextRequest.mutation, "hauler")
  })

  it("should process requests")
  describe(
    "mutation" /*, () => {
    // Sadly I can't test this because the mocha environment can't find the screeps constants like CLAIM
    it("should give basic worker", () => {
      const hatchery = new Hatchery("Spawn1")
      var mutation = hatchery.mutate("worker")

    });
  }*/
  )
})
