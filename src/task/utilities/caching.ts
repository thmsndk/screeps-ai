// Caches targets every tick to allow for RoomObject.targetedBy property

export class TargetCache {
  targets: { [ref: string]: string[] }

  tick: number

  public constructor() {
    this.targets = {}
    this.tick = Game.time // Record last refresh
  }

  // Generates a hash table for targets: key: TargetRef, val: targeting creep names
  private cacheTargets(): void {
    this.targets = {}
    for (const i in Game.creeps) {
      const creep = Game.creeps[i]
      let task = creep.memory.task
      // Perform a faster, primitive form of _.map(creep.task.manifest, task => task.target.ref)
      while (task) {
        if (!this.targets[task._target.ref]) {
          this.targets[task._target.ref] = []
        }
        this.targets[task._target.ref].push(creep.name)
        task = task._parent
      }

      // Persistant target, allowing haulers to be attached to a source
      if (creep.memory.target) {
        if (!this.targets[creep.memory.target]) {
          this.targets[creep.memory.target] = []
        }
        this.targets[creep.memory.target].push(creep.name)
      }
    }
  }

  // Assert that there is an up-to-date target cache
  public static assert(): void {
    if (!(Game.TargetCache && Game.TargetCache.tick === Game.time)) {
      Game.TargetCache = new TargetCache()
      Game.TargetCache.build()
    }
  }

  // Build the target cache
  public build(): void {
    this.cacheTargets()
  }
}
