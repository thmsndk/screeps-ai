import { RuneRequirement } from "Freya"
import { log } from "_lib/Overmind/console/log"
import { Tasks } from "task"

export const derefCreeps = (result: Creep[], creepName: string, index: number, creepNames: string[]): Creep[] => {
  const creep = Game.creeps[creepName] /* TODO: switch to deref */
  // // console.log("Found creep")
  // // console.log(JSON.stringify(creep))
  if (creep) {
    // // console.log(`${creepName} found`)
    if (!creep.spawning) {
      result.push(creep)
    }
  } else {
    const queued = global.freya.queued(creepName)
    // // console.log(`${creepName} queued?${JSON.stringify(queued)}`)
    if (!queued) {
      log.warning(`${creepName} has no prayer`)
      creepNames.splice(creepNames.indexOf(creepName), 1)
    }
  }

  return result
}

export abstract class Mission<M extends IMissionMemory = IMissionMemory> {
  private _memory: M

  public constructor(memory?: M) {
    this._memory = memory || ({} as any)
    if (!this._memory.id) {
      this._memory.id = Math.random()
        .toString(36)
        .substr(2, 9)
    }
  }

  public abstract getRequirements(): RuneRequirement[]

  public get memory(): M {
    return this._memory
  }

  public addCreep(creep: Creep | string, rune: string): void {
    const name = typeof creep === "string" ? creep : creep.name
    this.addCreepByName(name, rune)
  }

  public addCreepByName(creepName: string, rune: string): void {
    this.memory.creeps[rune].push(creepName)
  }

  public hasCreep(creep: Creep): boolean {
    for (const rune in this.memory.creeps) {
      if (this.memory.creeps.hasOwnProperty(rune)) {
        const creeps = this.memory.creeps[rune]
        if (creeps.indexOf(creep.name) >= 0) {
          return true
        }
      }
    }

    return false
  }

  public goToHome(creep: Creep): boolean {
    if (creep.pos.roomName !== creep.memory.home && creep.memory.home /* In case of amnesia */) {
      // // console.log(`${creep.name} => dropoff: ${creep.memory.home}`)
      creep.task = Tasks.goToRoom(creep.memory.home)

      return true
    }

    return false
  }

  public goToRoom(creep: Creep, roomName: string): boolean {
    if (creep.pos.roomName !== roomName) {
      // // console.log(`${creep.name} => goal: ${this.roomName}`)
      creep.task = Tasks.goToRoom(roomName)

      return true
    }

    return false
  }

  public abstract run(): void

  public getMaxTierRunePowers(
    min: number,
    max: number,
    capacityAvailable: number,
    tieredRunePowers: { [key: number]: { needed: number; powers: any } }
  ): { needed: number; powers: any } {
    const maxRunePowerLookup = Math.min(max, capacityAvailable)
    let requirementLookup = tieredRunePowers[min]
    for (const key in tieredRunePowers) {
      const energyCapacityRequirement = Number(key)
      if (tieredRunePowers.hasOwnProperty(energyCapacityRequirement)) {
        if (energyCapacityRequirement <= maxRunePowerLookup) {
          requirementLookup = tieredRunePowers[energyCapacityRequirement]
        }
      }
    }

    return requirementLookup
  }
}
