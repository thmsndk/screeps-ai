import { Mission } from "./Mission"

interface InfraStructurePositionMemory {
  structureType: BuildableStructureConstant
  x: number
  y: number
}

interface InfraStructureLayerMemory {
  roomName: string
  positions: InfraStructurePositionMemory[]
}
export interface InfrastructureMissionMemory extends IMissionMemory {
  layers: InfraStructureLayerMemory[]
  startTick?: number
  finishTick?: number
}

interface InfraStructureMissionConstructor {
  memory?: InfrastructureMissionMemory
}

class InfraStructurePosition {
  public StructureType: BuildableStructureConstant
  private x: number
  private y: number
  constructor(structureType: BuildableStructureConstant, x: number, y: number) {
    this.StructureType = structureType
    this.x = x
    this.y = y
  }

  get pos(): IPosition {
    return { x: this.x, y: this.y }
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
        positions.push(new InfraStructurePosition(position.structureType, position.x, position.y))
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
    if (this.memory) {
      if (!memory) {
        memory = { structureType, x, y }
      }
      this.memory.positions.push(memory)
    }

    this.Positions.push(new InfraStructurePosition(structureType, x, y))
  }
}

// tslint:disable-next-line: max-classes-per-file
export class InfraStructureMission extends Mission {
  public memory?: InfrastructureMissionMemory // TODO: Private
  public Layers: Layer[]
  constructor(parameters?: InfraStructureMissionConstructor) {
    super(parameters ? parameters.memory : undefined)
    const layers = [] as Layer[]
    if (parameters) {
      if (parameters.memory) {
        parameters.memory.layers.forEach(layer => {
          layers.push(new Layer(layer.roomName, layer))
        })
      }
    }
    this.Layers = layers
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
}
