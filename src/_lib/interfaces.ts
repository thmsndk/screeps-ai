declare global {
    interface Memory {
        SCRIPT_VERSION: string,
        BUILD_TIME: number,
        stats: IStats,
        jobs: IMemoryJob[]
    }
}

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

export type JobType = JobTypeMining
export type JobTypeMining = 1

// tslint:disable-next-line: interface-name
export interface IMemoryJob {
    type: JobType
    target?: string
    creeps: string[]
}

declare global { interface CreepMemory { role: string, target: string, unemployed: boolean } } // TODO: Role.x,y,z
