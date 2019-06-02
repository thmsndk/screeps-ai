import { Dictionary } from "lodash"
import { DEFCON, IMemoryDefcon } from "./DEFCON"
import { IMemoryJob } from "_lib/interfaces"

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
    sources: Dictionary<ISourceMemory>
    miningPositions: number
    energymission: IEnergyMission
    DEFCON: IMemoryDefcon
  }
  interface Global {
    log: any
    DEFCON: DEFCON
  }
} // TODO: in use / unused mining position?

interface ISourceMemory {
  miningPositions: RoomPosition[]
  assignedCreepIds: string[]
  distanceToSpawn: number
}

interface IEnergyMission {
  jobs: Dictionary<IMemoryJob>
}
