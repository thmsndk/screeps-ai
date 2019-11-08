import { calculateCumulativeMovingAverage } from "./calculateCumulativeMovingAverage";
function calculateAverageEnergy(room: Room) {
  const storageEnergy = room.storage ? room.storage.store[RESOURCE_ENERGY] : 0;
  const energyAvail = room.energyAvailable;
  // Const energyCap = room.energyCapacityAvailable
  const containers = room.find<StructureContainer>(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_CONTAINER
  });
  const containerEnergy = _.sum(containers, c => c.store.energy);
  // Const links = room.find<StructureLink>(FIND_STRUCTURES, {
  //   Filter: s => s.structureType === STRUCTURE_LINK && s.my
  // })
  // Const linkEnergy = _.sum(links, l => l.energy)
  const energy = storageEnergy + energyAvail + containerEnergy;
  if (!room.memory.averageEnergy) {
    room.memory.averageEnergy = { points: 1, average: energy, spawn: energyAvail };
  }
  room.memory.averageEnergy.points += 1;
  room.memory.averageEnergy.average = calculateCumulativeMovingAverage(room.memory.averageEnergy.average, room.memory.averageEnergy.points, energy);
  room.memory.averageEnergy.spawn = calculateCumulativeMovingAverage(room.memory.averageEnergy.spawn, room.memory.averageEnergy.points, energyAvail);
}
