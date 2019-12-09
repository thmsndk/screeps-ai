import { register } from "../utilities/TaskFactory"
import { Task } from "../Task"
import { deref } from "task/utilities/utilities"

export type reserveTargetType = StructureController;

export class TaskReserve extends Task {

	public static taskName = 'reserve';
	public target!: reserveTargetType;

	constructor(target: reserveTargetType, options = {} as TaskOptions) {
		super(TaskReserve.taskName, target, options);
	}

	public isValidTask() {
		return (this.creep.getActiveBodyparts(CLAIM) > 0);
	}

	public isValidTarget() {
		let target = this.target;
		return (target != null && !target.owner && (!target.reservation || target.reservation.ticksToEnd < 4999));
	}

	public work() {
		return this.creep.reserveController(this.target);
	}
}

const registerReserve = (memory: TaskMemory): TaskReserve => {
    const target = deref(memory._target.ref)

    return new TaskReserve(target as any)
  }

  register(registerReserve)
