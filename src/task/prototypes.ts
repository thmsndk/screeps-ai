import { deseralize } from "./utilities/TaskFactory"
import { TargetCache } from "./utilities/caching"

// Creep prototypes ===============================================================================================

Object.defineProperty(Creep.prototype, "task", {
  get(): ITask | null {
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

Object.defineProperty(RoomObject.prototype, "targetedBy", {
  get() {
    // Check that target cache has been initialized - you can move this to execute once per tick if you want
    TargetCache.assert()

    return _.map(Game.TargetCache.targets[this.ref], name => Game.creeps[name])
  }
})

// RoomPosition prototypes =============================================================================================

Object.defineProperty(RoomPosition.prototype, "print", {
  get() {
    return (
      '<a href="#!/room/' +
      Game.shard.name +
      "/" +
      this.roomName +
      '">[' +
      this.roomName +
      ", " +
      this.x +
      ", " +
      this.y +
      "]</a>"
    )
  },
  configurable: true
})

Object.defineProperty(RoomPosition.prototype, "isEdge", {
  // If the position is at the edge of a room
  get() {
    return this.x === 0 || this.x === 49 || this.y === 0 || this.y === 49
  }
})

Object.defineProperty(RoomPosition.prototype, "isVisible", {
  // If the position is in a defined room
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
    const impassibleStructures = _.filter(
      this.lookFor(LOOK_STRUCTURES),
      (s: Structure) =>
        s.structureType !== STRUCTURE_ROAD &&
        s.structureType !== STRUCTURE_CONTAINER &&
        !(s.structureType === STRUCTURE_RAMPART && ((s as StructureRampart).my || (s as StructureRampart).isPublic))
    )

    return impassibleStructures.length == 0
  }

  return true
}

RoomPosition.prototype.availableNeighbors = function(ignoreCreeps = false): RoomPosition[] {
  return _.filter(this.neighbors, pos => pos.isPassible(ignoreCreeps))
}

// Misc
String.prototype.padRight = function(length: number, char = " "): string {
  return this + char.repeat(Math.max(length - this.length, 0))
}

String.prototype.padLeft = function(length: number, char = " "): string {
  return char.repeat(Math.max(length - this.length, 0)) + this
}

Number.prototype.toPercent = function(decimals = 0): string {
  return ((this as number) * 100).toFixed(decimals) + "%"
}

Number.prototype.truncate = function(decimals: number): number {
  const re = new RegExp("(\\d+\\.\\d{" + decimals + "})(\\d)")
  const m = this.toString().match(re)

  return m ? parseFloat(m[1]) : this.valueOf()
}

Object.defineProperty(ConstructionSite.prototype, "isWalkable", {
  get() {
    return (
      this.structureType === STRUCTURE_ROAD ||
      this.structureType === STRUCTURE_CONTAINER ||
      this.structureType === STRUCTURE_RAMPART
    )
  },
  configurable: true
})
