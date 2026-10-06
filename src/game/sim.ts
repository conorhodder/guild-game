import type { GameState, LogLine } from './types';
import { fatigueSystem } from './systems/fatigue';
import { questSystem } from './systems/quests';
import { recoverySystem } from './systems/recovery';
import { TICK_MS } from './tick';

export { TICK_MS };

export type SimEvent = { type: 'log'; line: LogLine };
export type SimSystem = (state: GameState, tickMs: number, events: SimEvent[]) => void;

// Keep this order stable as systems are added:
// quests, camps, gathering, rest/fatigue, recovery, recruitment.
export const defaultSystems: SimSystem[] = [questSystem, fatigueSystem, recoverySystem];

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
