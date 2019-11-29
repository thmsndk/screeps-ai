import { ScreepsAPI, Branch } from "screeps-api"

// // const ScreepsAPI = require("screeps-api")
// // const { ScreepsAPI } = require("screeps-api")
interface Config {
  server: string
  rooms: [string, number, number][]
  spawnName: string
}

const baseConfig = {
  spawnName: "Yggdrasil"
}

const pserver: Config = {
  ...baseConfig,
  server: "pserver",
  rooms: [["W8N3", 31, 16]]
}

const swc: Config = {
  ...baseConfig,
  server: "swc",
  rooms: [["W8N3", 31, 16]]
}

const config = swc
const BRANCH = "Yggdrasil"
// Const BRANCH='default'

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const defaultBadge = {
  type: 16,
  color1: "#e026e3",
  color2: "#060606",
  color3: "#020202",
  param: 54,
  flip: false
}

const deploy = async (): Promise<void> => {
  const official = await ScreepsAPI.fromConfig("main")

  const me = await official.me()

  const officialBadge = me.badge

  const api = await ScreepsAPI.fromConfig(config.server)

  let ret = await api.raw.user.badge(officialBadge)

  if (ret.ok) {
    console.log("Badge Set")
  }

  const modules = {}
  // // const ps = []
  // // Const files = (await fs.readdir('src')).map(f => `src/${f}`)
  // // For (const file of files) {
  // //   Ps.push((async (file) => {
  // //     Const { name, ext } = path.parse(file)
  // //     Const data = await fs.readFile(file)
  // //     If (ext === '.js') {
  // //       Modules[name] = data.toString('utf8')
  // //     }
  // //     If (ext === '.wasm') {
  // //       Modules[name] = { binary: data.toString('base64') }
  // //     }
  // //   })(file))
  // // }
  // // Await Promise.all(ps)
  // // Magic, creates a new branch if it does not exists
  // // const resp = await api.raw.user.cloneBranch("", BRANCH, modules)
  // // console.log(resp)
  const { list: branches } = await api.raw.user.branches()
  // // console.log(branches)
  const branch = branches.find(b => b.branch === BRANCH) || ({} as Branch)
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
        const [roomName, x, y] = config.rooms[0]
        ret = await api.raw.game.placeSpawn(roomName, x, y, config.spawnName)
        // // const ret = await api.raw.game.placeSpawn(...config.rooms[0], "Spawn1")
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

  console.log("Finished deploying")
}

deploy()
