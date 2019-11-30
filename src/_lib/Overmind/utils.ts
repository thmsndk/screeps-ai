// https://github.com/bencbartlett/Overmind/blob/master/src/utilities/utils.ts

export function printRoomName(roomName: string): string {
	return '<a href="#!/room/' + Game.shard.name + '/' + roomName + '">' + roomName + '</a>';
}

export function color(str: string, color: string): string {
	return `<font color='${color}'>${str}</font>`;
}

/**
 * Return whether the IVM is enabled
 */
export function isIVM(): boolean {
	return typeof Game.cpu.getHeapStatistics === 'function';
}

/**
 * Compute an exponential moving average
 */
export function exponentialMovingAverage(current: number, avg: number | undefined, window: number): number {
	return (current + (avg || 0) * (window - 1)) / window;
}

/**
 * Compute an exponential moving average for unevenly spaced samples
 */
export function irregularExponentialMovingAverage(current: number, avg: number, dt: number, window: number): number {
	return (current * dt + avg * (window - dt)) / window;
}
