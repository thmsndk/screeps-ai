// const MemHack = {
//     memory: null,
//     parseTime: -1,
//     register () {
//       const start = Game.cpu.getUsed()
//       this.memory = Memory
//       const end = Game.cpu.getUsed()
//       this.parseTime = end - start
//       this.memory = RawMemory._parsed
//     },
//     pretick () {
//       delete global.Memory
//       global.Memory = this.memory
//       RawMemory._parsed = this.memory
//     }
//   }
//   MemHack.register()
//   export default MemHack

/*
You can run this code
cpu = Game.cpu.getUsed();JSON.parse(RawMemory.get());Game.cpu.getUsed()-cpu
in console and you will see how many CPU you spend on memory parsing.
*/
