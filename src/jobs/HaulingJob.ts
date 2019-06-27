import { Dictionary } from "lodash"
import { Role } from "role/roles"
import { CreepMutations } from "./../Hatchery"
import { Job, JobPriority, JobType } from "./Job"
import { PathStyle } from "./MovementPathStyles"
import { profile } from "_lib/Profiler"

/**
 * This is a generic purpose hauling job, it can haul to a target
 * Currently that target should be a structure
 *
 */
@profile
export class HaulingJob extends Job {
  public structure: Structure
  public memory: IMemoryJob

  constructor(target: Structure, memory?: IMemoryJob, creeps?: Dictionary<Creep>) {
    super(JobType.Hauling, target.id, memory, creeps)
    this.structure = target

    if (!memory) {
      if (!Memory.jobs[target.id]) {
        Memory.jobs[target.id] = []
      }
      const jobMemory = Memory.jobs[target.id]

      memory = _.find(jobMemory, { type: JobType.Hauling })

      if (!memory) {
        memory = {
          type: JobType.Hauling,
          target: target.id,
          creeps: [],
          priority: JobPriority.High
        } // TODO: move down into job, requires refactoring of other stuff

        Memory.jobs[target.id].push(memory) // "Seralize job" TODO: change structure to a dictionary per jobType and a list
      }
    }

    this.memory = memory

    if (creeps) {
      this.memory.creeps = Object.keys(creeps)
    }
  }

  public run() {
    const assignedCreeps = Object.keys(this.Creeps).length

    // We need to assign a hauler after we've assigned a miner, the behaviour of the creep should change depending on wether or not we have a hauler assigned
    // no need to fill  the rest of the mining positions before we have a hauler

    // currently only towers utilize this job, so we set maxhaulers accordingly
    const maxHaulers = 1 // should be in memory so you can define it genericly
    if (assignedCreeps === 0) {
      this.memory.priority = JobPriority.High - 1
    } else {
      this.memory.priority = JobPriority.Medium
    }

    if (assignedCreeps < maxHaulers) {
      // find creep that can solve task currently all our creeps can solve all tasks, this needs to be specialized
      let neededWorkers = maxHaulers - assignedCreeps

      // should probably change role, the role of the creep depends on its body configuration?
      neededWorkers = super.assign(neededWorkers, this.memory, Role.Larvae)

      // Do we already have requests for this?
      super.requestHatch(neededWorkers, CreepMutations.HAULER, this.memory.priority)
    }

    super.run(creep => haulingCreep.run(creep, this.structure))
  }
}

enum Mode {
  collecting,
  delivering
}

// tslint:disable-next-line: max-classes-per-file
@profile
class HaulingCreep {
  run(creep: Creep, structure: Structure) {
    // TODO: what if creep will expire before reaching source and another one is closer, should it go there?

    switch (creep.memory.mode) {
      case Mode.collecting:
        if (creep.carry.energy === creep.carryCapacity) {
          creep.memory.mode = Mode.delivering
        }
        break
      case Mode.delivering:
        if (creep.carry.energy === 0) {
          creep.memory.mode = Mode.collecting
        }
        break

      default:
        creep.memory.mode = Mode.collecting
        break
    }

    if (creep.memory.mode === Mode.collecting) {
      // creep.say('🔄');
      // find dropped resources near mine, put into container
      // when no more dropped resources or container full, pull from container and move back to spawn
      // first iteration we just pull from container and move to spawn & extensions, makes the initial spawn kinda broken though, cause I won't have containers as fast
      // we also need to make sure it does not pickup resources from a container, and then puts them back in, getting stuck, we could persist target in memory
      // const droppedResource
      let resource = structure.pos.findClosestByRange(FIND_DROPPED_RESOURCES)
      if (resource) {
        if (resource && creep.pickup(resource) === ERR_NOT_IN_RANGE) {
          creep.moveTo(resource, { visualizePathStyle: PathStyle.Hauling })
        }
      } else {
        const target = structure.pos.findClosestByRange(FIND_STRUCTURES, {
          filter: structure => {
            switch (structure.structureType) {
              case STRUCTURE_CONTAINER:
                const container = structure as StructureContainer
                const amount = _.sum(container.store)
                return amount > container.storeCapacity / 2
            }

            return false
          }
        })

        // job.memory.target = target ? target.id : undefined

        if (target && creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: PathStyle.Hauling })
        }
      }
    } else {
      // TODO: if target is full, do some maintenance
      // const target: any = creep.pos.findClosestByRange(FIND_STRUCTURES, {
      //     filter: (structure) => {

      //         switch (structure.structureType) {
      //             case STRUCTURE_EXTENSION:
      //                 const extension = structure as StructureExtension
      //                 return extension.energy < extension.energyCapacity
      //             case STRUCTURE_SPAWN:
      //                 const spawn = structure as StructureSpawn
      //                 return spawn.energy < spawn.energyCapacity

      //             // case STRUCTURE_TOWER:
      //             //     const tower = structure as StructureTower
      //             //     return tower.energy < tower.energyCapacity
      //             // case STRUCTURE_CONTAINER:
      //             //     const container = structure as StructureContainer
      //             //     return structure.id !== job.memory.target && container.store[RESOURCE_ENERGY] < container.storeCapacity

      //         }

      //         return false
      //     }
      // });

      // TODO: what if it is not energy we are transfering?, should hauling job specify kind of resource?
      if (structure && creep.transfer(structure, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.moveTo(structure, { visualizePathStyle: PathStyle.Deposit })
      }
    }
  }
}

const haulingCreep = new HaulingCreep()
