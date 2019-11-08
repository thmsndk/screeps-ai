import { Job, JobPriority, JobType } from "jobs/Job"
import { Dictionary } from "lodash"
import { UpgradeControllerJob } from "./jobs/UpgradeControllerJob"
function queueUpgraderJob(room: Room, jobs: Dictionary<Job[]>) {
  const controller = room.controller;
  if (controller && controller.my) {
    if (!jobs[controller.id]) {
      Memory.jobs[controller.id] = [];
      // Having to construct the memory this way and then sending it in, to be able to push the memory, is sily
      const jobMemory = {
        type: JobType.UpgradeController,
        target: controller.id,
        creeps: [],
        priority: JobPriority.Low
      };
      Memory.jobs[controller.id].push(jobMemory);
      const job = new UpgradeControllerJob(controller, jobMemory);
      jobs[controller.id] = [job];
    }
  }
}
