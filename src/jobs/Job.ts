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

    }

    public run() {
        console.log('generic job running, no effect')
    }
}
