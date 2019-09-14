import { deref } from "task/utilities/utilities"
import { InfraStructurePositionMemory } from "./InfraStructurePositionMemory"
export class InfraStructurePosition {
  private _constructionSite?: ConstructionSite
  private _structure?: Structure<StructureConstant>
  private memory: InfraStructurePositionMemory
  constructor(memory: InfraStructurePositionMemory, constructionSite?: ConstructionSite) {
    this.memory = memory
    if (constructionSite) {
      this._constructionSite = constructionSite
    }
    if (memory.id && !this._constructionSite) {
      const object = deref(memory.id) // TODO: to be fair this means we will parse the plan all the time and deref the entire plan, should probably wait to deref untill trying to access data, e.g. make it lazy
      const constructionSiteObject = object as ConstructionSite
      if (constructionSiteObject) {
        this._constructionSite = constructionSite
      } else {
        const structure = object as Structure<StructureConstant>
        if (structure) {
          this._structure = structure
        }
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
    return this.memory.id && this._structure ? true : false
  }
}
