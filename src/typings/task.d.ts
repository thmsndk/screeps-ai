/*

  TASKS

  What is a task
    - harvest
    - build
    - goTo(RoomObject|RoomPosition)
 */
interface Game {
  TargetCache: {
    tick: number
    targets: { [ref: string]: string[] }
    build(): void
  }
}

interface CreepMemory {
  task?: TaskMemory | null
}

interface Creep {
  task: ITask | null
  hasValidTask: boolean
  isIdle: boolean

  run(): number | void
}
interface RoomObject {
  ref: string
}

interface RoomPosition {
  print: any
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
  /** Room name */
  roomName: string
}

interface TaskSettings {
  targetRange: number
  workOffRoad: boolean
  oneShot: boolean
}

interface TaskOptions {
  blind?: boolean
  nextPos?: PositionMemory
  moveOptions?: MoveToOpts
  // MoveOptions: TravelToOptions; // <- uncomment this line if you use Traveler
}

interface TaskData {
  //   Quiet?: boolean
  resourceType?: ResourceConstant
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
  // Manifest: ITask[];
  // TargetManifest: (RoomObject | null)[];
  // TargetPosManifest: RoomPosition[];
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
