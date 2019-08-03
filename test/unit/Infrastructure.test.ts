import "../constants"
import { Memory } from "./mock"
import "../../src/task/prototypes"

import { assert } from "chai"
import { stringify } from "querystring"
import { Infrastructure } from "RoomPlanner/Infrastructure"
import { InfrastructureMemory } from "RoomPlanner/InfrastructureMemory"

import { Arg, Substitute } from "@fluffy-spoon/substitute"

import { CreepMutations, Hatchery } from "../../src/Hatchery"

describe("Infrastructure", () => {
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

  // When do we persist this to memory? - thats a problem for the future, let's not worry about memory for now
  it("should be able to add a construction layer", () => {
    const infrastructure = getInfrastructure(true)
    infrastructure.AddLayer("N0E0")

    assert.equal(infrastructure.Layers.length, 1)
    assert.equal("N0E0", infrastructure.Layers[0].roomName)
  })

  it("should be able to add position to layer", () => {
    const infrastructure = getInfrastructure(true)
    infrastructure.AddLayer("N0E0")
    infrastructure.AddPosition(0, STRUCTURE_ROAD, 1, 2)
    infrastructure.Layers[0].AddPosition(STRUCTURE_ROAD, 1, 3)
    assert.equal(infrastructure.Layers[0].Positions.length, 2)
    assert.equal(infrastructure.Layers[0].Positions.filter(p => p.StructureType === STRUCTURE_ROAD).length, 2)

    assert.equal(infrastructure.Layers[0].Positions[0].pos.x, 1)
    assert.equal(infrastructure.Layers[0].Positions[0].pos.y, 2)

    assert.equal(infrastructure.Layers[0].Positions[1].pos.x, 1)
    assert.equal(infrastructure.Layers[0].Positions[1].pos.y, 3)
  })

  it("should be able to update position with constructionsite")
  it("should be able to add position from constructionsite", () => {
    const cSite1 = mockConstructionSite(STRUCTURE_ROAD, "cSite1", "N0E0", 5, 5)
    const cSite2 = mockConstructionSite(STRUCTURE_ROAD, "cSite2", "N0E0", 5, 6)

    // @ts-ignore : it works
    global.Game.getObjectById(cSite1.id).returns(cSite1)
    // @ts-ignore : it works
    global.Game.getObjectById(cSite2.id).returns(cSite2)

    const infrastructure = getInfrastructure(true)
    infrastructure.AddLayer("N0E0")
    infrastructure.addConstructionSite(0, cSite1)
    infrastructure.Layers[0].addConstructionSite(cSite2)
    assert.equal(infrastructure.Layers[0].Positions.length, 2)
    assert.equal(infrastructure.Layers[0].Positions.filter(p => p.StructureType === STRUCTURE_ROAD).length, 2)

    assert.equal(infrastructure.Layers[0].Positions[0].id, cSite1.id)
    assert.equal(infrastructure.Layers[0].Positions[0].pos.x, 5)
    assert.equal(infrastructure.Layers[0].Positions[0].pos.y, 5)

    assert.equal(infrastructure.Layers[0].Positions[1].id, cSite2.id)
    assert.equal(infrastructure.Layers[0].Positions[1].pos.x, 5)
    assert.equal(infrastructure.Layers[0].Positions[1].pos.y, 6)
  })

  // Can you actually place multiple constructionsites on the same time?
  // should we allow for a position to contain multiple sites?
  it("should throw an error if a constructionsite already exists on that layer and position")

  it("should persist to memory", () => {
    const memory = defaultInfrastructureMemory(true)

    const infrastructure = new Infrastructure({ memory })
    infrastructure.AddLayer("N0E0")
    infrastructure.AddPosition(0, STRUCTURE_ROAD, 1, 2)
    infrastructure.Layers[0].AddPosition(STRUCTURE_ROAD, 1, 3)

    assert.equal(memory.layers.length, 1)
    assert.equal("N0E0", memory.layers[0].roomName)

    assert.equal(memory.layers[0].positions[0].x, 1)
    assert.equal(memory.layers[0].positions[0].y, 2)

    assert.equal(memory.layers[0].positions[1].x, 1)
    assert.equal(memory.layers[0].positions[1].y, 3)
  })

  it("should deseralize from memory", () => {
    const infrastructure = getInfrastructure()

    assert.equal(infrastructure.Layers[0].Positions.length, 2)
    assert.equal(infrastructure.Layers[0].Positions.filter(p => p.StructureType === STRUCTURE_ROAD).length, 2)

    assert.equal(infrastructure.Layers[0].Positions[0].pos.x, 1)
    assert.equal(infrastructure.Layers[0].Positions[0].pos.y, 2)

    assert.equal(infrastructure.Layers[0].Positions[1].pos.x, 1)
    assert.equal(infrastructure.Layers[0].Positions[1].pos.y, 3)
  })
  // the idea is it should be possible to check if a position is part of a infrastructure
  // does this responsibility belongs to the planner?
  // either way it should be possible to query a infrastructure for a position
  // allowing you to verify if your id / construction site exists in the plan.
  // should the query be on a specific layer, should it return all layers it is on?
  // maybe we should have a genereal "infrastructure" dataset in global "memory" and the infrastructure utilizes it
  it("should be able to look for construction site in infrastructure", () => {
    const infrastructure = getInfrastructure()

    const constructionSiteInPlan = infrastructure.findInfrastructure("constructionSiteId")

    const layers = Object.entries(constructionSiteInPlan)
    assert.equal(layers.length, 1, "expected 1 layer")
    for (const [index, pos] of layers) {
      assert.equal(index, "0")
      assert.equal(pos.roomName, "N0E0")
      assert.equal(pos.pos.x, 1)
      assert.equal(pos.pos.y, 2)
    }

    // var layersWithconstructionSiteAtPosition = infrastructure.FindInfrastructure({ roomName: "N0E0", x: 1, y:2}) // would use this to override an existing plan
  })
})

// TODO: should probably move this method to a common place where mocks exists, need to figure out how the global registration should work then aswell ...
// bleh, to hell with generics!, need to figure out how to make a generic mockBuildableStructure
const mockConstructionSite = (
  structureType: BuildableStructureConstant,
  id: string,
  roomName: string,
  x: number,
  y: number
): ConstructionSite => {
  // const mockConstructionSite = <T extends BuildableStructureConstant>(structureType:T, id:string, roomName: string, x:number, y: number): ConstructionSite<T> => {
  const constructionSiteId = new ConstructionSite(id)
  constructionSiteId.id = id
  constructionSiteId.structureType = structureType
  constructionSiteId.pos = new RoomPosition(x, y, roomName) // probably need a mockPosition aswell.
  constructionSiteId.pos.roomName = roomName
  constructionSiteId.pos.x = x
  constructionSiteId.pos.y = y

  return constructionSiteId
}

const getInfrastructure = (blankLayers?: boolean): Infrastructure => {
  const memory = defaultInfrastructureMemory(blankLayers)

  const constructionSiteId = new ConstructionSite("constructionSiteId")
  constructionSiteId.id = "constructionSiteId"
  constructionSiteId.structureType = STRUCTURE_ROAD
  constructionSiteId.pos = new RoomPosition(1, 2, "N0E0")
  constructionSiteId.pos.roomName = "N0E0"
  constructionSiteId.pos.x = 1
  constructionSiteId.pos.y = 2

  // @ts-ignore : it works
  global.Game.constructionSite.returns({ constructionSiteId })
  // @ts-ignore : it works
  global.Game.getObjectById(constructionSiteId.id).returns(constructionSiteId)

  return new Infrastructure({ memory })
}
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
