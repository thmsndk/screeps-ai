// Disabled because running Profiler.init tries to acquire Memory
// import "../constants"
// import { Game, Memory } from "./mock"
// import { assert } from "chai"
// import { loop } from "../../src/main"

// describe("main", () => {
//   before(() => {
//     // runs before all test in this block
//   })

//   beforeEach(() => {
//     // runs before each test in this block
//     // @ts-ignore : allow adding Game to global
//     global.Game = _.clone(Game)
//     // @ts-ignore : allow adding Memory to global
//     global.Memory = _.clone(Memory)
//   })

//   it("should export a loop function", () => {
//     assert.isTrue(typeof loop === "function")
//   })

//   it("should return void when called with no context", () => {
//     assert.isUndefined(loop())
//   })
// })
