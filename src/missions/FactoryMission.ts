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
 * Game.market.deal("5e148132eb7179d97de5d6f5", amount, "E19S38")
 * Game.market.calcTransactionCost(150000, 'W4N21', 'E19S38');
 * Game.market.createOrder({
    type: ORDER_SELL,
    resourceType: RESOURCE_ENERGY,
    price: 0.050,
    totalAmount: 150000,
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

 */

@profile
export class FactoryMission extends Mission {
  private room?: Room

  private roomName: string

  private roomMemory: RoomMemory

  public constructor(room: Room | string) {
    const roomMemory = typeof room === "string" ? Memory.rooms[room] : room.memory
    const roomName = typeof room === "string" ? room : room.name
    if (!roomMemory.factorymission) {
      roomMemory.factorymission = {
        id: "",
        creeps: {
          // TODO: how do we define a more explicit interface allowing to catch wrongly initialized memory?
          haulers: []
        }
      }
    }

    super(roomMemory.factorymission)

    this.roomMemory = roomMemory
    this.roomName = roomName

    if (room instanceof Room) {
      this.room = room
    }
  }

  public getRequirements(): RuneRequirement[] {
    const requirements = [] as RuneRequirement[]

    const factory = this.room?.find<StructureFactory>(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_FACTORY }
    })[0]

    if (!factory) {
      return requirements
    }

    const neededWorkers = factory ? 1 : 0

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
      const factory = this.room?.find<StructureFactory>(FIND_MY_STRUCTURES, {
        filter: { structureType: STRUCTURE_FACTORY }
      })[0]

      const haulers = this.memory.creeps.haulers.reduce<Creep[]>(derefCreeps, [])
      const idlehaulers = haulers.filter(creep => creep.isIdle)

      // TODO: Assign tasks
      const hauler = idlehaulers.pop() // TODO: We should pick the closest creep not just any idle creep

      if (hauler) {
        this.assignHaulTask(hauler, factory)
      }

      // Run haulers
      haulers.forEach(creep => creep.run())

      // Run Factory
      if (factory?.cooldown === 0) {
        factory.produce(RESOURCE_BATTERY)
      }

      return
    } catch (error) {
      console.log(
        `<span style='color:red'>[FactoryMission] ${_.escape(ErrorMapper.sourceMappedStackTrace(error))}</span>`
      )
    }
  }

  private assignHaulTask(creep: Creep, factory?: StructureFactory): void {
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

      if (factory) {
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
          creep.say("🚚⚡")
          if (factory.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            creep.task = Tasks.transfer(factory, RESOURCE_ENERGY)
          } else if (this.room?.storage) {
            creep.task = Tasks.transfer(this.room.storage, RESOURCE_ENERGY)
          }

          return
        }

        if (this.room?.terminal && creep.store.getUsedCapacity(RESOURCE_BATTERY) > 0) {
          creep.say("🚚🔋")
          creep.task = Tasks.transfer(this.room.terminal, RESOURCE_BATTERY)

          return
        }

        return
      }
    } else {
      if (this.room?.storage) {
        if ((factory?.store?.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > 0) {
          if ((this.room.storage.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) > 20000) {
            creep.say("W🚚⚡")
            creep.task = Tasks.withdraw(this.room.storage, RESOURCE_ENERGY)

            return
          }
        } else {
          if (this.room.terminal && factory) {
            // Battery transfer
            if (
              this.room.terminal.store.getUsedCapacity(RESOURCE_BATTERY) < 50000 &&
              (factory.store.getUsedCapacity(RESOURCE_BATTERY) ?? 0) > 0
            ) {
              creep.say("W🚚🔋")
              creep.task = Tasks.withdraw(factory, RESOURCE_BATTERY)

              return
            }
          }

          creep.say("?🚚⚡")
          creep.task = Tasks.transfer(this.room.storage, RESOURCE_ENERGY)
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
