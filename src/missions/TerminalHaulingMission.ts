import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement, RunePowers } from "Freya"
import { Mission, derefCreeps, haulerTieredRunePowers } from "./Mission"
import { ErrorMapper } from "utils/ErrorMapper"

enum HaulingMode {
  collecting,
  delivering
}

/**
 * Game.market.deal("5df4cd6e1c514b139eb808d0", amount, "E19S38") // 2m credits order W12S39, range 32
 * Game.market.calcTransactionCost(184608, 'W41N21', 'E19S38');
 * Game.market.createOrder({
    type: ORDER_SELL,
    resourceType: RESOURCE_ENERGY,
    price: 0.024,
    totalAmount: 100000,
    roomName: "E19S38"
})
 */

@profile
export class TerminalHaulingMission extends Mission {
  private room?: Room

  private roomName: string

  private roomMemory: RoomMemory

  public constructor(room: Room | string) {
    const roomMemory = typeof room === "string" ? Memory.rooms[room] : room.memory
    const roomName = typeof room === "string" ? room : room.name
    if (!roomMemory.terminalhaulingmission) {
      roomMemory.terminalhaulingmission = {
        id: "",
        creeps: {
          // TODO: how do we define a more explicit interface allowing to catch wrongly initialized memory?
          haulers: []
        }
      }
    }

    super(roomMemory.terminalhaulingmission)

    this.roomMemory = roomMemory
    this.roomName = roomName

    if (room instanceof Room) {
      this.room = room
    }
  }

  public getRequirements(): RuneRequirement[] {
    const requirements = [] as RuneRequirement[]
    if (this.room?.terminal?.store?.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      return requirements
    }

    const neededWorkers = this.room?.terminal ? 1 : 0

    const capacityAvailable = this.room?.energyCapacityAvailable ?? 300

    const requirementLookup = this.getMaxTierRunePowers(300, 2400, capacityAvailable, haulerTieredRunePowers)

    const haulers = {
      rune: "haulers",
      count: neededWorkers - (this.memory.creeps.haulers.length || 0),
      // 300 energy
      runePowers: requirementLookup.powers,
      priority: 1, // TODO: change priorty perhaps it should be a tab-step?
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

      // TODO: Assign tasks
      const hauler = idlehaulers.pop() // TODO: We should pick the closest creep not just any idle creep

      if (hauler) {
        this.assignHaulTask(hauler)
      }

      // Run haulers
      haulers.forEach(creep => creep.run())

      return
    } catch (error) {
      console.log(
        `<span style='color:red'>[TerminalHaulingMission] ${_.escape(ErrorMapper.sourceMappedStackTrace(error))}</span>`
      )
    }
  }

  private assignHaulTask(creep: Creep): void {
    // TODO: do we need to toggle a collection or delivery mode?, should probably check all sources, and not only 1?
    if (!creep.memory.mode || creep.memory.mode === HaulingMode.collecting) {
      if (creep.store.getFreeCapacity() === 0) {
        creep.memory.mode = HaulingMode.delivering
      }
    } else if (creep.memory.mode === HaulingMode.delivering) {
      if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
        creep.memory.mode = HaulingMode.collecting
      }
    }

    if (creep.memory.mode === HaulingMode.delivering) {
      if (this.goToHome(creep)) {
        return
      }

      if (this.room?.terminal) {
        creep.task = Tasks.transfer(this.room?.terminal)

        return
      }
    } else {
      if (this.room?.storage) {
        if (this.room?.terminal?.store?.getFreeCapacity(RESOURCE_ENERGY) ?? 0 > 0) {
          creep.task = Tasks.withdraw(this.room.storage)
        } else {
          creep.task = Tasks.transfer(this.room.storage)
        }

        return
      }

      // //   if (this.goToGoal(creep)) {
      // //     return
      // //   }
    }
    // TODO: move creeps in the way?
  }
}
