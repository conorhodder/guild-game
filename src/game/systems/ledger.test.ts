import { describe, expect, it } from 'vitest';
import { createNewGame } from '../newGame';
import { advance, type SimSystem } from '../sim';

const eventSystem: SimSystem = (_state, tickMs, events) => {
  if (tickMs !== 1000) return;
  events.push(
    { type: 'kill', monsterId: 'grizzlefang', named: true },
    { type: 'kill', monsterId: 'marsh-rat', named: false },
    { type: 'knockout', heroId: 'h1' },
    { type: 'quest', questId: 'rats-in-the-cellar', outcome: 'complete', simMs: tickMs },
    { type: 'quest', questId: 'rats-in-the-cellar', outcome: 'failed', simMs: tickMs },
    { type: 'gold', amount: 45 },
    { type: 'loot', itemId: 'rusted-shortsword', rarity: 'common' },
    { type: 'loot', itemId: 'marshglass-pendant', rarity: 'uncommon' },
    { type: 'loot', itemId: 'wolfheart-charm', rarity: 'rare' },
    { type: 'loot', itemId: 'grizzlefang-tooth', rarity: 'named' },
    { type: 'skillUp', heroId: 'h1', skill: 'mining', value: 2 },
    { type: 'levelUp', heroId: 'h1', level: 4 },
  );
};

describe('Guild Ledger event folding', () => {
  it('folds lifetime counters consistently across simulation chunk sizes', () => {
    const initial = createNewGame({ seed: 3, wallMs: 100, guildName: 'Test guild' });
    const single = advance(initial, 60_000, [eventSystem]).state;
    let chunked = initial;
    for (let second = 1; second <= 60; second += 1) {
      chunked = advance(chunked, second * 1000, [eventSystem]).state;
    }

    expect(chunked).toEqual(single);
    expect(single.ledger).toMatchObject({
      kills: 2,
      namedKills: 1,
      namedMonstersSlainById: { grizzlefang: 1 },
      questsCompleted: 1,
      questsFailed: 1,
      firstQuestCompleteAt: 1000,
      goldEarned: 45,
      itemsByRarity: { common: 1, uncommon: 1, rare: 1, named: 1 },
      namedDrops: 1,
      knockouts: 1,
      skillUps: 1,
      levelsGained: 1,
      highestLevel: 4,
      totalSimMsPlayed: 60_000,
    });
  });
});
