import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNewGame } from './game/newGame';
import { loadEnvelope, SAVE_KEY, serialize } from './save';
import { GameStore } from './store';
import type { StorageLike } from './store';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe('GameStore', () => {
  afterEach(() => vi.useRealTimers());

  it('creates and saves a new game when there is no save', () => {
    const storage = new MemoryStorage();
    const store = new GameStore({
      storage,
      now: () => 123,
      seed: () => 456,
    });

    expect(store.getState()).toMatchObject({
      guildName: '',
      gold: 50,
      clock: { simMs: 0, lastWallMs: 123 },
      rng: 456,
    });
    expect(loadEnvelope(storage.getItem(SAVE_KEY) ?? '')).toEqual(store.getState());
    store.destroy();
  });

  it('saves immediately after a dispatched action', () => {
    const storage = new MemoryStorage();
    const store = new GameStore({ storage, now: () => 100, seed: () => 1 });

    store.dispatch((state) => ({ ...state, gold: state.gold + 5 }));

    expect(store.getState()?.gold).toBe(55);
    expect(loadEnvelope(storage.getItem(SAVE_KEY) ?? '').gold).toBe(55);
    store.destroy();
  });

  it('autosaves at least every 30 seconds', () => {
    vi.useFakeTimers();
    let now = 100;
    const storage = new MemoryStorage();
    const store = new GameStore({ storage, now: () => now, seed: () => 1 });

    now = 200;
    vi.advanceTimersByTime(30_000);

    expect(JSON.parse(storage.getItem(SAVE_KEY) ?? '').savedAt).toBe(200);
    store.destroy();
  });

  it('preserves a corrupt save and waits for confirmation before starting a new game', () => {
    const storage = new MemoryStorage();
    const corruptValue = 'not a save';
    storage.setItem(SAVE_KEY, corruptValue);
    const store = new GameStore({ storage, now: () => 1234, seed: () => 99 });

    expect(store.getState()).toBeNull();
    expect(store.getSaveNotice()).toContain('preserved');
    expect(storage.getItem(`${SAVE_KEY}.corrupt-1234`)).toBe(corruptValue);
    expect(storage.getItem(SAVE_KEY)).toBeNull();

    store.startNewGame();

    expect(store.getState()?.rng).toBe(99);
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();
    store.destroy();
  });

  it('loads a saved state without modifying it', () => {
    const storage = new MemoryStorage();
    const game = createNewGame({ seed: 11, wallMs: 12, guildName: 'Test guild' });
    storage.setItem(SAVE_KEY, serialize(game, 13));
    const store = new GameStore({ storage, now: () => 14, seed: () => 99 });

    expect(store.getState()).toEqual(game);
    store.destroy();
  });
});
