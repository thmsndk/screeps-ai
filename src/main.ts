import { collect_stats } from '_lib/screepsplus'
import { Hatchery } from 'Hatchery';
import { RoleBuilder } from 'role/builder';
import { RoleHarvester } from 'role/harvester';
import { RoleHauler } from 'role/RoleHauler';
import { Role } from "role/roles";
import { RoleUpgrader } from 'role/upgrader';
import { ErrorMapper } from "utils/ErrorMapper";

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  // https://screepers.gitbook.io/screeps-typescript-starter/in-depth/cookbook/environment-letiables
  // require('version')
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

  const roleBuilder = new RoleBuilder()
  const roleHarvester = new RoleHarvester()
  const roleUpgrader = new RoleUpgrader()
  const roleHauler = new RoleHauler()


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
