import { deref } from "task/utilities/utilities"
import { InfraStructurePositionMemory } from "./InfraStructurePositionMemory"
export class InfraStructurePosition {
  private _constructionSite?: ConstructionSite

  private _structure?: Structure<StructureConstant>

  private memory: InfraStructurePositionMemory

  public constructor(memory: InfraStructurePositionMemory, constructionSite?: ConstructionSite) {
    this.memory = memory
    if (constructionSite) {
      this._constructionSite = constructionSite
    }

    if (memory.id && !this._constructionSite) {
      const object = deref(memory.id) // TODO: to be fair this means we will parse the plan all the time and deref the entire plan, should probably wait to deref untill trying to access data, e.g. make it lazy

      if (object instanceof ConstructionSite) {
        const constructionSiteObject = object as ConstructionSite
        this._constructionSite = constructionSiteObject
      } else if (object instanceof Structure) {
        const structure = object as Structure<StructureConstant>
        this._structure = structure
      }
    }
  }

  public get constructionSite(): ConstructionSite | undefined {
    return this._constructionSite
  }

  public set constructionSite(constructionSite: ConstructionSite | undefined) {
    this._constructionSite = constructionSite
    this.memory.id = constructionSite ? (constructionSite.id as string) : undefined
  }

  public get id(): string | undefined {
    return this.memory.id
  }

  public destroyed(): void {
    // eslint-disable-next-line id-blacklist
    this.memory.id = undefined
    // eslint-disable-next-line id-blacklist
    this._constructionSite = undefined
    // eslint-disable-next-line id-blacklist
    this._structure = undefined
  }

  public get StructureType(): BuildableStructureConstant {
    return this.memory.structureType
  }

  public set structure(structure: Structure<StructureConstant>) {
    this.memory.id = structure.id as string
    this._structure = structure
  }

  public get pos(): IPosition {
    return { x: this.memory.x, y: this.memory.y }
  }

  public get finished(): boolean {
    return this.memory.id && this._structure ? true : false
  }
}
