import { Tasks } from "task"
import { profile } from "_lib/Profiler"
import { RuneRequirement, RunePowers } from "Freya"
import { Mission, derefCreeps, haulerTieredRunePowers } from "./Mission"
import { ErrorMapper } from "utils/ErrorMapper"

enum HaulingMode {
  collecting = 1,
  delivering = 2
}

/**
 * Game.market.deal("5e148132eb7179d97de5d6f5", amount, "E19S38")
 * Game.market.calcTransactionCost(150000, 'W4N21', 'E19S38');
 * Game.market.createOrder({
    type: ORDER_SELL,
    resourceType: RESOURCE_ENERGY,
    price: 0.050,
    totalAmount: 150000,
    roomName: "E19S38"
})

Game.market.createOrder({
    type: ORDER_SELL,
    resourceType: RESOURCE_BATTERY,
    price: 0.750,
    totalAmount: 15000,
    roomName: "E19S38"
})

Game.market.calcTransactionCost(150000, 'W4N21', 'E19S38'); -- 60 rooms away
129700

Lapitz for energy trades (buying)
const oCost = Game.market.calcTransactionCost(order.amount, order.roomName, myRoom.name);
const finalAmount = order.amount-oCost;
if (finalAmount <= 0)
{
    continue;
}
const finalPrice = order.price * (order.amount/finalAmount)

api docs
const amountToBuy = 2000, maxTransferEnergyCost = 500;
const orders = Game.market.getAllOrders({type: ORDER_SELL, resourceType: RESOURCE_GHODIUM});

for(let i=0; i<orders.length; i++) {
    const transferEnergyCost = Game.market.calcTransactionCost(
        amountToBuy, 'W1N1', orders[i].roomName);

    if(transferEnergyCost < maxTransferEnergyCost) {
        Game.market.deal(orders[i].id, amountToBuy, "W1N1");
        break;
    }
}


Game.rooms.E19S38.terminal.send(RESOURCE_ENERGY,100000, 'E19S36')
 */
enum TerminalMode {
  FILL_TERMINAL = 1,
  EMPTY_TERMINAL = 2
}

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

    const mode = this.getTerminalMode()

    if (mode === TerminalMode.FILL_TERMINAL && this.room?.terminal?.store?.getFreeCapacity(RESOURCE_ENERGY) === 0) {
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
    if (!creep.memory.mode) {
      creep.memory.mode = HaulingMode.collecting
    } else if (creep.memory.mode === HaulingMode.collecting) {
      if (creep.store.getFreeCapacity() === 0) {
        creep.memory.mode = HaulingMode.delivering
      }
    } else if (creep.memory.mode === HaulingMode.delivering) {
      if (creep.store.getFreeCapacity() === creep.store.getCapacity()) {
        creep.memory.mode = HaulingMode.collecting
      }
    }

    // If storage is above a treshhold of energy, transfer to terminal, else withdraw from terminal and put into storage

    const mode = this.getTerminalMode()

    if (creep.memory.mode === HaulingMode.delivering) {
      if (this.goToHome(creep)) {
        return
      }

      if (this.room?.terminal) {
        if (mode === TerminalMode.FILL_TERMINAL) {
          creep.task = Tasks.transfer(this.room.terminal)
        } else if (this.room?.storage) {
          creep.task = Tasks.transfer(this.room.storage)
        }

        return
      }
    } else {
      if (this.room?.storage) {
        if (mode === TerminalMode.EMPTY_TERMINAL) {
          if (this.room?.terminal && (this.room.terminal.store?.getFreeCapacity(RESOURCE_ENERGY) ?? 0 > 0)) {
            creep.task = Tasks.withdraw(this.room.terminal, RESOURCE_ENERGY)
          } else {
            creep.task = Tasks.transfer(this.room.storage)
          }
        } else if (this.room?.terminal) {
          creep.task = Tasks.withdraw(this.room.storage, RESOURCE_ENERGY)
        }

        return
      }

      // //   if (this.goToGoal(creep)) {
      // //     return
      // //   }
    }
    // TODO: move creeps in the way?
  }

  private getTerminalMode(): TerminalMode {
    return (this.room?.storage?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) /
      (this.room?.storage?.store.getCapacity() ?? 1) >=
      0.9
      ? TerminalMode.FILL_TERMINAL
      : TerminalMode.EMPTY_TERMINAL
  }
}
