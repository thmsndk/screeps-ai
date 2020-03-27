/* This is the withdrawal task for non-energy resources. */

import { deref } from "task/utilities/utilities"

import { Task } from "../Task"
import { register } from "../utilities/TaskFactory"
import { EnergyStructure, isEnergyStructure, isStoreStructure, StoreStructure } from "../utilities/utilities"

export type withdrawTargetType =
  | EnergyStructure
  | StoreStructure
  | StructureLab
  | StructureNuker
  | StructurePowerSpawn
  | Tombstone
  | StructureTerminal

export class TaskWithdraw extends Task {
  public static taskName = "withdraw"

  public target!: withdrawTargetType

  public data!: {
    resourceType: ResourceConstant
    amount: number | undefined
  }

  public constructor(
    target: withdrawTargetType,
    resourceType: ResourceConstant = RESOURCE_ENERGY,
    amount?: number,
    options = {} as TaskOptions
  ) {
    super(TaskWithdraw.taskName, target, options)
    // Settings
    this.settings.oneShot = true
    this.data.resourceType = resourceType
    this.data.amount = amount
  }

  public isValidTask(): boolean {
    const amount = this.data.amount || 1

    return _.sum(this.creep.carry) <= this.creep.carryCapacity - amount
  }

  public isValidTarget(): boolean {
    const amount = this.data.amount || 1
    const target = this.target
    if (target instanceof Tombstone || isStoreStructure(target)) {
      return (target.store[this.data.resourceType] || 0) >= amount
    } else if (isEnergyStructure(target) && this.data.resourceType === RESOURCE_ENERGY) {
      return target.energy >= amount
    } else {
      if (target instanceof StructureLab) {
        return this.data.resourceType === target.mineralType && target.mineralAmount >= amount
      } else if (target instanceof StructureNuker) {
        return this.data.resourceType === RESOURCE_GHODIUM && target.ghodium >= amount
      } else if (target instanceof StructurePowerSpawn) {
        return this.data.resourceType === RESOURCE_POWER && target.power >= amount
      }
    }

    return false
  }

  public work(): ScreepsReturnCode {
    return this.creep.withdraw(this.target, this.data.resourceType, this.data.amount)
  }
}

const registerWithdraw = (memory: TaskMemory): TaskWithdraw => {
  const target = deref(memory._target.ref)

  return new TaskWithdraw(target as withdrawTargetType, memory.data?.resourceType, memory.data?.amount, memory.options)
}
register(registerWithdraw)
