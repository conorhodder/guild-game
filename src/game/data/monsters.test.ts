import { describe, expect, it } from 'vitest';
import { items, itemsById } from './items';
import { monsters } from './monsters';

describe('monster data', () => {
  it('uses unique stable ids and valid level and loot references', () => {
    const ids = monsters.map((monster) => monster.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(monsters.length).toBeGreaterThanOrEqual(20);
    for (const monster of monsters) {
      expect(monster.level).toBeGreaterThanOrEqual(1);
      expect(monster.level).toBeLessThanOrEqual(20);
      for (const entry of monster.lootTable.entries) {
        expect(itemsById[entry.itemId]).toBeDefined();
        expect(entry.chance).toBeGreaterThan(0);
        expect(entry.chance).toBeLessThanOrEqual(1);
        if (itemsById[entry.itemId]?.rarity === 'named') expect(monster.named).toBe(true);
      }
    }
  });

  it('places every named item only in named-monster loot tables', () => {
    const namedItems = items.filter((item) => item.rarity === 'named');
    expect(namedItems.length).toBeGreaterThanOrEqual(3);

    for (const item of namedItems) {
      const appearances = monsters.flatMap((monster) =>
        monster.lootTable.entries
          .filter((entry) => entry.itemId === item.id)
          .map(() => monster),
      );
      expect(appearances.length).toBeGreaterThan(0);
      expect(appearances.every((monster) => monster.named === true)).toBe(true);
    }

    expect(monsters.some((monster) => monster.named && monster.level >= 3 && monster.level <= 7)).toBe(
      true,
    );
    expect(monsters.some((monster) => monster.named && monster.level >= 8 && monster.level <= 14)).toBe(
      true,
    );
    expect(items.filter((item) => item.rarity === 'rare').length).toBeGreaterThanOrEqual(3);
  });
});
