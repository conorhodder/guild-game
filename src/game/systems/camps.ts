import { campChannel } from '../activityChannels';
import { campsById, zonesById } from '../data/zones';
import { monstersById } from '../data/monsters';
import { rngNext, rngPick } from '../rng';
import type { Activity, GameState } from '../types';
import type { SimEvent, SimSystem } from '../sim';
import { resolveFight } from './combat';
import { appendLog } from './log';

type CampActivity = Extract<Activity, { kind: 'camp' }>;

export function rollNamedSpawn(
  state: Pick<GameState, 'rng'>,
  camp: { namedId?: string; namedChance: number },
): boolean {
  return camp.namedId !== undefined && rngNext(state) < camp.namedChance;
}

function activeMembers(state: GameState, activity: CampActivity): string[] {
  return activity.heroIds.filter(
    (heroId) => state.heroes[heroId]?.activityId === activity.id,
  );
}

function endCamp(
  state: GameState,
  activity: CampActivity,
  events: SimEvent[],
  simMs: number,
  message: string,
  highlight = true,
): void {
  const channel = campChannel(activity.id, activity.campId);
  for (const heroId of activity.heroIds) {
    const hero = state.heroes[heroId];
    if (hero?.activityId === activity.id) hero.activityId = null;
  }
  const line = appendLog(state, channel, 'system', message, highlight, simMs);
  events.push({ type: 'log', line });
  delete state.activities[activity.id];
}

function retreatReason(state: GameState, activity: CampActivity): 'wipe' | 'retreat' | null {
  const members = activeMembers(state, activity);
  if (members.length === 0) return 'wipe';
  if (
    members.length < activity.heroIds.length / 2 ||
    members.some((heroId) => state.heroes[heroId]?.fatigue === 100)
  ) {
    return 'retreat';
  }
  return null;
}

export const campSystem: SimSystem = (state, tickMs, events) => {
  for (const activity of Object.values(state.activities)) {
    if (activity.kind !== 'camp') continue;
    const zone = zonesById[activity.zoneId];
    const camp = campsById[activity.campId];
    if (!zone || !camp || !zone.camps.some((candidate) => candidate.id === camp.id)) {
      endCamp(state, activity, events, tickMs, 'Your party has left the camp.');
      continue;
    }
    const channel = campChannel(activity.id, camp.id);

    if (activity.recallAt !== null && tickMs >= activity.recallAt) {
      endCamp(state, activity, events, tickMs, `Your party has left ${camp.name}.`, false);
      continue;
    }

    const initialReason = retreatReason(state, activity);
    if (initialReason) {
      endCamp(
        state,
        activity,
        events,
        tickMs,
        initialReason === 'wipe'
          ? `Your party has been defeated at ${camp.name}.`
          : `Your party has retreated from ${camp.name}.`,
      );
      continue;
    }
    if (tickMs < activity.spawnReadyAt) continue;

    const monsterId = activity.nextSpawnNamed && camp.namedId
      ? camp.namedId
      : rngPick(state, camp.monsters);
    const monster = monstersById[monsterId];
    if (!monster) {
      endCamp(state, activity, events, tickMs, `Your party has left ${camp.name}.`);
      continue;
    }

    const namedSpawn = monster.named === true;
    const members = activeMembers(state, activity);
    const result = resolveFight(
      state,
      { heroIds: members, monsterId, channel, startMs: tickMs },
      events,
    );

    if (result.outcome === 'won') {
      activity.kills += 1;
      if (namedSpawn) activity.namedKills += 1;
    }
    if (result.outcome === 'lost') {
      endCamp(state, activity, events, result.endMs, `Your party has been defeated at ${camp.name}.`);
      continue;
    }

    const reason = retreatReason(state, activity);
    if (reason) {
      endCamp(
        state,
        activity,
        events,
        result.endMs,
        reason === 'wipe'
          ? `Your party has been defeated at ${camp.name}.`
          : `Your party has retreated from ${camp.name}.`,
      );
      continue;
    }

    activity.spawnReadyAt = result.endMs + camp.respawnSec * 1000;
    activity.nextSpawnNamed = rollNamedSpawn(state, camp);
  }
};
