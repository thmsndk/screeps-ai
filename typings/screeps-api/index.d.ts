declare module "screeps-api" {
  interface MeResponse {
    ok: any
    _id: any
    email: string
    username: string
    cpu: number
    badge: { type: number; color1: string; color2: string; color3: string; param: number; flip: boolean }
    password: string
    notifyPrefs: { sendOnline: any; errorsInterval: any; disabledOnMessages: any; disabled: any; interval: any }
    gcl: number
    credits: number
    lastChargeTime: any
    lastTweetTime: any
    github: { id: any; username: any }
    twitter: { username: string; followers_count: number }
  }

  interface Game {
    // // placeSpawn(placement: [string, number, number][], name: string): void
    // // PlaceSpawn(placement: (string | number)[], name: string): void
    placeSpawn(roomName: string, x: number, y: number, name: string, shard?: string): void
  }

  interface Branch {
    branch: string
    activeWorld: boolean
  }

  interface User {
    badge(...args: any): any
    cloneBranch(...args: any): any
    branches(...args: any): { list: Branch[] }
    setActiveBranch(...args: any): any
    worldStatus(...args: any): any
  }

  interface Auth {
    me(): MeResponse
  }

  interface Raw {
    auth: Auth
    user: User
    game: Game
  }
  interface Api {
    raw: Raw
    me(): MeResponse
  }

  namespace ScreepsAPI {
    export function fromConfig(server: string, config?: string, opts?: any): Promise<Api>
  }
}
