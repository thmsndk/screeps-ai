import { Mission } from "./Mission"

// // interface IntelMissionMemory extends IMissionMemory {}

/**
 * What is an IntelMission?
 * Is it a mission for a village, responsible for finding outposts?
 * Does it use observers to get info?, how does it function with scanner.scan in elders?
 */
export class IntelMission extends Mission {
  public constructor() {
    super()
  }

  public getRequirements(): import("../Freya").RuneRequirement[] {
    throw new Error("Method not implemented.")
  }

  public run(): void {
    throw new Error("Method not implemented.")
  }
}
