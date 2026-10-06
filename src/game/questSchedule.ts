import { TICK_MS } from './tick';

export function encounterTime(
  startedAt: number,
  durationMs: number,
  index: number,
  count: number,
): number {
  const scheduled = startedAt + Math.round((durationMs * (index + 1)) / (count + 1));
  return Math.ceil(scheduled / TICK_MS) * TICK_MS;
}
