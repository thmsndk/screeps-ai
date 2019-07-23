import { emoji } from "_lib/emoji"
import { profile } from "_lib/Profiler"
import { CreepMutations } from "Hatchery"
import { Dictionary } from "lodash"
import { Role } from "role/roles"
import { Job, JobPriority, JobType } from "./Job"
import { PathStyle } from "./MovementPathStyles"

/** The purpose of this job is to haul energy dropped from miners to spawn and extensions
 * could 1 hauler job support more than 1 node? depends on distance & miningspots & attached miners
 *
 */
@profile
export class MiningHaulingJob extends Job {
  public source: Source
  public sourceMemory: ISourceMemory
  public memory: IMemoryJob
  constructor(source: Source, sourceMemory: ISourceMemory, memory?: IMemoryJob, creeps?: Dictionary<Creep>) {
    if (!memory) {
      memory = {
        type: JobType.Hauling,
        target: source.id,
        creeps: [],
        priority: JobPriority.High
      }
    }

    super(JobType.Hauling, source.id, memory, creeps)

    this.source = source
    this.sourceMemory = sourceMemory

    this.memory = memory

    if (creeps) {
      this.memory.creeps = Object.keys(creeps)
    }
  }

  public run() {
    const assignedCreeps = Object.keys(this.Creeps).length

    // We need to assign a hauler after we've assigned a miner, the behaviour of the creep should change depending on wether or not we have a hauler assigned
    // no need to fill  the rest of the mining positions before we have a hauler

    const maxHaulers = 1
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

    super.run(creep => haulingCreep.run(this, creep, this.source))
  }
}

enum Mode {
  collecting,
  delivering
}

// tslint:disable-next-line: max-classes-per-file
@profile
class HaulingCreep {
  public run(job: MiningHaulingJob, creep: Creep, source: Source) {
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

      const targets = source.pos.findInRange(FIND_STRUCTURES, 2, {
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

      if (targets && creep.withdraw(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.moveTo(targets[0], { range: 1, visualizePathStyle: PathStyle.Hauling })
      } else {
        const resource = source.pos.findInRange(FIND_DROPPED_RESOURCES, 2)
        if (resource) {
          if (resource && creep.pickup(resource[0]) === ERR_NOT_IN_RANGE) {
            creep.moveTo(resource[0], { visualizePathStyle: PathStyle.Hauling })
          }
        }
      }
    } else {
      const target: any = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: structure => {
          // console.log("MHJ", structure.structureType)
          switch (structure.structureType) {
            case STRUCTURE_EXTENSION:
              const extension = structure as StructureExtension
              return extension.energy < extension.energyCapacity
            case STRUCTURE_SPAWN:
              const spawn = structure as StructureSpawn
              return spawn.energy < spawn.energyCapacity
            case STRUCTURE_STORAGE:
              const tower = structure as StructureStorage
              return (
                tower.store[RESOURCE_ENERGY] < tower.storeCapacity &&
                creep.room.energyAvailable === creep.room.energyCapacityAvailable
              )
            // case STRUCTURE_TOWER:
            //     const tower = structure as StructureTower
            //     return tower.energy < tower.energyCapacity
            // case STRUCTURE_CONTAINER:
            //     const container = structure as StructureContainer
            //     return structure.id !== job.memory.target && container.store[RESOURCE_ENERGY] < container.storeCapacity
          }

          return false
        }
      })

      if (target && creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        const result = creep.moveTo(target, { range: 1, visualizePathStyle: PathStyle.Deposit })
        switch (result) {
          case OK:
            break
          case ERR_NO_PATH:
            const closestBlockingCreep = creep.pos.findInRange(FIND_MY_CREEPS, 1)
            if (closestBlockingCreep.length > 0) {
              creep.moveTo(closestBlockingCreep[0].pos)
              closestBlockingCreep[0].moveTo(creep.pos)
            }

            break

          case ERR_INVALID_TARGET:
            console.log("invalid target")
            break
          case ERR_NOT_FOUND:
            console.log("not found")
            break
          default:
            console.log("??", result)
            break
        }
      }
    }
  }
}

const haulingCreep = new HaulingCreep()
