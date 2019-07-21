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
  DEFCON?: import("../DEFCON").IMemoryDefcon
  // missions: IMissionMemory[]
  remoteEnergyMission?: IRemoteEnergyMissionMemory
  averageEnergy?: { points: number; average: number; spawn: number }
  infrastructureMission?: import("../missions/InfrastructureMission").InfrastructureMissionMemory
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
}

interface ISourceMemory {
  miningPositions: IPosition[]
  distanceToSpawn: number
}

interface IEnergyMission extends IMissionMemory {
  jobs: import("lodash").Dictionary<IMemoryJob>
}

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

interface IMissionMemory {}
