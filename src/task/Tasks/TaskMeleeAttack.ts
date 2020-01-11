import { deref } from "task/utilities/utilities"
import { Task } from "../Task"
import { register } from "../utilities/TaskFactory"

export type meleeAttackTargetType = Creep | Structure;

export class TaskMeleeAttack extends Task {

	static taskName = 'meleeAttack';
	target!: meleeAttackTargetType;

	constructor(target: meleeAttackTargetType, options = {} as TaskOptions) {
		super(TaskMeleeAttack.taskName, target, options);
		// Settings
		this.settings.targetRange = 1;
	}

	isValidTask():boolean {
		return this.creep.getActiveBodyparts(ATTACK) > 0;
	}

	isValidTarget():boolean {
		return this.target && this.target.hits > 0;
	}

	work():CreepActionReturnCode {
		return this.creep.attack(this.target);
	}
}

const registerMeleeAttack = (memory: TaskMemory): TaskMeleeAttack => {
    const target = deref(memory._target.ref)

    return new TaskMeleeAttack(target as meleeAttackTargetType, memory.options)
  }
  register(registerMeleeAttack)
