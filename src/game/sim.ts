import type { GameState, LogLine } from './types';

export const TICK_MS = 1000;

export type SimEvent = { type: 'log'; line: LogLine };
export type SimSystem = (state: GameState, tickMs: number, events: SimEvent[]) => void;

export const defaultSystems: SimSystem[] = [];

export function advance(
  state: GameState,
  toSimMs: number,
  systems: readonly SimSystem[] = defaultSystems,
): { state: GameState; events: SimEvent[] } {
  if (!Number.isFinite(toSimMs)) throw new RangeError('Simulation time must be finite.');

  const nextState = structuredClone(state);
  const events: SimEvent[] = [];
  const endSimMs = Math.max(state.clock.simMs, toSimMs);

  for (
    let tickMs = (Math.floor(state.clock.simMs / TICK_MS) + 1) * TICK_MS;
    tickMs <= endSimMs;
    tickMs += TICK_MS
  ) {
    for (const system of systems) system(nextState, tickMs, events);
  }

  nextState.clock.simMs = endSimMs;
  return { state: nextState, events };
}
