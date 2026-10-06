import { describe, expect, it } from 'vitest';
import { itemsById } from './items';
import { monsters } from './monsters';

describe('monster data', () => {
  it('uses unique stable ids and valid level and loot references', () => {
    const ids = monsters.map((monster) => monster.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(monsters).toHaveLength(8);
    for (const monster of monsters) {
      expect(monster.level).toBeGreaterThanOrEqual(1);
      expect(monster.level).toBeLessThanOrEqual(7);
      for (const entry of monster.lootTable.entries) {
        expect(itemsById[entry.itemId]).toBeDefined();
        expect(entry.chance).toBeGreaterThanOrEqual(0);
        expect(entry.chance).toBeLessThanOrEqual(1);
        if (itemsById[entry.itemId]?.rarity === 'named') expect(monster.named).toBe(true);
      }
    }
  });
});
