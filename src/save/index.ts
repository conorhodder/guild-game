import type { GameState, LogCategory, LogLine } from '../game/types';

export const SAVE_KEY = 'guildmasters-ledger.save';
export const SAVE_VERSION = 1;

export interface SaveEnvelope {
  format: 'tgl-save';
  version: number;
  savedAt: number;
  state: GameState;
}

type Migration = (state: unknown) => unknown;

export const migrations: Record<number, Migration> = {};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const logCategories: LogCategory[] = ['combat', 'loot', 'skill', 'system'];

function isLogLine(value: unknown): value is LogLine {
  if (!isRecord(value)) return false;

  return (
    Number.isInteger(value.id) &&
    typeof value.simMs === 'number' &&
    Number.isFinite(value.simMs) &&
    typeof value.channel === 'string' &&
    typeof value.category === 'string' &&
    logCategories.includes(value.category as LogCategory) &&
    typeof value.text === 'string' &&
    (value.highlight === undefined || typeof value.highlight === 'boolean')
  );
}

export function isGameState(value: unknown): value is GameState {
  if (!isRecord(value) || !isRecord(value.clock)) return false;

  return (
    typeof value.guildName === 'string' &&
    typeof value.gold === 'number' &&
    Number.isFinite(value.gold) &&
    typeof value.clock.simMs === 'number' &&
    Number.isFinite(value.clock.simMs) &&
    typeof value.clock.lastWallMs === 'number' &&
    Number.isFinite(value.clock.lastWallMs) &&
    typeof value.rng === 'number' &&
    Number.isInteger(value.rng) &&
    value.rng >= 0 &&
    value.rng <= 0xffffffff &&
    typeof value.nextId === 'number' &&
    Number.isInteger(value.nextId) &&
    value.nextId >= 1 &&
    Array.isArray(value.log) &&
    value.log.every(isLogLine) &&
    typeof value.nextLogId === 'number' &&
    Number.isInteger(value.nextLogId) &&
    value.nextLogId >= 1
  );
}

export function loadEnvelope(json: string): GameState {
  const parsed: unknown = JSON.parse(json);
  if (!isRecord(parsed)) throw new Error('Invalid save envelope.');
  if (parsed.format !== 'tgl-save') throw new Error('Unrecognized save format.');
  if (!Number.isInteger(parsed.version) || (parsed.version as number) < 1) {
    throw new Error('Invalid save version.');
  }
  if (typeof parsed.savedAt !== 'number' || !Number.isFinite(parsed.savedAt)) {
    throw new Error('Invalid save timestamp.');
  }

  const version = parsed.version as number;
  if (version > SAVE_VERSION) throw new Error('This save is from a newer game version.');

  let state: unknown = parsed.state;
  for (let currentVersion = version; currentVersion < SAVE_VERSION; currentVersion += 1) {
    const migrate = migrations[currentVersion];
    if (!migrate) throw new Error(`No migration is available for save version ${currentVersion}.`);
    state = migrate(state);
  }

  if (!isGameState(state)) throw new Error('Invalid saved game state.');
  return state;
}

export function serialize(state: GameState, savedAt = Date.now()): string {
  if (!isGameState(state)) throw new Error('Cannot save an invalid game state.');
  if (!Number.isFinite(savedAt)) throw new RangeError('Save timestamp must be finite.');

  const envelope: SaveEnvelope = {
    format: 'tgl-save',
    version: SAVE_VERSION,
    savedAt,
    state,
  };
  return JSON.stringify(envelope);
}

export function exportSave(state: GameState, savedAt = Date.now()): string {
  const bytes = new TextEncoder().encode(serialize(state, savedAt));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function importSave(encoded: string): GameState {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return loadEnvelope(new TextDecoder().decode(bytes));
}
