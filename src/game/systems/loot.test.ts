import { describe, expect, it } from 'vitest';
import { itemsById } from '../data/items';
import { monsters } from '../data/monsters';
import { createNewGame } from '../newGame';
import { rollLoot } from './loot';

describe('loot', () => {
  it('rolls gold, adds gear and materials, and highlights rare and named items', () => {
    const state = createNewGame({ seed: 42, wallMs: 0, guildName: '' });
    const events: Parameters<typeof rollLoot>[3] = [];

    rollLoot(
      state,
      {
        gold: [5, 5],
        entries: [
          { itemId: 'copper-ore', chance: 1 },
          { itemId: 'marshglass-pendant', chance: 1 },
          { itemId: 'morrow-heartstone', chance: 1 },
        ],
      },
      'quest:a1',
      events,
      3000,
    );

    expect(state.gold).toBe(55);
    expect(state.materials['copper-ore']).toBe(1);
    expect(Object.keys(state.stash)).toHaveLength(2);
    expect(Object.keys(state.itemInstances)).toHaveLength(2);
    expect(state.log.every((line) => line.simMs === 3000)).toBe(true);
    expect(state.log.filter((line) => line.category === 'loot' && line.highlight)).toHaveLength(2);
    expect(state.log.some((line) => line.text === 'You receive a Marshglass Pendant.')).toBe(true);
    expect(
      state.log.some((line) => line.text === 'You receive Morrow Heartstone (Named)!'),
    ).toBe(true);
    expect(events).toHaveLength(4);
  });

  it('matches named-monster loot rates within ten percent relative error', () => {
    const namedMonsters = monsters.filter((monster) => monster.named);

    for (const monster of namedMonsters) {
      const samples = Math.max(
        10_000,
        ...monster.lootTable.entries.map((entry) => Math.ceil(2000 / entry.chance)),
      );
      const state = createNewGame({ seed: 91_827, wallMs: 0, guildName: 'Drop Test' });
      const dropCounts = new Map(monster.lootTable.entries.map((entry) => [entry.itemId, 0]));

      for (let roll = 0; roll < samples; roll += 1) {
        const events: Parameters<typeof rollLoot>[3] = [];
        rollLoot(state, monster.lootTable, 'test:loot', events);
        for (const event of events) {
          if (event.type !== 'log' || event.line.category !== 'loot') continue;
          const entry = monster.lootTable.entries.find(({ itemId }) => {
            const item = itemsById[itemId];
            if (!item) return false;
            const text =
              item.rarity === 'named'
                ? `You receive ${item.name} (Named)!`
                : `You receive a ${item.name}.`;
            return event.line.text === text;
          });
          if (entry) {
            dropCounts.set(entry.itemId, (dropCounts.get(entry.itemId) ?? 0) + 1);
          }
        }
      }

      for (const entry of monster.lootTable.entries) {
        const observed = (dropCounts.get(entry.itemId) ?? 0) / samples;
        const relativeError = Math.abs(observed - entry.chance) / entry.chance;
        expect(relativeError).toBeLessThanOrEqual(0.1);
      }
    }
  });
});
