import { questChannel } from '../activityChannels';
import { questsById } from '../data/quests';
import { encounterTime } from '../questSchedule';
import type { Activity, GameState } from '../types';
import type { SimEvent, SimSystem } from '../sim';
import { resolveFight } from './combat';
import { grantXp } from './heroes';
import { appendLog } from './log';
import { rollLoot } from './loot';

function releaseParty(state: GameState, activity: Extract<Activity, { kind: 'quest' }>): void {
  for (const heroId of activity.heroIds) {
    const hero = state.heroes[heroId];
    if (hero?.activityId === activity.id) hero.activityId = null;
  }
}

function failQuest(
  state: GameState,
  activity: Extract<Activity, { kind: 'quest' }>,
  questName: string,
  events: SimEvent[],
  simMs: number,
): void {
  releaseParty(state, activity);
  const line = appendLog(
    state,
    questChannel(activity.id, activity.questId),
    'system',
    `Quest failed: ${questName}. The party was defeated.`,
    true,
    simMs,
  );
  events.push({ type: 'log', line });
  delete state.activities[activity.id];
}

function completeQuest(
  state: GameState,
  activity: Extract<Activity, { kind: 'quest' }>,
  events: SimEvent[],
  simMs: number,
): void {
  const quest = questsById[activity.questId];
  if (!quest) return;
  const channel = questChannel(activity.id, quest.id);
  const members = activity.heroIds.filter(
    (heroId) => state.heroes[heroId]?.activityId === activity.id,
  );

  if (members.length > 0) {
    const xpEach = quest.rewardXp / members.length;
    for (const heroId of members) grantXp(state, heroId, xpEach, events, simMs);
  }
  state.gold += quest.rewardGold;
  rollLoot(state, quest.lootTable, channel, events, simMs);

  const line = appendLog(
    state,
    channel,
    'system',
    `Quest complete: ${quest.name}.`,
    true,
    simMs,
  );
  events.push({ type: 'log', line });
  releaseParty(state, activity);
  delete state.activities[activity.id];
}

export const questSystem: SimSystem = (state, tickMs, events) => {
  for (const activity of Object.values(state.activities)) {
    if (activity.kind !== 'quest') continue;
    const quest = questsById[activity.questId];
    if (!quest) {
      releaseParty(state, activity);
      delete state.activities[activity.id];
      continue;
    }

    const durationMs = quest.durationMin * 60_000;
    while (
      state.activities[activity.id] &&
      activity.encountersLeft > 0 &&
      tickMs >= activity.nextEncounterAt
    ) {
      const encounterIndex = quest.encounters.length - activity.encountersLeft;
      const monsterId = quest.encounters[encounterIndex];
      if (!monsterId) {
        failQuest(state, activity, quest.name, events, tickMs);
        break;
      }
      const partyIds = activity.heroIds.filter(
        (heroId) => state.heroes[heroId]?.activityId === activity.id,
      );
      if (partyIds.length === 0) {
        failQuest(state, activity, quest.name, events, tickMs);
        break;
      }

      const result = resolveFight(
        state,
        {
          heroIds: partyIds,
          monsterId,
          channel: questChannel(activity.id, quest.id),
          startMs: tickMs,
        },
        events,
      );
      if (result.outcome === 'lost') {
        failQuest(state, activity, quest.name, events, result.endMs);
        break;
      }

      activity.encountersLeft -= 1;
      activity.nextEncounterAt =
        activity.encountersLeft > 0
          ? encounterTime(
              activity.startedAt,
              durationMs,
              encounterIndex + 1,
              quest.encounters.length,
            )
          : activity.endsAt;
    }

    if (
      state.activities[activity.id] &&
      activity.encountersLeft === 0 &&
      tickMs >= activity.endsAt
    ) {
      completeQuest(state, activity, events, tickMs);
    }
  }
};
