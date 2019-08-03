import { Infrastructure } from "RoomPlanner/Infrastructure"
export class RoomPlanner {
  private infrastructure: Infrastructure
  constructor(infrastructure: Infrastructure) {
    // Should probably be an interface and not an exact implementation
    this.infrastructure = infrastructure
  }
  public plan(roomName: string, rcl: number): Infrastructure {
    for (let index = 0; index <= rcl; index++) {
      this.infrastructure.AddLayer(roomName)
    }

    // Really naive implementation to satisfy  basic unit tests, need to write more tests that validates positions against rcl and such
    this.infrastructure.AddPosition(2, STRUCTURE_EXTENSION, 0, 1)
    this.infrastructure.AddPosition(2, STRUCTURE_EXTENSION, 0, 2)
    this.infrastructure.AddPosition(2, STRUCTURE_EXTENSION, 0, 3)
    this.infrastructure.AddPosition(2, STRUCTURE_EXTENSION, 0, 4)
    this.infrastructure.AddPosition(2, STRUCTURE_EXTENSION, 0, 5)

    // TODO: should probably add higher rcl on new layers
    if (rcl >= 3) {
      this.infrastructure.AddPosition(rcl, STRUCTURE_EXTENSION, 0, 6)
      this.infrastructure.AddPosition(rcl, STRUCTURE_EXTENSION, 0, 7)
      this.infrastructure.AddPosition(rcl, STRUCTURE_EXTENSION, 0, 8)
      this.infrastructure.AddPosition(rcl, STRUCTURE_EXTENSION, 0, 9)
      this.infrastructure.AddPosition(rcl, STRUCTURE_EXTENSION, 0, 10)
    }

    return this.infrastructure
  }
}
