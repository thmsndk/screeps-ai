import "../constants"
import { Hatchery, CreepMutations } from "./../../src/Hatchery"
import { assert } from "chai"
import { helper } from "./helper"

describe("main", () => {
  // before(() => {
  //   // runs before all test in this block
  //   Memory.spawns.Spawn1 = {
  //     requests: {
  //       test: [
  //         { mutation: CreepMutations.UPGRADER, priority: 10, target: "" },
  //         { mutation: CreepMutations.HAULER, priority: 20, target: "" },
  //         { mutation: CreepMutations.WORKER, priority: 30, target: "" }
  //       ]
  //     }
  //   }

  //   Game.spawns.Spawn1 = { room: Game.rooms.TEST, memory: Memory.spawns.Spawn1 }
  // })

  it("runs a server and matches the game tick", async function() {
    for (let i = 1; i < 10; i += 1) {
      assert.equal(await helper.server.world.gameTime, i)
      await helper.server.tick()
    }
  })

  it("writes and reads to memory", async function() {
    await helper.player.console(`Memory.foo = 'bar'`)
    await helper.server.tick()
    const memory = JSON.parse(await helper.player.memory)
    assert.equal(memory.foo, "bar")
  })

  // it("should process requests", () => {
  //   describe("mutation", () => {
  //     // Sadly I can't test this because the mocha environment can't find the screeps constants like CLAIM
  //     it("should give basic worker", () => {
  //       const hatchery = new Hatchery("Spawn1")
  //       var mutation = hatchery.mutate("worker")
  //     })
  //   })
  // })
})
