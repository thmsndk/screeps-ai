// `global` extension samples
declare namespace NodeJS {
  interface Global {
    Memory: any
    age: number
    freya: import("../Freya").Freya
    log: any
    DEFCON: import("../Thor").Thor
    Profiler: Profiler // Import("./_lib/Profiler/Profiler/typings").Profiler
    injectBirthday: () => void
    // Infrastructure: import("../RoomPlanner/Infrastructure").Infrastructure // TODO: figure out this later
  }
}

// Declare global {

// } // TODO: in use / unused mining position?

interface IPosition {
  /**
   * X position in the room.
   */
  x: number
  /**
   * Y position in the room.
   */
  y: number
  /** Room name */
  roomName?: string
}

// TODO: extract out interfaces
interface CPUExtended extends CPU {
  used: number
}
// Tslint:disable-next-line: interface-name
interface IStats {
  tick?: number
  cpu?: CPUExtended
  gcl?: GlobalControlLevel
  memory?: {
    used: number
    // Other memory stats here?
  }
  market?: {
    credits: number
    num_orders: number
  }
  roomSummary?: {}
  jobs: import("lodash").Dictionary<IMemoryJob[]>
}

type JobTypes = JobTypeMining | JobTypeUpgradeController | JobTypeHauling | JobTypeBuilding
type JobTypeMining = 1
type JobTypeUpgradeController = 2
type JobTypeHauling = 3
type JobTypeBuilding = 4
