declare global {
    interface Memory {
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
