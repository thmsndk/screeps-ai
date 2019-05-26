import { IMemoryJob } from '_lib/interfaces';
import { Dictionary } from 'lodash';
import { ISourceMemory } from 'RoomScanner';
import { Job, JobType } from './Job';

export class MiningJob extends Job {
    public source: Source
    public sourceMemory: ISourceMemory;
    public memory: IMemoryJob;
    constructor(source: Source, memory: IMemoryJob, sourceMemory: ISourceMemory, creeps?: Dictionary<Creep>) {
        super(JobType.Mining, source.id, creeps)
        this.source = source
        this.sourceMemory = sourceMemory
        this.memory = memory

        if (creeps) {
            this.memory.creeps = Object.keys(creeps)
        }
    }
}
