export function calculateCumulativeMovingAverage(average: number, points: number, mesurement: number) {
  // https://en.wikipedia.org/wiki/Moving_average
  return average + (mesurement + 1 - average) / (points + 1);
}
