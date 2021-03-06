import { Dictionary } from "lodash"
import { Substitute, Arg } from "@fluffy-spoon/substitute"

export const Game = Substitute.for<Game>()

export const Memory = {
  creeps: {} as Dictionary<Creep>,
  spawns: {} as Dictionary<SpawnMemory>,
  rooms: {} as Dictionary<RoomMemory>,
  profiler: {}
}

const mockScreeps = () => {
  const g = global as any

  g.Game = Game

  // tslint:disable-next-line: max-classes-per-file, only-arrow-functions
  g.Creep = class Creep {}

  // tslint:disable-next-line: max-classes-per-file, only-arrow-functions
  // tslint:disable-next-line: max-classes-per-file
  g.Room = class Room {}

  // tslint:disable-next-line: max-classes-per-file
  g.Room.Terrain = Substitute.for<RoomTerrain>()

  // tslint:disable-next-line: max-classes-per-file, only-arrow-functions
  // tslint:disable-next-line: max-classes-per-file
  g.RoomObject = class RoomObject {}

  // tslint:disable-next-line: max-classes-per-file, only-arrow-functions
  // tslint:disable-next-line: max-classes-per-file
  g.RoomPosition = class RoomPosition {}

  // tslint:disable-next-line: max-classes-per-file, only-arrow-functions
  // tslint:disable-next-line: max-classes-per-file
  g.ConstructionSite = class ConstructionSite extends RoomObject {}
}

mockScreeps()
