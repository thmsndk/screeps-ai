import "../constants"

import { assert } from "chai"

import { Arg, Substitute } from "@fluffy-spoon/substitute"

import { CreepMutations, Hatchery } from "../../src/Hatchery"
import { Game, Memory } from "./mock"

describe("BuildingMission", () => {
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

  // should it though, do we need to support manually places construction sites?
  it("should scan for newly placed construction sites" /*, () => {}*/)

  // not sure the mission should be responsible for this
  // it("should rebuild a stomped construction site" /*, () => {}*/)
})
