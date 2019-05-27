import { JobTypes } from '_lib/interfaces';
import { Dictionary } from 'lodash';

export class Job {
    public type: JobTypes
    public target?: string
    public Creeps: Dictionary<Creep>

    constructor(type: JobTypes, target?: string, creeps?: Dictionary<Creep>) {
        this.type = type
        this.target = target
        this.Creeps = creeps || {}
        if (target) {
            for (const creepName in this.Creeps) {
                if (this.Creeps.hasOwnProperty(creepName)) {
                    const creep = this.Creeps[creepName];
                    creep.memory.target = target
                }
            }
        }
    }

    public run() {
        console.log('generic job running, no effect')
    }
}

export const JobPriority = {
    Low: 1,
    Medium: 2,
    High: 3
}
