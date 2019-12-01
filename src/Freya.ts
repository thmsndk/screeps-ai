import PriorityQueue from "_lib/PriorityQueue/PriorityQueue"
import { log } from "_lib/Overmind/console/log"

// Function bodyCost(body: BodyPartConstant[]) {
//   Return body.reduce((cost, part) => {
//     Return cost + BODYPART_COST[part]
//   }, 0)
// }

// Export enum CreepMutations {
//   CLAIMER = "claimer",
//   DEFENDER = "defender",
//   HARVESTER = "harvester",
//   HOLD = "hold",
//   MOVER = "mover",
//   RANGER = "ranger",
//   WORKER = "worker",
//   HAULER = "hauler",
//   UPGRADER = "upgrader"
// }

export interface RuneRequirement extends Priority {
  rune: string
  runePowers: RunePowers
  count: number
  mission: string
}

export type RunePowers = { [key in BodyPartConstant]?: number }

// TODO: calculate runes
// Calculate runepower
export function calculateRunePowers(body: BodyPartConstant[]): RunePowers {
  return body.reduce((runepowers, part) => {
    runepowers[part] = (runepowers[part] || 0) + 1

    return runepowers
  }, {} as RunePowers)
}

export function compareRunePowers(creepPowers: RunePowers, wishes: RunePowers, minRequirements?: RunePowers): boolean {
  for (const part in wishes) {
    if (creepPowers.hasOwnProperty(part)) {
      const wishPartPower = wishes[part as BodyPartConstant] || 0
      const creepPartPower = creepPowers[part as BodyPartConstant] || 0

      if (!creepPartPower || creepPartPower < wishPartPower) {
        return false
      }
    } else {
      return false
    }
  }

  return true
}

function calculateBodyCost(body: BodyPartConstant[]): number {
  return body.reduce((cost, part) => cost + BODYPART_COST[part], 0)
}

const comparePriority = (a: Priority, b: Priority): number => b.priority - a.priority

export class Freya {
  private requests: PriorityQueue<MemoryPrayer>

  public constructor() {
    this.requests = new PriorityQueue<MemoryPrayer>({
      comparator: comparePriority
      // InitialValues: []
    })
  }

  public get prayers(): number {
    return this.requests.length
  }

  public queued(creepName: string): boolean

  public queued(creepNames: string[]): { [index: string]: boolean }

  public queued(creepName: string | string[]): boolean | { [index: string]: boolean } {
    const allPrayers = this.requests.length ? this.requests.peek(this.requests.length) : []

    if (typeof creepName === "string") {
      return allPrayers.some(prayer => prayer.name === creepName)
    }

    const creepNames = creepName as string[]

    return allPrayers.reduce((result, prayer) => {
      if (creepNames.some(name => prayer.name === name)) {
        result[prayer.name] = true
      }

      return result
    }, {} as { [index: string]: boolean })
  }

  public run(): void {
    if (this.prayers > 0) {
      // // console.log(`[Freya]: ${this.prayers} prayers`)
    }

    // TODO: something smart in regards to selecting spawn
    for (const spawnName in Game.spawns) {
      if (Game.spawns.hasOwnProperty(spawnName)) {
        const spawn = Game.spawns[spawnName]

        const spawning = !!spawn.spawning
        // // console.log(`spawn queue length: ${this.requests.length}`)
        if (!spawning && this.requests.length > 0 /* && population < maxPopulation*/) {
          const next = this.requests.dequeue()
          if (next && !this.spawn(spawn, next)) {
            this.requests.queue(next)
          }
        }

        // TODO: RoomVisual?
      }
    }
  }

  // TODO: a prayer should have a target / target position, so freya can decide where to summon the unit.
  // TODO: multiple prayers on the same tick causes name clases.
  public pray(requirement: RuneRequirement): { [index: string]: string[] } {
    const names = {} as { [index: string]: string[] }
    const prayerBatch = this.prayers + 1
    log.info(`[Freya]: ${requirement.rune} ${requirement.count}`)
    for (let index = 0; index < requirement.count; index++) {
      const name = `${requirement.rune} ${prayerBatch} ${index} ${Game.time}`

      if (!names[requirement.rune]) {
        names[requirement.rune] = []
      }
      names[requirement.rune].push(name)

      const prayer = {
        name,
        priority: requirement.priority,
        rune: requirement.rune,
        runePowers: requirement.runePowers,
        mission: requirement.mission
      }
      log.info(`   ${name} queued`)
      this.requests.queue(prayer)
      // TODO: could persist to memory, but does it really matter?
    }

    return names
  }

  private spawn(spawn: StructureSpawn, prayer: MemoryPrayer): boolean {
    const body = this.generateBody(prayer.runePowers)

    const bodyCost = calculateBodyCost(body)

    // // console.log("Spawning")
    // // console.log(JSON.stringify(prayer))
    // // console.log(body)
    // // console.log(bodyCost)
    if (spawn.room.energyAvailable >= bodyCost) {
      const creepName = prayer.name
      const result = spawn.spawnCreep(body, creepName, {
        memory: {
          home: spawn.pos.roomName, // TODO: What is home? we might be spawning a creep for a mission in another room.
          rune: prayer.rune,
          mission: prayer.mission
        }
      } as SpawnOptions)

      if (result === OK) {
        log.info("Prayer answered: " + creepName + " " + bodyCost)

        return true
      } else {
        log.info(`[Freya]: ${result}`)
      }
    }

    return false

    // * OK	0 The operation has been scheduled successfully.
    // * ERR_NOT_OWNER - 1 You are not the owner of this spawn.
    // * ERR_NAME_EXISTS - 3 There is a creep with the same name already.
    // * ERR_BUSY - 4 The spawn is already in process of spawning another creep.
    // * ERR_NOT_ENOUGH_ENERGY - 6 The spawn and its extensions contain not enough energy to create a creep with the given body.
    // * ERR_INVALID_ARGS - 10 Body is not properly described or name was not provided.
    // * ERR_RCL_NOT_ENOUGH - 14 Your Room Controller level is insufficient to use this spawn.

    // https://docs.screeps.com/api/#Creep
  }

  private generateBody(runePowers: RunePowers): BodyPartConstant[] {
    // // console.log("generating body")
    const body = [] as BodyPartConstant[]

    for (const part in runePowers) {
      if (runePowers.hasOwnProperty(part)) {
        const bodyPart = part.toLowerCase() as BodyPartConstant
        const powers = runePowers[bodyPart] || 0
        // // console.log(bodyPart)
        // // console.log(powers)
        for (let index = 0; index < powers; index++) {
          body.push(bodyPart)
        }
      }
    }

    // // console.log(body)
    return body
  }
}

interface Priority {
  priority: number
}
interface MemoryPrayer extends Priority {
  mission: string
  runePowers: RunePowers
  rune: string
  name: string
}
