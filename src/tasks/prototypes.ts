import { deseralize } from "./TaskFactory"

Object.defineProperty(Creep.prototype, "task", {
  get() {
    if (!this._task) {
      const memoryTask = this.memory.task
      this._task = memoryTask ? deseralize(memoryTask) : null
    }
    return this._task
  },
  set(task: ITask | null) {
    this.memory.task = task ? task.memory : null
    if (task) {
      // Register references to creep
      task.creep = this
    }

    // Clear cache
    this._task = null
  }
})

Creep.prototype.run = function(): number | void {
  if (this.task) {
    return this.task.run()
  }
}

Object.defineProperties(Creep.prototype, {
  hasValidTask: {
    get() {
      return this.task && this.task.isValid()
    }
  },
  isIdle: {
    get() {
      return !this.hasValidTask
    }
  }
})

// RoomObject prototypes ===============================================================================================

Object.defineProperty(RoomObject.prototype, "ref", {
  get() {
    return this.id || this.name || ""
  }
})

// Object.defineProperty(RoomObject.prototype, 'targetedBy', {
// 	get: function () {
// 		// Check that target cache has been initialized - you can move this to execute once per tick if you want
// 		TargetCache.assert();
// 		return _.map(Game.TargetCache.targets[this.ref], name => Game.creeps[name]);
// 	},
// });

// RoomPosition prototypes =============================================================================================

Object.defineProperty(RoomPosition.prototype, "isEdge", {
  // if the position is at the edge of a room
  get() {
    return this.x === 0 || this.x === 49 || this.y === 0 || this.y === 49
  }
})

Object.defineProperty(RoomPosition.prototype, "isVisible", {
  // if the position is in a defined room
  get() {
    return Game.rooms[this.roomName] !== undefined
  },
  configurable: true
})

Object.defineProperty(RoomPosition.prototype, "neighbors", {
  get() {
    const adjPos: RoomPosition[] = []
    for (const dx of [-1, 0, 1]) {
      for (const dy of [-1, 0, 1]) {
        if (!(dx === 0 && dy === 0)) {
          const x = this.x + dx
          const y = this.y + dy
          if (0 < x && x < 49 && 0 < y && y < 49) {
            adjPos.push(new RoomPosition(x, y, this.roomName))
          }
        }
      }
    }
    return adjPos
  }
})

RoomPosition.prototype.isPassible = function(ignoreCreeps = false): boolean {
  // Is terrain passable?
  if (Game.map.getTerrainAt(this) === "wall") {
    return false
  }
  if (this.isVisible) {
    // Are there creeps?
    if (ignoreCreeps === false && this.lookFor(LOOK_CREEPS).length > 0) {
      return false
    }
    // Are there structures?
    const impassibleStructures = _.filter(this.lookFor(LOOK_STRUCTURES), (s: Structure) => {
      return (
        s.structureType !== STRUCTURE_ROAD &&
        s.structureType !== STRUCTURE_CONTAINER &&
        !(s.structureType === STRUCTURE_RAMPART && ((s as StructureRampart).my || (s as StructureRampart).isPublic))
      )
    })
    return impassibleStructures.length == 0
  }
  return true
}

RoomPosition.prototype.availableNeighbors = function(ignoreCreeps = false): RoomPosition[] {
  return _.filter(this.neighbors, pos => pos.isPassible(ignoreCreeps))
}
