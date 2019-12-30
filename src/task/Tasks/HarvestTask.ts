import { register } from "../utilities/TaskFactory"
import { Task } from "../Task"
import { deref } from "task/utilities/utilities"

export type harvestTargetType = Source | Mineral

function isSource(obj: Source | Mineral): obj is Source {
  return (obj as Source).energy !== undefined
}

export class HarvestTask extends Task {
  public static taskName = "harvest"

  public target!: harvestTargetType

  public constructor(target: harvestTargetType, options = {} as TaskOptions) {
    super(HarvestTask.taskName, target as any, options)
  }

  public isValidTask(): boolean {
    return _.sum(this.creep.carry) < this.creep.carryCapacity
  }

  public isValidTarget(): boolean {
    // If (this.target && (this.target instanceof Source ? this.target.energy > 0 : this.target.mineralAmount > 0)) {
    // 	// Valid only if there's enough space for harvester to work - prevents doing tons of useless pathfinding
    // 	Return this.target.pos.availableNeighbors().length > 0 || this.creep.pos.isNearTo(this.target.pos);
    // }
    // Return false;
    if (isSource(this.target)) {
      return this.target.energy > 0
    } else {
      return this.target.mineralAmount > 0
    }
  }

  public work(): number {
    return this.creep.harvest(this.target)
  }
}

const registerHarvest = (memory: TaskMemory): HarvestTask => {
  const target = deref(memory._target.ref) as harvestTargetType

  return new HarvestTask(target, memory.options)
}

register(registerHarvest)
