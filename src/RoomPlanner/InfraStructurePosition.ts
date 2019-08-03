import { deref } from "task/utilities/utilities"
import { InfraStructurePositionMemory } from "./InfraStructurePositionMemory"
export class InfraStructurePosition {
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
