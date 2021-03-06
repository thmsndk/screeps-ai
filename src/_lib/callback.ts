﻿// Callback is a class (use with new) that stores functions to call
// back later, and they're called with a specified object.

export type CallbackFunction = (params: IStats) => void

export class Callback {
  private handlers: CallbackFunction[] = [] // observers

  public subscribe(fn: CallbackFunction) {
    this.handlers.push(fn)
  }

  public unsubscribe(fn: CallbackFunction) {
    this.handlers = this.handlers.filter((item: CallbackFunction) => {
      if (item !== fn) {
        return item
      }

      return undefined
    })
  }

  public fire(params: any) {
    // TODO: Put error handling around the call?
    this.handlers.forEach((item: any) => {
      try {
        item.call(item, params)
      } catch (err) {
        console.log("Ignored error calling back ", item.name, "with", params, "-", err)
      }
    })
  }
}
