interface CreepMemory {
  mission: string
  rune?: string
  mode?: number
  cost?: number
  role?: string
  target?: string
  unemployed?: boolean
  upgrading?: boolean
  harvest?: boolean
  building?: boolean
  working?: boolean
  home: string
}

interface RoomMemory {
  claim?: boolean
  reserve?: boolean
  outpost?: boolean
  village?: boolean
  sources?: import("lodash").Dictionary<ISourceMemory>

  terminalhaulingmission?: IMissionMemory
  claimmission: IMissionMemory
  reservemission: IMissionMemory
  towermission: IMissionMemory
  upgradecontrollermission: IMissionMemory
  miningPositions?: number
  energymission?: IEnergyMission
  DEFCON?: import("../DEFCON").IMemoryDefcon
  // Missions: IMissionMemory[]
  remoteEnergyMission?: IRemoteEnergyMissionMemory
  averageEnergy?: { points: number; average: number; spawn: number }
  infrastructure?: import("../RoomPlanner/InfrastructureMemory").InfrastructureMemory
  infrastructureMission?: IMissionMemory
  runPlanner?: boolean
}

interface FlagMemory {
  miningPositions: number
}

interface RawMemory {
  _parsed: any
}

interface Memory {
  // Overmind stats
  settings: any
  resetBucket: boolean
  haltTick: any
  // End overmind stats
  uuid: number
  log: any
  SCRIPT_VERSION: string
  BUILD_TIME: number
  stats: any // IStats
  jobs: import("lodash").Dictionary<IMemoryJob[]>
  foo: any
  infrastructure?: import("../RoomPlanner/InfrastructureMemory").InfrastructureMemory
}

declare const HARVEST_MEM_USAGE = "u"
declare const HARVEST_MEM_DOWNTIME = "d"
declare const SOURCE_MEM_ENERGY_PER_TICK = "e"

interface ISourceMemory {
  containerId?: Id<StructureContainer>
  miningPositions: IPosition[]
  distanceToSpawn: number
  // For stats
  // Const HARVEST_MEM_PATHING = "P"
  [HARVEST_MEM_USAGE]: number
  [HARVEST_MEM_DOWNTIME]: number
  [SOURCE_MEM_ENERGY_PER_TICK]: number
}

interface IEnergyMission extends IMissionMemory {}

interface IRemoteEnergyMissionMemory extends IEnergyMission {
  flagId: string
  sourceFlags?: string[]
}

interface IMemoryJob {
  type: JobTypes
  missionPriority?: number
  priority: number
  target?: string
  creeps: string[]
  jobs?: IMemoryJob[]
}

interface IMissionMemory {
  id: string
  creeps: { [index: string]: string[] }
}
