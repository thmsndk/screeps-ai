declare global {
    interface Memory {
        SCRIPT_VERSION: string,
        BUILD_TIME: number,
        stats: IStats
    }
}

interface CPUExtended extends CPU {
    used: number
}
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
