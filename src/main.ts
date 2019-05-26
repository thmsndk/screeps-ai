import { BuilderJob } from './jobs/BuilderJob';
import { HaulingJob } from './jobs/HaulingJob';
import { UpgradeControllerJob } from './jobs/UpgradeControllerJob';

import { IMemoryJob, JobType } from '_lib/interfaces';
import { collect_stats } from '_lib/screepsplus';
import { Hatchery } from 'Hatchery';
import { Job } from 'jobs/Job';
import { MiningJob } from 'jobs/MiningJob';
import { Dictionary } from 'lodash';
import { RoomScanner } from 'RoomScanner';
import { ErrorMapper } from "utils/ErrorMapper";

const roomScanner = new RoomScanner()

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  // console.log(`Current game tick is ${Game.time}`);

  // https://screepers.gitbook.io/screeps-typescript-starter/in-depth/cookbook/environment-letiables
  if (!Memory.BUILD_TIME || Memory.BUILD_TIME !== __BUILD_TIME__) {
    Memory.BUILD_TIME = __BUILD_TIME__
    Memory.SCRIPT_VERSION = __REVISION__
    console.log(`New code uploaded ${__BUILD_TIME__} (${__REVISION__})`)
  }

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    const creep = Memory.creeps[name]
    if (creep) { creep.unemployed = true }

    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
      console.log('Clearing non-existing creep memory:', name);
    }
  }

  // TODO: a player module that automates what i do manually, spawn placement, extension placement, container placement. http://docs.screeps.com/api/#Room.createConstructionSite
  // TODO: a module that determines how many of the different roles we need based on amount of work needed
  // TODO: a module that can spawn creeps
  // if a creep wants to do a job, make sure it has time enough to live

  // TODO: should we have jobs in each room? what about "general purpose" jobs?
  // deseralize jobs
  const jobs: Job[] = deseralizeJobs();

  // run room scanner TODO: only run the static scan once per new room
  roomScanner.scan(Game.spawns.Spawn1.room)

  // TODO: detect jobs
  // MiningJob how to detect a job exists, search jobs for sourceId
  // TODO:How do we prioritize the jobs?

  queueMiningJobs(jobs);

  // queue upgradeController job, how to determine how many upgraders we want?
  const controller = Game.spawns.Spawn1.room.controller
  if (controller) {
    if (!jobs.find(job => job.target === controller.id)) {

      // having to construct the memory this way and then sending it in, to be able to push the memory, is sily
      const jobMemory = { type: JobType.Mining, target: controller.id, creeps: [] };
      const job = new UpgradeControllerJob(controller, jobMemory);
      Memory.jobs.push(jobMemory); // "Seralize job" TODO: change structure to a dictionary per jobType and a list
      jobs.push(job);

    }
  }

  // queue building jobs
  const constructionSites = Game.spawns.Spawn1.room.find(FIND_MY_CONSTRUCTION_SITES)
  constructionSites.forEach(site => {
    if (!jobs.find(job => job.target === site.id)) {
      const job = new BuilderJob(site);

      jobs.push(job);
    }
  })

  // hatchery, should contain a list of requested creep types for jobs, but we also need to determine what hatchery should hatch it later



  // TODO: assign jobs
  // find a valid creep for the job assing creep to job
  jobs.forEach(job => {
    job.run()
  });

  // seralize jobs
  // Memory.jobs = jobs

  // Map Sources
  const hatchery = new Hatchery()
  hatchery.run()

  const tower = Game.getObjectById<StructureTower>('TOWER_ID');

  if (tower) {
    const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: (structure: Structure) => structure.hits < structure.hitsMax
    });

    if (closestDamagedStructure) {
      tower.repair(closestDamagedStructure);
    }

    const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (closestHostile) {
      tower.attack(closestHostile);
    }
  }

  collect_stats();

});

function deseralizeJobs() {
  const jobs: Job[] = []; // should this be a dictionary with target as id? what if a target has multiple jobs then? e.g. Mining and Hauler Job
  if (!Memory.jobs) {
    Memory.jobs = [];
  }
  Memory.jobs.forEach(seralizedJob => {
    switch (seralizedJob.type) {
      case JobType.Mining:
      case JobType.Hauling:
        const source = Game.getObjectById<Source>(seralizedJob.target);
        if (source) {
          const sourceMemory = source.room.memory.sources[source.id];

          if(!sourceMemory)
          {
            //console.log('Something wrong with this job, there is no source memory, corrupt job, or what if it is a job to a room I have no visibility in?')
            return
          }

          const creeps = deseralizeJobCreeps(seralizedJob);

          if (seralizedJob.type === JobType.Hauling) {
            jobs.push(new HaulingJob(source, seralizedJob, sourceMemory, creeps));
          }
          else {
            jobs.push(new MiningJob(source, seralizedJob, sourceMemory, creeps));
          }
        }
        break;
      case JobType.UpgradeController:
        const controller = Game.getObjectById<StructureController>(seralizedJob.target);
        if (controller) {
          const creeps = deseralizeJobCreeps(seralizedJob);

          jobs.push(new UpgradeControllerJob(controller, seralizedJob, creeps));
        }
        break;
      case JobType.Building:
        const site = Game.getObjectById<ConstructionSite>(seralizedJob.target);
        if (site) {
          const creeps = deseralizeJobCreeps(seralizedJob);

          jobs.push(new BuilderJob(site, seralizedJob, creeps));
        }
        break;
    }
  });
  return jobs;


}
function deseralizeJobCreeps(seralizedJob: IMemoryJob): Dictionary<Creep> {
  const creeps: Dictionary<Creep> = {};
  if (seralizedJob.creeps) { // TODO: DRY we are doing this for each  job
    seralizedJob.creeps.forEach(creepId => {
      const creep = Game.getObjectById<Creep>(creepId);
      if (creep) {
        creep.memory.unemployed = false;
        creeps[creepId] = creep;
      }
    });
  }
  return creeps
}

function queueMiningJobs(jobs: Job[]) {
  // TODO: hauler jobs
  for (const roomName in Game.rooms) {
    if (Game.rooms.hasOwnProperty(roomName)) {
      const room = Game.rooms[roomName];
      for (const sourceId in room.memory.sources) {
        if (room.memory.sources.hasOwnProperty(sourceId)) {
          const source = Game.getObjectById<Source>(sourceId);

          if (source) {
            const sourceMemory = room.memory.sources[sourceId];

            if (!jobs.find(job => job.target === sourceId && job.type === JobType.Mining)) {
              const jobMemory = { type: JobType.Mining, target: sourceId, creeps: [] }; // TODO: this need to be refactored, Miningjob should initialize it's memory, but what when we deseralize it?
              const miningJob = new MiningJob(source, jobMemory, sourceMemory);
              Memory.jobs.push(jobMemory);
              jobs.push(miningJob);

            }

            if (!jobs.find(job => job.target === sourceId && job.type === JobType.Hauling)) {
              const jobMemory = { type: JobType.Hauling, target: sourceId, creeps: [] }; // TODO: this need to be refactored, HaulerJob should initialize it's memory, but what when we deseralize it?
              const haulingJob = new HaulingJob(source, jobMemory, sourceMemory);
              Memory.jobs.push(jobMemory);
              jobs.push(haulingJob);
            }
          }
        }
      }
    }
  }
}

