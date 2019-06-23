import { CreepMutations } from "./../Hatchery"
import { PathStyle } from "./MovementPathStyles"
import { Dictionary } from "lodash"
import { Job, JobPriority, JobType } from "./Job"
import { Role } from "role/roles"
import { emoji } from "_lib/emoji"
import { profile } from "_lib/Profiler"

// TODO: What if the target is removed? clean up job and release builders?

@profile
export class BuilderJob extends Job {
  public constructionSite: ConstructionSite
  public memory: IMemoryJob
  constructor(constructionSite: ConstructionSite, memory?: IMemoryJob, creeps?: Dictionary<Creep>) {
    super(JobType.Building, constructionSite.id, memory, creeps)
    this.constructionSite = constructionSite

    if (!memory) {
      memory = {
        type: JobType.Building,
        target: constructionSite.id,
        creeps: [],
        priority: JobPriority.Medium
      }

      if (!Memory.jobs[constructionSite.id]) {
        Memory.jobs[constructionSite.id] = []
      }

      Memory.jobs[constructionSite.id].push(memory) // "Seralize job" TODO: change structure to a dictionary per jobType and a list
    }

    this.memory = memory

    if (creeps) {
      this.memory.creeps = Object.keys(creeps)
      // Monkeypatch for updating role on builder
      // for (const creepName in creeps) {
      //   if (creeps.hasOwnProperty(creepName)) {
      //     const creep = creeps[creepName]
      //     creep.memory.role = Role.builder
      //   }
      // }
    }
  }

  public run() {
    // TODO: depending on structure type, queue different amount of builders
    const maxCreeps = 10

    const assignedCreeps = Object.keys(this.Creeps).length

    const progress = Math.floor((this.constructionSite.progress / this.constructionSite.progressTotal) * 100)
    if (this.constructionSite.room) {
      let visualize = assignedCreeps > 0

      // if (assignedCreeps === 0) {
      // visualize = false
      // switch (this.constructionSite.structureType) {
      //     case STRUCTURE_ROAD:
      //     case STRUCTURE_EXTENSION:

      //         break;
      // }
      // }

      if (visualize) {
        this.constructionSite.room.visual.text(
          `${assignedCreeps} / ${maxCreeps} 🛠️ ${progress}%`,
          this.constructionSite.pos.x + 1,
          this.constructionSite.pos.y,
          { align: "left", opacity: 0.8 }
        )
      }
    }

    super.run(creep => {
      jobCreep.run(this.constructionSite, creep)
      // creep.say(emoji.lightning)
      // TODO: when job is finished release creep
      if (progress === 100) {
        // creep.memory.role = Role.Larvae // do we need something else than roles to describe the purpose of the creep?
        creep.memory.unemployed = true
        creep.say("[Builder]  Job's done ")

        // TODO: delete job
      }
      // disable builder release for now, untill we get a smart way to do it
      // if (energyPercentage && energyPercentage < 0.30) {
      //     creep.memory.role = Role.Larvae // do we need something else than roles to describe the purpose of the creep?
      //     creep.memory.unemployed = true
      //     creep.say("B Released")
      //     this.memory.creeps = this.memory.creeps.filter(creepId => creepId !== creep.id);
      //     // delete this.Creeps[creep.id]
      // }
    })
  }
}

// tslint:disable-next-line: max-classes-per-file
@profile
class BuilderCreep {
  run(constructionSite: ConstructionSite, creep: Creep) {
    // TODO:
    if (creep.memory.building && creep.carry.energy === 0) {
      creep.memory.building = false
      creep.say("🔄 withdraw ")
    }

    if (!creep.memory.building && creep.carry.energy === creep.carryCapacity) {
      creep.memory.building = true
      creep.say("🚧 build")
    }

    if (creep.memory.building) {
      if (creep.build(constructionSite) === ERR_NOT_IN_RANGE) {
        creep.say("🚧")
        creep.moveTo(constructionSite, {
          visualizePathStyle: PathStyle.Construction
        })
      }
    } else {
      const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: structure => {
          switch (structure.structureType) {
            case STRUCTURE_CONTAINER:
              const container = structure as StructureContainer
              return _.sum(container.store) >= creep.carryCapacity
            case STRUCTURE_EXTENSION:
              const extension = structure as StructureExtension
              return extension.energy >= creep.carryCapacity
            case STRUCTURE_SPAWN:
              const spawn = structure as StructureSpawn
              return spawn.energy >= creep.carryCapacity
            case STRUCTURE_TOWER:
              const tower = structure as StructureTower
              return tower.energy >= creep.carryCapacity
          }

          return false
        }
      })

      if (target) {
        if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: PathStyle.Collection })
        }
      }
      // do not fallback to mining
      // else {
      //     // creep.say('🔄 harvest');
      //     let sources = creep.room.find(FIND_SOURCES);
      //     if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
      //         creep.moveTo(sources[0], { visualizePathStyle: { stroke: '#ffaa00' } });
      //     }
      // }
    }
  }
}

const jobCreep = new BuilderCreep()
