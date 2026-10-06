import { describe, expect, it } from 'vitest';
import { questsById } from '../data/quests';
import { monstersById } from '../data/monsters';
import { dispatchQuest, foundGuild } from '../actions';
import { createNewGame } from '../newGame';
import { advance } from '../sim';

function dispatchFirstQuest(seed = 42) {
  const founded = foundGuild('The Wayfarers')(
    createNewGame({ seed, wallMs: 0, guildName: '' }),
  );
  const result = dispatchQuest('rats-in-the-cellar', founded.heroOrder)(founded, 0);
  if (!('state' in result) || result.reason) throw new Error('Expected the quest to dispatch.');
  return result.state;
}

describe('quest system', () => {
  it('completes a seeded quest deterministically with encounters and rewards', () => {
    const initial = dispatchFirstQuest();
    const first = advance(initial, 120_000);
    const second = advance(dispatchFirstQuest(), 120_000);
    const quest = questsById['rats-in-the-cellar'];

    expect(first).toEqual(second);
    expect(first.state.activities).toEqual({});
    expect(first.state.seenMonsters).toEqual(['marsh-rat', 'cellar-spider']);
    expect(first.state.gold).toBeGreaterThanOrEqual(initial.gold + (quest?.rewardGold ?? 0));
    expect(first.state.heroOrder.every((id) => first.state.heroes[id]?.activityId === null)).toBe(
      true,
    );
    expect(first.state.log.some((line) => line.text === 'Quest complete: Rats in the Cellar.')).toBe(
      true,
    );
    expect(first.state.log.at(-1)).toMatchObject({
      simMs: 120_000,
      channel: expect.stringContaining('quest:'),
      highlight: true,
    });
    expect(initial.ledger).toMatchObject({
      firstDispatchAt: 0,
      firstDispatchWall: 0,
    });
    expect(first.state.ledger).toMatchObject({
      firstQuestCompleteAt: 120_000,
      questsCompleted: 1,
      totalSimMsPlayed: 120_000,
    });
  });

  it('is invariant to chunking a running quest over 3,600 seconds', () => {
    const initial = dispatchFirstQuest();
    let chunked = initial;
    for (let seconds = 1; seconds <= 3600; seconds += 1) {
      chunked = advance(chunked, seconds * 1000).state;
    }
    const single = advance(initial, 3_600_000).state;

    expect(chunked).toEqual(single);
    expect(chunked.ledger).toEqual(single.ledger);
  });

  it('fails and removes a quest when every party member is knocked out', () => {
    const monster = monstersById['marsh-rat'];
    if (!monster) throw new Error('Expected the marsh rat encounter.');
    const original = { hp: monster.hp, damage: monster.damage, armor: monster.armor };
    Object.assign(monster, { hp: 1_000_000, damage: 1_000, armor: 1_000_000 });

    try {
      const initial = dispatchFirstQuest();
      const finished = advance(initial, 120_000).state;

      expect(finished.activities).toEqual({});
      expect(finished.heroOrder.every((id) => finished.heroes[id]?.activityId === null)).toBe(true);
      expect(
        finished.log.some((line) => line.text === 'Quest failed: Rats in the Cellar. The party was defeated.'),
      ).toBe(true);
      expect(finished.log.some((line) => line.text.startsWith('Quest complete:'))).toBe(false);
    } finally {
      Object.assign(monster, original);
    }
  });
});
