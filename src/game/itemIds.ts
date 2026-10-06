import type { GameState, ItemInstance } from './types';

export function createItemInstance(
  state: Pick<GameState, 'nextId'>,
  itemId: string,
): ItemInstance {
  const uid = `i${state.nextId}`;
  state.nextId += 1;
  return { uid, itemId };
}
