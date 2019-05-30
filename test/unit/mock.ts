import { Dictionary } from "lodash";

export const Game = {
  creeps: [],
  rooms: { TEST: { energyAvailable: 300, energyCapacityAvailable: 300 } },// as Dictionary<Room>,
  spawns: { Spawn1: {} },// as Dictionary<StructureSpawn>,
  time: 12345
};

export const Memory = {
  creeps: [],
  spawns: {} as Dictionary<SpawnMemory>
};
