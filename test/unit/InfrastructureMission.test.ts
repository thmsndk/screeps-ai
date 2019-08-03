import "../constants"
import { Memory } from "./mock"
import "../../src/task/prototypes"

import { assert } from "chai"
import { stringify } from "querystring"
import { Infrastructure } from "RoomPlanner/Infrastructure"
import { InfrastructureMemory } from "RoomPlanner/InfrastructureMemory"
import { TaskBuild } from "task/Tasks/TaskBuild"

import { Arg, Substitute } from "@fluffy-spoon/substitute"

import { CreepMutations, Hatchery } from "../../src/Hatchery"
import { InfraStructureMission } from "../../src/missions/InfrastructureMission"
import { InfrastructureMissionMemory } from "../../src/missions/InfrastructureMissionMemory"

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

  // in case of missing structures
  it("should be able to re-validate plan" /*, () => {}*/)
  it("creates construction site on position")
  it("handles ERR_RCL_NOT_ENOUGH")
  it("handles ERR_FULL")

  describe("Creeps", () => {
    it("Assigned creeps should be loaded from memory", () => {
      const memory = defaultMemory()

      const mission = new InfraStructureMission({ memory, infrastructure: getInfrastructure() })

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

      const mission = new InfraStructureMission({ memory, infrastructure: getInfrastructure() })

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
      const mission = new InfraStructureMission({ memory, infrastructure: getInfrastructure() })

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
const getInfrastructure = (): Infrastructure => {
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

const defaultMemory = () => {
  const memory = {} as InfrastructureMissionMemory

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

  // Memory.rooms.N0E0 = { infrastructure: memory } as any // TODO: figure out if this was needed

  return memory
}
