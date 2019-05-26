import { JobType as JobTypeType, JobTypeMining } from '_lib/interfaces';
import { Dictionary } from 'lodash';

export class Job {
    public type: JobTypeType
    public target?: string
    public Creeps: Dictionary<Creep>

    constructor(type: JobTypeType, target?: string, creeps?: Dictionary<Creep>) {
        this.type = type
        this.target = target
        this.Creeps = creeps || {}

    }

    public run() {
        console.log('generic job running, no effect')
    }
}

export const JobType = {
    Mining: 1 as JobTypeMining
}

