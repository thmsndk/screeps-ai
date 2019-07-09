import { Dictionary } from "lodash"
import { Substitute, Arg } from "@fluffy-spoon/substitute"

export const Game = Substitute.for<Game>()
// {
//   creeps: [],
//   rooms: { TEST: { energyAvailable: 300, energyCapacityAvailable: 300 } }, // as Dictionary<Room>,
//   spawns: { Spawn1: {} }, // as Dictionary<StructureSpawn>,
//   time: 12345
// }

export const Memory = {
  creeps: {} as Dictionary<Creep>,
  spawns: {} as Dictionary<SpawnMemory>,
  profiler: {}
}

export interface CreepOptions {
  name: string
  body: BodyPartConstant[]
}

// const creepFunctionName = "Creep"
// global[creepFunctionName]:any = stubCreep

/**
 * Returns a fake `Creep` for tests
 *
 * @param creepName The name of the creep
 */
// export const Creep = (options: CreepOptions) => {

//     body = options.body.map((type) => {
//       return {
//         type
//       }
//     })

//     name = options.name
// } as any as CreepConstructor

/**
 * Returns a fake `Creep` for tests
 *
 * @param creepName The name of the creep
 */
// export function stubCreep(options: CreepOptions): Creep {
//   return new Creep(options)
// }

// export class StubCreep extends Creep {}

export const stubStuff = () => {
  const g = global as any

  g.Game = Game
  g.Creep = (function() {
    //class StubCreep extends Creep {}
    function Creep() {}

    return Creep
  })()

  // tslint:disable-next-line: max-classes-per-file
  g.RoomObject = (function() {
    //class StubRoomObject extends RoomObject {}
    function RoomObject() {}

    return RoomObject
  })()

  // tslint:disable-next-line: max-classes-per-file
  g.RoomPosition = (function() {
    //class StubRoomPosition extends RoomPosition {}
    function RoomObject() {}

    return RoomObject
  })()
}

stubStuff()
