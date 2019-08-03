import { Dictionary } from "lodash"

import { InfrastructureLayer } from "./InfrastructureLayer"
import { InfraStructureLayerMemory } from "./InfraStructureLayerMemory"
import { InfrastructureMemory } from "./InfrastructureMemory"
import { InfraStructurePositionMemory } from "./InfraStructurePositionMemory"

interface InfraStructureConstructor {
  memory: InfrastructureMemory
}

export class Infrastructure {
  public Layers: InfrastructureLayer[]

  private memory: InfrastructureMemory // TODO: should it be a property that fetches memory from the memory object?

  constructor(parameters: InfraStructureConstructor) {
    const layers = [] as InfrastructureLayer[]

    this.memory = parameters.memory
    if (parameters.memory.layers) {
      parameters.memory.layers.forEach(layer => {
        layers.push(new InfrastructureLayer(layer.roomName, layer))
      })
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
    this.Layers.push(new InfrastructureLayer(roomName, memory as InfraStructureLayerMemory))
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
}

interface FindInfrastructureResult {
  roomName: string
  pos: { x: number; y: number }
}
