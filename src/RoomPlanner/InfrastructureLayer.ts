import { InfraStructurePositionMemory } from "./InfraStructurePositionMemory"
import { InfraStructureLayerMemory } from "./InfraStructureLayerMemory"
import { InfraStructurePosition } from "./InfraStructurePosition"
// Tslint:disable-next-line: max-classes-per-file
export class InfrastructureLayer {
  private memory: InfraStructureLayerMemory

  public roomName: string

  public Positions: InfraStructurePosition[]

  public constructor(roomName: string, memory: InfraStructureLayerMemory) {
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
    memory?: InfraStructurePositionMemory,
    constructionSite?: ConstructionSite
  ): void {
    if (!memory) {
      memory = { structureType, x, y }
      if (constructionSite) {
        memory.id = constructionSite.id as string
      }
    }

    if (this.Positions.some(p => p.pos.x === x && p.pos.y === y)) {
      return
    }

    if (this.memory) {
      this.memory.positions.push(memory)
    }
    this.Positions.push(new InfraStructurePosition(memory, constructionSite))
  }

  public addConstructionSite(constructionSite: ConstructionSite<BuildableStructureConstant>): void {
    this.AddPosition(
      constructionSite.structureType,
      constructionSite.pos.x,
      constructionSite.pos.y,
      undefined,
      constructionSite
    )
  }
}
