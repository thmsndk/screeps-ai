import { InfraStructureLayerMemory } from "./InfraStructureLayerMemory"
export interface InfrastructureMemory {
  layers: InfraStructureLayerMemory[]
  startTick?: number
  finishTick?: number
}
