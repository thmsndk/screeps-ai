import { register } from "../utilities/TaskFactory"
import { Task } from "../Task"
import { deref } from "task/utilities/utilities"

export type upgradeTargetType = StructureController;

export class TaskUpgrade extends Task {

	static taskName = 'upgrade';
	target!: upgradeTargetType; // TODO: generics like MemoryMission

	constructor(target: upgradeTargetType, options = {} as TaskOptions) {
		super(TaskUpgrade.taskName, target, options);
		// Settings
		this.settings.targetRange = 3;
		this.settings.workOffRoad = true;
	}

	isValidTask() {
		return (this.creep.carry.energy > 0);
	}

	isValidTarget() {
		return this.target && this.target.my;
	}

	work() {
		return this.creep.upgradeController(this.target);
	}
}

const registerUpgrade = (memory: TaskMemory): TaskUpgrade => {
    const target = deref(memory._target.ref)
    return new TaskUpgrade(target as any)
  }
  register(registerUpgrade)
