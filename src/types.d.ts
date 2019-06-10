// memory extension samples
interface CreepMemory {
  mode?: number
  cost: number
  role: string
  target: string
  unemployed: boolean
  upgrading: boolean
  harvest: boolean
  building: boolean
  working: boolean
}

interface RoomMemory {
  sources?: import("lodash").Dictionary<ISourceMemory>
  miningPositions?: number
  energymission?: IEnergyMission
  DEFCON?: import("./DEFCON").IMemoryDefcon
  // missions: IMissionMemory[]
  remoteEnergyMission?: IRemoteEnergyMissionMemory
  averageEnergy?: { points: number; average: number; spawn: number }
}

interface FlagMemory {
  miningPositions: number
}

interface Memory {
  uuid: number
  log: any
  SCRIPT_VERSION: string
  BUILD_TIME: number
  stats: IStats
  jobs: import("lodash").Dictionary<IMemoryJob[]>
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any
    DEFCON: import("./DEFCON").DEFCON
    Profiler: Profiler //import("./_lib/Profiler/Profiler/typings").Profiler
  }
}

// declare global {

// } // TODO: in use / unused mining position?

interface ISourceMemory {
  miningPositions: IPosition[]
  assignedCreepIds: string[]
  distanceToSpawn: number
}

interface IEnergyMission extends IMissionMemory {
  jobs: import("lodash").Dictionary<IMemoryJob>
}

interface IRemoteEnergyMissionMemory extends IEnergyMission {
  flagId: string
  sourceFlags?: string[]
}

interface IPosition {
  /**
   * X position in the room.
   */
  x: number
  /**
   * Y position in the room.
   */
  y: number
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

// tslint:disable-next-line: interface-name
interface IMemoryJob {
  type: JobTypes
  missionPriority?: number
  priority: number
  target?: string
  creeps: string[]
  jobs?: IMemoryJob[]
}

interface IMissionMemory {}
