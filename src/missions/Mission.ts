export interface IMissionMemory {}

export class Mission {
  public memory?: IMissionMemory
  constructor(memory?: IMissionMemory) {
    this.memory = memory
  }
}
