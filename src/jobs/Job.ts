import { emoji } from "_lib/emoji"
import { profile } from "_lib/Profiler"
import { CreepMutations, Hatchery } from "Hatchery"
import { Dictionary } from "lodash"
import { Role } from "role/roles"

@profile
export class Job {
  public type: JobTypes
  public target?: string
  public Creeps: Dictionary<Creep>
  private hatchery?: Hatchery
  public memory: IMemoryJob

  constructor(type: JobTypes, target?: string, memory?: IMemoryJob, creeps?: Dictionary<Creep>) {
    if (!memory) {
      memory = { type, target, priority: 0, creeps: [] }
    }

    this.memory = memory
    this.type = type
    this.target = target
    this.Creeps = creeps || {}
    if (target) {
      const roomObject = Game.getObjectById<RoomObject>(target)
      if (roomObject) {
        const spawn = roomObject.pos.findClosestByRange(FIND_MY_SPAWNS)
        if (spawn) {
          this.hatchery = new Hatchery(spawn)
        }
      }

      for (const creepId in this.Creeps) {
        if (this.Creeps.hasOwnProperty(creepId)) {
          const creep = this.Creeps[creepId]
          creep.memory.target = target
        }
      }
    }
  }

  public run(run?: (creep: Creep) => void) {
    for (const name in this.Creeps) {
      if (this.Creeps.hasOwnProperty(name)) {
        const creep = this.Creeps[name]
        if (run) {
          run(creep)
        }
        // creep.say(emoji.bug)
      }
    }
  }

  public assign(neededWorkers: number, memory: IMemoryJob, role: Role): number {
    // TODO: memory should be in constructor, will solve later
    // TODO: RoleConstant and Mutation should probably be merged

    let unemployed = _.filter(
      Game.creeps,
      creep => !creep.spawning && creep.memory.unemployed && creep.memory.role === role
    )

    // Sort by range
    const target = Game.getObjectById<RoomObject>(this.target) // TODO: not sure it is smart to get object again here. we should store position of job on base entry
    if (target) {
      unemployed = unemployed.sort((a, b) => {
        const aRange = a.pos.getRangeTo(target)
        const bRange = b.pos.getRangeTo(target)

        return aRange - bRange
      })
    }

    const creepsToEmploy = unemployed.slice(0, unemployed.length >= neededWorkers ? neededWorkers : unemployed.length)
    // console.log(`assign `, role, unemployed, neededWorkers, creepsToEmploy.length)
    // console.log(`${this.target} requested ${mutation}`, neededWorkers, requests)

    neededWorkers -= creepsToEmploy.length
    // console.log(`found ${creepsToEmploy.length} creeps to employ`)
    creepsToEmploy.forEach(creep => {
      if (!this.Creeps[creep.id]) {
        creep.memory.role = role
        creep.memory.unemployed = false
        this.Creeps[creep.id] = creep

        if (memory.creeps) {
          memory.creeps.push(creep.id)
        }
      }
    })

    return neededWorkers
  }

  public requestHatch(neededWorkers: number, mutation: CreepMutations, priority: number) {
    if (this.hatchery) {
      // TODO: What if there is no spawn in this room, but the job is for this room? what hatchery should spawn it then?
      if (this.target) {
        const requests = this.hatchery.getRequests(this.target, mutation)
        neededWorkers -= requests
        if (neededWorkers > 0) {
          for (let index = 0; index < neededWorkers; index++) {
            // request new creeps
            // console.log(`${this.target} requested ${mutation}`, neededWorkers, requests)
            this.hatchery.queue({
              mutation,
              target: this.target,
              priority
            })
          }
        }
      }
    }
  }
}

export enum JobType {
  Mining = 1, // as JobTypeMining
  UpgradeController = 2, // as JobTypeUpgradeController
  Hauling = 3, // as JobTypeHauling
  Building = 4 // as JobTypeBuilding
}

export const JobPriority = {
  Low: 5,
  Medium: 10,
  High: 30
}
