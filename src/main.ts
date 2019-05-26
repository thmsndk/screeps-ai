
import { collect_stats } from '_lib/screepsplus';
import { Hatchery } from 'Hatchery';
import { Dictionary } from 'lodash';
import { RoleBuilder } from 'role/builder';
import { RoleHarvester } from 'role/harvester';
import { RoleHauler } from 'role/RoleHauler';
import { Role } from "role/roles";
import { RoleUpgrader } from 'role/upgrader';
import { RoomScanner } from 'RoomScanner';
import { ErrorMapper } from "utils/ErrorMapper";
import { emoji } from '_lib/emoji';
import { Job, JobType } from 'jobs/Job';
import { MiningJob } from 'jobs/MiningJob';



// OLD
const roleBuilder = new RoleBuilder()
const roleHarvester = new RoleHarvester()
const roleUpgrader = new RoleUpgrader()
const roleHauler = new RoleHauler()
const hatchery = new Hatchery()
// END OLD

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
    let creep = Memory.creeps[name]
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
  const jobs: Job[] = [] // should this be a dictionary with target as id? what if a target has multiple jobs then? e.g. Mining and Hauler Job
  if (!Memory.jobs) { Memory.jobs = [] }

  Memory.jobs.forEach(seralizedJob => {
    switch (seralizedJob.type) {
      case JobType.Mining:
        const source = Game.getObjectById<Source>(seralizedJob.target)
        if (source) {

          const sourceMemory = source.room.memory.sources[source.id];
          // sourceMemory.assignedCreepIds = sourceMemory.assignedCreepIds.filter((v, i) => sourceMemory.assignedCreepIds.indexOf(v) === i) // remove duplicates
          const creeps: Dictionary<Creep> = {}
          if (seralizedJob.creeps) {
            seralizedJob.creeps.forEach(creepId => {
              const creep = Game.getObjectById<Creep>(creepId)
              if (creep) {
                creep.memory.unemployed = false
                creeps[creepId] = creep
              }
            })
          }

          jobs.push(new MiningJob(source, seralizedJob, sourceMemory, creeps))
        }
        break;
    }
  });

  // run room scanner TODO: only run the static scan once per new room
  roomScanner.scan(Game.spawns.Spawn1.room)

  // TODO: detect jobs
  // MiningJob how to detect a job exists, search jobs for sourceId
  // TODO:How do we prioritize the jobs?

  queueMiningJobs(jobs);

  // TODO: assign jobs
  // find a valid creep for the job assing creep to job
  jobs.forEach(job => {
    job.run()
  });

  // seralize jobs
  // Memory.jobs = jobs

  // Map Sources









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

  // Actions
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    if (creep.memory.role === Role.harvester) {
      roleHarvester.run(creep);
    }

    if (creep.memory.role === Role.upgrader) {
      roleUpgrader.run(creep);
    }

    if (creep.memory.role === Role.builder) {
      roleBuilder.run(creep);
    }

    if (creep.memory.role === Role.Larvae) {
      roleHauler.run(creep);
    }
  }

  collect_stats();
});



function queueMiningJobs(jobs: Job[]) {
  for (const roomName in Game.rooms) {
    if (Game.rooms.hasOwnProperty(roomName)) {
      const room = Game.rooms[roomName];
      for (const sourceId in room.memory.sources) {
        if (room.memory.sources.hasOwnProperty(sourceId)) {
          if (!jobs.find(job => job.target === sourceId)) {
            const source = Game.getObjectById<Source>(sourceId);
            if (source) {
              const sourceMemory = room.memory.sources[sourceId];
              const jobMemory = { type: JobType.Mining, target: sourceId, creeps: [] }; // TODO: this need to be refactored, Miningjob should initialize it's memory, but what when we deseralize it?
              const miningJob = new MiningJob(source, jobMemory, sourceMemory);
              Memory.jobs.push(jobMemory); // "Seralize job" TODO: change structure to a dictionary per jobType and a list
              jobs.push(miningJob);
            }
          }
        }
      }
    }
  }
}

