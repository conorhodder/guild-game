import { appendLog } from './log';
import type { SimEvent, SimSystem } from '../sim';
import type { Activity, GameState } from '../types';

export function knockOut(
  state: GameState,
  heroId: string,
  channel: string,
  events: SimEvent[],
  simMs: number = state.clock.simMs,
): void {
  const hero = state.heroes[heroId];
  if (!hero) return;

  const lostXp = Math.floor(0.25 * hero.xp);
  hero.xp -= lostXp;
  hero.injuredUntil = simMs + (5 + hero.level) * 60_000;
  hero.activityId = null;
  const line = appendLog(
    state,
    channel,
    'combat',
    `${hero.name} has been knocked out! ${lostXp} XP lost.`,
    true,
    simMs,
  );
  events.push({ type: 'log', line });
  events.push({ type: 'knockout', heroId });
}

function releaseRest(
  state: GameState,
  activity: Extract<Activity, { kind: 'rest' }>,
  events: SimEvent[],
  simMs: number,
): void {
  const hero = state.heroes[activity.heroId];
  if (hero?.activityId === activity.id) hero.activityId = null;
  if (hero) {
    const line = appendLog(
      state,
      'guild',
      'system',
      `${hero.name} has finished resting and is ready for duty.`,
      undefined,
      simMs,
    );
    events.push({ type: 'log', line });
  }
  delete state.activities[activity.id];
}

export const recoverySystem: SimSystem = (state, tickMs, events) => {
  for (const activity of Object.values(state.activities)) {
    if (activity.kind !== 'rest') continue;
    const hero = state.heroes[activity.heroId];
    if (hero && hero.fatigue <= 0) {
      hero.fatigue = 0;
      releaseRest(state, activity, events, tickMs);
    }
  }

  for (const hero of Object.values(state.heroes)) {
    if (hero.injuredUntil === null || hero.injuredUntil > tickMs) continue;
    hero.injuredUntil = null;
    const line = appendLog(
      state,
      'guild',
      'system',
      `${hero.name} has recovered and is ready for duty.`,
      undefined,
      tickMs,
    );
    events.push({ type: 'log', line });
  }
};
