import { afterEach, describe, expect, it, vi } from 'vitest';
import { equip, foundGuild } from './game/actions';
import { OFFLINE_CAP_MS } from './game/clock';
import { createItemInstance } from './game/itemIds';
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
    const expected = createNewGame({ seed: 456, wallMs: 123, guildName: '' });
    const store = new GameStore({
      storage,
      now: () => 123,
      seed: () => 456,
    });

    expect(store.getState()).toEqual(expected);
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

  it('dispatches item actions and returns rejection reasons without changing state', () => {
    const storage = new MemoryStorage();
    const game = foundGuild('The Wayfarers')(
      createNewGame({ seed: 42, wallMs: 100, guildName: '' }),
    );
    const heroId = game.heroOrder[0];
    const hero = heroId ? game.heroes[heroId] : undefined;
    if (!hero) throw new Error('Expected a starter hero.');
    const instance = createItemInstance(game, 'copper-band');
    game.itemInstances[instance.uid] = instance;
    game.stash[instance.uid] = instance;
    storage.setItem(SAVE_KEY, serialize(game, 100));
    const store = new GameStore({ storage, now: () => 100, seed: () => 1 });

    expect(store.dispatch(equip(hero.id, instance.uid))).toBeNull();
    expect(store.getState()?.heroes[hero.id]?.equipment.trinket).toBe(instance.uid);

    const current = store.getState();
    expect(store.dispatch(equip(hero.id, 'i999'))).toBe(
      'That item is not in the stash.',
    );
    expect(store.getState()).toBe(current);
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

    expect(store.getState()).toEqual(
      createNewGame({ seed: 99, wallMs: 1234, guildName: '' }),
    );
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();
    store.destroy();
  });

  it('loads a saved state without modifying it', () => {
    const storage = new MemoryStorage();
    const game = createNewGame({ seed: 11, wallMs: 12, guildName: 'Test guild' });
    storage.setItem(SAVE_KEY, serialize(game, 13));
    const store = new GameStore({ storage, now: () => 12, seed: () => 99 });

    expect(store.getState()).toEqual(game);
    store.destroy();
  });

  it('pauses the clock while hidden and performs one capped catch-up when visible', () => {
    vi.useFakeTimers();
    const visibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    let now = 1000;
    const storage = new MemoryStorage();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    const store = new GameStore({ storage, now: () => now, seed: () => 1 });

    try {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
      now = 6000;
      vi.advanceTimersByTime(5000);
      expect(store.getState()?.clock.simMs).toBe(0);

      const fortyEightHours = 48 * 60 * 60 * 1000;
      now = 1000 + fortyEightHours;
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(store.getState()?.clock.simMs).toBe(OFFLINE_CAP_MS);
      expect(store.getState()?.clock.lastWallMs).toBe(now);
      expect(store.getAwaySummary()).toMatchObject({
        rawDelta: fortyEightHours,
        credited: OFFLINE_CAP_MS,
        capped: true,
      });
      store.dismissAwaySummary();
      expect(store.getAwaySummary()).toBeNull();
    } finally {
      store.destroy();
      if (visibility) Object.defineProperty(document, 'visibilityState', visibility);
      else Reflect.deleteProperty(document, 'visibilityState');
    }
  });

  it('shows a summary for a long load catch-up but not for live ticks', () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const initial = createNewGame({ seed: 3, wallMs: 0, guildName: '' });
    storage.setItem(SAVE_KEY, serialize(initial, 0));
    let now = 60_000;
    const store = new GameStore({ storage, now: () => now, seed: () => 1 });

    expect(store.getAwaySummary()).toMatchObject({
      rawDelta: 60_000,
      credited: 60_000,
      capped: false,
    });
    store.dismissAwaySummary();
    now += 1000;
    vi.advanceTimersByTime(1000);
    expect(store.getAwaySummary()).toBeNull();
    store.destroy();
  });

  it('does not show a summary when the wall clock moves backward', () => {
    const storage = new MemoryStorage();
    const initial = createNewGame({ seed: 3, wallMs: 1000, guildName: '' });
    storage.setItem(SAVE_KEY, serialize(initial, 1000));
    const store = new GameStore({ storage, now: () => 0, seed: () => 1 });

    expect(store.getState()?.clock.simMs).toBe(0);
    expect(store.getState()?.clock.lastWallMs).toBe(1000);
    expect(store.getAwaySummary()).toBeNull();
    store.destroy();
  });
});
