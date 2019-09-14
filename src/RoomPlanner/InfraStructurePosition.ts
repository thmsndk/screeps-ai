import { deref } from "task/utilities/utilities"
import { InfraStructurePositionMemory } from "./InfraStructurePositionMemory"
export class InfraStructurePosition {
  private _constructionSite?: ConstructionSite
  private memory: InfraStructurePositionMemory
  constructor(memory: InfraStructurePositionMemory, constructionSite?: ConstructionSite) {
    this.memory = memory
    if (constructionSite) {
      this._constructionSite = constructionSite
    }
    if (memory.id && !this.constructionSite) {
      const object = deref(memory.id)
      const constructionSiteObject = object as ConstructionSite
      if (constructionSiteObject) {
        this.constructionSite = constructionSite
      }
    }
  }

  get constructionSite(): ConstructionSite | undefined {
    return this._constructionSite
  }

  set constructionSite(constructionSite: ConstructionSite | undefined) {
    this._constructionSite = constructionSite
    this.memory.id = constructionSite ? constructionSite.id : undefined
  }

  get id(): string | undefined {
    return this.memory.id
  }

  get StructureType(): BuildableStructureConstant {
    return this.memory.structureType
  }

  set structure(structure: Structure<StructureConstant>) {
    this.memory.id = structure.id
  }

  get pos(): IPosition {
    return { x: this.memory.x, y: this.memory.y }
  }

  get finished(): boolean {
    return this.memory.id && !this.constructionSite ? true : false
  }
}
