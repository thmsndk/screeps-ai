import { RuneRequirement, RunePowers } from "Freya"
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

const routeCache: {
  [startRoomName: string]: {
    [targetRoomName: string]: {
      tick: number
      route: string[] | ERR_NO_PATH
    }
  }
} = {}

const getRoute = (
  creep: Creep,
  toRoomName: string
):
  | {
      exit: ExitConstant
      room: string
    }[]
  | ERR_NO_PATH => {
  // This probably belongs inside the gotoroom task?
  const from = creep.pos

  let fromCache = routeCache[from.roomName]
  if (!fromCache) {
    fromCache = routeCache[from.roomName] = {}
  }

  // TODO: cache it

  const to = new RoomPosition(25, 25, toRoomName)

  // Use `findRoute` to calculate a high-level plan for this path,
  // Prioritizing highways and owned rooms
  const route = Game.map.findRoute(from.roomName, to.roomName, {
    routeCallback(roomName) {
      const parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName)
      const westEastCoordinate: number = parsed ? Number(parsed[1]) ?? 0 : 0
      const northSouthCoordinate: number = parsed ? Number(parsed[2]) ?? 0 : 0
      const isHighway = westEastCoordinate % 10 === 0 || northSouthCoordinate % 10 === 0
      const isMyRoom = Game.rooms[roomName] && Game.rooms[roomName].controller && Game.rooms[roomName]?.controller?.my
      if (isHighway || isMyRoom) {
        return 1
      } else {
        return 2.5
      }
    }
  })

  return route
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

  public goToRoom(creep: Creep, toRoomName: string): boolean {
    if (creep.pos.roomName !== toRoomName) {
      // // console.log(`${creep.name} => goal: ${this.roomName}`)
      // // creep.task = Tasks.goToRoom(toRoomName)
      if (!creep.task) {
        const route = getRoute(creep, toRoomName)

        if (route !== ERR_NO_PATH) {
          const goToRoomTasks: ITask[] = []

          route.forEach(function(info) {
            if (creep.pos.roomName !== info.room) {
              goToRoomTasks.push(Tasks.goToRoom(info.room))
            }
          })

          creep.task = Tasks.chain(goToRoomTasks)
        }

        // Invoke PathFinder, allowing access only to rooms from `findRoute`
        // // const ret = PathFinder.search(from, to, {
        // //   roomCallback(roomName) {
        // //     if (!allowedRooms[roomName]) {
        // //       return false
        // //     }

        // //     return true
        // //   }
        // // })

        // // if (!creep.task) {
        // //   log.info(`${creep.name} has no task ${JSON.stringify(route)}`)
        // // }
      }

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
        // // if (min === 650) {
        // //   log.info(`${energyCapacityRequirement} <= ${maxRunePowerLookup}`)
        // // }
        if (energyCapacityRequirement <= maxRunePowerLookup) {
          requirementLookup = tieredRunePowers[energyCapacityRequirement]
        }
      }
    }

    // // if (min === 650) {
    // //   log.info(`${JSON.stringify(requirementLookup)}`)
    // // }

    return requirementLookup
  }

  public relocateCreepHome(roomName: string, roomMemory: RoomMemory, creep: Creep): void {
    if ((roomMemory.settlement || roomMemory.village) && creep.memory.home !== roomName) {
      creep.memory.home = roomName
    }
  }
}

export const haulerTieredRunePowers: { [key: number]: { needed: number; powers: RunePowers } } = {
  300: { needed: 1, powers: { [CARRY]: 3, [MOVE]: 3 } },
  400: { needed: 1, powers: { [CARRY]: 4, [MOVE]: 4 } },
  500: { needed: 1, powers: { [CARRY]: 5, [MOVE]: 5 } },
  600: { needed: 1, powers: { [CARRY]: 6, [MOVE]: 6 } },
  700: { needed: 1, powers: { [CARRY]: 7, [MOVE]: 7 } },
  800: { needed: 1, powers: { [CARRY]: 8, [MOVE]: 8 } },
  900: { needed: 1, powers: { [CARRY]: 9, [MOVE]: 9 } },
  1000: { needed: 1, powers: { [CARRY]: 10, [MOVE]: 10 } },
  1100: { needed: 1, powers: { [CARRY]: 11, [MOVE]: 11 } },
  1200: { needed: 1, powers: { [CARRY]: 12, [MOVE]: 12 } },
  1300: { needed: 1, powers: { [CARRY]: 13, [MOVE]: 13 } },
  1400: { needed: 1, powers: { [CARRY]: 14, [MOVE]: 14 } },
  1500: { needed: 1, powers: { [CARRY]: 15, [MOVE]: 15 } },
  1600: { needed: 1, powers: { [CARRY]: 16, [MOVE]: 16 } },
  1700: { needed: 1, powers: { [CARRY]: 17, [MOVE]: 17 } },
  1800: { needed: 1, powers: { [CARRY]: 18, [MOVE]: 18 } },
  1900: { needed: 1, powers: { [CARRY]: 19, [MOVE]: 19 } },
  2000: { needed: 1, powers: { [CARRY]: 20, [MOVE]: 20 } },
  2100: { needed: 1, powers: { [CARRY]: 21, [MOVE]: 21 } },
  2200: { needed: 1, powers: { [CARRY]: 22, [MOVE]: 22 } },
  2300: { needed: 1, powers: { [CARRY]: 23, [MOVE]: 23 } },
  2400: { needed: 1, powers: { [CARRY]: 24, [MOVE]: 24 } },
  2500: { needed: 1, powers: { [CARRY]: 25, [MOVE]: 25 } }
}
