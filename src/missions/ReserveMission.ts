import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement, RunePowers } from "Freya"
import { Mission, derefCreeps } from "./Mission"
import { ErrorMapper } from "utils/ErrorMapper"
import { log } from "_lib/Overmind/console/log"
@profile
export class ReserveMission extends Mission {
  private room?: Room

  private roomName: string

  private roomMemory: RoomMemory

  public constructor(room: Room | string) {
    const roomMemory = typeof room === "string" ? Memory.rooms[room] : room.memory
    const roomName = typeof room === "string" ? room : room.name
    if (!roomMemory.reservemission) {
      roomMemory.reservemission = {
        id: "",
        creeps: {
          // TODO: how do we define a more explicit interface allowing to catch wrongly initialized memory?
          reservers: []
        }
      }
    }

    super(roomMemory.reservemission)

    this.roomMemory = roomMemory
    this.roomName = roomName

    if (room instanceof Room) {
      this.room = room
    }
  }

  public getRequirements(): RuneRequirement[] {
    const requirements = []
    const neededWorkers = 1

    const reserverRunePowers: { [key: number]: { needed: number; powers: RunePowers } } = {
      650: { needed: 1, powers: { [MOVE]: 1, [CLAIM]: 1 } },
      1300: { needed: 1, powers: { [MOVE]: 2, [CLAIM]: 2 } },
      1950: { needed: 1, powers: { [MOVE]: 3, [CLAIM]: 3 } },
      2600: { needed: 1, powers: { [MOVE]: 4, [CLAIM]: 4 } },
      3250: { needed: 1, powers: { [MOVE]: 5, [CLAIM]: 5 } }
    }

    // TODO: count total workers, unspawned and spawned, spawned workers should be substracted with less TTL than travel time or something arbritrary
    // TODO: use an alive creep to get home location, perhaps home location / preferred spawn should be stored in memory
    const actualReservers = this.memory.creeps.reservers.reduce<Creep[]>(derefCreeps, [])
    const dyingReservers = actualReservers.reduce(
      (total, creep) => ((creep.ticksToLive ?? 0) < 25 ? total++ : total),
      0
    )

    const roomToCheckCapacity = this.roomMemory.outpost ? Game.rooms[actualReservers[0]?.memory?.home] : this.room

    const capacityAvailable = roomToCheckCapacity?.energyCapacityAvailable ?? 300

    const reserverRequirementLookup = this.getMaxTierRunePowers(650, 1950, capacityAvailable, reserverRunePowers)

    const reservers = {
      rune: "reservers",
      count: neededWorkers - ((this.memory.creeps.reservers.length || 0) - dyingReservers),
      // 650 energy https://screeps.arcath.net/creep-designer/?share=1#0#0#0#0#0#1#0
      runePowers: reserverRequirementLookup.powers, // { [MOVE]: 1, [CLAIM]: 1 },
      priority: 1, // TODO: change priorty perhaps it should be a tab-step?
      mission: this.memory.id,
      missionRoom: this.roomName
    }

    if (reservers.count > 0) {
      log.info(
        `${this.roomName} => ${roomToCheckCapacity?.name} => ${capacityAvailable} ${JSON.stringify(
          reserverRequirementLookup
        )}`
      )
      // // 14376173 E18S36 => E19S36 => 1800
      // // 14376173 E18S37 => E19S38 => 12900
      requirements.push(reservers)
    }

    return requirements
  }

  public run(): void {
    try {
      const reservers = this.memory.creeps.reservers.reduce<Creep[]>(derefCreeps, [])
      const idlereservers = reservers.filter(creep => creep.isIdle)

      // Find controller
      // TODO: Assign tasks
      const reserver = idlereservers.pop() // TODO: We should pick the closest creep not just any idle creep

      if (reserver) {
        if (!this.goToRoom(reserver, this.roomName)) {
          const controller = this.room?.controller
          if (controller) {
            if (!reserver.task) {
              reserver.task = Tasks.reserve(controller)
            }
          }
        }
      }

      // Run reservers
      reservers.forEach(creep => creep.run())

      return
    } catch (error) {
      console.log(
        `<span style='color:red'>[ReserveMission] ${_.escape(ErrorMapper.sourceMappedStackTrace(error))}</span>`
      )
    }
  }
}
