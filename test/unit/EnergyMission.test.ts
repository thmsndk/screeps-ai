import "../constants"
import { Memory } from "./mock"
import "../../src/task/prototypes"

import { Substitute } from "@fluffy-spoon/substitute"

import { CreepMutations } from "../../src/Hatchery"

describe("EnergyMission", () => {
  before(() => {
    // runs before all test in this block

    // @ts-ignore : allow adding Memory to global
    global.Memory = Memory
    Memory.spawns.Spawn1 = {
      requests: {
        test: [
          { mutation: CreepMutations.UPGRADER, target: "", priority: 10 },
          { mutation: CreepMutations.HAULER, target: "", priority: 20 },
          { mutation: CreepMutations.WORKER, target: "", priority: 30 }
        ]
      }
    }
  })

  beforeEach(() => {
    // runs before each test in this block
    // @ts-ignore : allow adding Game to global
    global.Game = Substitute.for<Game>()
    // @ts-ignore : allow adding Memory to global
    global.Memory = _.clone(Memory)

    const spawn1 = Substitute.for<StructureSpawn>()
    // @ts-ignore : it works
    spawn1.memory.returns(Memory.spawns.Spawn1)
    // @ts-ignore : it works
    global.Game.spawns.returns({
      Spawn1: spawn1
    })
  })

  // bootstrap phase is when a source node does not have a harvester
  // bootstrap phase can potentially be different on each tier.

  it("it should detect bootstrap phase" /*, () => {}*/)
  it("it should assign suitible harvesters to the mission" /*, () => {}*/)
  it("it should request a suitible harvester for the mission" /*, () => {}*/)

  it("it should at minimum keep 1 harvester working on each node" /*, () => {}*/)
  it("should assign enough creeps for the source to be emptied within 300 ticks" /*, () => {}*/)

  it("once bootstrapped it should construct a source container" /*, () => {}*/)
  // it should chain the following task withdraw => build

  it("it should upgrade from tier 0 to tier 1" /*, () => {}*/)

  describe("Tier 1 RCL 1 / 300 available energy source container", () => {
    it("3M3C haulers should be spawned" /*, () => {}*/)
    it("2W1M1C harvesters should be spawed" /*, () => {}*/)
  })

  describe("Tier 2 RCL 3 / 600 available energy", () => {
    it("it should find 5W1C1M harvesters" /*, () => {}*/)
    it("it should request 5W1C1M harvesters" /*, () => {}*/)

    it("it should find 3C3M haulers" /*, () => {}*/)
    it("it should request 3C3M haulers" /*, () => {}*/)
  })

  // Tier 3 only spawn 1 harvester and let it travel between sources while the source is regenning?
  // We also need to conisder boosts and PC regen.

  it("should find / request replacement creeps so they arrive when TTL expires" /*, () => {}*/)

  // Do we want to calculate the size of our haulers based on distance and energy rate?
  // could also calculate the amount of haulers

  it("it should calculate profit & profit/cpu on each tier / phase" /*, () => {}*/)
})
