import { InfraStructureLayerMemory } from "./InfraStructureLayerMemory"
export interface InfrastructureMemory {
  layers: { [roomName: string]: InfraStructureLayerMemory[] }
  startTick?: number
  finishTick?: number
}
