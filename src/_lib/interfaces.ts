declare global {
    interface Memory {
        stats: IStats
    }
}

export interface IStats {
    tick?: number,
    cpu?: CPU,
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
