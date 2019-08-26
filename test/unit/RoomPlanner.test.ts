import "../constants"
import "../../src/task/prototypes"
import { Memory } from "./mock"

import { Substitute } from "@fluffy-spoon/substitute"
import { assert } from "chai"

import { CreepMutations } from "../../src/Hatchery"
import { RoomPlanner } from "RoomPlanner"
import { Infrastructure } from "RoomPlanner/Infrastructure"
import { InfrastructureMemory } from "RoomPlanner/InfrastructureMemory"

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
  it("5 extensions should be planned on RCL 2", () => {
    assertExtensionCountByRCL(5, 2)
  })
  it("10 extensions should be planned on RCL 3", () => {
    assertExtensionCountByRCL(10, 3)
  })
  it("20 extensions should be planned on RCL 4", () => {
    assertExtensionCountByRCL(20, 4)
  })
  it("30 extensions should be planned on RCL 5", () => {
    assertExtensionCountByRCL(30, 5)
  })
  it("40 extensions should be planned on RCL 6", () => {
    assertExtensionCountByRCL(40, 6)
  })
  it("50 extensions should be planned on RCL 7", () => {
    assertExtensionCountByRCL(50, 7)
  })
  it("60 extensions should be planned on RCL 8", () => {
    assertExtensionCountByRCL(60, 8)
  })

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

  it("should handle multiroom plans for roads and such." /*, () => {}*/)
})

const defaultInfrastructureMemory = (blankLayers?: boolean) => {
  const memory = {
    layers: [
      {
        roomName: "N0E0",
        positions: [
          { structureType: STRUCTURE_ROAD, x: 1, y: 2, id: "constructionSiteId" },
          { structureType: STRUCTURE_ROAD, x: 1, y: 3 }
        ]
      }
    ]
  } as InfrastructureMemory
  if (blankLayers) {
    memory.layers = []
  }
  return memory
}
const assertExtensionCountByRCL = (expectedExtensions: number, rcl: number) => {
  const planner = new RoomPlanner(new Infrastructure({ memory: defaultInfrastructureMemory(true) }))
  const infrastructure = planner.plan("TEST", rcl) // TODO: should we really pass in rcl level? should it not generate an entire plan ?
  assert.equal(infrastructure.Layers.length, rcl + 1)
  const plannedExtensions = infrastructure.findBuildableInfrastructure(STRUCTURE_EXTENSION)
  assert.isNotEmpty(plannedExtensions, "expected layers to be found")
  // assert.equal(Object.keys(plannedExtensions).length, 1, "expected to find 1 layer of planned extensions")
  let plannedExtensionCount = 0
  for (const plannedRcl in plannedExtensions) {
    if (plannedExtensions.hasOwnProperty(plannedRcl)) {
      const extensions = plannedExtensions[plannedRcl]
      assert.isNotEmpty(extensions, "expected planned extensions to be found")
      plannedExtensionCount += extensions.length
    }
  }

  assert.equal(plannedExtensionCount, expectedExtensions)
}
