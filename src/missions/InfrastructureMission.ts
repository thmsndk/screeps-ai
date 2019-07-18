import { Mission } from "./Mission"

interface InfrastructureMissionMemory extends IMissionMemory {
  layers: any
  startTick: number
  finishTick: number
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
  public roomName: string
  public Positions: InfraStructurePosition[]
  constructor(roomName: string) {
    this.roomName = roomName
    this.Positions = []
  }

  public AddPosition(structureType: BuildableStructureConstant, x: number, y: number) {
    this.Positions.push(new InfraStructurePosition(structureType, x, y))
  }
}

// tslint:disable-next-line: max-classes-per-file
export class InfraStructureMission extends Mission {
  public memory?: InfrastructureMissionMemory // TODO: Private
  public Layers: Layer[]
  constructor(parameters?: InfraStructureMissionConstructor) {
    super(parameters ? parameters.memory : undefined)
    this.Layers = []
  }

  public AddLayer(roomName: string) {
    this.Layers.push(new Layer(roomName))
  }

  public AddPosition(layerIndex: number, structureType: BuildableStructureConstant, x: number, y: number) {
    this.Layers[layerIndex].AddPosition(structureType, x, y)
  }
}
