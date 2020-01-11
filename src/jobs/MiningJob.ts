import { emoji } from "_lib/emoji"
import { profile } from "_lib/Profiler"
import { DEFCONLEVEL } from "Thor"
import { Dictionary } from "lodash"
import { Role } from "role/roles"
import { CreepMutations } from "./../Hatchery"
import { Job, JobPriority, JobType } from "./Job"
import { MiningHaulingJob } from "./MiningHaulingJob"
import { PathStyle } from "./MovementPathStyles"
import { Tasks } from "../task" // Path to Tasks.ts
import { GoToTask } from "task/Tasks/GotoTask"

/* TODO: Spawn Construction job for a container, alternative, let the first miner do it?
how do we prevent having to repeatedly check for container?,
Mining job should have a list of containers, and if there is none, spawn it
*/
@profile
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

    super.run(creep => {
      //roleHarvester.run(this, creep, this.source)
      // new taskbased "Role"
      // if (this.source.room.name !== creep.room.name) {
      //   if (creep.task === null || creep.task.name !== GoToTask.taskName) {
      //     creep.task = Tasks.goTo(this.source, { moveOptions: { range: 1 } })
      //   }

      //   creep.run()

      //   return
      // }

      if (creep.isIdle) {
        RoleHarvester.newTask(this, creep, this.source)
      }
      // console.log("attempting to run")
      creep.run()
    })
  }
}

// tslint:disable-next-line: max-classes-per-file

// tslint:disable-next-line: max-classes-per-file
@profile
class RoleHarvester {
  // Harvesters harvest from sources, preferring unattended ones and deposit to Spawn1
  // This module demonstrates the RoomObject.targetedBy functionality

  // I don't like this, tasks should be assigned at a higher level,
  // we should not be finding creeps by role and running their role.
  public static newTask(job: MiningJob, creep: Creep, source: Source): void {
    if (creep.room.memory.DEFCON && creep.room.memory.DEFCON.level > DEFCONLEVEL.NONE) {
      // stay 3 fields away from from enemy
      const hostilesInRange = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 4)
      if (hostilesInRange.length > 0) {
        const fleePath = PathFinder.search(
          creep.pos,
          hostilesInRange.map(hostile => ({ pos: hostile.pos, range: 4 })),
          { flee: true }
        )

        creep.moveByPath(fleePath.path)

        return
      }
    }

    if (creep.carry.energy < creep.carryCapacity) {
      // Harvest from an empty source if there is one, else pick any source
      // const sources = creep.room.find(FIND_SOURCES)
      // let unattendedSource = _.filter(sources, source => source.targetedBy.length == 0)[0]; // I like this idea
      // if (unattendedSource) {
      // 	creep.task = Tasks.harvest(unattendedSource);
      // } else {
      creep.task = Tasks.harvest(source)
      // }
    } else {
      const haulers = Object.keys(job.haulingJob.Creeps)

      const nearbyContainer = job.source.pos.findInRange(FIND_STRUCTURES, 2, {
        filter: structure => {
          switch (structure.structureType) {
            case STRUCTURE_CONTAINER:
              const container = structure as StructureContainer
              return _.sum(container.store) < container.storeCapacity && haulers.length > 0
          }

          return false
        }
      })

      let target = nearbyContainer.length > 0 ? nearbyContainer[0] : null

      if (!target) {
        target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
          filter: structure => {
            switch (structure.structureType) {
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
      }

      if (target) {
        let shouldTransfer = true
        if (target.structureType === STRUCTURE_CONTAINER) {
          const container = target as StructureContainer
          if (container.hits / container.hitsMax <= 0.6) {
            creep.repair(container)
            shouldTransfer = false
          }
        }

        if (shouldTransfer) {
          creep.task = Tasks.transfer(target as StructureContainer | StructureExtension | StructureSpawn)
        }
      } else {
        // TODO drop task
        creep.drop(RESOURCE_ENERGY)
      }
    }
  }
}
