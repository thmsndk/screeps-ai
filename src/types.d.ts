import { IMemoryJob } from "_lib/interfaces"
import { Dictionary } from "lodash"
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
  }
}

declare global {
  interface RoomMemory {
    sources: Dictionary<ISourceMemory>
    miningPositions: number
    energymission: IEnergyMission
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
