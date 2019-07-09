import { Dictionary } from "lodash"
import { Substitute, Arg } from "@fluffy-spoon/substitute"

export const Game = Substitute.for<Game>()

export const Memory = {
  creeps: {} as Dictionary<Creep>,
  spawns: {} as Dictionary<SpawnMemory>,
  profiler: {}
}

const mockScreeps = () => {
  const g = global as any

  g.Game = Game
  g.Creep = (function() {
    function Creep() {}

    return Creep
  })()

  // tslint:disable-next-line: max-classes-per-file
  g.RoomObject = (function() {
    function RoomObject() {}

    return RoomObject
  })()

  // tslint:disable-next-line: max-classes-per-file
  g.RoomPosition = (function() {
    function RoomObject() {}

    return RoomObject
  })()
}

mockScreeps()
