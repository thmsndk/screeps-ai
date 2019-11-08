import { calculateRunePowers, compareRunePowers, Freya, RuneRequirement } from "Freya"
import { EnergyMission } from "missions/EnergyMission"
import { RoomPlanner } from "RoomPlanner"
import { RoomScanner } from "RoomScanner"
import { IntelMission } from "missions/IntellMission"
import { Mission } from "missions/Mission"

export class Elders {
  private checkSettle = true

  private roomPlanner: RoomPlanner

  private scanner: RoomScanner

  private freya: Freya

  public constructor(planner: RoomPlanner, scanner: RoomScanner, freya: Freya) {
    this.roomPlanner = planner
    this.scanner = scanner // Should this be intel?
    this.freya = freya
  }

  public run(): Mission[] {
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
        }
      }
    }

    //    Generate outpost missions
    //    Convert outpost to village? (construct spawn) - this is a somewhat strategic decision in regards to reinforcement and how far we can extend ourselves

    //    Allocate creeps to missions or request creep suitible for mission
    for (const mission of missions) {
      // Search for creep with correct runes / power levels
      // Request a creep from freya with specific runes / power levels
      // Should freya be in global scope? should freya contain logic to find creeps?
      // The energy mission should be responsible for determining the stage it is at, and what power levels it requires?
      const missionRequirements = mission.getRequirements()
      // // console.log(JSON.stringify(missionRequirements))
      // Loop creeps, verify requirements,
      if (missionRequirements.length > 0) {
        for (const creepName in Game.creeps) {
          if (Game.creeps.hasOwnProperty(creepName)) {
            const creep = Game.creeps[creepName]

            // TODO: what if a creep is already allocated to a mission?
            // TODO: does it make sense to allocate a creep that is very far away from the mission goal?
            if (creep.spawning || !creep.isIdle || mission.hasCreep(creep)) {
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

    return missions
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
