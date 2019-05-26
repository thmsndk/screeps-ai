declare global {
    interface Memory {
        SCRIPT_VERSION: string,
        BUILD_TIME: number,
        stats: IStats,
        jobs: IMemoryJob[]
    }
}

// TODO: extract out interfaces
interface CPUExtended extends CPU {
    used: number
}
// tslint:disable-next-line: interface-name
export interface IStats {
    tick?: number,
    cpu?: CPUExtended,
    gcl?: GlobalControlLevel,
    memory?: {
        used: number,
        // Other memory stats here?
    },
    market?: {
        credits: number,
        num_orders: number,
    },
    roomSummary?: {

    }
}

export type JobTypes = JobTypeMining
export type JobTypeMining = 1
export type JobTypeUpgradeController = 1

// tslint:disable-next-line: interface-name
export interface IMemoryJob {
    type: JobTypes
    target?: string
    creeps: string[]
}

export const JobType = {
    Mining: 1 as JobTypeMining,
    UpgradeController: 2 as JobTypeUpgradeController
}

declare global {
    interface CreepMemory {
        cost: number,
        role: string,
        target: string,
        unemployed: boolean,
        upgrading: boolean,
        harvest: boolean
    }
} // TODO: Role.x,y,z
