import { itemsById } from '../data/items';
import type { LootTable } from '../data/monsters';
import { createItemInstance } from '../itemIds';
import { rngInt, rngNext } from '../rng';
import type { GameState } from '../types';
import type { SimEvent } from '../sim';
import { appendLog } from './log';

export function rollLoot(
  state: GameState,
  table: LootTable,
  channel: string,
  events: SimEvent[],
  simMs: number = state.clock.simMs,
): void {
  const gold = rngInt(state, table.gold[0], table.gold[1]);
  state.gold += gold;
  if (gold > 0) {
    const line = appendLog(state, channel, 'loot', `You receive ${gold} gold.`, undefined, simMs);
    events.push({ type: 'log', line });
  }

  for (const entry of table.entries) {
    if (rngNext(state) >= entry.chance) continue;
    const item = itemsById[entry.itemId];
    if (!item) throw new RangeError(`Unknown loot item: ${entry.itemId}`);

    if (item.slot === 'material') {
      state.materials[item.id] = (state.materials[item.id] ?? 0) + 1;
    } else {
      const instance = createItemInstance(state, item.id);
      state.itemInstances[instance.uid] = instance;
      state.stash[instance.uid] = instance;
    }

    const text =
      item.rarity === 'named'
        ? `You receive ${item.name} (Named)!`
        : `You receive a ${item.name}.`;
    const line = appendLog(
      state,
      channel,
      'loot',
      text,
      item.rarity === 'rare' || item.rarity === 'named',
      simMs,
    );
    events.push({ type: 'log', line });
  }
}
