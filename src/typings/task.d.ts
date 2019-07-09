/*

  TASKS

  What is a task
    - harvest
    - build
    - goTo(RoomObject|RoomPosition)
 */
interface CreepMemory {
  task?: TaskMemory
}

interface Creep {
  task: ITask | null
  hasValidTask: boolean
  isIdle: boolean

  run(): number | void
}

interface RoomPosition {
  neighbors: RoomPosition[]
  isEdge: boolean
  isVisible: boolean

  isPassible(ignoreCreeps?: boolean): boolean

  availableNeighbors(ignoreCreeps?: boolean): RoomPosition[]
}

interface PositionMemory {
  /**
   * X position in the room.
   */
  x: number
  /**
   * Y position in the room.
   */
  y: number
  /** room name */
  roomName: string
}

interface TaskSettings {
  targetRange: number
  workOffRoad: boolean
}

interface TaskOptions {
  blind?: boolean
  nextPos?: PositionMemory
  moveOptions?: MoveToOpts
  // moveOptions: TravelToOptions; // <- uncomment this line if you use Traveler
}

interface TaskData {
  //   quiet?: boolean
  resourceType?: string
  amount?: number
  signature?: string
  skipEnergy?: boolean
}

interface TaskMemory {
  name: string
  _creep: {
    name: string
  }
  _target: {
    ref: string
    _pos: PositionMemory
  }
  _parent?: TaskMemory | null
  options?: TaskOptions
  data?: TaskData
  tick: number
}

interface ITask extends TaskMemory {
  settings: TaskSettings
  memory: TaskMemory
  creep: Creep
  target: RoomObject | null
  targetPos: PositionMemory
  parent: ITask | null
  // manifest: ITask[];
  // targetManifest: (RoomObject | null)[];
  // targetPosManifest: RoomPosition[];
  eta: number | undefined

  /** This allows you to do another task returning to the task it was forked from */
  fork(newTask: ITask): ITask

  isValidTask(): boolean

  isValidTarget(): boolean

  isValid(): boolean

  moveToTarget(range?: number): number

  run(): number | void

  work(): number

  finish(): void
}
