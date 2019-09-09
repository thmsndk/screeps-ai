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

    // wall = RCL 2
    // extension = RCL 2
    // Rampart = RCL 2
    // Tower = RCL 3
    // Storage = RCL 4
    // Link = RCL 5
    // Extractor = RCL 6
    // LAB = RCL 6
    // Terminal = RCL 6


    // Really naive implementation to satisfy  basic unit tests, need to write more tests that validates positions against rcl and such
    this.infrastructure.AddPosition(2, STRUCTURE_EXTENSION, 0, 1)
    this.infrastructure.AddPosition(2, STRUCTURE_EXTENSION, 0, 2)
    this.infrastructure.AddPosition(2, STRUCTURE_EXTENSION, 0, 3)
    this.infrastructure.AddPosition(2, STRUCTURE_EXTENSION, 0, 4)
    this.infrastructure.AddPosition(2, STRUCTURE_EXTENSION, 0, 5)

    // TODO: should probably add higher rcl on new layers
    if (rcl >= 3) {
      this.infrastructure.AddPosition(3, STRUCTURE_EXTENSION, 0, 6)
      this.infrastructure.AddPosition(3, STRUCTURE_EXTENSION, 0, 7)
      this.infrastructure.AddPosition(3, STRUCTURE_EXTENSION, 0, 8)
      this.infrastructure.AddPosition(3, STRUCTURE_EXTENSION, 0, 9)
      this.infrastructure.AddPosition(3, STRUCTURE_EXTENSION, 0, 10)
    }

    if (rcl >= 4) {
      this.infrastructure.AddPosition(4, STRUCTURE_EXTENSION, 0, 11)
      this.infrastructure.AddPosition(4, STRUCTURE_EXTENSION, 0, 12)
      this.infrastructure.AddPosition(4, STRUCTURE_EXTENSION, 0, 13)
      this.infrastructure.AddPosition(4, STRUCTURE_EXTENSION, 0, 14)
      this.infrastructure.AddPosition(4, STRUCTURE_EXTENSION, 0, 15)
      this.infrastructure.AddPosition(4, STRUCTURE_EXTENSION, 0, 16)
      this.infrastructure.AddPosition(4, STRUCTURE_EXTENSION, 0, 17)
      this.infrastructure.AddPosition(4, STRUCTURE_EXTENSION, 0, 18)
      this.infrastructure.AddPosition(4, STRUCTURE_EXTENSION, 0, 19)
      this.infrastructure.AddPosition(4, STRUCTURE_EXTENSION, 0, 20)
    }

    if (rcl >= 5) {
      this.infrastructure.AddPosition(5, STRUCTURE_EXTENSION, 0, 21)
      this.infrastructure.AddPosition(5, STRUCTURE_EXTENSION, 0, 22)
      this.infrastructure.AddPosition(5, STRUCTURE_EXTENSION, 0, 23)
      this.infrastructure.AddPosition(5, STRUCTURE_EXTENSION, 0, 24)
      this.infrastructure.AddPosition(5, STRUCTURE_EXTENSION, 0, 25)
      this.infrastructure.AddPosition(5, STRUCTURE_EXTENSION, 0, 26)
      this.infrastructure.AddPosition(5, STRUCTURE_EXTENSION, 0, 27)
      this.infrastructure.AddPosition(5, STRUCTURE_EXTENSION, 0, 28)
      this.infrastructure.AddPosition(5, STRUCTURE_EXTENSION, 0, 29)
      this.infrastructure.AddPosition(5, STRUCTURE_EXTENSION, 0, 30)
    }

    if (rcl >= 6) {
      this.infrastructure.AddPosition(6, STRUCTURE_EXTENSION, 0, 31)
      this.infrastructure.AddPosition(6, STRUCTURE_EXTENSION, 0, 32)
      this.infrastructure.AddPosition(6, STRUCTURE_EXTENSION, 0, 33)
      this.infrastructure.AddPosition(6, STRUCTURE_EXTENSION, 0, 34)
      this.infrastructure.AddPosition(6, STRUCTURE_EXTENSION, 0, 35)
      this.infrastructure.AddPosition(6, STRUCTURE_EXTENSION, 0, 36)
      this.infrastructure.AddPosition(6, STRUCTURE_EXTENSION, 0, 37)
      this.infrastructure.AddPosition(6, STRUCTURE_EXTENSION, 0, 38)
      this.infrastructure.AddPosition(6, STRUCTURE_EXTENSION, 0, 39)
      this.infrastructure.AddPosition(6, STRUCTURE_EXTENSION, 0, 40)
    }

    if (rcl >= 7) {
      this.infrastructure.AddPosition(7, STRUCTURE_EXTENSION, 0, 41)
      this.infrastructure.AddPosition(7, STRUCTURE_EXTENSION, 0, 42)
      this.infrastructure.AddPosition(7, STRUCTURE_EXTENSION, 0, 43)
      this.infrastructure.AddPosition(7, STRUCTURE_EXTENSION, 0, 44)
      this.infrastructure.AddPosition(7, STRUCTURE_EXTENSION, 0, 45)
      this.infrastructure.AddPosition(7, STRUCTURE_EXTENSION, 0, 46)
      this.infrastructure.AddPosition(7, STRUCTURE_EXTENSION, 0, 47)
      this.infrastructure.AddPosition(7, STRUCTURE_EXTENSION, 0, 48)
      this.infrastructure.AddPosition(7, STRUCTURE_EXTENSION, 0, 49)
      this.infrastructure.AddPosition(7, STRUCTURE_EXTENSION, 0, 50)
    }

    if (rcl >= 8) {
      this.infrastructure.AddPosition(8, STRUCTURE_EXTENSION, 1, 41)
      this.infrastructure.AddPosition(8, STRUCTURE_EXTENSION, 2, 42)
      this.infrastructure.AddPosition(8, STRUCTURE_EXTENSION, 3, 43)
      this.infrastructure.AddPosition(8, STRUCTURE_EXTENSION, 4, 44)
      this.infrastructure.AddPosition(8, STRUCTURE_EXTENSION, 5, 45)
      this.infrastructure.AddPosition(8, STRUCTURE_EXTENSION, 6, 46)
      this.infrastructure.AddPosition(8, STRUCTURE_EXTENSION, 7, 47)
      this.infrastructure.AddPosition(8, STRUCTURE_EXTENSION, 8, 48)
      this.infrastructure.AddPosition(8, STRUCTURE_EXTENSION, 9, 49)
      this.infrastructure.AddPosition(8, STRUCTURE_EXTENSION, 10, 50)
    }

    return this.infrastructure
  }
}
