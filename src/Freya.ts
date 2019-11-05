import PriorityQueue from "ts-priority-queue"

// function bodyCost(body: BodyPartConstant[]) {
//   return body.reduce((cost, part) => {
//     return cost + BODYPART_COST[part]
//   }, 0)
// }

// export enum CreepMutations {
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

export interface RuneRequirement {
  rune: string
  runePowers: RunePowers
  count: number
}

export type RunePowers = { [key in BodyPartConstant]?: number }

// TODO: calculate runes
// calculate runepower
export function calculateRunePowers(body: BodyPartConstant[]): RunePowers {
  return body.reduce(
    (runepowers, part) => {
      runepowers[part] = (runepowers[part] || 0) + 1
      return runepowers
    },
    {} as RunePowers
  )
}

export function compareRunePowers(creepPowers: RunePowers, wishes: RunePowers, minRequirements?: RunePowers): boolean {
  for (const part in wishes) {
    if (creepPowers.hasOwnProperty(part)) {
      const wishPartPower = wishes[part as BodyPartConstant] || 0
      const creepPartPower = creepPowers[part as BodyPartConstant] || 0

      if (!creepPartPower || creepPartPower < wishPartPower) {
        return false
      }
    }
  }

  return true
}

function calculateBodyCost(body: BodyPartConstant[]): number {
  return body.reduce((cost, part) => {
    return cost + BODYPART_COST[part]
  }, 0)
}

const comparePriority = (a: Priority, b: Priority) => b.priority - a.priority

export class Freya {
  private requests: PriorityQueue<MemoryPrayer>
  constructor() {
    this.requests = new PriorityQueue<MemoryPrayer>({
      comparator: comparePriority
      // initialValues: []
    })
  }
  public run() {
    // TODO: something smart in regards to selecting spawn
    for (const spawnName in Game.spawns) {
      if (Game.spawns.hasOwnProperty(spawnName)) {
        const spawn = Game.spawns[spawnName]

        const spawning = !!spawn.spawning
        console.log(`spawn queue length: ${this.requests.length}`)
        if (!spawning && this.requests.length > 0 /*&& population < maxPopulation*/) {
          const next = this.requests.dequeue()
          if (next && !this.spawn(spawn, next)) {
            this.requests.queue(next)
          }
        }

        // TODO: RoomVisual?
      }
    }
  }
  public pray(requirement: RuneRequirement): { [index: string]: string[] } {
    const names = {} as { [index: string]: string[] }

    for (let index = 0; index < requirement.count; index++) {
      const name = `${requirement.rune} ${index} ${Game.time}`

      if (!names[requirement.rune]) {
        names[requirement.rune] = []
      }
      names[requirement.rune].push(name)

      const prayer = {
        name,
        priority: 0,
        rune: requirement.rune,
        runePowers: requirement.runePowers
      }

      this.requests.queue(prayer)
      // TODO: could persist to memory, but does it really matter?
    }
    return names
  }
  private spawn(spawn: StructureSpawn, prayer: MemoryPrayer) {
    const body = this.generateBody(prayer.runePowers)

    const bodyCost = calculateBodyCost(body)

    console.log("Spawning")
    console.log(JSON.stringify(prayer))
    console.log(body)
    console.log(bodyCost)
    if (spawn.room.energyAvailable >= bodyCost) {
      const creepName = prayer.name
      const result = spawn.spawnCreep(body, creepName, {
        memory: {
          home: spawn.pos.roomName, // what is home? we might be spawning a creep for a mission in another room.
          rune: prayer.rune
        }
      } as SpawnOptions)

      if (result === OK) {
        console.log("Prayer answered: " + creepName + " " + bodyCost)
        return true
      } else {
        console.log(`[Freya]: ${result}`)
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
    console.log("generating body")
    const body = [] as BodyPartConstant[]

    for (const part in runePowers) {
      if (runePowers.hasOwnProperty(part)) {
        const bodyPart = part.toLowerCase() as BodyPartConstant
        const powers = runePowers[bodyPart] || 0
        console.log(bodyPart)
        console.log(powers)
        for (let index = 0; index < powers; index++) {
          body.push(bodyPart)
        }
      }
    }
    console.log(body)
    return body
  }
}

interface Priority {
  priority: number
}
interface MemoryPrayer extends Priority {
  runePowers: RunePowers
  rune: string
  name: string
}
