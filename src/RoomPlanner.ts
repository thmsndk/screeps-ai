import { InfrastructureLayer } from "./RoomPlanner/InfrastructureLayer"
export class RoomPlanner {
  public plan(roomName: string, rcl: number): InfrastructureLayer[] {
    const layers = [] as InfrastructureLayer[]
    const layer = new InfrastructureLayer(roomName, {} as any) // TODO: global Infrastructure object containing memory
    layers.push(layer)

    return layers
  }
}
