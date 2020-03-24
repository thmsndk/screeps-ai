import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement, RunePowers } from "Freya"
import { Mission, derefCreeps, haulerTieredRunePowers } from "./Mission"
import { ErrorMapper } from "utils/ErrorMapper"
import { log } from "_lib/Overmind/console/log"

export interface ConvoyMissionMemory extends IMissionMemory {
  targets: { [roomName: string]: number }
}

enum HaulingMode {
  collecting,
  delivering
}

@profile
export class ConvoyMission extends Mission<ConvoyMissionMemory> {
  private room?: Room

  private roomName: string

  private roomMemory: RoomMemory

  public constructor(room: Room | string) {
    const roomMemory = typeof room === "string" ? Memory.rooms[room] : room.memory
    const roomName = typeof room === "string" ? room : room.name
    if (!roomMemory.convoymission) {
      roomMemory.convoymission = {
        id: "",
        creeps: {
          // TODO: how do we define a more explicit interface allowing to catch wrongly initialized memory?
          haulers: []
        },
        targets: {
          E19S36: 100000,
          E18S37: 100000
        }
      }
    }

    super(roomMemory.convoymission)

    this.roomMemory = roomMemory
    this.roomName = roomName

    if (room instanceof Room) {
      this.room = room
    }
  }

  public getRequirements(): RuneRequirement[] {
    const requirements = [] as RuneRequirement[]

    // TODO: how much are we hauling? should be able to configure on mission, Where are we hauling? should also be able to configure
    const capacityAvailable = this.room?.energyCapacityAvailable ?? 300
    const haulersRequirementLookup = this.getMaxTierRunePowers(300, 2500, capacityAvailable, haulerTieredRunePowers)
    const haulers = {
      rune: "haulers",
      count:
        Object.keys(this.roomMemory?.convoymission?.targets ?? {}).length * 3 -
        (this.memory.creeps.haulers.length || 0),
      runePowers: haulersRequirementLookup.powers,
      priority: 20,
      mission: this.memory.id,
      missionRoom: this.roomName
    }

    if (haulers.count > 0) {
      requirements.push(haulers)
    }

    return requirements
  }

  public run(): void {
    try {
      const haulers = this.memory.creeps.haulers.reduce<Creep[]>(derefCreeps, [])
      const idlehaulers = haulers.filter(creep => creep.isIdle)

      for (const deliveryRoomName in this.memory.targets) {
        if (this.memory.targets.hasOwnProperty(deliveryRoomName)) {
          // // const deliveryRoom = Game.rooms[deliveryRoomName]
          // //   const amount = this.memory.targets[deliveryRoom]

          const hauler = idlehaulers.pop()

          if (hauler) {
            if (!hauler.memory.mode || hauler.memory.mode === HaulingMode.collecting) {
              if (hauler.store.getFreeCapacity() === 0) {
                hauler.memory.mode = HaulingMode.delivering
              }
            } else if (hauler.memory.mode === HaulingMode.delivering) {
              if (hauler.store.getFreeCapacity() === hauler.store.getCapacity()) {
                hauler.memory.mode = HaulingMode.collecting
              }
            }

            // TODO: reduce amount required for that target.

            if (hauler.memory.mode === HaulingMode.delivering) {
              // Dirty fix to spread haulers out over all targets
              if (idlehaulers.length > 0 && idlehaulers.length < Object.keys(this.memory.targets ?? {}).length) {
                continue
              }

              if (!this.goToRoom(hauler, deliveryRoomName)) {
                if (hauler.room?.storage) {
                  hauler.task = Tasks.transfer(hauler.room.storage, RESOURCE_ENERGY)
                }
                // TODO: empty out energy to extension, spawn
                // TODO: how do we detect that the task finished? and then subsctract the amount from the target amount?
              }
            } else {
              if (!this.goToHome(hauler)) {
                if (hauler.room?.storage) {
                  hauler.task = Tasks.withdraw(hauler.room.storage, RESOURCE_ENERGY)
                }
              }
            }
          }
          // TOOD: i'd really like to utilize all this behaviour / this mission as a "submission" in SettlementMission
        }
      }

      // Run haulers
      haulers.forEach(creep => creep.run())

      return
    } catch (error) {
      console.log(
        `<span style='color:red'>[ConvoyMission] ${_.escape(ErrorMapper.sourceMappedStackTrace(error))}</span>`
      )
    }
  }
}
