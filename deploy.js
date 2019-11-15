const fs = require("fs").promises
const path = require("path")
const { ScreepsAPI } = require("screeps-api")

const config1 = {
  server: "local",
  rooms: [["E29S16", 26, 30]]
}
const config2 = {
  server: "localhost",
  rooms: [["W8N3", 31, 16]]
}
const config3 = {
  server: "botarena",
  rooms: [["E4S7", 30, 35]]
}
const config4 = {
  server: "splus2",
  rooms: [["W8N8", 25, 25]]
}
const config5 = {
  server: "pbrun",
  rooms: [
    ["W2N2", 20, 25],
    ["W8N3", 20, 25]
  ]
}
const config6 = {
  server: "test",
  rooms: [["W5N2", 40, 20]]
}
const config7 = {
  server: "pi",
  rooms: [
    ["W2N2", 20, 25],
    ["W8N3", 20, 25]
  ]
}
const config8 = {
  server: "splus",
  rooms: [["W8N8", 25, 25]]
}
const config9 = {
  server: "fordo",
  rooms: [["W3N7", 30, 20]]
}
const config10 = {
  server: "prtest",
  rooms: [["W3N7", 30, 20]]
}
// Const config = config1
// Const config = config2
// Const config = config3
// Const config = config4
// Const config = config5
// Const config = config6
// Const config = config7
// Const config = config8
// Const config = config9
const config = config10
const BRANCH = "ZeSwarm_v1.1"
// Const BRANCH='default'
ScreepsAPI.fromConfig(config.server).then(async api => {
  const ret = await api.raw.user.badge({
    type: 24,
    color1: "#ff0000",
    color2: "#ffb400",
    color3: "#ff6a27",
    param: 0,
    flip: false
  })
  if (ret.ok) {
    console.log("Badge Set")
  }
  const modules = {}
  const ps = []
  // Const files = (await fs.readdir('src')).map(f => `src/${f}`)
  // For (const file of files) {
  //   Ps.push((async (file) => {
  //     Const { name, ext } = path.parse(file)
  //     Const data = await fs.readFile(file)
  //     If (ext === '.js') {
  //       Modules[name] = data.toString('utf8')
  //     }
  //     If (ext === '.wasm') {
  //       Modules[name] = { binary: data.toString('base64') }
  //     }
  //   })(file))
  // }
  // Await Promise.all(ps)
  const resp = await api.raw.user.cloneBranch("", BRANCH, modules)
  console.log(resp)
  const { list: branches } = await api.raw.user.branches()
  console.log(branches)
  const branch = branches.find(b => b.branch === BRANCH) || {}
  if (!branch.activeWorld) {
    await api.raw.user.setActiveBranch(BRANCH, "activeWorld")
    console.log(`Active branch set to ${BRANCH}`)
  }

  console.log("Code Pushed")
  const { status } = await api.raw.user.worldStatus()
  // Const rooms = [['E4S7', 30, 35]]
  if (status === "empty") {
    while (true) {
      try {
        console.log("Not Spawned, attempting spawn from room list...")
        const ret = await api.raw.game.placeSpawn(...config.rooms[0], "Spawn1")
        if (ret.ok) {
          console.log("Placed Spawn")
          break
        } else {
          console.log("Error placing spawn:", ret.error)
        }
      } catch (err) {
        console.log("Error placing spawn:", err)
      }
      await sleep(10000)
    }
  }
  console.log("ZeSwarm v1.1 ready.")
})

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
