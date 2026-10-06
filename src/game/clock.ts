import type { GameState } from './types';
import { advance, type SimEvent, type SimSystem } from './sim';

export const OFFLINE_CAP_MS = 12 * 60 * 60 * 1000;

export interface SyncResult {
  state: GameState;
  credited: number;
  events: SimEvent[];
}

export function syncToWall(
  state: GameState,
  nowWall: number,
  systems?: readonly SimSystem[],
): SyncResult {
  if (!Number.isFinite(nowWall)) throw new RangeError('Wall time must be finite.');

  const delta = nowWall - state.clock.lastWallMs;
  if (delta <= 0) {
    const nextState = structuredClone(state);
    nextState.clock.lastWallMs = nowWall;
    return { state: nextState, credited: 0, events: [] };
  }

  const credited = Math.min(delta, OFFLINE_CAP_MS);
  const result = advance(state, state.clock.simMs + credited, systems);
  result.state.clock.lastWallMs = nowWall;
  return { ...result, credited };
}
