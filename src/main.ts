import { JobType, JobTypeMining } from '_lib/interfaces';
import { collect_stats } from '_lib/screepsplus';
import { Hatchery } from 'Hatchery';
import { RoleBuilder } from 'role/builder';
import { RoleHarvester } from 'role/harvester';
import { RoleHauler } from 'role/RoleHauler';
import { Role } from "role/roles";
import { RoleUpgrader } from 'role/upgrader';
import { RoomScanner } from 'RoomScanner';
import { ErrorMapper } from "utils/ErrorMapper";

class Job {
  public type: JobType
  public target?: string

  constructor(type: JobType, target?: string) {
    this.type = type
    this.target = target
  }
}

const JobType = {
  Mining: 1 as JobTypeMining
}

// tslint:disable-next-line: max-classes-per-file
class MiningJob extends Job {
  public source: Source
  constructor(source: Source) {
    super(JobType.Mining, source.id)
    this.source = source
  }
}

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
        if (source) { jobs.push(new MiningJob(source)) }
        break;
    }
  });

  // run room scanner TODO: only run the static scan once per new room
  roomScanner.scan(Game.rooms.Spawn1)

  // TODO: detect jobs
  // MiningJob how to detect a job exists, search jobs for sourceId
  // TODO:How do we prioritize the jobs?

  for (const roomName in Game.rooms) {
    if (Game.rooms.hasOwnProperty(roomName)) {
      const room = Game.rooms[roomName];

      for (const sourceId in room.memory.sources) {
        if (room.memory.sources.hasOwnProperty(sourceId)) {
          const sourceMemory = room.memory.sources[sourceId];
          if (!jobs.find(job => job.target === sourceId)) {
            const source = Game.getObjectById<Source>(sourceId)
            if (source) {
              const miningJob = new MiningJob(source)
              Memory.jobs.push({ type: miningJob.type, target: sourceId }) // "Seralize job"
              jobs.push()
            }
          }
        }
      }
    }
  }

  // TODO: assign jobs

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

