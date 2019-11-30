interface String {
  padRight(length: number, char?: string): string

  padLeft(length: number, char?: string): string
}

interface Number {
  toPercent(decimals?: number): string

  truncate(decimals: number): number
}
