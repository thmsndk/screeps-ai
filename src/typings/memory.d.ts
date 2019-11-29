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
  towermission: IMissionMemory
  upgradecontrollermission: IMissionMemory
  outpost: boolean
  sources?: import("lodash").Dictionary<ISourceMemory>
  miningPositions?: number
  energymission?: IEnergyMission
  DEFCON?: import("../DEFCON").IMemoryDefcon
  // Missions: IMissionMemory[]
  remoteEnergyMission?: IRemoteEnergyMissionMemory
  averageEnergy?: { points: number; average: number; spawn: number }
  infrastructure?: import("../RoomPlanner/InfrastructureMemory").InfrastructureMemory
  infrastructureMission?: IMissionMemory
  runPlanner?: boolean
  village?: boolean
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
  foo: any
  infrastructure?: import("../RoomPlanner/InfrastructureMemory").InfrastructureMemory
}

interface ISourceMemory {
  containerId?: Id<StructureContainer>
  miningPositions: IPosition[]
  distanceToSpawn: number
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
