import { Hatchery } from './../../src/Hatchery';
import { assert } from "chai";
import { loop } from "../../src/main";
import { Game, Memory } from "./mock"

describe("hatchery", () => {
  before(() => {
    // runs before all test in this block
    Memory.spawns.Spawn1 = {
      requests: [
        { mutation: "upgrader", priority: 10 },
        { mutation: "hauler", priority: 20 },
        { mutation: "worker", priority: 30 }
      ]
    }
    Game.rooms.TEST = {}

    Game.spawns.Spawn1 = { room: Game.rooms.TEST, memory: Memory.spawns.Spawn1 }
  });

  beforeEach(() => {
    // runs before each test in this block
    // @ts-ignore : allow adding Game to global
    global.Game = _.clone(Game) as Game;
    // @ts-ignore : allow adding Memory to global
    global.Memory = _.clone(Memory);
  });

  it("should import spawn requests ", () => {
    const hatchery = new Hatchery("Spawn1")
    assert.equal(hatchery.requests.length, 3);
  });

  it("should prioritize requests ", () => {
    const hatchery = new Hatchery("Spawn1")
    let nextRequest = hatchery.requests.peek()
    assert.equal(nextRequest.mutation, "worker");
  });

  it("should re-prioritize requests ", () => {
    const hauler = Memory.spawns.Spawn1.requests && Memory.spawns.Spawn1.requests[1]

    assert.isOk(hauler)

    if (hauler) {
      hauler.priority = 100
    }

    const hatchery = new Hatchery("Spawn1")
    let nextRequest = hatchery.requests.peek()
    assert.equal(nextRequest.mutation, "hauler");
  });
});
