// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any
    DEFCON: import("../DEFCON").DEFCON
    Profiler: Profiler // import("./_lib/Profiler/Profiler/typings").Profiler
    injectBirthday: () => void
  }
}

// declare global {

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
  /** room name */
  roomName?: string
}

// TODO: extract out interfaces
interface CPUExtended extends CPU {
  used: number
}
// tslint:disable-next-line: interface-name
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
