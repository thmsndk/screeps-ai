import "../constants"

import { assert } from "chai"

import { Arg, Substitute } from "@fluffy-spoon/substitute"

import { CreepMutations, Hatchery } from "../../src/Hatchery"
import { Game, Memory } from "./mock"

describe("hatchery", () => {
  before(() => {
    // runs before all test in this block
    Memory.spawns.Spawn1 = {
      requests: {
        test: [
          { mutation: CreepMutations.UPGRADER, target: "", priority: 10 },
          { mutation: CreepMutations.HAULER, target: "", priority: 20 },
          { mutation: CreepMutations.WORKER, target: "", priority: 30 }
        ]
      }
    }

    const spawn1 = Substitute.for<StructureSpawn>()
    spawn1.memory.returns(Memory.spawns.Spawn1)
    Game.spawns.returns({
      Spawn1: spawn1
    })
  })

  beforeEach(() => {
    // runs before each test in this block
    // // @ts-ignore : allow adding Game to global
    // global.Game = Game
    // @ts-ignore : allow adding Memory to global
    global.Memory = _.clone(Memory)
  })

  it("should import spawn requests from memory", () => {
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
  // describe(
  //   "mutation" /*, () => {
  //   // Sadly I can't test this because the mocha environment can't find the screeps constants like CLAIM
  //   it("should give basic worker", () => {
  //     const hatchery = new Hatchery("Spawn1")
  //     var mutation = hatchery.mutate("worker")

  //   });
  // }*/
  // )
  it("should not attempt to generate creeps with more than 50 body parts", () => {
    const hatchery = new Hatchery("Spawn1")
    const body = hatchery.mutate(CreepMutations.WORKER, 5000) // made mutate public instead of mocking room visuals and all sorts of shenanigans
    assert.isBelow(body.parts.length, 51)
  })
})
