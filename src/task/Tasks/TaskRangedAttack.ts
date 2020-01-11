import { deref } from "task/utilities/utilities"
import { Task } from "../Task"
import { register } from "../utilities/TaskFactory"

export type rangedAttackTargetType = Creep | Structure;

export class TaskRangedAttack extends Task {

	static taskName = 'rangedAttack';
	target!: rangedAttackTargetType;

	constructor(target: rangedAttackTargetType, options = {} as TaskOptions) {
		super(TaskRangedAttack.taskName, target, options);
		// Settings
		this.settings.targetRange = 3;
	}

	isValidTask():boolean {
		return this.creep.getActiveBodyparts(RANGED_ATTACK) > 0;
	}

	isValidTarget():boolean {
		return this.target && this.target.hits > 0;
	}

	work():CreepActionReturnCode {
		return this.creep.rangedAttack(this.target);
	}
}

const registerRangedAttack = (memory: TaskMemory): TaskRangedAttack => {
    const target = deref(memory._target.ref)

    return new TaskRangedAttack(target as rangedAttackTargetType, memory.options)
  }
  register(registerRangedAttack)
