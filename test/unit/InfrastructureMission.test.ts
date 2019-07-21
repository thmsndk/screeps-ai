import { stringify } from "querystring"
import "../constants"
import { Memory } from "./mock"

import { assert } from "chai"

import { Arg, Substitute } from "@fluffy-spoon/substitute"

import { CreepMutations, Hatchery } from "../../src/Hatchery"
import { InfraStructureMission, InfrastructureMissionMemory } from "./../../src/missions/InfrastructureMission"

import "../../src/task/prototypes"
import { TaskBuild } from "task/Tasks/TaskBuild"

describe("InfrastructureMission", () => {
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

  it("should be able to update position with constructionsite")
  it("should be able to add position from constructionsite", () => {
    const cSite1 = mockConstructionSite(STRUCTURE_ROAD, "cSite1", "N0E0", 5, 5)
    const cSite2 = mockConstructionSite(STRUCTURE_ROAD, "cSite2", "N0E0", 5, 6)

    // @ts-ignore : it works
    global.Game.getObjectById(cSite1.id).returns(cSite1)
    // @ts-ignore : it works
    global.Game.getObjectById(cSite2.id).returns(cSite2)

    const mission = new InfraStructureMission()
    mission.AddLayer("N0E0")
    mission.addConstructionSite(0, cSite1)
    mission.Layers[0].addConstructionSite(cSite2)
    assert.equal(mission.Layers[0].Positions.length, 2)
    assert.equal(mission.Layers[0].Positions.filter(p => p.StructureType === STRUCTURE_ROAD).length, 2)

    assert.equal(mission.Layers[0].Positions[0].id, cSite1.id)
    assert.equal(mission.Layers[0].Positions[0].pos.x, 5)
    assert.equal(mission.Layers[0].Positions[0].pos.y, 5)

    assert.equal(mission.Layers[0].Positions[1].id, cSite2.id)
    assert.equal(mission.Layers[0].Positions[1].pos.x, 5)
    assert.equal(mission.Layers[0].Positions[1].pos.y, 6)
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
    const memory = defaultMemory()

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
    const memory = defaultMemory()

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
  it("creates construction site on position")
  it("handles ERR_RCL_NOT_ENOUGH")
  it("handles ERR_FULL")

  describe("Creeps", () => {
    it("Assigned creeps should be loaded from memory", () => {
      const memory = defaultMemory()

      const mission = new InfraStructureMission({ memory })

      // @ts-ignore : it works
      global.Game.received().getObjectById("creepId1")
      // @ts-ignore : it works
      global.Game.received().getObjectById("creepId2")

      assert.equal(Object.keys(mission.creeps).length, 2)

      assert.equal(mission.creeps.creepId1.name, "creep1")
      assert.equal(mission.creeps.creepId2.name, "creep2")
    })
    it("Can be assigned & persisted to memory", () => {
      const memory = defaultMemory()

      const mission = new InfraStructureMission({ memory })

      const creepId = "creepId3"
      const creep = new Creep(creepId)
      creep.id = creepId
      creep.name = "creep3"
      creep.memory = {} as any

      // @ts-ignore : it works
      global.Game.getObjectById(creepId).returns(creep)

      mission.addCreep(creep)

      assert.equal(Object.keys(mission.creeps).length, 3)

      assert.include(memory.creeps, creepId)
    })

    it("Gets a build task assigned when idle", () => {
      const memory = defaultMemory()
      const mission = new InfraStructureMission({ memory })

      mission.distributeTasks()

      // @ts-ignore : it works
      const creeps = global.Game.creeps

      const task = creeps.creep.task as TaskBuild // this triggers a deseralize of task
      assert.isNotNull(task)

      if (task) {
        // assert.typeOf(task, "TaskBuild")
        assert.equal(task.name, TaskBuild.taskName)
        const target = task.target
        assert.equal(target.id, "constructionSiteId")
        assert.equal(target.structureType, STRUCTURE_ROAD)
        assert.equal(target.pos.roomName, "N0E0")
        assert.equal(target.pos.x, 1)
        assert.equal(target.pos.y, 2)
      }
    })

    // What about the speed of building a constructionsite
    it("co-op construction if 1 creep can not build it alone")

    it("Gets multiple tasks assigned")
    it("Does not get a task it can't finish in TLL assigned")
  })
})

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

const defaultMemory = () => {
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

  memory.creeps = ["creepId1", "creepId2"]

  const creep = new Creep("creepId1")
  creep.name = "creep1"
  creep.memory = {} as any

  const creep2 = new Creep("creepId2")
  creep2.name = "creep2"
  creep2.memory = {} as any
  // @ts-ignore : it works
  global.Game.creeps.returns({ creep, creep2 })
  // @ts-ignore : it works
  global.Game.getObjectById("creepId1").returns(creep)
  // @ts-ignore : it works
  global.Game.getObjectById("creepId2").returns(creep2)

  Memory.rooms.N0E0 = { infrastructure: memory } as any

  return memory
}
