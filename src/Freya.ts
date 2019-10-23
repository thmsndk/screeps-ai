// function bodyCost(body: BodyPartConstant[]) {
//   return body.reduce((cost, part) => {
//     return cost + BODYPART_COST[part]
//   }, 0)
// }

// export enum CreepMutations {
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

export type RunePowers = { [key in BodyPartConstant]: number }

// TODO: calculate runes
// calculate runepower
export function calculateRunePowers(body: BodyPartConstant[]): RunePowers {
  return body.reduce(
    (runepowers, part) => {
      if (!runepowers.hasOwnProperty(part)) {
        runepowers[part] = 0
      }
      runepowers[part]++
      return runepowers
    },
    {} as RunePowers
  )
}

export function compareRunePowers(creepPowers: RunePowers, wishes: RunePowers, minRequirements?: RunePowers): boolean {
  for (const part in wishes) {
    if (creepPowers.hasOwnProperty(part)) {
      const wishPartPower = wishes[part as BodyPartConstant]
      const creepPartPower = creepPowers[part as BodyPartConstant]

      if (!creepPartPower || creepPartPower < wishPartPower) {
        return false
      }
    }
  }

  return true
}

export class Freya {}
