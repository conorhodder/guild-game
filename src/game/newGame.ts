import type { GameState } from './types';

export interface NewGameOptions {
  seed: number;
  wallMs: number;
  guildName: string;
}

export function createNewGame({ seed, wallMs, guildName }: NewGameOptions): GameState {
  if (!Number.isFinite(seed) || !Number.isFinite(wallMs)) {
    throw new RangeError('Seed and wall time must be finite numbers.');
  }

  return {
    guildName,
    gold: 50,
    clock: {
      simMs: 0,
      lastWallMs: wallMs,
    },
    rng: seed >>> 0,
    nextId: 1,
    heroes: {},
    heroOrder: [],
    activities: {},
    log: [],
    nextLogId: 1,
  };
}
