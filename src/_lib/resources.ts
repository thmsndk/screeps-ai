import { Dictionary } from "lodash"

interface IStructureInfo {
  count: number
  min_hits: number
  max_hits: number
}

interface StructureInfoDictionary<T> {
  [Key: string]: T
}

type GroundResourcesAmount = { [Key in ResourceConstant]: number }

interface IRoomSummary {
  room_name: any // In case this gets taken out of context
  controller_level: any
  controller_progress: any
  controller_needed: any
  controller_downgrade: any
  controller_blocked: any
  controller_safemode: any
  controller_safemode_avail: any
  controller_safemode_cooldown: any
  energy_avail: any
  energy_cap: any
  num_sources: any
  source_energy: any
  mineral_type: any
  mineral_amount: any
  num_extractors: any
  has_storage: any
  storage_energy: any
  storage_minerals: any
  has_terminal: any
  terminal_energy: any
  terminal_minerals: any
  num_containers: any
  container_energy: any
  num_links: any
  link_energy: any
  num_creeps: any
  creep_counts: any
  creep_energy: any
  num_enemies: any
  num_spawns: any
  spawns_spawning: any
  num_towers: any
  tower_energy: any
  structure_info: any
  num_construction_sites: any
  num_my_construction_sites: any
  ground_resources: any
  num_source_containers: any
}

// Resources Module handles determining what sort of mode we should be operating in.
//
// CRITICAL, LOW, NORMAL
//
// The mode is based upon a combination of factors, including:
//   Room Controller Level
//   Room Structures - Storage, Container
//   Room Sources (probably a linear relationship to other things like minimum stored energy)

// Things which are expected to vary based upon the resource mode, room level, and sources:
//   Creep behavior (e.g., no upgrading room controller at CRITICAL)
//   Number of creeps of each type
//   Body size/configuration of creeps
//   Minimum level of repair for decayable things (storage, roads, ramparts)
//   Minimum level of repair of walls

// Resource budget is complex.
// 1. Income averages to 10 energy per tick per source
// 2. A creep lasts 1500 ticks,
//    a. takes 3 ticks per body part to build (CREEP_SPAWN_TIME)
//    b. takes a variable energy cost per body part (BODYPART_COST)
// 3. Number of structures differs at controller level (CONTROLLER_STRUCTURES, no arrays)
//

// Determines the number of containers that are adjacent to sources.
// NOTE: THIS MUST MATCH CALCULATIONS IN role.harvester2.determine_destination()!!!
export function count_source_containers(room: Room) {
  const roomSources = room.find(FIND_SOURCES)

  // Go through all sources and all nearby containers, and pick one that is not
  // claimed by another harvester2 for now.
  // TODO: Prefer to pick one at a source that isn't already claimed.
  let retval = 0

  source_container_search: for (const source of roomSources) {
    const nearbyContainers = source.pos.findInRange(FIND_STRUCTURES, 2, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
    })
    // console.log(room.name + ', source: ' + source.id + ', nearby containers: ' + nearby_containers.length);
    for (const nc of nearbyContainers) {
      if (nc.pos.getRangeTo(source) >= 2.0) {
        // We can't say 1.999 above I don't think, in the findInRange, so double check.
        continue
      }
      retval++
    } // nearby_containers
  } // room_sources

  return retval
} // num_source_containers

// Summarizes the situation in a room in a single object.
// Room can be a string room name or an actual room object.
export function summarize_room_internal(room: Room): IRoomSummary | null {
  if (_.isString(room)) {
    room = Game.rooms[room]
  }
  if (room == null) {
    return null
  }
  if (room.controller == null || !room.controller.my) {
    // Can null even happen?
    return null
  }
  const controllerLevel = room.controller.level
  const controllerProgress = room.controller.progress
  const controllerNeeded = room.controller.progressTotal
  const controllerDowngrade = room.controller.ticksToDowngrade
  const controllerBlocked = room.controller.upgradeBlocked
  const controllerSafemode = room.controller.safeMode ? room.controller.safeMode : 0
  const controllerSafemodeAvail = room.controller.safeModeAvailable
  const controllerSafemodeCooldown = room.controller.safeModeCooldown
  const hasStorage = room.storage != null
  const storageEnergy = room.storage ? room.storage.store[RESOURCE_ENERGY] : 0
  const storageMinerals = room.storage ? _.sum(room.storage.store) - storageEnergy : 0
  const energyAvail = room.energyAvailable
  const energyCap = room.energyCapacityAvailable
  const containers = room.find<StructureContainer>(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_CONTAINER
  })
  const numContainers = containers == null ? 0 : containers.length
  const containerEnergy = _.sum(containers, c => c.store.energy)
  const sources = room.find(FIND_SOURCES)
  const numSources = sources == null ? 0 : sources.length
  const sourceEnergy = _.sum(sources, s => s.energy)
  const links = room.find<StructureLink>(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_LINK && s.my
  })
  const numLinks = links == null ? 0 : links.length
  const linkEnergy = _.sum(links, l => l.energy)
  const minerals = room.find(FIND_MINERALS)
  const mineral = minerals && minerals.length > 0 ? minerals[0] : null
  const mineralType = mineral ? mineral.mineralType : ""
  const mineralAmount = mineral ? mineral.mineralAmount : 0
  const extractors = room.find(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_EXTRACTOR
  })
  const numExtractors = extractors.length
  const creeps = _.filter(Game.creeps, c => c.pos.roomName === room.name && c.my)
  const numCreeps = creeps ? creeps.length : 0
  const enemyCreeps = room.find(FIND_HOSTILE_CREEPS)
  const creepEnergy = _.sum(Game.creeps, c => (c.pos.roomName === room.name ? c.carry.energy : 0))
  const numEnemies = enemyCreeps ? enemyCreeps.length : 0
  const spawns = room.find(FIND_MY_SPAWNS)
  const numSpawns = spawns ? spawns.length : 0
  const spawnsSpawning = _.sum(spawns, s => (s.spawning ? 1 : 0))
  const towers = room.find<StructureTower>(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_TOWER && s.my
  })
  const numTowers = towers ? towers.length : 0
  const towerEnergy = _.sum(towers, t => t.energy)
  const constSites = room.find(FIND_CONSTRUCTION_SITES)
  const myConstSites = room.find(FIND_CONSTRUCTION_SITES, {
    filter: cs => cs.my
  })
  const numConstructionSites = constSites.length
  const numMyConstructionSites = myConstSites.length
  const numSourceContainers = count_source_containers(room)
  const hasTerminal = room.terminal != null
  const terminalEnergy = room.terminal ? room.terminal.store[RESOURCE_ENERGY] : 0
  const terminalMinerals = room.terminal ? _.sum(room.terminal.store) - terminalEnergy : 0

  // Get info on all our structures
  // TODO: Split roads to those on swamps vs those on dirt
  const structureTypes = new Set(room.find(FIND_STRUCTURES).map(s => s.structureType))

  const structureInfo: StructureInfoDictionary<IStructureInfo> = {}
  for (const s of structureTypes) {
    const ss = room.find(FIND_STRUCTURES, {
      filter: str => str.structureType === s
    })
    structureInfo[s] = {
      count: ss.length,
      min_hits: _.min(ss, "hits").hits,
      max_hits: _.max(ss, "hits").hits
    }
  }
  // console.log(JSON.stringify(structure_info));

  const groundResources = room.find(FIND_DROPPED_RESOURCES)
  // const ground_resources_short = ground_resources.map(r => ({ amount: r.amount, resourceType: r.resourceType }));
  const reducedResources = _.reduce(
    groundResources,
    (acc: GroundResourcesAmount, res) => {
      acc[res.resourceType] = _.get(acc, [res.resourceType], 0) + res.amount
      return acc
    },
    {}
  )

  // _.reduce([{resourceType: 'energy', amount: 200},{resourceType: 'energy', amount:20}], (acc, res) => { acc[res.resourceType] = _.get(acc, [res.resourceType], 0) + res.amount; return acc; }, {});

  // console.log(JSON.stringify(reduced_resources));

  // Number of each kind of creeps
  // const creep_types = new Set(creeps.map(c => c.memory.role));
  const creepCounts = _.countBy(creeps, c => c.memory.role)

  // Other things we can count:
  // Tower count, energy
  // Minimum health of ramparts, walls
  // Minimum health of roads
  // Number of roads?
  // Resources (energy/minerals) on the ground?

  // Other things we can't count but we _can_ track manually:
  // Energy spent on repairs
  // Energy spent on making creeps
  // Energy lost to links
  //
  // Energy in a source when it resets (wasted/lost energy)

  const retval = {
    room_name: room.name, // In case this gets taken out of context
    controller_level: controllerLevel,
    controller_progress: controllerProgress,
    controller_needed: controllerNeeded,
    controller_downgrade: controllerDowngrade,
    controller_blocked: controllerBlocked,
    controller_safemode: controllerSafemode,
    controller_safemode_avail: controllerSafemodeAvail,
    controller_safemode_cooldown: controllerSafemodeCooldown,
    energy_avail: energyAvail,
    energy_cap: energyCap,
    num_sources: numSources,
    source_energy: sourceEnergy,
    mineral_type: mineralType,
    mineral_amount: mineralAmount,
    num_extractors: numExtractors,
    has_storage: hasStorage,
    storage_energy: storageEnergy,
    storage_minerals: storageMinerals,
    has_terminal: hasTerminal,
    terminal_energy: terminalEnergy,
    terminal_minerals: terminalMinerals,
    num_containers: numContainers,
    container_energy: containerEnergy,
    num_links: numLinks,
    link_energy: linkEnergy,
    num_creeps: numCreeps,
    creep_counts: creepCounts,
    creep_energy: creepEnergy,
    num_enemies: numEnemies,
    num_spawns: numSpawns,
    spawns_spawning: spawnsSpawning,
    num_towers: numTowers,
    tower_energy: towerEnergy,
    structure_info: structureInfo,
    num_construction_sites: numConstructionSites,
    num_my_construction_sites: numMyConstructionSites,
    ground_resources: reducedResources,
    num_source_containers: numSourceContainers
  }

  // console.log('Room ' + room.name + ': ' + JSON.stringify(retval));
  return retval
} // summarize_room

let summarizedRoomTimestamp: number = 0
let summarizedRooms: Dictionary<IRoomSummary | null>
export function summarize_rooms() {
  const now = Game.time

  // First check if we cached it
  if (summarizedRoomTimestamp === now) {
    return summarizedRooms
  }

  const retval: Dictionary<IRoomSummary | null> = {}

  for (const r in Game.rooms) {
    const summary = summarize_room_internal(Game.rooms[r])
    retval[r] = summary
  }

  summarizedRoomTimestamp = now
  summarizedRooms = retval

  // console.log('All rooms: ' + JSON.stringify(retval));
  return retval
} // summarize_rooms

export function summarize_room(room: Room): IRoomSummary | null {
  if (_.isString(room)) {
    room = Game.rooms[room]
  }
  if (room == null) {
    return null
  }

  const sr = summarize_rooms()

  return sr[room.name]
}
