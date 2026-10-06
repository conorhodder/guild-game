import { useSyncExternalStore } from 'react';
import { createNewGame } from './game/newGame';
import type { GameState } from './game/types';
import { loadEnvelope, SAVE_KEY, serialize } from './save';

const AUTOSAVE_MS = 30_000;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface GameStoreOptions {
  storage?: StorageLike;
  now?: () => number;
  seed?: () => number;
}

export type GameAction = (state: GameState, wallMs: number) => GameState;

function randomSeed(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] ?? 0;
}

export class GameStore {
  private state: GameState | null = null;
  private saveNotice: string | null = null;
  private readonly subscribers = new Set<() => void>();
  private readonly storage: StorageLike;
  private readonly now: () => number;
  private readonly seed: () => number;
  private readonly autosaveTimer: ReturnType<typeof setInterval>;

  constructor(options: GameStoreOptions = {}) {
    this.storage = options.storage ?? window.localStorage;
    this.now = options.now ?? Date.now;
    this.seed = options.seed ?? randomSeed;

    const rawSave = this.storage.getItem(SAVE_KEY);
    if (rawSave === null) {
      this.state = this.createGame();
      this.saveNow();
    } else {
      try {
        this.state = loadEnvelope(rawSave);
      } catch {
        const corruptKey = `${SAVE_KEY}.corrupt-${this.now()}`;
        this.storage.setItem(corruptKey, rawSave);
        this.storage.removeItem(SAVE_KEY);
        this.saveNotice =
          'Your save could not be loaded and has been preserved. Start a new game to continue.';
      }
    }

    this.autosaveTimer = setInterval(() => this.saveNow(), AUTOSAVE_MS);
  }

  getState = (): GameState | null => this.state;

  getSaveNotice = (): string | null => this.saveNotice;

  subscribe = (listener: () => void): (() => void) => {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  };

  dispatch(action: GameAction): void {
    if (!this.state) throw new Error('A new game must be started before dispatching actions.');
    this.state = action(this.state, this.now());
    this.saveNow();
    this.notify();
  }

  startNewGame(): void {
    if (this.state) return;
    this.state = this.createGame();
    this.saveNotice = null;
    this.saveNow();
    this.notify();
  }

  destroy(): void {
    clearInterval(this.autosaveTimer);
    this.subscribers.clear();
  }

  private createGame(): GameState {
    return createNewGame({
      seed: this.seed(),
      wallMs: this.now(),
      guildName: '',
    });
  }

  private saveNow(): void {
    if (this.state) this.storage.setItem(SAVE_KEY, serialize(this.state, this.now()));
  }

  private notify(): void {
    for (const subscriber of this.subscribers) subscriber();
  }
}

export const gameStore = new GameStore();

export function useGame(): GameState | null {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getState, gameStore.getState);
}

export function useSaveNotice(): string | null {
  return useSyncExternalStore(
    gameStore.subscribe,
    gameStore.getSaveNotice,
    gameStore.getSaveNotice,
  );
}
