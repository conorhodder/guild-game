import { gatherChannel } from '../activityChannels';
import { gatheringMaterials } from '../data/items';
import { rngNext } from '../rng';
import type { Activity, GatherSkill, GameState, ItemData } from '../types';
import type { SimEvent, SimSystem } from '../sim';
import { gatherCap } from './heroes';
import { appendLog } from './log';
import { trySkillUp } from './skills';
import { TICK_MS } from '../tick';

type GatherActivity = Extract<Activity, { kind: 'gather' }>;

function eligibleMaterials(skill: GatherSkill, skillValue: number): ItemData[] {
  return gatheringMaterials[skill].filter((item) => item.levelReq <= skillValue);
}

export function bestGatheringMaterial(
  skill: GatherSkill,
  skillValue: number,
): ItemData | undefined {
  return eligibleMaterials(skill, skillValue).at(-1);
}

export function gatheringIntervalMs(
  skill: GatherSkill,
  skillValue: number,
): number | null {
  const best = bestGatheringMaterial(skill, skillValue);
  return best ? Math.max(20, 60 - best.value / 2) * 1000 : null;
}

export function rollGatheringMaterial(
  state: Pick<GameState, 'rng'>,
  skill: GatherSkill,
  skillValue: number,
): ItemData | undefined {
  const eligible = eligibleMaterials(skill, skillValue);
  const best = eligible.at(-1);
  if (!best) return undefined;
  const lower = eligible.at(-2);
  return lower && rngNext(state) < 0.1 ? lower : best;
}

export function stopGathering(
  state: GameState,
  activity: GatherActivity,
  events: SimEvent[],
  simMs: number,
  message?: string,
): void {
  const hero = state.heroes[activity.heroId];
  if (hero?.activityId === activity.id) hero.activityId = null;
  if (hero) {
    const line = appendLog(
      state,
      gatherChannel(hero.id),
      'system',
      message ?? `${hero.name} is too exhausted to continue gathering.`,
      undefined,
      simMs,
    );
    events.push({ type: 'log', line });
  }
  delete state.activities[activity.id];
}

function nextTickAt(simMs: number): number {
  return Math.ceil(simMs / TICK_MS) * TICK_MS;
}

export const gatheringSystem: SimSystem = (state, tickMs, events) => {
  for (const activity of Object.values(state.activities)) {
    if (activity.kind !== 'gather') continue;
    const hero = state.heroes[activity.heroId];
    if (!hero || hero.activityId !== activity.id) {
      delete state.activities[activity.id];
      continue;
    }
    if (hero.fatigue >= 100) {
      stopGathering(state, activity, events, tickMs);
      continue;
    }
    if (tickMs < activity.nextYieldAt) continue;

    const intervalMs = gatheringIntervalMs(activity.skill, hero.gather[activity.skill]);
    const material = rollGatheringMaterial(
      state,
      activity.skill,
      hero.gather[activity.skill],
    );
    if (intervalMs === null || !material) {
      stopGathering(
        state,
        activity,
        events,
        tickMs,
        `${hero.name} has no available materials to gather.`,
      );
      continue;
    }

    state.materials[material.id] = (state.materials[material.id] ?? 0) + 1;
    activity.yields += 1;
    const channel = gatherChannel(hero.id);
    const line = appendLog(state, channel, 'loot', `You receive ${material.name}.`, undefined, tickMs);
    events.push({ type: 'log', line });
    trySkillUp(
      state,
      hero,
      activity.skill,
      gatherCap(hero.level),
      channel,
      events,
      tickMs,
    );

    const nextIntervalMs = gatheringIntervalMs(
      activity.skill,
      hero.gather[activity.skill],
    );
    activity.nextYieldAt =
      nextIntervalMs === null
        ? nextTickAt(tickMs + TICK_MS)
        : nextTickAt(tickMs + nextIntervalMs);
  }
};
