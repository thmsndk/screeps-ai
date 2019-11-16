import { claimTargetType, TaskClaim } from "./Tasks/TaskClaim"
// // import { dismantleTargetType, TaskDismantle } from "./Tasks/task_dismantle"
// // import { fortifyTargetType, TaskFortify } from "./Tasks/task_fortify"
// // import { getBoostedTargetType, TaskGetBoosted } from "./Tasks/task_getBoosted"
// // import { getRenewedTargetType, TaskGetRenewed } from "./Tasks/task_getRenewed"
import { goToTargetType, GoToTask } from "./Tasks/GotoTask"
import { goToRoomTargetType, TaskGoToRoom } from "./Tasks/TaskGoToRoom"
import { harvestTargetType, HarvestTask } from "./Tasks/HarvestTask"
// // import { attackTargetType, TaskAttack } from "./Tasks/task_attack"
import { buildTargetType, TaskBuild } from "./Tasks/TaskBuild"
// // import { healTargetType, TaskHeal } from "./Tasks/task_heal"
// // import { meleeAttackTargetType, TaskMeleeAttack } from "./Tasks/task_meleeAttack"
import { pickupTargetType, TaskPickup } from "./Tasks/TaskPickup"
// // import { rangedAttackTargetType, TaskRangedAttack } from "./Tasks/task_rangedAttack"
// // import { repairTargetType, TaskRepair } from "./Tasks/task_repair"
// // import { reserveTargetType, TaskReserve } from "./Tasks/task_reserve"
// // import { signControllerTargetType, TaskSignController } from "./Tasks/task_signController"
import { transferTargetType, TransferTask } from "./Tasks/TransferTask"

import { TaskUpgrade, upgradeTargetType } from "./Tasks/TaskUpgrade"
import { TaskWithdraw, withdrawTargetType } from "./Tasks/TaskWithdraw"
// // import { dropTargetType, TaskDrop } from "./Tasks/task_drop"
// // import { TaskTransferAll, transferAllTargetType } from "./Tasks/task_transferAll"
// // import { TaskWithdrawAll, withdrawAllTargetType } from "./Tasks/task_withdrawAll"

export class Tasks {
  /* Tasks.chain allows you to transform a list of tasks into a single task, where each subsequent task in the list
   * is the previous task's parent. SetNextPos will chain Task.nextPos as well, preventing creeps from idling for a
   * tick between tasks. If an empty list is passed, null is returned. */
  public static chain(tasks: ITask[], setNextPos = true): ITask | null {
    if (tasks.length === 0) {
      return null
    }
    let task = null
    if (setNextPos) {
      for (let i = 0; i < tasks.length - 1; i++) {
        task = tasks[i]
        if (task && task.options) {
          task.options.nextPos = tasks[i + 1].targetPos
        }
      }
    }
    // Make the accumulator task from the end and iteratively fork it
    task = _.last(tasks) // Start with last task
    tasks = _.dropRight(tasks) // Remove it from the list
    for (let i = tasks.length - 1; i >= 0; i--) {
      // Iterate over the remaining tasks
      task = task.fork(tasks[i])
    }

    return task
  }

  // //   static attack(target: attackTargetType, options = {} as TaskOptions): TaskAttack {
  // //     return new TaskAttack(target, options)
  // //   }

  public static build(target: buildTargetType, options = {} as TaskOptions): TaskBuild {
    return new TaskBuild(target, options)
  }

  public static claim(target: claimTargetType, options = {} as TaskOptions): TaskClaim {
    return new TaskClaim(target, options)
  }

  // //   static dismantle(target: dismantleTargetType, options = {} as TaskOptions): TaskDismantle {
  // //     return new TaskDismantle(target, options)
  // //   }

  // //   static drop(
  // //     target: dropTargetType,
  // //     resourceType: ResourceConstant = RESOURCE_ENERGY,
  // //     amount: number | undefined = undefined,
  // //     options = {} as TaskOptions
  // //   ): TaskDrop {
  // //     return new TaskDrop(target, resourceType, amount, options)
  // //   }

  // //   static fortify(target: fortifyTargetType, options = {} as TaskOptions): TaskFortify {
  // //     return new TaskFortify(target, options)
  // //   }

  // //   static getBoosted(
  // //     target: getBoostedTargetType,
  // //     boostType: _ResourceConstantSansEnergy,
  // //     amount: number | undefined = undefined,
  // //     options = {} as TaskOptions
  // //   ): TaskGetBoosted {
  // //     return new TaskGetBoosted(target, boostType, amount, options)
  // //   }

  // //   static getRenewed(target: getRenewedTargetType, options = {} as TaskOptions): TaskGetRenewed {
  // //     return new TaskGetRenewed(target, options)
  // //   }

  public static goTo(target: goToTargetType, options = {} as TaskOptions): GoToTask {
    return new GoToTask(target, options)
  }

  public static goToRoom(target: goToRoomTargetType, options = {} as TaskOptions): TaskGoToRoom {
    return new TaskGoToRoom(target, options)
  }

  public static harvest(target: harvestTargetType, options = {} as TaskOptions): HarvestTask {
    return new HarvestTask(target, options)
  }

  // // static heal(target: healTargetType, options = {} as TaskOptions): TaskHeal {
  // // 	return new TaskHeal(target, options);
  // // }

  // // static meleeAttack(target: meleeAttackTargetType, options = {} as TaskOptions): TaskMeleeAttack {
  // // 	return new TaskMeleeAttack(target, options);
  // // }

  public static pickup(target: pickupTargetType, options = {} as TaskOptions): TaskPickup {
    return new TaskPickup(target, options)
  }

  // // static rangedAttack(target: rangedAttackTargetType, options = {} as TaskOptions): TaskRangedAttack {
  // // 	return new TaskRangedAttack(target, options);
  // // }

  // // static repair(target: repairTargetType, options = {} as TaskOptions): TaskRepair {
  // // 	return new TaskRepair(target, options);
  // // }

  // // static reserve(target: reserveTargetType, options = {} as TaskOptions): TaskReserve {
  // // 	return new TaskReserve(target, options);
  // // }

  // // static signController(target: signControllerTargetType, signature: string,
  // // 					  options = {} as TaskOptions): TaskSignController {
  // // 	return new TaskSignController(target, signature, options);
  // // }

  public static transfer(
    target: transferTargetType,
    resourceType: ResourceConstant = RESOURCE_ENERGY,
    amount?: number,
    options = {} as TaskOptions
  ): TransferTask {
    return new TransferTask(target, resourceType, amount, options)
  }

  // // static transferAll(target: transferAllTargetType,
  // // 				   skipEnergy = false,
  // // 				   options    = {} as TaskOptions): TaskTransferAll {
  // // 	return new TaskTransferAll(target, skipEnergy, options);
  // // }

  public static upgrade(target: upgradeTargetType, options = {} as TaskOptions): TaskUpgrade {
    return new TaskUpgrade(target, options)
  }

  public static withdraw(
    target: withdrawTargetType,
    resourceType: ResourceConstant = RESOURCE_ENERGY,
    amount?: number,
    options = {} as TaskOptions
  ): TaskWithdraw {
    return new TaskWithdraw(target, resourceType, amount, options)
  }

  // // static withdrawAll(target: withdrawAllTargetType, options = {} as TaskOptions): TaskWithdrawAll {
  // // 	return new TaskWithdrawAll(target, options);
  // // }
}
