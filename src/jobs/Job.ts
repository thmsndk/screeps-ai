import { JobType as JobTypeType, JobTypeMining } from '_lib/interfaces';
import { Dictionary } from 'lodash';

export class Job {
    public type: JobTypeType
    public target?: string
    public Creeps: Dictionary<Creep>

    constructor(type: JobTypeType, target?: string, creeps?: Dictionary<Creep>) {
        console.log('new job ' + target)
        this.type = type
        this.target = target
        this.Creeps = creeps || {}

    }
}

export const JobType = {
    Mining: 1 as JobTypeMining
}

