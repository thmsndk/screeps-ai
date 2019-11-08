import { TransferTask } from "./task/Tasks/TransferTask"
import { TaskWithdraw } from "./task/Tasks/TaskWithdraw"
import { JobPriority } from "jobs/Job"
import { Dictionary } from "lodash"
import { CreepMutations, Hatchery } from "./Hatchery"
import { Tasks } from "task"
function queueFlagMissions() {
  const lootFlags: Dictionary<Flag> = {};
  const claimFlags: Dictionary<Flag> = {};
  const remoteFlags: Dictionary<Flag[]> = {};
  for (const flagName in Game.flags) {
    if (Game.flags.hasOwnProperty(flagName)) {
      const flag = Game.flags[flagName];
      if (flag.name.startsWith("remote") || flag.name.startsWith("source")) {
        if (!remoteFlags[flag.pos.roomName]) {
          remoteFlags[flag.pos.roomName] = [];
        }
        remoteFlags[flag.pos.roomName].push(flag);
      }
      if (flag.name.startsWith("loot")) {
        if (!remoteFlags[flag.pos.roomName]) {
          lootFlags[flag.pos.roomName] = flag;
        }
      }
      if (flag.name.startsWith("claim")) {
        if (!remoteFlags[flag.pos.roomName]) {
          claimFlags[flag.pos.roomName] = flag;
        }
      }
    }
  }
  // Remote Mining Mission
  for (const roomName in remoteFlags) {
    if (remoteFlags.hasOwnProperty(roomName)) {
      const flags = remoteFlags[roomName];
      if (!Memory.rooms[roomName]) {
        Memory.rooms[roomName] = {};
      }
      // Const remoteFlag = flags.find(flag => flag.name.startsWith("remote"))
      // Const remoteEnergyMissionMemory = Memory.rooms[roomName].remoteEnergyMission
      // Console.log(JSON.stringify(remoteEnergyMissionMemory))
      // If (
      //   !remoteEnergyMissionMemory ||
      //   (remoteFlag && remoteEnergyMissionMemory && remoteEnergyMissionMemory.flagId !== remoteFlag.name)
      // ) {
      // Const remoteEnergyMission = new RemoteEnergyMission({ roomName, flags })
      // RemoteEnergyMission.run()
      // }
    }
  }
  // Loot "mission"
  for (const roomName in lootFlags) {
    if (lootFlags.hasOwnProperty(roomName)) {
      const flag = lootFlags[roomName];
      const hatchery = new Hatchery(Game.spawns.Spawn1); // TODO: Hatchery should be a singleton?
      let requiredLooters = 2;
      const requestedLooters = hatchery.getRequests(flag.name, CreepMutations.HAULER);
      const missionCreeps = _.filter(Game.creeps, creep => creep.memory.target === flag.name);
      requiredLooters -= requestedLooters + missionCreeps.length;
      for (let index = requestedLooters; index < requiredLooters; index++) {
        hatchery.queue({
          target: flag.name,
          mutation: CreepMutations.HAULER,
          priority: JobPriority.Medium,
          employed: true
        });
      }
      missionCreeps.forEach(creep => {
        if (creep.carry[RESOURCE_ENERGY] !== creep.carryCapacity) {
          if (!flag.room) {
            // No vision
            creep.task = Tasks.goTo(flag, { moveOptions: { range: 3 } });
          }
          else {
            if (flag.room !== creep.room) {
              creep.task = Tasks.goTo(flag, { moveOptions: { range: 3 } });
            }
            else {
              const target: any = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => {
                  // Console.log("MHJ", structure.structureType)
                  switch (structure.structureType) {
                    case STRUCTURE_EXTENSION:
                      const extension = structure as StructureExtension;
                      return extension.energy !== 0;
                    case STRUCTURE_SPAWN:
                      const spawn = structure as StructureSpawn;
                      return spawn.energy !== 0;
                    case STRUCTURE_STORAGE:
                      const storage = structure as StructureStorage;
                      return storage.store[RESOURCE_ENERGY] !== 0;
                    case STRUCTURE_TOWER:
                      const tower = structure as StructureTower;
                      return tower.energy !== 0;
                    case STRUCTURE_CONTAINER:
                      const container = structure as StructureContainer;
                      return container.store[RESOURCE_ENERGY] !== 0;
                  }
                  return false;
                }
              });
              // Assign harvest task to target if it does not already have a harvest task
              if (creep.task == null || creep.task.name !== TaskWithdraw.taskName) {
                creep.task = Tasks.withdraw(target);
              }
            }
          }
        }
        else {
          if (creep.pos.roomName !== creep.memory.home) {
            // Goto home room
            creep.task = Tasks.goToRoom(creep.memory.home);
          }
          else {
            // Transfer task
            const target: any = creep.pos.findClosestByRange(FIND_STRUCTURES, {
              filter: structure => {
                // Console.log("MHJ", structure.structureType)
                switch (structure.structureType) {
                  case STRUCTURE_EXTENSION:
                    const extension = structure as StructureExtension;
                    return extension.energy < extension.energyCapacity;
                  case STRUCTURE_SPAWN:
                    const spawn = structure as StructureSpawn;
                    return spawn.energy < spawn.energyCapacity;
                  case STRUCTURE_STORAGE:
                    const storage = structure as StructureStorage;
                    return (storage.store[RESOURCE_ENERGY] < storage.storeCapacity &&
                      creep.room.energyAvailable === creep.room.energyCapacityAvailable);
                  // Case STRUCTURE_TOWER:
                  //     Const tower = structure as StructureTower
                  //     Return tower.energy < tower.energyCapacity
                  // Case STRUCTURE_CONTAINER:
                  //     Const container = structure as StructureContainer
                  //     Return structure.id !== job.memory.target && container.store[RESOURCE_ENERGY] < container.storeCapacity
                }
                return false;
              }
            });
            if (creep.task == null || creep.task.name !== TransferTask.taskName) {
              creep.task = Tasks.transfer(target);
            }
          }
        }
        creep.run();
      });
    }
  }
  // Claim "mission"
  for (const roomName in claimFlags) {
    if (claimFlags.hasOwnProperty(roomName)) {
      const flag = claimFlags[roomName];
      const hatchery = new Hatchery(Game.spawns.Spawn1); // TODO: Hatchery should be a singleton?
      let requiredClaimers = 1;
      const requestedLooters = hatchery.getRequests(flag.name, CreepMutations.CLAIMER);
      const missionCreeps = _.filter(Game.creeps, creep => creep.memory.target === flag.name);
      requiredClaimers -= requestedLooters + missionCreeps.length;
      for (let index = requestedLooters; index < requiredClaimers; index++) {
        hatchery.queue({
          target: flag.name,
          mutation: CreepMutations.CLAIMER,
          priority: JobPriority.Medium,
          employed: true
        });
      }
      missionCreeps.forEach(creep => {
        if (!flag.room) {
          // No vision
          creep.task = Tasks.goTo(flag, { moveOptions: { range: 3 } });
        }
        else {
          if (flag.room !== creep.room) {
            creep.task = Tasks.goTo(flag, { moveOptions: { range: 3 } });
          }
          else {
            const target: any = creep.room.controller;
            // Assign harvest task to target if it does not already have a harvest task
            if (creep.task == null || creep.task.name !== TaskWithdraw.taskName) {
              creep.task = Tasks.claim(target);
            }
          }
        }
        creep.run();
      });
    }
  }
}
