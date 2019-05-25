declare global { interface CreepMemory { role: string } }

import { ErrorMapper } from "utils/ErrorMapper";
import { RoleBuilder } from 'role/builder';
import { RoleHarvester } from 'role/harvester';
import { RoleUpgrader } from 'role/upgrader';
import { collect_stats } from '_lib/screepsplus'

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  // https://screepers.gitbook.io/screeps-typescript-starter/in-depth/cookbook/environment-letiables
  // require('version')
  if (!Memory.SCRIPT_VERSION || Memory.SCRIPT_VERSION != __REVISION__) {
    Memory.SCRIPT_VERSION = __REVISION__
    console.log('New code uploaded')
  }

  // TODO: a player module that automates what i do manually, spawn placement, extension placement, container placement. http://docs.screeps.com/api/#Room.createConstructionSite
  // TODO: a module that determines how many of the different roles we need based on amount of work needed
  // TODO: a module that can spawn creeps
  // if a creep wants to do a job, make sure it has time enough to live

  let roleBuilder = new RoleBuilder()
  let roleHarvester = new RoleHarvester()
  let roleUpgrader = new RoleUpgrader()

  let Role = {
    harvester: 'harvester',
    upgrader: 'upgrader',
    builder: 'builder',
  }

  const tower = Game.getObjectById<StructureTower>('TOWER_ID');

  if (tower) {
    let closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: (structure: Structure) => structure.hits < structure.hitsMax
    });

    if (closestDamagedStructure) {
      tower.repair(closestDamagedStructure);
    }

    let closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (closestHostile) {
      tower.attack(closestHostile);
    }
  }

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
      console.log('Clearing non-existing creep memory:', name);
    }
  }

  let harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == Role.harvester);
  let upgraders = _.filter(Game.creeps, (creep) => creep.memory.role == Role.upgrader);
  let builders = _.filter(Game.creeps, (creep) => creep.memory.role == Role.builder);

  let spawn = Game.spawns['Spawn1']

  let spawn1Spawning = !!spawn.spawning; // code runs so fast that spawncreep does not update spawning in this tick?

  if (harvesters.length < 3 && !spawn1Spawning) {
    let newName = 'Harvester' + Game.time;

    spawn1Spawning = true;
    let result = spawn.spawnCreep([WORK, CARRY, MOVE], newName,
      { memory: { role: Role.harvester } } as SpawnOptions);

    if (result == OK) {
      console.log('Spawning new harvester: ' + newName);
    }
  }

  if (upgraders.length < 5 && !spawn1Spawning) {

    spawn1Spawning = true;

    let newName = 'Upgrader' + Game.time;
    let result = spawn.spawnCreep([WORK, CARRY, MOVE], newName,
      { memory: { role: Role.upgrader } } as SpawnOptions);

    if (result == OK) {
      console.log('Spawning new upgrader: ' + newName);
    }

    //* OK	0 The operation has been scheduled successfully.
    //* ERR_NOT_OWNER - 1 You are not the owner of this spawn.
    //* ERR_NAME_EXISTS - 3 There is a creep with the same name already.
    //* ERR_BUSY - 4 The spawn is already in process of spawning another creep.
    //* ERR_NOT_ENOUGH_ENERGY - 6 The spawn and its extensions contain not enough energy to create a creep with the given body.
    //* ERR_INVALID_ARGS - 10 Body is not properly described or name was not provided.
    //* ERR_RCL_NOT_ENOUGH - 14 Your Room Controller level is insufficient to use this spawn.
  }

  if (builders.length < 2 && !spawn1Spawning) {

    spawn1Spawning = true;

    // TODO: no reason to spawn builders if there are nothing to construct
    let newName = 'Builder' + Game.time;

    let result = spawn.spawnCreep([WORK, CARRY, MOVE], newName,
      { memory: { role: Role.builder } } as SpawnOptions);

    if (result == OK) {
      console.log('Spawning new builder: ' + newName);
    }

  }

  let spawn1 = Game.spawns['Spawn1']
  if (spawn1 && spawn1.spawning) {
    let spawningCreep = Game.creeps[spawn1.spawning.name];
    spawn1.room.visual.text(
      '🛠️' + spawningCreep.memory.role,
      spawn1.pos.x + 1,
      spawn1.pos.y,
      { align: 'left', opacity: 0.8 });
  }

  // Actions
  for (let name in Game.creeps) {
    let creep = Game.creeps[name];
    if (creep.memory.role == Role.harvester) {
      roleHarvester.run(creep);
    }

    if (creep.memory.role == Role.upgrader) {
      roleUpgrader.run(creep);
    }

    if (creep.memory.role == Role.builder) {
      roleBuilder.run(creep);
    }
  }

  collect_stats();
});
