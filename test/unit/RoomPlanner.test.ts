import "../constants"
import "../../src/task/prototypes"
import { Memory } from "./mock"

import { Substitute } from "@fluffy-spoon/substitute"

import { CreepMutations } from "../../src/Hatchery"

describe("RoomPlanner", () => {
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

  it("no extensions should be planned on RCL 0" /*, () => {}*/)
  it("no extensions should be planned on RCL 1" /*, () => {}*/)
  it(
    "5 extensions should be planned on RCL 2" /*() => {
    const planner = new RoomPlanner()
    const rcl2Plan = planner.plan("TEST", 2)
    assert.equal(rcl2Plan.length, 1)
    // const layer0 = rcl2Plan[0].getStructureType // already made this in InfrastructureMission. time to extract out InfraStructure from the actual Mission
  }*/
  )
  it("10 extensions should be planned on RCL 3" /*, () => {}*/)
  it("20 extensions should be planned on RCL 4" /*, () => {}*/)
  it("30 extensions should be planned on RCL 5" /*, () => {}*/)
  it("40 extensions should be planned on RCL 6" /*, () => {}*/)
  it("50 extensions should be planned on RCL 7" /*, () => {}*/)
  it("60 extensions should be planned on RCL 8" /*, () => {}*/)

  it("should plan extensions around spawn in a checkerboard pattern" /*, () => {}*/)
  // CONTROLLER_STRUCTURES => if (rcl < 8) return positions.slice(0, CONTROLLER_STRUCTURES[structureType][rcl]);

  it("should plan walls around edges of room" /*, () => {}*/)
  it("should plan ramparts entrances in edge walls" /*, () => {}*/)

  it("should plan ramparts at important locations" /*, () => {}*/)

  // this requires us to mock the pathing to return a path
  // what about terrain?
  it("should plan roads from source to spawn" /*, () => {}*/)

  // requires us to mock RoomVisual
  it("should visualize plan" /*, () => {}*/)
})
