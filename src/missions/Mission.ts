import { RuneRequirement } from "Freya"

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

  public abstract run(): void
}
