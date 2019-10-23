import "../constants"

import { assert } from "chai"

import { Arg, Substitute } from "@fluffy-spoon/substitute"

import { calculateRunePowers, RunePowers, compareRunePowers } from "Freya"

import { Memory } from "./mock"

describe("Freya", () => {
  before(() => {
    // runs before all test in this block
    // Memory.spawns.Spawn1 = {
    //   requests: {
    //     test: [
    //       { mutation: CreepMutations.UPGRADER, target: "", priority: 10 },
    //       { mutation: CreepMutations.HAULER, target: "", priority: 20 },
    //       { mutation: CreepMutations.WORKER, target: "", priority: 30 }
    //     ]
    //   }
    // }
  })

  beforeEach(() => {
    // runs before each test in this block
    // @ts-ignore : allow adding Game to global
    global.Game = Substitute.for<Game>()
    // @ts-ignore : allow adding Memory to global
    global.Memory = _.clone(Memory)

    // const spawn1 = Substitute.for<StructureSpawn>()
    // spawn1.memory.returns(Memory.spawns.Spawn1)
    // Game.spawns.returns({
    //   Spawn1: spawn1
    // })
  })

  it("should calculate runepower correct", () => {
    const runePowers = calculateRunePowers([WORK, WORK, MOVE, CARRY])
    assert.deepEqual(runePowers, { [WORK]: 2, [MOVE]: 1, [CARRY]: 1 } as RunePowers)
  })

  it("equal runepower should return true", () => {
    const creepPowers = { [WORK]: 2, [MOVE]: 1, [CARRY]: 1 } as RunePowers
    const wishes = { [WORK]: 2, [MOVE]: 1, [CARRY]: 1 } as RunePowers
    const equal = compareRunePowers(creepPowers, wishes)
    assert.isTrue(equal)
  })

  it("less runepower should return false", () => {
    const creepPowers = { [WORK]: 1, [MOVE]: 1, [CARRY]: 1 } as RunePowers
    const wishes = { [WORK]: 2, [MOVE]: 1, [CARRY]: 1 } as RunePowers
    const equal = compareRunePowers(creepPowers, wishes)
    assert.isFalse(equal)
  })
})
