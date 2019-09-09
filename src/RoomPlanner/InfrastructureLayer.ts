import { InfraStructurePositionMemory } from "./InfraStructurePositionMemory"
import { InfraStructureLayerMemory } from "./InfraStructureLayerMemory"
import { InfraStructurePosition } from "./InfraStructurePosition"
// tslint:disable-next-line: max-classes-per-file
export class InfrastructureLayer {
  private memory: InfraStructureLayerMemory
  public roomName: string
  public Positions: InfraStructurePosition[]
  constructor(roomName: string, memory: InfraStructureLayerMemory) {
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
  ) {
    if (!memory) {
      memory = { structureType, x, y }
      if (constructionSite) {
        memory.id = constructionSite.id
      }
    }
    if (this.memory) {
      this.memory.positions.push(memory)
    }
    this.Positions.push(new InfraStructurePosition(memory, constructionSite))
  }

  public addConstructionSite(constructionSite: ConstructionSite<BuildableStructureConstant>) {
    this.AddPosition(
      constructionSite.structureType,
      constructionSite.pos.x,
      constructionSite.pos.y,
      undefined,
      constructionSite
    )
  }
}
