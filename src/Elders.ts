import { calculateRunePowers, compareRunePowers, Freya, RuneRequirement } from "Freya"
import { EnergyMission } from "missions/EnergyMission"
import { RoomPlanner } from "RoomPlanner"
import { RoomScanner } from "RoomScanner"
import { IntelMission } from "missions/IntellMission"
import { Mission } from "missions/Mission"
import { InfraStructureMission } from "missions/InfrastructureMission"
import { Infrastructure } from "RoomPlanner/Infrastructure"
import { UpgradeControllerMission } from "missions/UpgradeControllerMission"
import { calculateAverageEnergy } from "calculateAverageEnergy"
import { TargetCache } from "task/utilities/caching"
import { TowerMission } from "missions/TowerMission"
import { log } from "_lib/Overmind/console/log"
import { profile } from "_lib/Profiler"
import { ReserveMission } from "missions/ReserveMission"
import { TerminalHaulingMission } from "missions/TerminalHaulingMission"
import { ClaimMission } from "missions/ClaimMission"
import { DEFCONMission } from "missions/DEFCONMission"
import { FactoryMission } from "missions/FactoryMission"
import { Thor } from "Thor"
import { ConvoyMission } from "missions/ConvoyMission"

@profile
export class Elders {
  private checkSettle = true

  private roomPlanner: RoomPlanner

  private scanner: RoomScanner

  private freya: Freya

  private infrastructure: Infrastructure

  private thor: Thor

  public constructor(
    planner: RoomPlanner,
    scanner: RoomScanner,
    freya: Freya,
    infrastructure: Infrastructure,
    thor: Thor
  ) {
    this.roomPlanner = planner
    this.scanner = scanner // Should this be intel?
    this.freya = freya
    this.infrastructure = infrastructure
    this.thor = thor
  }

  public run(): Mission[] {
    // Check that target cache has been initialized - you can move this to execute once per tick if you want
    TargetCache.assert()

    this.parseFlags()

    this.bootstrap()

    const missions = [] as Mission[]

    //    Generate village missions
    //      Scout missions to find outposts, intell is gathered and the intell counsil member is informed?
    for (const roomName in Game.rooms) {
      if (Game.rooms.hasOwnProperty(roomName)) {
        const room = Game.rooms[roomName]

        // Gather intell
        this.scanner.scan(room)

        if (room.memory.village) {
          const energyMission = new EnergyMission(room)
          missions.push(energyMission)

          // Does missions need a finish condition?

          // // const intelMission = new IntelMission()
          // // missions.push(intelMission)

          // TODO: new missions up, get requirements, loop creeps, loop missions, could call getRequirements repeatedly, but cache the requirements in the mission for that specific tick?
          // TODO: Upgradecontroller mission
          calculateAverageEnergy(room)

          missions.push(new UpgradeControllerMission(room))

          missions.push(new TowerMission(room))

          missions.push(new FactoryMission(room))

          if (room.terminal) {
            missions.push(new TerminalHaulingMission(room))
          }

          if (roomName === "E19S38") {
            missions.push(new ConvoyMission(room))
          }
        }

        // TODO: perhaps an infrastructure mission should be based on a village? but we want to built the outpost / settlement as well :thinking:
        missions.push(this.infrastructureMission(room))

        if (room.memory.village || room.memory.outpost || room.memory.settlement || room.memory.claim) {
          missions.push(new DEFCONMission(room, this.thor))
        }
      }
    }

    //    Generate outpost missions
    for (const roomName in Memory.rooms) {
      if (Memory.rooms.hasOwnProperty(roomName)) {
        const roomMemory = Memory.rooms[roomName]
        const room = Game.rooms[roomName]

        // TODO: what about rooms  connecting rooms, how do we build and maintain roads there?
        if (roomMemory.outpost || roomMemory.settlement) {
          missions.push(new EnergyMission(room || roomName))
          missions.push(this.infrastructureMission(room || roomName))
          if (roomMemory.settlement) {
            missions.push(new UpgradeControllerMission(room || roomName))
            if (
              room &&
              room.energyCapacityAvailable >= EXTENSION_ENERGY_CAPACITY[1] * 5 + 300 &&
              Object.values(Game.spawns).some(s => s.pos.roomName === roomName)
            ) {
              roomMemory.settlement = false
              roomMemory.village = true
            }
          }
        }

        if (roomMemory.reserve) {
          missions.push(new ReserveMission(room || roomName))
        }

        // TODO: The logic that determines to set the claim property needs to take GCL into account.
        //    Convert outpost to village? (construct spawn) - this is a somewhat strategic decision in regards to reinforcement and how far we can extend ourselves
        // What is the tier between an outpost where we do not claim the controller, and one where we do? do we call that a settlement?
        // When do we reserve the controller, do we always do that for an outpost? what decides that? it restocks energy there so we could time it in such a way that energy is refilled when it expires.
        if (roomMemory.claim) {
          missions.push(new ClaimMission(Game.rooms[roomName] || roomName))
        }
      }
    }

    //    Allocate creeps to missions or request creep suitible for mission
    this.assignMissionCreeps(missions)

    this.infrastructure.visualize()

    return missions
  }

  private infrastructureMission(roomOrName: Room | string): InfraStructureMission {
    // // const roomName = typeof roomOrName === "string" ? roomOrName : roomOrName.name
    const room = roomOrName instanceof Room ? roomOrName : null

    const infrastructureMission = new InfraStructureMission({
      room: roomOrName,
      infrastructure: this.infrastructure
    })

    // Add manual cSites
    if (room && this.roomPlanner.lastRun !== Game.time) {
      if (room.memory.runPlanner) {
        this.roomPlanner.plan(room.name, 8 /* Room.controller.level + 1*/)
        room.memory.runPlanner = false
      }

      const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES)
      constructionSites.forEach(site => {
        // Plan was just run, the cSite does not exist in this tick
        const plan = this.infrastructure.findInfrastructure(site)
        // TODO: there seem to be an issue finding existing cSites in the plan
        if (!plan || Object.keys(plan).length <= 0) {
          log.info(`"adding ${site.id} to layer 0:`)
          // // console.log(JSON.stringify(plan))
          this.infrastructure.addConstructionSite(0, site)
        }
      })
    }

    return infrastructureMission
  }

  private assignMissionCreeps(missions: Mission<IMissionMemory>[]): void {
    for (const mission of missions) {
      const missionRequirements = mission.getRequirements()
      // // console.log(JSON.stringify(missionRequirements))
      // Loop creeps, verify requirements,
      if (missionRequirements.length > 0) {
        for (const creepName in Game.creeps) {
          if (Game.creeps.hasOwnProperty(creepName)) {
            const creep = Game.creeps[creepName]

            // TODO: what if a creep is already allocated to a mission?
            // TODO: does it make sense to allocate a creep that is very far away from the mission goal?
            if (creep.spawning || !creep.isIdle || creep.memory.mission || mission.hasCreep(creep)) {
              continue
            }

            const rune = this.isWorthy(creep, missionRequirements)
            if (!rune) {
              continue
            }

            mission.addCreep(creep, rune)
          }
        }

        for (const requirement of missionRequirements) {
          if (requirement.count <= 0) {
            continue
          }

          // Should a prayer expire?, should it return a ticket, so you can cancel a prayer?
          const names = this.freya.pray(requirement)
          for (const rune in names) {
            if (names.hasOwnProperty(rune)) {
              const runeNames = names[rune]

              runeNames.forEach(name => {
                mission.addCreepByName(name, rune)
              })
            }
          }
        }
      }
    }
  }

  /**
   * The "counsil" should be controllable by flags, green = on, red = off
   * E.g. mark something as an outpost, convert it to village
   */
  private parseFlags(): void {
    for (const flagName in Game.flags) {
      if (Game.flags.hasOwnProperty(flagName)) {
        const flag = Game.flags[flagName]
        // TODO: extract to flag parser?
        if (flag.name.startsWith("remote") || flag.name.startsWith("outpost")) {
          let roomMemory = Memory.rooms[flag.pos.roomName]
          if (!roomMemory) {
            Memory.rooms[flag.pos.roomName] = roomMemory = {} as any
          }

          if (!roomMemory.outpost && flag.color === COLOR_WHITE) {
            flag.setColor(COLOR_GREEN)
          }

          roomMemory.outpost = flag.color === COLOR_GREEN
        }

        if (flag.name.startsWith("reserve")) {
          let roomMemory = Memory.rooms[flag.pos.roomName]
          if (!roomMemory) {
            Memory.rooms[flag.pos.roomName] = roomMemory = {} as any
          }

          if (!roomMemory.reserve && flag.color === COLOR_WHITE) {
            flag.setColor(COLOR_GREEN)
          }

          roomMemory.reserve = flag.color === COLOR_GREEN
        }

        if (flag.name.startsWith("claim")) {
          let roomMemory = Memory.rooms[flag.pos.roomName]
          if (!roomMemory) {
            Memory.rooms[flag.pos.roomName] = roomMemory = {} as any
          }

          if (!roomMemory.claim && flag.color === COLOR_WHITE) {
            flag.setColor(COLOR_GREEN)
          }

          roomMemory.claim = flag.color === COLOR_GREEN
        }
      }
    }
  }

  private bootstrap(): void {
    // Bootstrap process - runs every X ticks to validate health of a "village" / core room
    //    Settle first village (e.g. 1 room, safemode rcl = 1 or safemode and no spawn (auto)) - run planner
    if (this.checkSettle) {
      const hasOneOrLessSpawns = Object.keys(Game.spawns).length <= 1
      const roomWithInitialController = Object.values(Game.rooms).find(
        r =>
          !!r.controller &&
          r.controller.my &&
          r.controller.level === 1 &&
          ((!!r.controller.safeMode && r.controller.safeMode > 0) || r.name === "sim")
      )

      if (hasOneOrLessSpawns && roomWithInitialController) {
        // Settle village
        // Gather intell
        this.scanner.scan(roomWithInitialController)
        // TODO:  spread planning out over ticks?, should this be a planning request instead?
        roomWithInitialController.memory.village = true // TODO: for supporting private server "auto" spawn in the plan
        this.roomPlanner.plan(roomWithInitialController.name, 8)
      }

      this.checkSettle = false
    }
  }

  private isWorthy(creep: Creep, missionRequirements: RuneRequirement[]): string | undefined {
    const creepRunePowers = calculateRunePowers(creep.body.map(body => body.type))

    for (const requirement of missionRequirements) {
      if (requirement.count <= 0) {
        continue
      }

      // If (creep.hasRunePowers(requirement.runePowers)) {
      if (compareRunePowers(creepRunePowers, requirement.runePowers)) {
        requirement.count--

        return requirement.rune
      }
    }

    return
  }
}
