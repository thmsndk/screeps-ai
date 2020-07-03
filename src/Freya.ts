import PriorityQueue from "_lib/PriorityQueue/PriorityQueue"
import { log } from "_lib/Overmind/console/log"
import { derefRoomPosition } from "task/utilities/utilities"

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
  missionRoom: string
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
  private requests: { [roomName: string]: PriorityQueue<MemoryPrayer> }

  private spawns!: { [roomName: string]: StructureSpawn[] }

  private preferedVillage: { [roomName: string]: string }

  public constructor() {
    this.requests = {}
    this.hydrate()
    this.preferedVillage = {}
  }

  public get prayers(): number {
    return Object.values(this.requests).reduce((total, queue) => total + queue.length, 0)
  }

  public queued(creepName: string): boolean

  public queued(creepNames: string[]): { [index: string]: boolean }

  public queued(creepName: string | string[]): boolean | { [index: string]: boolean } {
    // Const allPrayers = this.requests.length ? this.requests.peek(this.requests.length) : []
    const allPrayers = Object.values(this.requests).reduce<MemoryPrayer[]>((result, queue) => {
      if (queue.length > 0) {
        result.push(...queue.peek(queue.length))
      }

      return result
    }, [])

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

  public print(): void {
    // TODO: group by preferred village
    log.info(JSON.stringify(this.preferedVillage))
    const villages = _.groupBy(this.preferedVillage)
    for (const village in villages) {
      if (villages.hasOwnProperty(village)) {
        const preferredVillage = villages[village]
        const requests = this.requests[village]
        if (requests && requests.length > 0) {
          log.info(`===================================`)
          log.info(`${village} ${requests.length} prayers => ${preferredVillage.join(",")}`)
          const prayers = requests.peek(requests.length)
          prayers.forEach(prayer =>
            log.info(`${prayer.missionRoom} ${prayer.name} ${JSON.stringify(prayer.runePowers)}`)
          )
        }
      }
    }
  }

  public run(): void {
    // This.hydrate() moved out into main.

    // All spawning parts is a multiple of 3, have to verify this, but it should be enough to run this logic Game.time % 3 === 0

    if (this.prayers > 0) {
      // // console.log(`[Freya]: ${this.prayers} prayers`)
    }

    const globalRequests = this.requests.global // Should only happen when we have no spawn or in the start with auto spawns

    // TODO: something smart in regards to selecting spawn
    for (const village in this.spawns) {
      if (this.spawns.hasOwnProperty(village)) {
        const spawns = this.spawns[village]
        const requests = this.requests[village]

        if (!spawns || !spawns.length) {
          return
        }

        spawns.forEach(spawn => {
          let spawning = !!spawn.spawning

          if (globalRequests && globalRequests.length) {
            if (!spawning && globalRequests.length > 0 /* && population < maxPopulation*/) {
              const next = globalRequests.dequeue()
              // // log.info(`[Freya]: Dequeing from global ${globalRequests.length + 1} ${next.name}`)
              if (next && !this.spawn(spawn, next)) {
                // // log.info(`[Freya]: adding back to global ${next.name}`)
                globalRequests.queue(next)
              } else {
                // Bail out, this spawn is spawning
                return
              }
            }
          }

          spawning = !!spawn.spawning

          if (requests && requests.length) {
            // // console.log(`spawn queue length: ${this.requests.length}`)
            if (!spawning && requests.length > 0 /* && population < maxPopulation*/) {
              const next = requests.dequeue()
              if (next && !this.spawn(spawn, next)) {
                requests.queue(next)
              }
            }
          }
        })
      }
    }
  }

  public hydrate(): void {
    // Hydrate and group spawns by room
    this.spawns = _.groupBy(Game.spawns, "room.name")
  }

  // TODO: multiple prayers on the same tick causes name clases.
  public pray(requirement: RuneRequirement): { [index: string]: string[] } {
    const names = {} as { [index: string]: string[] }
    const prayerBatch = this.prayers + 1
    log.info(`[Freya]: ${requirement.missionRoom} / ${requirement.mission} ${requirement.rune} ${requirement.count}`)
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
        mission: requirement.mission,
        missionRoom: requirement.missionRoom
      }

      this.queue(prayer)
      log.info(
        `   ${this.preferedVillage[prayer.missionRoom]} ${name} queued ${JSON.stringify(requirement.runePowers)}`
      )
      // TODO: could persist to memory, but does it really matter?
    }

    return names
  }

  private queue(prayer: MemoryPrayer): void {
    let preferedSpawn = this.preferedVillage[prayer.missionRoom] ?? "global"

    // TODO: clear the preferred villages at an interval, in case of new spawns, alternatively we should instruct fraya to reconsider upon spawn completion (clear cache)
    if (!preferedSpawn || preferedSpawn === "global") {
      log.warning(`    ${prayer.missionRoom} no preferred spawn found `)
      const villages = this.spawns
      let distance = 100 // TODO: supply in prayer?
      for (const roomName in villages) {
        if (villages.hasOwnProperty(roomName)) {
          if (roomName === prayer.missionRoom) {
            log.info(`    ${roomName} set as prefered spawn`)
            preferedSpawn = roomName
            break
          }

          const potentialDistance = Game.map.getRoomLinearDistance(prayer.missionRoom, roomName)
          log.info(`    ${roomName} distance ${potentialDistance} to ${prayer.missionRoom}`)
          if (potentialDistance < distance) {
            distance = potentialDistance
            preferedSpawn = roomName
            log.info(`    ${roomName} set as prefered spawn distance ${distance}`)
          }
        }
      }

      this.preferedVillage[prayer.missionRoom] = preferedSpawn
    }

    let requests = this.requests[preferedSpawn]
    if (!requests) {
      log.info(`    ${preferedSpawn} queue initialized `)
      requests = this.requests[preferedSpawn] = new PriorityQueue<MemoryPrayer>({
        comparator: comparePriority
        // InitialValues: []
      })
    }

    requests.queue(prayer)
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
        log.info(`[Freya]: ${spawn.pos.print} Prayer answered: ${prayer.mission} ${creepName} ${bodyCost}`)

        return true
      } else {
        log.info(`[Freya]: ${spawn.pos.print} ${result}`)
      }
    }

    // // log.warning(`[Freya]: ${spawn.pos.print} ${prayer.name} NOT ENOUGH ENERGY ${bodyCost}`)

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
  missionRoom: string
  mission: string
  runePowers: RunePowers
  rune: string
  name: string
}
