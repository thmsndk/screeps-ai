import { RoomPlanner } from "RoomPlanner"
import { Job, JobPriority } from "jobs/Job"
import { Dictionary } from "lodash"
import { InfraStructureMission } from "missions/InfrastructureMission"
import { Role } from "role/roles"
import { CreepMutations } from "./Hatchery"
import { Infrastructure } from "RoomPlanner/Infrastructure"
import { infraStructureMissions, hatcheries } from "./main"
// // const comparePriority = (a: BuilderJob, b: BuilderJob) => b.memory.priority - a.memory.priority
function queueBuildingJobs(room: Room, jobs: Dictionary<Job[]>) {
  const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
  // Group construction sites by type?, the type could be utilized as id, might be deleted then by earlier logic that deletes jobs if target is not found
  // Road work, what priority is that? Low?
  // Extension, what priority is that? Medium
  // Container, what priority? HIGH
  // Walls ?
  // Priority is not that important when we do not sort jobs by priority.
  // We wish to accomplish "enough" workers assigned to "all" construction jobs, we also wish workers to get assigned to the closest job
  // How do we handle construction requests in other rooms?
  // When do we spawn new creeps?
  // Should workers both construct and repair stuff?
  // Should we calculate how long time it will take to construct stuff and assign workers based on that?
  // Should we mark a construction job with a tick we want it finished? and based on that a decision as to how many creeps should be requested?
  // The problem with "queueing" building jobs, is that it's for detecting jobs I manually place.... they should be automated, then I don't have to queue them.
  // We need a "Building Mission" it should be responsible of prioritizing jobs, determine if we need more builders for all the jobs, bigger builders and what order they should be done in
  // Get mission from cache or create new one
  // Let mission = infraStructureMissions[room.name] // we can't do this because then we store a reference to the creeps, references should be reevaluated each tick
  // If (!mission) {
  let memory = room.memory.infrastructure; // Should infrastructure not exist on the global scope?
  if (!memory || !memory.layers) {
    memory = room.memory.infrastructure = { layers: [] };
    room.memory.runPlanner = true;
  }
  // If (room.controller) {
  //   Const tmpInfrastructure = new Infrastructure({ memory: { layers: [] } })
  //   Const roomPlanner = new RoomPlanner(tmpInfrastructure)
  //   RoomPlanner.plan(room.name, 8 /*room.controller.level + 1*/)
  //   TmpInfrastructure.visualize()
  // }
  const infrastructure = new Infrastructure({ memory });
  let planRanThisTick = false;
  if (room.memory.runPlanner) {
    const roomPlanner = new RoomPlanner(infrastructure);
    roomPlanner.plan(room.name, 8 /* Room.controller.level + 1*/);
    room.memory.runPlanner = false;
    planRanThisTick = true;
  }
  infrastructure.visualize();
  let infrastructureMissionMemory = room.memory.infrastructureMission;
  if (!infrastructureMissionMemory || !infrastructureMissionMemory.creeps) {
    infrastructureMissionMemory = room.memory.infrastructureMission = { creeps: { builders: [] } };
  }
  const mission = new InfraStructureMission({ memory: infrastructureMissionMemory, infrastructure });
  infraStructureMissions[room.name] = mission;
  // }
  const hatchery = _.first(Object.values(hatcheries));
  let neededWorkers = constructionSites.length > 0 ? 2 : 0; // Currently a naive approach making us have 2 workers
  // Should probably adjust amount of workers based on how much energy we want to use, how many construction sites, and more
  neededWorkers -= Object.keys(mission.creeps).length;
  // Assign creeps to mission
  const idle = _.filter(Game.creeps, creep => !creep.spawning && creep.memory.unemployed && creep.isIdle && creep.memory.role === Role.builder);
  if (idle) {
    idle.slice(0, neededWorkers).forEach(creep => {
      neededWorkers -= 1;
      mission.addCreep(creep);
      creep.memory.unemployed = false;
    });
  }
  // RequestHatch, should be moved to a function somewhere
  if (hatchery) {
    const target = "infrastructure";
    const mutation = CreepMutations.WORKER;
    const requests = hatchery.getRequests(target, mutation);
    neededWorkers -= requests;
    if (neededWorkers > 0) {
      for (let index = 0; index < neededWorkers; index++) {
        // Request new creeps
        // Console.log(`${this.target} requested ${mutation}`, neededWorkers, requests)
        hatchery.queue({
          mutation,
          target,
          priority: JobPriority.Medium + 10
        });
      }
    }
  }
  // Distribute tasks
  mission.distributeTasks();
  // Add manual cSites
  if (!planRanThisTick) {
    constructionSites.forEach(site => {
      // Plan was just run, the cSite does not exist in this tick
      const plan = infrastructure.findInfrastructure(site.id);
      // TODO: there seem to be an issue finding existing cSites in the plan
      if (!plan || Object.keys(plan).length <= 0) {
        console.log("adding to layer 0");
        infrastructure.addConstructionSite(0, site);
      }
    });
  }
  // Run creeps
  mission.run();
}
