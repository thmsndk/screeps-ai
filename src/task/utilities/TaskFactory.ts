import { Dictionary } from "lodash"
// import { TaskUpgrade, upgradeTargetType } from "./Tasks/task_upgrade"
// import { TaskWithdraw, withdrawTargetType } from "./Tasks/task_withdraw"
// import { dropTargetType, TaskDrop } from "./Tasks/task_drop"
// import { TaskTransferAll, transferAllTargetType } from "./Tasks/task_transferAll"
// import { TaskWithdrawAll, withdrawAllTargetType } from "./Tasks/task_withdrawAll"
// import { DummyTask } from "../Tasks/DummyTask"
// import { claimTargetType, TaskClaim } from "./Tasks/task_claim"
// import { dismantleTargetType, TaskDismantle } from "./Tasks/task_dismantle"
// import { fortifyTargetType, TaskFortify } from "./Tasks/task_fortify"
// import { getBoostedTargetType, TaskGetBoosted } from "./Tasks/task_getBoosted"
// import { getRenewedTargetType, TaskGetRenewed } from "./Tasks/task_getRenewed"
// import { goToTargetType, GoToTask } from "../Tasks/GotoTask"
// import { goToRoomTargetType, TaskGoToRoom } from "./Tasks/task_goToRoom"
// import { harvestTargetType, HarvestTask } from "../Tasks/HarvestTask"
// import { attackTargetType, TaskAttack } from "./Tasks/task_attack"
// import { buildTargetType, TaskBuild } from "../Tasks/TaskBuild"
// import { healTargetType, TaskHeal } from "./Tasks/task_heal"
// import { meleeAttackTargetType, TaskMeleeAttack } from "./Tasks/task_meleeAttack"
// import { pickupTargetType, TaskPickup } from "./Tasks/task_pickup"
// import { rangedAttackTargetType, TaskRangedAttack } from "./Tasks/task_rangedAttack"
// import { repairTargetType, TaskRepair } from "./Tasks/task_repair"
// import { reserveTargetType, TaskReserve } from "./Tasks/task_reserve"
// import { signControllerTargetType, TaskSignController } from "./Tasks/task_signController"
// import { transferTargetType, TransferTask } from "../Tasks/TransferTask"
// import { deref, derefRoomPosition } from "./utilities"

type registerCallback = (memory: TaskMemory) => ITask | null

class TaskFactory {
  private callbacks: Dictionary<registerCallback>

  constructor() {
    this.callbacks = {} as Dictionary<registerCallback>
  }

  public create(memory: TaskMemory): ITask | null {
    const callback = this.callbacks[memory.name.toLowerCase()]

    if (callback) {
      return callback(memory)
    }

    return null
  }

  public register(callback: registerCallback) {
    // console.log("Registering callback")
    const name = callback.name
    // TODO: validate method starts with register
    const taskName = name.substring(8).toLowerCase() // remove 'register'
    // console.log(taskName)
    // TODO: validate callback already exists
    this.callbacks[taskName] = callback
  }
}

const taskFactory = new TaskFactory()

export const register = (callback: registerCallback) => {
  taskFactory.register(callback)
}

export const deseralize = (memory: TaskMemory): ITask | null => {
  const taskName = memory.name
  // const target = deref(memory._target.ref)
  const task = taskFactory.create(memory)

  // // Create a task object of the correct type
  // switch (taskName) {
  //   // case TaskAttack.taskName:
  //   // 	task = new TaskAttack(target as attackTargetType);
  //   // 	break;
  //   case TaskBuild.taskName:
  //     task = new TaskBuild(target as buildTargetType)
  //     break
  //   // case TaskClaim.taskName:
  //   // 	task = new TaskClaim(target as claimTargetType);
  //   // 	break;
  //   // case TaskDismantle.taskName:
  //   // 	task = new TaskDismantle(target as dismantleTargetType);
  //   // 	break;
  //   // case TaskDrop.taskName:
  //   // 	task = new TaskDrop(derefRoomPosition(protoTask._target._pos) as dropTargetType);
  //   // 	break;
  //   // case TaskFortify.taskName:
  //   // 	task = new TaskFortify(target as fortifyTargetType);
  //   // 	break;
  //   // case TaskGetBoosted.taskName:
  //   // 	task = new TaskGetBoosted(target as getBoostedTargetType,
  //   // 							  protoTask.data.resourceType as _ResourceConstantSansEnergy);
  //   // 	break;
  //   // case TaskGetRenewed.taskName:
  //   // 	task = new TaskGetRenewed(target as getRenewedTargetType);
  //   // 	break;
  //   case GoToTask.taskName:
  //     task = new GoToTask(derefRoomPosition(memory._target._pos) as goToTargetType)
  //     break
  //   // case TaskGoToRoom.taskName:
  //   // 	task = new TaskGoToRoom(protoTask._target._pos.roomName as goToRoomTargetType);
  //   // 	break;
  //   case HarvestTask.taskName:
  //     task = new HarvestTask(target as harvestTargetType)
  //     break
  //   // case TaskHeal.taskName:
  //   // 	task = new TaskHeal(target as healTargetType);
  //   // 	break;
  //   // case TaskMeleeAttack.taskName:
  //   // 	task = new TaskMeleeAttack(target as meleeAttackTargetType);
  //   // 	break;
  //   // case TaskPickup.taskName:
  //   // 	task = new TaskPickup(target as pickupTargetType);
  //   // 	break;
  //   // case TaskRangedAttack.taskName:
  //   // 	task = new TaskRangedAttack(target as rangedAttackTargetType);
  //   // 	break;
  //   // case TaskRepair.taskName:
  //   // 	task = new TaskRepair(target as repairTargetType);
  //   // 	break;
  //   // case TaskReserve.taskName:
  //   // 	task = new TaskReserve(target as reserveTargetType);
  //   // 	break;
  //   // case TaskSignController.taskName:
  //   // 	task = new TaskSignController(target as signControllerTargetType);
  //   // 	break;
  //   case TransferTask.taskName:
  //     task = new TransferTask(target as transferTargetType)
  //     break
  //   // case TaskTransferAll.taskName:
  //   // 	task = new TaskTransferAll(target as transferAllTargetType);
  //   // 	break;
  //   // case TaskUpgrade.taskName:
  //   // 	task = new TaskUpgrade(target as upgradeTargetType);
  //   // 	break;
  // case TaskWithdraw.taskName:
  // 	task = new TaskWithdraw(target as withdrawTargetType);
  // 	break;
  //   // case TaskWithdrawAll.taskName:
  //   // 	task = new TaskWithdrawAll(target as withdrawAllTargetType);
  //   // 	break;
  //   // default:
  //   // 	console.log(`Invalid task name: ${taskName}! task.creep: ${protoTask._creep.name}. Deleting from memory!`);
  //   // 	task = new TaskInvalid(target as any);
  //   // 	break;
  //   default:
  //     // console.log(`Invalid task name: ${taskName}! task.creep: ${memory._creep.name}. Deleting from memory!`)
  //     task = new DummyTask(target as any)
  //     break
  // }
  if (task) {
    task.memory = memory
  } else {
    console.log(`Invalid task name: ${taskName}! task.creep: ${memory._creep.name}. Deleting from memory!`)
    // taskFactory.create({ name: "invalid"})
  }

  return task
}
