import { appendLog } from './log';
import type { SimEvent } from '../sim';
import type { GameState } from '../types';

export function knockOut(
  state: GameState,
  heroId: string,
  channel: string,
  events: SimEvent[],
  simMs: number = state.clock.simMs,
): void {
  const hero = state.heroes[heroId];
  if (!hero) return;

  hero.activityId = null;
  const line = appendLog(
    state,
    channel,
    'combat',
    `${hero.name} has been knocked out!`,
    true,
    simMs,
  );
  events.push({ type: 'log', line });
}
