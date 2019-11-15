// https://github.com/RonPenton/ts-priority-queue/tree/master/src

import BinaryHeapStrategy from "./BinaryHeapStrategy"

export type Comparator<T> = (a: T, b: T) => number

export interface Options<T> {
  comparator: Comparator<T>
  initialValues?: T[]
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface QueueStrategy<T extends any> {
  queue(value: T): void
  dequeue(): T
  peek(): T
  peek(amount: number): T[]
  clear(): void
}

export default class PriorityQueue<T> {
  private _length = 0

  public get length(): number {
    return this._length
  }

  private strategy: QueueStrategy<T>

  public constructor(options: Options<T>) {
    this._length = options.initialValues ? options.initialValues.length : 0
    this.strategy = new BinaryHeapStrategy(options)
  }

  public queue(value: T): void {
    this._length++
    this.strategy.queue(value)
  }

  public dequeue(): T {
    if (!this._length) {
      throw new Error("Empty queue")
    }
    this._length--

    return this.strategy.dequeue()
  }

  public peek(): T

  public peek(count: number): T[]

  public peek(count?: number): T | T[] {
    if (!count) {
      if (!this._length) {
        throw new Error("Empty queue")
      }

      return this.strategy.peek()
    }

    return this.strategy.peek(count)
  }

  public clear(): void {
    this._length = 0
    this.strategy.clear()
  }
}
