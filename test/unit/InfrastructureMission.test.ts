import "../constants"

import { assert } from "chai"

import { Arg, Substitute } from "@fluffy-spoon/substitute"

import { CreepMutations, Hatchery } from "../../src/Hatchery"
import { InfraStructureMission, InfrastructureMissionMemory } from "./../../src/missions/InfrastructureMission"
import { Memory } from "./mock"

const Game = Substitute.for<Game>()

describe("InfrastructureMission", () => {
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

  // Do we need a InfrastructureThings? (module responsible for all that is Infrastructure, Things is a viking term for assemblies where people would talk)

  // each mission should not scan for this... we should do a "global" scan for construction sites and react based on data already gathered
  it("should not find construction sites" /*, () => {}*/)

  it("should lookup newly placed construction sites" /*, () => {}*/)

  it("should scan for newly placed construction sites" /*, () => {}*/)

  it("should rebuild a stomped construction site" /*, () => {}*/)

  // When do we persist this to memory? - thats a problem for the future, let's not worry about memory for now
  it("should be able to add a construction layer", () => {
    const mission = new InfraStructureMission()
    mission.AddLayer("N0E0")

    assert.equal(mission.Layers.length, 1)
    assert.equal("N0E0", mission.Layers[0].roomName)
  })

  it("should be able to add position to layer", () => {
    const mission = new InfraStructureMission()
    mission.AddLayer("N0E0")
    mission.AddPosition(0, STRUCTURE_ROAD, 1, 2)
    mission.Layers[0].AddPosition(STRUCTURE_ROAD, 1, 3)
    assert.equal(mission.Layers[0].Positions.length, 2)
    assert.equal(mission.Layers[0].Positions.filter(p => p.StructureType === STRUCTURE_ROAD).length, 2)

    assert.equal(mission.Layers[0].Positions[0].pos.x, 1)
    assert.equal(mission.Layers[0].Positions[0].pos.y, 2)

    assert.equal(mission.Layers[0].Positions[1].pos.x, 1)
    assert.equal(mission.Layers[0].Positions[1].pos.y, 3)
  })

  it("should persist to memory", () => {
    const memory = { layers: [] as any[] } as InfrastructureMissionMemory
    Memory.rooms.N0E0 = { infrastructure: memory } as any

    const mission = new InfraStructureMission({ memory })
    mission.AddLayer("N0E0")
    mission.AddPosition(0, STRUCTURE_ROAD, 1, 2)
    mission.Layers[0].AddPosition(STRUCTURE_ROAD, 1, 3)

    assert.equal(memory.layers.length, 1)
    assert.equal("N0E0", memory.layers[0].roomName)

    assert.equal(memory.layers[0].positions[0].x, 1)
    assert.equal(memory.layers[0].positions[0].y, 2)

    assert.equal(memory.layers[0].positions[1].x, 1)
    assert.equal(memory.layers[0].positions[1].y, 3)
  })

  it("should deseralize from memory", () => {
    const memory = {
      layers: [
        {
          roomName: "N0E0",
          positions: [{ structureType: STRUCTURE_ROAD, x: 1, y: 2 }, { structureType: STRUCTURE_ROAD, x: 1, y: 3 }]
        }
      ]
    } as InfrastructureMissionMemory
    Memory.rooms.N0E0 = { infrastructure: memory } as any

    const mission = new InfraStructureMission({ memory })

    assert.equal(mission.Layers[0].Positions.length, 2)
    assert.equal(mission.Layers[0].Positions.filter(p => p.StructureType === STRUCTURE_ROAD).length, 2)

    assert.equal(mission.Layers[0].Positions[0].pos.x, 1)
    assert.equal(mission.Layers[0].Positions[0].pos.y, 2)

    assert.equal(mission.Layers[0].Positions[1].pos.x, 1)
    assert.equal(mission.Layers[0].Positions[1].pos.y, 3)
  })
  // the idea is it should be possible to check if a position is part of a mission
  // does this responsibility belongs to the planner?
  // either way it should be possible to query a mission for a position
  // allowing you to verify if your id / construction site exists in the plan.
  // should the query be on a specific layer, should it return all layers it is on?
  // maybe we should have a genereal "infrastructure" dataset in global "memory" and the mission utilizes it
  it("should be able to look for construction site in infrastructure", () => {
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
    } as InfrastructureMissionMemory
    Memory.rooms.N0E0 = { infrastructure: memory } as any

    const mission = new InfraStructureMission({ memory })
    const constructionSiteInPlan = mission.findInfrastructure("constructionSiteId")

    const layers = Object.entries(constructionSiteInPlan)
    assert.equal(layers.length, 1, "expected 1 layer")
    for (const [index, pos] of layers) {
      assert.equal(index, "0")
      assert.equal(pos.roomName, "N0E0")
      assert.equal(pos.pos.x, 1)
      assert.equal(pos.pos.y, 2)
    }

    // var layersWithconstructionSiteAtPosition = mission.FindInfrastructure({ roomName: "N0E0", x: 1, y:2}) // would use this to override an existing plan
  })
  // in case of missing structures
  it("should be able to re-validate plan" /*, () => {}*/)
})
