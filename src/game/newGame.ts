import type { GameState } from './types';
import {
  createRecruitmentCandidates,
  RECRUITMENT_REFRESH_MS,
} from './systems/recruitment';
import { createGuildLedger } from './systems/ledger';

export interface NewGameOptions {
  seed: number;
  wallMs: number;
  guildName: string;
}

export function createNewGame({ seed, wallMs, guildName }: NewGameOptions): GameState {
  if (!Number.isFinite(seed) || !Number.isFinite(wallMs)) {
    throw new RangeError('Seed and wall time must be finite numbers.');
  }

  const state: GameState = {
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
    itemInstances: {},
    stash: {},
    materials: {},
    seenMonsters: [],
    recruitment: {
      candidates: [],
      refreshAt: RECRUITMENT_REFRESH_MS,
    },
    ledger: createGuildLedger(wallMs),
    log: [],
    nextLogId: 1,
  };
  state.recruitment.candidates = createRecruitmentCandidates(state);
  return state;
}
