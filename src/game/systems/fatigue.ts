import type { SimSystem } from '../sim';

const FATIGUE_PER_MINUTE = {
  quest: 1,
  camp: 1,
  gather: 0.5,
  rest: -3,
  idle: -1,
} as const;

export const fatigueSystem: SimSystem = (state, tickMs) => {
  for (const hero of Object.values(state.heroes)) {
    const injured = hero.injuredUntil !== null && hero.injuredUntil > tickMs;
    const activity = hero.activityId ? state.activities[hero.activityId] : undefined;
    const rate = injured
      ? FATIGUE_PER_MINUTE.idle
      : activity?.kind
        ? FATIGUE_PER_MINUTE[activity.kind]
        : FATIGUE_PER_MINUTE.idle;
    hero.fatigue = Math.min(100, Math.max(0, hero.fatigue + rate / 60));
  }
};
