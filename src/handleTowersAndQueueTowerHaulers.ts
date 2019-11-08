import { HaulingJob } from "jobs/HaulingJob"
import { Job } from "jobs/Job"
import { Dictionary } from "lodash"
function handleTowersAndQueueTowerHaulers(room: Room, jobs: Dictionary<Job[]>) {
  const towers = room.find<StructureTower>(FIND_MY_STRUCTURES, {
    filter: (structure: Structure) => structure.structureType === STRUCTURE_TOWER
  });
  towers.forEach(tower => {
    // Queue tower hauling jobs
    if (!jobs[tower.id] || jobs[tower.id].length === 0) {
      const job = new HaulingJob(tower);
      jobs[tower.id] = [job];
    }
    // Prefer shooting enemies
    const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (closestHostile) {
      tower.attack(closestHostile);
    }
    else {
      const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        // Walls does not appear to be in "FIND_MY_STRUCTURES"
        filter: (structure: Structure) =>
          // Console.log(structure.structureType, structure.hits, structure.hitsMax, structure.hits / structure.hitsMax)
          (structure.hits < structure.hitsMax &&
            structure.structureType !== STRUCTURE_WALL &&
            structure.structureType !== STRUCTURE_RAMPART) ||
          structure.hits / structure.hitsMax < 0.0004
      });
      if (closestDamagedStructure) {
        tower.repair(closestDamagedStructure);
      }
      else {
        const closestCreep = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
          // Walls does not appear to be in "FIND_MY_STRUCTURES"
          filter: (creep: Creep) =>
            // Console.log(structure.structureType, structure.hits, structure.hitsMax, structure.hits / structure.hitsMax)
            creep.hits < creep.hitsMax
        });
        if (closestCreep) {
          tower.heal(closestCreep);
        }
      }
    }
  });
}
