import type { GameState } from './types';

export function rngNext(state: Pick<GameState, 'rng'>): number {
  state.rng = (state.rng + 0x6d2b79f5) >>> 0;
  let value = state.rng;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
}

export function rngInt(state: Pick<GameState, 'rng'>, low: number, high: number): number {
  if (!Number.isInteger(low) || !Number.isInteger(high) || low > high) {
    throw new RangeError('Random integer bounds must be ordered integers.');
  }
  return low + Math.floor(rngNext(state) * (high - low + 1));
}

export function rngPick<T>(state: Pick<GameState, 'rng'>, values: readonly T[]): T {
  if (values.length === 0) throw new RangeError('Cannot choose from an empty array.');
  return values[rngInt(state, 0, values.length - 1)] as T;
}
