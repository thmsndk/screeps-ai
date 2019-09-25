import { emoji } from "_lib/emoji"
import { profile } from "_lib/Profiler"
import { Dictionary } from "lodash"
import { Role } from "role/roles"
import { getPositions } from "RoomScanner"
import { CreepMutations } from "./../Hatchery"
import { Job, JobPriority, JobType } from "./Job"
import { PathStyle } from "./MovementPathStyles"
import { Tasks } from "task"
import { GoToTask } from "task/Tasks/GotoTask"

@profile
export class UpgradeControllerJob extends Job {
  public controller: StructureController
  public memory: IMemoryJob
  constructor(controller: StructureController, memory: IMemoryJob, creeps?: Dictionary<Creep>) {
    super(JobType.UpgradeController, controller.id, memory, creeps)
    this.controller = controller
    this.memory = memory

    if (creeps) {
      this.memory.creeps = Object.keys(creeps)
    }
  }

  public run() {
    const creeps = Object.values(this.Creeps)
    const assignedCreeps = creeps.length

    // const positions = getPositions(new Room.Terrain(this.controller.room.name), this.controller.pos, 3)

    // Whats the average energy consumption of 1 upgrader?
    // Upgrades a controller for 1 energy unit per tick.

    const averageEnergyUsage =
      creeps.reduce(
        (energyUsage, creep) =>
          energyUsage +
          creep.body.filter(part => part.type === WORK).length +
          CARRY_CAPACITY * creep.body.filter(part => part.type === CARRY).length,
        0
      ) / assignedCreeps
    const averageEnergy = this.controller.room
      ? this.controller.room.memory.averageEnergy
        ? this.controller.room.memory.averageEnergy.average
        : 0
      : 0
    const maxCreeps = Math.min(
      Math.floor(averageEnergy / (averageEnergyUsage || averageEnergy)),
      this.controller.level === 8 ? 1 : 10
    )

    this.visualizeProgress(assignedCreeps, maxCreeps)

    // ? should we look at all available energy and calculate a percentage? - e.g containers, extensions and spawn
    let neededWorkers = maxCreeps - assignedCreeps

    const energyPercentage = this.controller.room.energyAvailable / this.controller.room.energyCapacityAvailable
    if (assignedCreeps < maxCreeps && energyPercentage > 0.25) {
      if (assignedCreeps === 0) {
        neededWorkers = 1
        this.memory.priority = JobPriority.Medium
      } else {
        // if ((assignedCreeps / maxCreeps) >= 0.25 && this.memory.priority >= JobPriority.Medium) {
        this.memory.priority = JobPriority.Low
        // }
      }

      // TODO: should the job be responsible for finding creeps to solve the task? I don't think so
      // find creep that can solve task currently all our creeps can solve all tasks, this needs to be specialized
      // when suddenly ~90 workers are needed because of the high max, everything gets converted to upgraders

      // should probably change role, the role of the creep depends on its body configuration?
      neededWorkers = super.assign(neededWorkers, this.memory, Role.upgrader)
      // console.log(this.target + " needed workers after assign ", neededWorkers, this.memory.priority)

      // Do we already have requests for this?
      super.requestHatch(neededWorkers, CreepMutations.UPGRADER, this.memory.priority)
    }

    super.run(creep => {
      // TODO: should also only look at creeps in the same room, what about remote workers?

      const harvesters = _.filter(Game.creeps, creep => creep.memory.role === Role.harvester)
      if (harvesters.length === 0) {
        return
      }

      upgradeControllerCreep.run(this.controller, creep)
      // This was a silly idea, to handle the emergency of having no harvesters, we also need to check if we in fact have no harvesters, not just if our energy is low
      //
      // creep.say(emoji.lightning)
      // if (energyPercentage < 0.30 && released < maxRelease) {
      //     creep.memory.role = Role.Larvae // do we need something else than roles to describe the purpose of the creep?
      //     creep.memory.unemployed = true
      //     creep.say("U Released")
      //     this.memory.creeps = this.memory.creeps.filter(creepId => creepId !== creep.id);
      //     // delete this.Creeps[creep.id]
      //     released++
      // }
    })
  }

  private visualizeProgress(assignedCreeps: number, maxCreeps: number) {
    const progress = Math.floor((this.controller.progress / this.controller.progressTotal) * 100)
    if (this.controller.room) {
      this.controller.room.visual.text(
        `${assignedCreeps} / ${maxCreeps} ⚡ ${progress}%`,
        this.controller.pos.x,
        this.controller.pos.y - 1,
        { align: "center", opacity: 0.8 }
      )
    }
  }
}

// tslint:disable-next-line: max-classes-per-file
@profile
class UpgradeControllerCreep {
  public run(controller: StructureController, creep: Creep) {
    if (controller.room !== creep.room) {
      if (creep.task === null || creep.task.name !== GoToTask.taskName) {
        creep.task = Tasks.goTo(controller, { moveOptions: { range: 3 } })
        creep.run()
      }

      return
    }

    // TODO: General upgrade logic should perhaps exist in a base class?
    if (creep.memory.upgrading && creep.carry.energy === 0) {
      creep.memory.upgrading = false
      creep.say("🔄 withdraw")
    }
    if (!creep.memory.upgrading && creep.carry.energy === creep.carryCapacity) {
      creep.memory.upgrading = true
      creep.say("⚡ upgrade")
    }

    if (creep.memory.upgrading && controller) {
      if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
        creep.moveTo(controller, {
          visualizePathStyle: PathStyle.UpgradeController
        })
      }
    } else {
      // TODO: find everything and figure out what is closes?
      // ? do we need upgraders to get to structure containers?
      // let tombstone = controller.pos.findClosestByRange(FIND_TOMBSTONES)
      // if (tombstone) {
      //   if (tombstone && creep.pickup(tombstone) === ERR_NOT_IN_RANGE) {
      //     creep.moveTo(tombstone, { visualizePathStyle: PathStyle.Hauling })
      //   }
      // } else {
      const resource = controller.pos.findClosestByRange(FIND_DROPPED_RESOURCES)
      if (resource) {
        if (resource && creep.pickup(resource) === ERR_NOT_IN_RANGE) {
          creep.moveTo(resource, { visualizePathStyle: PathStyle.Hauling })
        }
      } else {
        const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
          filter: structure => {
            switch (structure.structureType) {
              case STRUCTURE_CONTAINER:
                const container = structure as StructureContainer
                return container.store[RESOURCE_ENERGY] >= creep.carryCapacity
              // case STRUCTURE_EXTENSION:
              //   const extension = structure as StructureExtension
              //   return extension.energy >= creep.carryCapacity
              // case STRUCTURE_SPAWN:
              //   const spawn = structure as StructureSpawn
              //   return spawn.energy >= creep.carryCapacity
              // case STRUCTURE_TOWER: // not sure it should get from there
              //   const tower = structure as StructureTower
              //   return tower.energy >= creep.carryCapacity
            }

            return false
          }
        })

        if (target) {
          if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: PathStyle.Collection })
          }
        }
      }
      // }

      // DO NOT FALL BACK TO harvesting from sources
      // else {
      //     //creep.say('🔄 harvest');
      //     var sources = creep.room.find(FIND_SOURCES);
      //     if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
      //         creep.moveTo(sources[0], { visualizePathStyle: { stroke: '#ffaa00' } });
      //     }
      // }
    }
  }
}

const upgradeControllerCreep = new UpgradeControllerCreep()
