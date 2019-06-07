import { CreepMutations } from "./../Hatchery"
import { PathStyle } from "./MovementPathStyles"
import { Dictionary } from "lodash"
import { Job, JobPriority } from "./Job"
import { Role } from "role/roles"
import { emoji } from "_lib/emoji"
import { MiningHaulingJob } from "./MiningHaulingJob"
import { DEFCONLEVEL } from "DEFCON"

/* TODO: Spawn Construction job for a container, alternative, let the first miner do it?
how do we prevent having to repeatedly check for container?,
Mining job should have a list of containers, and if there is none, spawn it
*/

export class MiningJob extends Job {
  public source: Source
  public sourceMemory: ISourceMemory
  public memory: IMemoryJob
  public haulingJob: MiningHaulingJob
  constructor(
    source: Source,
    sourceMemory: ISourceMemory,
    haulingJob: MiningHaulingJob,
    memory?: IMemoryJob,
    creeps?: Dictionary<Creep>
  ) {
    if (!memory) {
      memory = {
        type: JobType.Mining,
        target: source.id,
        creeps: [],
        priority: JobPriority.High,
        jobs: [haulingJob.memory]
      }
    }

    super(JobType.Mining, source.id, memory, creeps)
    this.source = source
    this.sourceMemory = sourceMemory

    this.memory = memory
    this.haulingJob = haulingJob

    if (creeps) {
      this.memory.creeps = Object.keys(creeps)
      // Monkeypatch for updating role on harvesters
      // for (const creepName in creeps) {
      //     if (creeps.hasOwnProperty(creepName)) {
      //         const creep = creeps[creepName];
      //         creep.memory.role = Role.harvester
      //     }
      // }
    }
  }

  public run() {
    const assignedCreeps = Object.keys(this.Creeps).length

    if (this.sourceMemory) {
      if (assignedCreeps === 0) {
        this.memory.priority = JobPriority.High
      } else {
        this.memory.priority = JobPriority.Medium + 1 // might need more priority levels
      }

      // TODO: predict / calculate death of miners and request a replacement before the old one dies.

      if (assignedCreeps < this.sourceMemory.miningPositions.length) {
        // TODO memory should be private and we should store it in object
        // find creep that can solve task currently all our creeps can solve all tasks, this needs to be specialized
        let neededWorkers = this.sourceMemory.miningPositions.length - assignedCreeps
        // should probably change role, the role of the creep depends on its body configuration?
        neededWorkers = super.assign(neededWorkers, this.memory, Role.harvester)

        // Do we already have requests for this?
        super.requestHatch(neededWorkers, CreepMutations.HARVESTER, this.memory.priority)
      }
    }

    // We need to assign a hauler after we've assigned a miner, the behaviour of the creep should change depending on wether or not we have a hauler assigned
    // no need to fill  the rest of the mining positions before we have a hauler

    super.run(creep => roleHarvester.run(this, creep, this.source))
  }
}

// tslint:disable-next-line: max-classes-per-file
class MiningCreep {
  run(job: MiningJob, creep: Creep, source: Source) {
    // We should not abandon returning with resources
    if (creep.room.memory.DEFCON && creep.room.memory.DEFCON.level > DEFCONLEVEL.NONE) {
      // stay 3 fields away from from enemy
      const hostilesInRange = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 4)
      if (hostilesInRange.length > 0) {
        const fleePath = PathFinder.search(
          creep.pos,
          hostilesInRange.map(hostile => ({ pos: hostile.pos, range: 3 })),
          { flee: true }
        )

        creep.moveByPath(fleePath.path)

        return
      }
    }

    // TODO: what if creep will expire before reaching source and another one is closer, should it go there?
    const harvet = creep.carry.energy < creep.carryCapacity

    if (harvet) {
      if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
        creep.moveTo(source, { visualizePathStyle: PathStyle.Harvest })
      }
    } else {
      const haulers = Object.keys(job.haulingJob.Creeps)

      // if (haulers.length > 0) {
      //   creep.drop(RESOURCE_ENERGY)
      // } else {
      const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: structure => {
          switch (structure.structureType) {
            case STRUCTURE_CONTAINER:
              const container = structure as StructureContainer
              return _.sum(container.store) < container.storeCapacity && haulers.length > 0
            case STRUCTURE_EXTENSION:
              const extension = structure as StructureExtension
              return extension.energy < extension.energyCapacity && haulers.length === 0
            case STRUCTURE_SPAWN:
              const spawn = structure as StructureSpawn
              return spawn.energy < spawn.energyCapacity && haulers.length === 0
            // case STRUCTURE_TOWER:
            //   const tower = structure as StructureTower
            //   return tower.energy < tower.energyCapacity && haulers.length === 0
          }

          return false
        }
      })

      if (target) {
        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: PathStyle.Deposit })
        }
      } else {
        creep.drop(RESOURCE_ENERGY)
      }
      // }
    }
  }
}

const roleHarvester = new MiningCreep()
