import { deseralize } from "./TaskFactory"
import { deref, derefRoomPosition } from "./utilities"

export interface targetType {
  ref: string
  pos: RoomPosition
} // overwrite this variable in derived classes to specify more precise typing

/* An abstract class for encapsulating creep actions. This generalizes the concept of "do action X to thing Y until
 * condition Z is met" and saves a lot of convoluted and duplicated code in creep logic. A Task object contains
 * the necessary logic for traveling to a target, performing a task, and realizing when a task is no longer sensible
 * to continue.*/

export abstract class Task implements ITask {
  public static taskName: string

  public name: string // Name of the task type, e.g. 'upgrade'
  public _creep: {
    // Data for the creep the task is assigned to"
    name: string // Name of the creep
  }
  public _target: {
    // Data for the target the task is directed to:
    ref: string // Target id or name
    _pos: PositionMemory // Target position's coordinates in case vision is lost
  }
  public _parent?: TaskMemory | null // The parent of this task, if any. Task is changed to parent upon completion
  public tick: number
  public settings: TaskSettings // Settings for a given type of task; shouldn't be modified on an instance-basis
  public options?: TaskOptions // Options for a specific instance of a task
  public data?: TaskData // Data pertaining to a given instance of a task

  constructor(taskName: string, target: targetType, options = {} as TaskOptions) {
    // Parameters for the task
    this.name = taskName
    this._creep = {
      name: ""
    }
    if (target) {
      // Handles edge cases like when you're done building something and target disappears
      this._target = {
        ref: target.ref,
        _pos: target.pos
      }
    } else {
      this._target = {
        ref: "",
        _pos: {
          x: -1,
          y: -1,
          roomName: ""
        }
      }
    }
    this._parent = null
    this.settings = {
      targetRange: 1, // range at which you can perform action
      workOffRoad: false // whether work() should be performed off road
      //   oneShot: false // remove this task once work() returns OK, regardless of validity
    }
    _.defaults(options, {
      blind: false,
      moveOptions: {}
    })
    this.tick = Game.time
    this.options = options
    this.data = {
      //   quiet: true
    }
  }

  get memory(): TaskMemory {
    return {
      name: this.name,
      _creep: this._creep,
      _target: this._target,
      _parent: this._parent,
      options: this.options,
      data: this.data,
      tick: this.tick
    }
  }

  set memory(protoTask: TaskMemory) {
    // Don't write to this.name; used in task switcher
    this._creep = protoTask._creep
    this._target = protoTask._target
    this._parent = protoTask._parent
    this.options = protoTask.options
    this.data = protoTask.data
    this.tick = protoTask.tick
  }

  // Getter/setter for task.creep
  get creep(): Creep {
    // Get task's own creep by its name
    return Game.creeps[this._creep.name]
  }

  set creep(creep: Creep) {
    this._creep.name = creep.name
  }

  // Dereferences the target
  get target(): RoomObject | null {
    return deref(this._target.ref)
  }

  // Dereferences the saved target position; useful for situations where you might lose vision
  get targetPos(): RoomPosition {
    // refresh if you have visibility of the target
    if (this.target) {
      this._target._pos = this.target.pos
    }
    return derefRoomPosition(this._target._pos)
  }

  // Getter/setter for task parent
  get parent(): Task | null {
    return this._parent ? deseralize(this._parent) : null
  }

  set parent(parentTask: Task | null) {
    this._parent = parentTask ? parentTask.memory : null
    // If the task is already assigned to a creep, update their memory
    if (this.creep) {
      this.creep.task = this
    }
  }

  // Return a list of [this, this.parent, this.parent.parent, ...] as tasks
  get manifest(): Task[] {
    const manifest: Task[] = [this]
    let parent = this.parent
    while (parent) {
      manifest.push(parent)
      parent = parent.parent
    }
    return manifest
  }

  // Return a list of [this.target, this.parent.target, ...] without fully instantiating the list of tasks
  get targetManifest(): Array<RoomObject | null> {
    const targetRefs: string[] = [this._target.ref]
    let parent = this._parent
    while (parent) {
      targetRefs.push(parent._target.ref)
      parent = parent._parent
    }
    return _.map(targetRefs, ref => deref(ref))
  }

  // Return a list of [this.target, this.parent.target, ...] without fully instantiating the list of tasks
  get targetPosManifest(): RoomPosition[] {
    const targetPositions: PositionMemory[] = [this._target._pos]
    let parent = this._parent
    while (parent) {
      targetPositions.push(parent._target._pos)
      parent = parent._parent
    }
    return _.map(targetPositions, protoPos => derefRoomPosition(protoPos))
  }

  // Fork the task, assigning a new task to the creep with this task as its parent
  public fork(newTask: Task): Task {
    newTask.parent = this
    if (this.creep) {
      this.creep.task = newTask
    }
    return newTask
  }

  // Test every tick to see if task is still valid
  public abstract isValidTask(): boolean

  // Test every tick to see if target is still valid
  public abstract isValidTarget(): boolean

  public isValid(): boolean {
    let validTask = false
    if (this.creep) {
      validTask = this.isValidTask()
    }
    let validTarget = false
    if (this.target) {
      validTarget = this.isValidTarget()
    } else if (this.options && this.options.blind && !Game.rooms[this.targetPos.roomName]) {
      // If you can't see the target's room but you have blind enabled, then that's okay
      validTarget = true
    }
    // Return if the task is valid; if not, finalize/delete the task and return false
    if (validTask && validTarget) {
      return true
    } else {
      // Switch to parent task if there is one
      this.finish()
      return this.parent ? this.parent.isValid() : false
    }
  }

  public moveToTarget(range = this.settings.targetRange): number {
    if (this.options && this.options.moveOptions && !this.options.moveOptions.range) {
      this.options.moveOptions.range = range
    }
    return this.creep.moveTo(this.targetPos, this.options ? this.options.moveOptions : undefined)
    // return this.creep.travelTo(this.targetPos, this.options.moveOptions); // <- switch if you use Traveler
  }

  /* Moves to the next position on the agenda if specified - call this in some tasks after work() is completed */
  public moveToNextPos(): number | undefined {
    if (this.options && this.options.nextPos) {
      const nextPos = derefRoomPosition(this.options.nextPos)
      return this.creep.moveTo(nextPos)
      // return this.creep.travelTo(nextPos); // <- switch if you use Traveler
    }

    return undefined
  }

  // Return expected number of ticks until creep arrives at its first destination; this requires Traveler to work!
  get eta(): number | undefined {
    if (this.creep && (this.creep.memory as any)._trav) {
      return (this.creep.memory as any)._trav.path.length
    }

    return undefined
  }

  // Execute this task each tick. Returns nothing unless work is done.
  public run(): number | undefined {
    if (this.creep.pos.inRangeTo(this.targetPos, this.settings.targetRange) && !this.creep.pos.isEdge) {
      //   if (this.settings.workOffRoad) {
      //     // Move to somewhere nearby that isn't on a road
      //     this.parkCreep(this.creep, this.targetPos, true)
      //   }
      const result = this.work()
      //   if (this.settings.oneShot && result == OK) {
      //     this.finish()
      //   }
      return result
    } else {
      return this.moveToTarget()
    }
  }

  //   /* Bundled form of Zerg.park(); adapted from BonzAI codebase*/
  //   protected parkCreep(creep: Creep, pos: RoomPosition = creep.pos, maintainDistance = false): number {
  //     let road = _.find(creep.pos.lookFor(LOOK_STRUCTURES), s => s.structureType == STRUCTURE_ROAD)
  //     if (!road) return OK

  //     let positions = _.sortBy(creep.pos.availableNeighbors(), (p: RoomPosition) => p.getRangeTo(pos))
  //     if (maintainDistance) {
  //       let currentRange = creep.pos.getRangeTo(pos)
  //       positions = _.filter(positions, (p: RoomPosition) => p.getRangeTo(pos) <= currentRange)
  //     }

  //     let swampPosition
  //     for (let position of positions) {
  //       if (_.find(position.lookFor(LOOK_STRUCTURES), s => s.structureType == STRUCTURE_ROAD)) continue
  //       let terrain = position.lookFor(LOOK_TERRAIN)[0]
  //       if (terrain === "swamp") {
  //         swampPosition = position
  //       } else {
  //         return creep.move(creep.pos.getDirectionTo(position))
  //       }
  //     }

  //     if (swampPosition) {
  //       return creep.move(creep.pos.getDirectionTo(swampPosition))
  //     }

  //     return creep.moveTo(pos)
  //     // return creep.travelTo(pos); // <-- Switch if you use Traveler
  //   }

  // Task to perform when at the target
  public abstract work(): number

  // Finalize the task and switch to parent task (or null if there is none)
  public finish(): void {
    this.moveToNextPos()
    if (this.creep) {
      this.creep.task = this.parent
    } else {
      console.log(`No creep executing ${this.name}!`)
    }
  }
}
