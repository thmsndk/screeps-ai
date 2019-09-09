interface RoomVisual {
  structure(
    x: number,
    y: number,
    type: BuildableStructureConstant,
    opts?: {
      opacity: number
    }
  ): void

  connectRoads(opts?: { color: string }): void

  speech(
    text: string,
    x: number,
    y: number,
    opts?: {
      background: string
      textcolor: string
      textstyle: string
      textsize: string
      textfont: string
      opacity: string
    }
  ): void

  animatedPosition(
    x: number,
    y: number,
    opts?: {
      color: string
      opacity: string
      radius: string
      frames: string
    }
  ): void

  test(): void

  // resource
  // _fluid
  // _mineral
  // _compund
}
