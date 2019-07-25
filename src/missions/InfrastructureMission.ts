import { TaskWithdraw } from "./../task/Tasks/TaskWithdraw"
import { getPositions } from "RoomScanner"
import { stringify } from "querystring"
import { deref } from "task/utilities/utilities"
import { Tasks } from "../task/Tasks"
import { Mission } from "./Mission"
import { Dictionary } from "lodash"

interface InfraStructurePositionMemory {
  structureType: BuildableStructureConstant
  x: number
  y: number
  id?: string
}

interface InfraStructureLayerMemory {
  roomName: string
  positions: InfraStructurePositionMemory[]
}
export interface InfrastructureMissionMemory extends IMissionMemory {
  layers: InfraStructureLayerMemory[]
  startTick?: number
  finishTick?: number
  /**
   * a list of creepIds assigned to this mission.
   */
  creeps: string[]
}

interface InfraStructureMissionConstructor {
  memory?: InfrastructureMissionMemory
}

class InfraStructurePosition {
  public constructionSite?: ConstructionSite
  private memory: InfraStructurePositionMemory
  constructor(memory: InfraStructurePositionMemory, constructionSite?: ConstructionSite) {
    this.memory = memory

    if (constructionSite) {
      this.constructionSite = constructionSite
    }

    if (memory.id && !this.constructionSite) {
      this.constructionSite = deref(memory.id) as ConstructionSite
    }
  }

  get id(): string | undefined {
    return this.memory.id
  }

  get StructureType(): BuildableStructureConstant {
    return this.memory.structureType
  }

  get pos(): IPosition {
    return { x: this.memory.x, y: this.memory.y }
  }
}

// tslint:disable-next-line: max-classes-per-file
class Layer {
  private memory: InfraStructureLayerMemory
  public roomName: string
  public Positions: InfraStructurePosition[]
  constructor(roomName: string, memory: InfraStructureLayerMemory) {
    this.roomName = roomName

    this.memory = memory

    const positions = [] as InfraStructurePosition[]
    if (this.memory) {
      this.memory.positions.forEach(position => {
        positions.push(new InfraStructurePosition(position))
      })
    }
    this.Positions = positions
  }

  public AddPosition(
    structureType: BuildableStructureConstant,
    x: number,
    y: number,
    memory?: InfraStructurePositionMemory,
    constructionSite?: ConstructionSite
  ) {
    if (!memory) {
      memory = { structureType, x, y }

      if (constructionSite) {
        memory.id = constructionSite.id
      }
    }

    if (this.memory) {
      this.memory.positions.push(memory)
    }

    this.Positions.push(new InfraStructurePosition(memory, constructionSite))
  }

  public addConstructionSite(constructionSite: ConstructionSite<BuildableStructureConstant>) {
    this.AddPosition(
      constructionSite.structureType,
      constructionSite.pos.x,
      constructionSite.pos.y,
      undefined,
      constructionSite
    )
  }
}

// tslint:disable-next-line: max-classes-per-file
export class InfraStructureMission extends Mission {
  public memory?: InfrastructureMissionMemory // TODO: Private
  public Layers: Layer[]
  public creeps!: Dictionary<Creep>

  constructor(parameters?: InfraStructureMissionConstructor) {
    super(parameters ? parameters.memory : undefined)
    const layers = [] as Layer[]
    const creeps = {} as Dictionary<Creep>
    if (parameters) {
      if (parameters.memory) {
        if (parameters.memory.layers) {
          parameters.memory.layers.forEach(layer => {
            layers.push(new Layer(layer.roomName, layer))
          })
        }

        if (parameters.memory.creeps) {
          Object.values(parameters.memory.creeps).forEach(creepId => {
            const creep = Game.getObjectById<Creep>(creepId)
            if (creep) {
              creeps[creepId] = creep
            }
          })
        }
      }
    }
    this.Layers = layers
    this.creeps = creeps
  }

  public AddLayer(roomName: string, memory?: InfraStructureLayerMemory) {
    if (this.memory) {
      if (!memory) {
        memory = { roomName, positions: [] as InfraStructurePositionMemory[] }
      }
      this.memory.layers.push(memory)
    }
    this.Layers.push(new Layer(roomName, memory as InfraStructureLayerMemory))
  }

  public AddPosition(layerIndex: number, structureType: BuildableStructureConstant, x: number, y: number) {
    this.Layers[layerIndex].AddPosition(structureType, x, y)
  }

  public addConstructionSite(layerIndex: number, constructionSite: ConstructionSite<BuildableStructureConstant>) {
    this.Layers[layerIndex].addConstructionSite(constructionSite)
  }

  public findInfrastructure(constructionSiteId: string): Dictionary<FindInfrastructureResult> {
    const results = {} as Dictionary<FindInfrastructureResult>
    this.Layers.forEach((layer, index) => {
      const position = layer.Positions.find(p => p.id === constructionSiteId)
      if (position) {
        results[index] = { roomName: layer.roomName, pos: position.pos }
      }
    })

    return results
  }

  public addCreep(creep: Creep) {
    if (this.memory) {
      this.memory.creeps.push(creep.id)
    }

    this.creeps[creep.id] = creep
  }

  public distributeTasks() {
    const idleCreeps = _.filter(this.creeps, creep => creep.isIdle)
    idleCreeps.forEach(creep => {
      // We should probably have a PriortyQueue of construction sites
      this.Layers.forEach((layer, index) => {
        // TODO: implement targetedBy and handle coop tasks, find closest creep, validate work parts, and other shenanigans
        // TODO: when construction site is done, we need to mark it as such with a reference to the structure instead
        const position = layer.Positions.find(p => !!p.id && !!Game.getObjectById(p.id))
        if (position && position.constructionSite) {
          creep.task = Tasks.build(position.constructionSite)
        }
      })
    })
  }

  public run() {
    Object.values(this.creeps).forEach(creep => {
      if (creep.carry.energy === 0) {
        // const resource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES)
        // chain dropped resources in a close quarter
        //

        // if (resource) {
        //   if (resource && creep.pickup(resource) === ERR_NOT_IN_RANGE) {
        //     creep.moveTo(resource, { visualizePathStyle: PathStyle.Hauling })
        //   }
        // } else {
        const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
          filter: structure => {
            switch (structure.structureType) {
              case STRUCTURE_CONTAINER:
                const container = structure as StructureContainer
                return _.sum(container.store) >= creep.carryCapacity
              case STRUCTURE_EXTENSION:
                const extension = structure as StructureExtension
                return extension.energy >= creep.carryCapacity
              case STRUCTURE_SPAWN:
                const spawn = structure as StructureSpawn
                return spawn.energy >= creep.carryCapacity
              case STRUCTURE_TOWER:
                const tower = structure as StructureTower
                return tower.energy >= creep.carryCapacity
              case STRUCTURE_STORAGE:
                const storage = structure as StructureStorage
                return storage.store[RESOURCE_ENERGY] < storage.storeCapacity
            }

            return false
          }
        }) as StructureContainer | StructureExtension | StructureSpawn | StructureTower | StructureStorage

        if (target) {
          const withdraw = Tasks.withdraw(target, RESOURCE_ENERGY, creep.carryCapacity - creep.carry.energy)

          if (creep.task && creep.task.name !== TaskWithdraw.taskName) {
            creep.task = Tasks.chain([withdraw, creep.task])
          } else if (withdraw) {
            creep.task = withdraw
          }
        }
      }

      creep.run()
    })
  }
}

interface FindInfrastructureResult {
  roomName: string
  pos: { x: number; y: number }
}
