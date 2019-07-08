import { assert } from "chai"
import { helper } from "./helper"

describe("main", () => {
  // before(() => {
  //   // runs before all test in this block
  // })

  it("runs a server and matches the game tick", async function() {
    for (let i = 1; i < 10; i += 1) {
      assert.equal(await helper.server.world.gameTime, i)
      await helper.server.tick()
    }
  })

  it("writes and reads to memory", async function() {
    // Print console logs every tick
    helper.player.on("console", (logs: any, results: any, userid: any, username: any) => {
      _.each(logs, line => console.log(`[console|${username}]`, line))
    })
    await helper.player.console("this is a test")
    await helper.player.console("Memory.foo = 'bar'")
    await helper.server.tick()
    const memory = JSON.parse(await helper.player.memory)
    assert.equal(memory.foo, "bar")
  })
})
