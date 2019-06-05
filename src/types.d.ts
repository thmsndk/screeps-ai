import { Dictionary } from "lodash"
import { DEFCON, IMemoryDefcon } from "./DEFCON"
import { IMemoryJob } from "_lib/interfaces"
import { IMissionMemory } from "missions/Mission"

// memory extension samples
interface CreepMemory {
  role: string
  room: string
  working: boolean
}

interface Memory {
  uuid: number
  log: any
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any
    DEFCON: DEFCON
  }
}

declare global {
  interface RoomMemory {
    sources?: Dictionary<ISourceMemory>
    miningPositions?: number
    energymission?: IEnergyMission
    DEFCON?: IMemoryDefcon
    // missions: IMissionMemory[]
    remoteEnergyMission?: IRemoteEnergyMissionMemory
  }
  interface Global {
    log: any
    DEFCON: DEFCON
  }
  interface FlagMemory {
    miningPositions: number
  }
} // TODO: in use / unused mining position?

interface ISourceMemory {
  miningPositions: IPosition[]
  assignedCreepIds: string[]
  distanceToSpawn: number
}

interface IEnergyMission extends IMissionMemory {
  jobs: Dictionary<IMemoryJob>
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
