import { Dictionary } from "lodash"

export function deseralizeJobCreeps(seralizedJob: IMemoryJob): Dictionary<Creep> {
  const creeps: Dictionary<Creep> = {}
  if (seralizedJob.creeps) {
    // TODO: DRY we are doing this for each  job
    seralizedJob.creeps.forEach(creepId => {
      const creep = Game.getObjectById<Creep>(creepId)
      if (creep) {
        creep.memory.unemployed = false
        creeps[creepId] = creep
      }
    })
  }
  return creeps
}

export function deseralizeCreeps(seralizedCreeps: string[]): Dictionary<Creep> {
  const creeps: Dictionary<Creep> = {}
  if (seralizedCreeps) {
    // TODO: DRY we are doing this for each  job
    seralizedCreeps.forEach(creepId => {
      const creep = Game.getObjectById<Creep>(creepId)
      if (creep) {
        creep.memory.unemployed = false
        creeps[creepId] = creep
      }
    })
  }
  return creeps
}
