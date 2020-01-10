import { register } from "../utilities/TaskFactory"
import { Task } from "../Task"
import { deref, EnergyStructure, isEnergyStructure, isStoreStructure, StoreStructure } from "../utilities/utilities"

export type transferTargetType =
  | EnergyStructure
  | StoreStructure
  | StructureLab
  | StructureNuker
  | StructurePowerSpawn
  | StructureFactory
  | Creep

export class TransferTask extends Task {
  public static taskName = "transfer"

  public target!: transferTargetType

  public data!: {
    resourceType: ResourceConstant
    amount: number | undefined
  }

  public constructor(
    target: transferTargetType,
    resourceType: ResourceConstant = RESOURCE_ENERGY,
    amount?: number,
    options = {} as TaskOptions
  ) {
    super(TransferTask.taskName, target as any, options)
    // Settings
    this.settings.oneShot = true
    this.data.resourceType = resourceType
    this.data.amount = amount
  }

  public isValidTask(): boolean {
    const amount = this.data.amount || 1
    const resourcesInCarry = this.creep.carry[this.data.resourceType] || 0

    return resourcesInCarry >= amount
  }

  public isValidTarget(): boolean {
    const amount = this.data.amount || 1
    const target = this.target
    if (target instanceof Creep) {
      return _.sum(target.carry) <= target.carryCapacity - amount
    } else if (isStoreStructure(target)) {
      return _.sum(target.store) <= target.storeCapacity - amount
    } else if (isEnergyStructure(target) && this.data.resourceType === RESOURCE_ENERGY) {
      return target.energy <= target.energyCapacity - amount
    } else {
      if (target instanceof StructureLab) {
        return (
          (target.mineralType === this.data.resourceType || !target.mineralType) &&
          target.mineralAmount <= target.mineralCapacity - amount
        )
      } else if (target instanceof StructureNuker) {
        return this.data.resourceType === RESOURCE_GHODIUM && target.ghodium <= target.ghodiumCapacity - amount
      } else if (target instanceof StructurePowerSpawn) {
        return this.data.resourceType === RESOURCE_POWER && target.power <= target.powerCapacity - amount
      }
    }

    return false
  }

  public work() {
    return this.creep.transfer(this.target, this.data.resourceType, this.data.amount)
  }
}

const registerTransfer = (memory: TaskMemory): TransferTask => {
  const target = deref(memory._target.ref) as transferTargetType

  return new TransferTask(target, memory.data?.resourceType, memory.data?.amount, memory.options)
}

register(registerTransfer)
