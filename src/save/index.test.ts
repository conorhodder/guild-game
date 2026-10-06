import { describe, expect, it } from 'vitest';
import { createNewGame } from '../game/newGame';
import type { GameState } from '../game/types';
import {
  exportSave,
  importSave,
  isGameState,
  loadEnvelope,
  SAVE_VERSION,
  serialize,
} from './index';

const fixtureFiles = import.meta.glob('./fixtures/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

function expectCurrentShape(state: GameState) {
  expect(isGameState(state)).toBe(true);
  expect(Object.keys(state).sort()).toEqual(
    [
      'activities',
      'clock',
      'gold',
      'guildName',
      'heroOrder',
      'heroes',
      'itemInstances',
      'log',
      'materials',
      'nextId',
      'nextLogId',
      'rng',
      'stash',
    ].sort(),
  );
  expect(Object.keys(state.clock).sort()).toEqual(['lastWallMs', 'simMs']);
  expect(Array.isArray(state.log)).toBe(true);
}

describe('save format', () => {
  it.each(Object.entries(fixtureFiles))('loads fixture %s into the current state shape', (_, raw) => {
    const state = loadEnvelope(JSON.stringify(raw));
    expectCurrentShape(state);
  });

  it('migrates the v1 fixture with empty hero and activity collections', () => {
    const fixture = fixtureFiles['./fixtures/v1.json'];
    const state = loadEnvelope(JSON.stringify(fixture));

    expect(state.heroes).toEqual({});
    expect(state.heroOrder).toEqual([]);
    expect(state.activities).toEqual({});
  });

  it('migrates the v2 fixture with empty stash and materials', () => {
    const fixture = fixtureFiles['./fixtures/v2.json'];
    const state = loadEnvelope(JSON.stringify(fixture));

    expect(state.stash).toEqual({});
    expect(state.materials).toEqual({});
    expect(state.itemInstances).toEqual({});
    expect(Object.keys(state.heroes)).toHaveLength(3);
  });

  it('round-trips JSON and UTF-8 base64 saves', () => {
    const state = createNewGame({
      seed: 42,
      wallMs: 1_700_000_000_000,
      guildName: 'Étoile & Oak',
    });

    expect(loadEnvelope(serialize(state, 123))).toEqual(state);
    expect(importSave(exportSave(state, 123))).toEqual(state);
  });

  it('rejects saves from a newer version', () => {
    const state = createNewGame({ seed: 1, wallMs: 2, guildName: '' });
    const newerSave = JSON.stringify({
      format: 'tgl-save',
      version: SAVE_VERSION + 1,
      savedAt: 3,
      state,
    });

    expect(() => loadEnvelope(newerSave)).toThrow(/newer game version/);
  });

  it('validates item instances, stash gear, and material quantities', () => {
    const state = createNewGame({ seed: 1, wallMs: 2, guildName: '' });

    expect(isGameState({ ...state, itemInstances: [] })).toBe(false);
    expect(isGameState({ ...state, stash: { i1: { uid: 'i1', itemId: 'unknown' } } })).toBe(
      false,
    );
    expect(isGameState({ ...state, materials: { 'copper-ore': 0 } })).toBe(false);
  });

  it('rejects garbage without changing the existing state', () => {
    const state = createNewGame({ seed: 1, wallMs: 2, guildName: '' });
    const before = structuredClone(state);

    expect(() => importSave('bm90IGEganNvbg==')).toThrow();
    expect(state).toEqual(before);
  });
});
