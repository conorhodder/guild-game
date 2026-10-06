import { useSyncExternalStore } from 'react';
import type { GameAction, GameActionResult } from './game/actions';
import { syncToWall } from './game/clock';
import { createNewGame } from './game/newGame';
import { summarizeAbsence, type AwaySummary } from './game/systems/offline';
import type { GameState } from './game/types';
import { loadEnvelope, SAVE_KEY, serialize } from './save';

const AUTOSAVE_MS = 30_000;
const CLOCK_INTERVAL_MS = 1000;
const SESSION_GAP_MS = 30 * 60_000;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface GameStoreOptions {
  storage?: StorageLike;
  now?: () => number;
  seed?: () => number;
  document?: Document;
}

export type { GameAction } from './game/actions';

function isGameActionResult(
  result: GameState | GameActionResult,
): result is GameActionResult {
  return 'state' in result;
}

function randomSeed(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] ?? 0;
}

function localDateKey(wallMs: number): string {
  const date = new Date(wallMs);
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function startLedgerSession(state: GameState, wallMs: number): GameState {
  return {
    ...state,
    ledger: {
      ...state.ledger,
      sessions: state.ledger.sessions + 1,
      lastActiveWall: Math.max(state.ledger.lastActiveWall, wallMs),
    },
  };
}

function recordLedgerAction(state: GameState, wallMs: number): GameState {
  const ledger = state.ledger;
  const day = localDateKey(wallMs);
  const highestHeroLevel = state.heroOrder.reduce(
    (highest, heroId) => Math.max(highest, state.heroes[heroId]?.level ?? 0),
    ledger.highestLevel,
  );

  return {
    ...state,
    ledger: {
      ...ledger,
      sessions:
        ledger.sessions + (wallMs - ledger.lastActiveWall > SESSION_GAP_MS ? 1 : 0),
      lastActiveWall: Math.max(ledger.lastActiveWall, wallMs),
      playDays: ledger.playDays.includes(day) ? ledger.playDays : [...ledger.playDays, day],
      highestLevel: highestHeroLevel,
    },
  };
}

export class GameStore {
  private state: GameState | null = null;
  private awaySummary: AwaySummary | null = null;
  private saveNotice: string | null = null;
  private readonly subscribers = new Set<() => void>();
  private readonly storage: StorageLike;
  private readonly now: () => number;
  private readonly seed: () => number;
  private readonly document: Document;
  private readonly autosaveTimer: ReturnType<typeof setInterval>;
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private readonly visibilityHandler = () => {
    if (this.document.visibilityState === 'visible') {
      this.syncClock(true);
      this.startClockTimer();
    } else {
      this.stopClockTimer();
    }
  };

  constructor(options: GameStoreOptions = {}) {
    this.storage = options.storage ?? window.localStorage;
    this.now = options.now ?? Date.now;
    this.seed = options.seed ?? randomSeed;
    this.document = options.document ?? window.document;

    const rawSave = this.storage.getItem(SAVE_KEY);
    if (rawSave === null) {
      this.state = this.createGame();
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

    if (this.state) this.state = startLedgerSession(this.state, this.now());
    this.syncClock(true);
    this.saveNow();
    this.document.addEventListener('visibilitychange', this.visibilityHandler);
    this.startClockTimer();
    this.autosaveTimer = setInterval(() => this.saveNow(), AUTOSAVE_MS);
  }

  getState = (): GameState | null => this.state;

  getSaveNotice = (): string | null => this.saveNotice;

  getAwaySummary = (): AwaySummary | null => this.awaySummary;

  dismissAwaySummary(): void {
    if (!this.awaySummary) return;
    this.awaySummary = null;
    this.notify();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  };

  dispatch(action: GameAction): string | null {
    if (!this.state) throw new Error('A new game must be started before dispatching actions.');
    const wallMs = this.now();
    const result = action(this.state, wallMs);
    if (isGameActionResult(result)) {
      if (result.reason) return result.reason;
      this.state = recordLedgerAction(result.state, wallMs);
    } else {
      this.state = recordLedgerAction(result, wallMs);
    }
    this.saveNow();
    this.notify();
    return null;
  }

  startNewGame(): void {
    if (this.state) return;
    this.state = startLedgerSession(this.createGame(), this.now());
    this.saveNotice = null;
    this.saveNow();
    this.notify();
  }

  destroy(): void {
    clearInterval(this.autosaveTimer);
    this.stopClockTimer();
    this.document.removeEventListener('visibilitychange', this.visibilityHandler);
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

  private syncClock(showSummary = false): void {
    if (!this.state) return;
    const before = this.state;
    const nowWall = this.now();
    const rawDelta = nowWall - before.clock.lastWallMs;
    const result = syncToWall(before, nowWall);
    this.state = result.state;
    if (showSummary && result.credited >= 60_000) {
      this.awaySummary = summarizeAbsence(
        before,
        result.state,
        result.events,
        result.credited,
        rawDelta,
      );
    }
    this.notify();
  }

  private startClockTimer(): void {
    if (this.clockTimer !== null || this.document.visibilityState !== 'visible') return;
    this.clockTimer = setInterval(() => this.syncClock(), CLOCK_INTERVAL_MS);
  }

  private stopClockTimer(): void {
    if (this.clockTimer === null) return;
    clearInterval(this.clockTimer);
    this.clockTimer = null;
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

export function useAwaySummary(): AwaySummary | null {
  return useSyncExternalStore(
    gameStore.subscribe,
    gameStore.getAwaySummary,
    gameStore.getAwaySummary,
  );
}

export function dismissAwaySummary(): void {
  gameStore.dismissAwaySummary();
}
