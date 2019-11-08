import { HaulingJob } from "jobs/HaulingJob"
import { Job, JobType } from "jobs/Job"
import { Dictionary } from "lodash"
import { deseralizeJobCreeps } from "utils/MemoryUtil"
import { BuilderJob } from "./jobs/BuilderJob"
import { UpgradeControllerJob } from "./jobs/UpgradeControllerJob"
function deseralizeJobs() {
  const jobs: Dictionary<Job[]> = {}; // Should this be a dictionary with target as id? what if a target has multiple jobs then? e.g. Mining and Hauler Job
  if (!Memory.jobs) {
    Memory.jobs = {};
  }
  // TODO: solve sorting is it important at all?
  // Memory.jobs.sort((a, b) => {
  //   Return b.priority - a.priority
  // })
  for (const targetId in Memory.jobs) {
    if (Memory.jobs.hasOwnProperty(targetId)) {
      const target = Game.getObjectById<RoomObject>(targetId);
      if (!target) {
        delete Memory.jobs[targetId]; // TODO: this might become an issue when we queue jobs in other rooms
        continue;
      }
      const serializedJobs = Memory.jobs[targetId];
      jobs[targetId] = [];
      serializedJobs.forEach(seralizedJob => {
        switch (seralizedJob.type) {
          case JobType.UpgradeController:
            // SeralizedJob.priority = JobPriority.Low // mokeypatched memory
            const controller = target as StructureController;
            if (controller) {
              const creeps = deseralizeJobCreeps(seralizedJob);
              jobs[targetId].push(new UpgradeControllerJob(controller, seralizedJob, creeps));
            }
            break;
          case JobType.Building:
            // SeralizedJob.priority = JobPriority.Medium // mokeypatched memory
            const site = target as ConstructionSite;
            if (site) {
              const creeps = deseralizeJobCreeps(seralizedJob);
              jobs[targetId].push(new BuilderJob(site, seralizedJob, creeps));
            }
            break;
          case JobType.Hauling:
            // SeralizedJob.priority = JobPriority.Medium // mokeypatched memory
            const structure = target as Structure;
            if (structure) {
              const creeps = deseralizeJobCreeps(seralizedJob);
              jobs[targetId].push(new HaulingJob(structure, seralizedJob, creeps));
            }
            break;
        }
      });
    }
  }
  return jobs;
}
