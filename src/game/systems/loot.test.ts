import { describe, expect, it } from 'vitest';
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
    expect(events).toHaveLength(4);
  });
});
