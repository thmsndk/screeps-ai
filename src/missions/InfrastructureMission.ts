import { Mission } from "./Mission"
import { Dictionary } from "lodash"
import { stringify } from "querystring"

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
  private memory: InfraStructurePositionMemory
  constructor(memory: InfraStructurePositionMemory) {
    this.memory = memory
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
    memory?: InfraStructurePositionMemory
  ) {
    if (!memory) {
      memory = { structureType, x, y }
    }

    if (this.memory) {
      this.memory.positions.push(memory)
    }

    this.Positions.push(new InfraStructurePosition(memory))
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
        parameters.memory.layers.forEach(layer => {
          layers.push(new Layer(layer.roomName, layer))
        })

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
}

interface FindInfrastructureResult {
  roomName: string
  pos: { x: number; y: number }
}
