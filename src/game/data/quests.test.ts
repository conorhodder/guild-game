import { describe, expect, it } from 'vitest';
import { itemsById } from './items';
import { monstersById } from './monsters';
import { quests } from './quests';

describe('quest data', () => {
  it('has ten unique quests spanning levels 1–20 with valid encounter and loot references', () => {
    const ids = quests.map((quest) => quest.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(quests).toHaveLength(10);
    expect(quests.filter((quest) => quest.firstQuest)).toHaveLength(1);
    for (const quest of quests) {
      expect(quest.level).toBeGreaterThanOrEqual(1);
      expect(quest.level).toBeLessThanOrEqual(20);
      expect(quest.encounters.length).toBeGreaterThan(0);
      for (const monsterId of quest.encounters) expect(monstersById[monsterId]).toBeDefined();
      for (const entry of quest.lootTable.entries) expect(itemsById[entry.itemId]).toBeDefined();
    }

    expect(quests[0]).toMatchObject({
      id: 'rats-in-the-cellar',
      name: 'Rats in the Cellar',
      level: 1,
      durationMin: 2,
      firstQuest: true,
    });
    expect(quests[0]?.encounters.every((monsterId) => monstersById[monsterId]?.level === 1)).toBe(
      true,
    );
  });

  it('includes monsters near every recommended quest level', () => {
    for (const quest of quests) {
      expect(
        quest.encounters.some(
          (monsterId) => Math.abs((monstersById[monsterId]?.level ?? 0) - quest.level) <= 2,
        ),
      ).toBe(true);
    }
  });
});
