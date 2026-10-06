import { itemsById } from '../game/data/items';
import { monstersById } from '../game/data/monsters';
import { questsById } from '../game/data/quests';
import { campsById, zonesById } from '../game/data/zones';
import {
  createRecruitmentCandidates,
  RECRUITMENT_REFRESH_MS,
  ROSTER_LIMIT,
} from '../game/systems/recruitment';
import type {
  Activity,
  ClassId,
  GameState,
  Hero,
  ItemInstance,
  LogCategory,
  LogLine,
  Slot,
} from '../game/types';

export const SAVE_KEY = 'guildmasters-ledger.save';
export const SAVE_VERSION = 6;

export interface SaveEnvelope {
  format: 'tgl-save';
  version: number;
  savedAt: number;
  state: GameState;
}

type Migration = (state: unknown) => unknown;

export const migrations: Record<number, Migration> = {
  1: (state) => {
    if (!isRecord(state)) return state;
    return {
      ...state,
      heroes: state.heroes ?? {},
      heroOrder: state.heroOrder ?? [],
      activities: state.activities ?? {},
    };
  },
  2: (state) => {
    if (!isRecord(state)) return state;
    return {
      ...state,
      itemInstances: state.itemInstances ?? {},
      stash: state.stash ?? {},
      materials: state.materials ?? {},
    };
  },
  3: (state) => {
    if (!isRecord(state)) return state;
    return {
      ...state,
      seenMonsters: state.seenMonsters ?? [],
    };
  },
  4: (state) => {
    if (!isRecord(state) || !isRecord(state.activities)) return state;
    return {
      ...state,
      activities: Object.fromEntries(
        Object.entries(state.activities).map(([id, activity]) => [
          id,
          isRecord(activity) && activity.kind === 'camp'
            ? {
                ...activity,
                kills: activity.kills ?? 0,
                namedKills: activity.namedKills ?? 0,
                recallAt: activity.recallAt ?? null,
              }
            : activity,
        ]),
      ),
    };
  },
  5: (state) => {
    if (
      !isRecord(state) ||
      isRecord(state.recruitment) ||
      !isRecord(state.clock) ||
      !Number.isFinite(state.clock.simMs) ||
      !Number.isInteger(state.rng) ||
      (state.rng as number) < 0 ||
      (state.rng as number) > 0xffffffff ||
      !Number.isInteger(state.nextId) ||
      (state.nextId as number) < 1 ||
      !isRecord(state.heroes) ||
      !Array.isArray(state.heroOrder)
    ) {
      return state;
    }
    const migrated = {
      ...state,
      recruitment: {
        candidates: [] as Hero[],
        refreshAt: (state.clock.simMs as number) + RECRUITMENT_REFRESH_MS,
      },
    };
    migrated.recruitment.candidates = createRecruitmentCandidates(
      migrated as unknown as GameState,
    );
    return migrated;
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const logCategories: LogCategory[] = ['combat', 'loot', 'skill', 'system'];
const classIds: ClassId[] = ['warrior', 'cleric', 'rogue', 'wizard'];
const combatSkills = ['offense', 'defense', 'healing', 'evocation', 'backstab'];
const slots: Slot[] = ['mainHand', 'offHand', 'body', 'trinket'];

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

function isHero(value: unknown): value is Hero {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.classId !== 'string' ||
    !classIds.includes(value.classId as ClassId) ||
    typeof value.glyph !== 'string' ||
    typeof value.flavour !== 'string' ||
    !Number.isInteger(value.level) ||
    (value.level as number) < 1 ||
    (value.level as number) > 20 ||
    typeof value.xp !== 'number' ||
    !Number.isFinite(value.xp) ||
    value.xp < 0 ||
    !isRecord(value.skills) ||
    !isRecord(value.gather) ||
    !isRecord(value.equipment) ||
    typeof value.fatigue !== 'number' ||
    !Number.isFinite(value.fatigue) ||
    value.fatigue < 0 ||
    value.fatigue > 100 ||
    !(value.activityId === null || typeof value.activityId === 'string') ||
    !(value.injuredUntil === null ||
      (typeof value.injuredUntil === 'number' && Number.isFinite(value.injuredUntil)))
  ) {
    return false;
  }

  return (
    Object.entries(value.skills).every(
      ([skill, amount]) =>
        combatSkills.includes(skill) &&
        typeof amount === 'number' &&
        Number.isFinite(amount) &&
        amount >= 0,
    ) &&
    typeof value.gather.mining === 'number' &&
    Number.isFinite(value.gather.mining) &&
    value.gather.mining >= 0 &&
    typeof value.gather.herbalism === 'number' &&
    Number.isFinite(value.gather.herbalism) &&
    value.gather.herbalism >= 0 &&
    Object.entries(value.equipment).every(
      ([slot, uid]) => slots.includes(slot as Slot) && typeof uid === 'string',
    )
  );
}

function isActivity(value: unknown): value is Activity {
  if (!isRecord(value) || typeof value.id !== 'string') return false;

  if (value.kind === 'quest') {
    const quest =
      typeof value.questId === 'string' ? questsById[value.questId] : undefined;
    if (!quest) return false;
    return (
      Array.isArray(value.heroIds) &&
      value.heroIds.every((id) => typeof id === 'string') &&
      new Set(value.heroIds).size === value.heroIds.length &&
      value.heroIds.length >= 1 &&
      value.heroIds.length <= 4 &&
      typeof value.startedAt === 'number' &&
      Number.isFinite(value.startedAt) &&
      typeof value.endsAt === 'number' &&
      Number.isFinite(value.endsAt) &&
      value.endsAt >= value.startedAt &&
      typeof value.nextEncounterAt === 'number' &&
      Number.isFinite(value.nextEncounterAt) &&
      Number.isInteger(value.encountersLeft) &&
      (value.encountersLeft as number) >= 0 &&
      (value.encountersLeft as number) <= quest.encounters.length
    );
  }
  if (value.kind === 'camp') {
    const zone = typeof value.zoneId === 'string' ? zonesById[value.zoneId] : undefined;
    const camp = typeof value.campId === 'string' ? campsById[value.campId] : undefined;
    return (
      zone !== undefined &&
      camp !== undefined &&
      zone.camps.some((zoneCamp) => zoneCamp.id === camp.id) &&
      Array.isArray(value.heroIds) &&
      value.heroIds.every((id) => typeof id === 'string') &&
      new Set(value.heroIds).size === value.heroIds.length &&
      value.heroIds.length >= 1 &&
      value.heroIds.length <= 4 &&
      typeof value.startedAt === 'number' &&
      Number.isFinite(value.startedAt) &&
      typeof value.spawnReadyAt === 'number' &&
      Number.isFinite(value.spawnReadyAt) &&
      typeof value.nextSpawnNamed === 'boolean' &&
      Number.isInteger(value.kills) &&
      (value.kills as number) >= 0 &&
      Number.isInteger(value.namedKills) &&
      (value.namedKills as number) >= 0 &&
      (value.namedKills as number) <= (value.kills as number) &&
      (value.recallAt === null ||
        (typeof value.recallAt === 'number' && Number.isFinite(value.recallAt)))
    );
  }
  if (value.kind === 'gather') {
    return (
      typeof value.heroId === 'string' &&
      (value.skill === 'mining' || value.skill === 'herbalism') &&
      typeof value.startedAt === 'number' &&
      Number.isFinite(value.startedAt) &&
      typeof value.nextYieldAt === 'number' &&
      Number.isFinite(value.nextYieldAt)
    );
  }
  return (
    value.kind === 'rest' &&
    typeof value.heroId === 'string' &&
    typeof value.startedAt === 'number' &&
    Number.isFinite(value.startedAt)
  );
}

function isItemInstance(value: unknown): value is ItemInstance {
  return (
    isRecord(value) &&
    typeof value.uid === 'string' &&
    /^i\d+$/.test(value.uid) &&
    typeof value.itemId === 'string' &&
    value.itemId.length > 0
  );
}

export function isGameState(value: unknown): value is GameState {
  if (
    !isRecord(value) ||
    !isRecord(value.clock) ||
    !isRecord(value.itemInstances) ||
    !isRecord(value.stash) ||
    !isRecord(value.recruitment) ||
    !Array.isArray(value.seenMonsters)
  ) {
    return false;
  }

  const itemInstances = value.itemInstances;

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
    isRecord(value.heroes) &&
    Object.entries(value.heroes).every(([id, hero]) => isHero(hero) && hero.id === id) &&
    Array.isArray(value.heroOrder) &&
    value.heroOrder.length <= ROSTER_LIMIT &&
    value.heroOrder.every(
      (id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(value.heroes, id),
    ) &&
    new Set(value.heroOrder).size === value.heroOrder.length &&
    isRecord(value.activities) &&
    Object.entries(value.activities).every(
      ([id, activity]) => isActivity(activity) && activity.id === id,
    ) &&
    Object.entries(value.itemInstances).every(
      ([uid, item]) => isItemInstance(item) && item.uid === uid,
    ) &&
    Object.values(value.heroes).every(
      (hero) =>
        isHero(hero) &&
        Object.entries(hero.equipment).every(([slot, uid]) => {
          if (typeof uid !== 'string') return false;
          const instance = itemInstances[uid];
          return isItemInstance(instance) && itemsById[instance.itemId]?.slot === slot;
        }),
    ) &&
    Object.entries(value.stash).every(
      ([uid, item]) => {
        if (!isItemInstance(item) || item.uid !== uid) return false;
        const storedInstance = itemInstances[uid];
        return (
          itemsById[item.itemId]?.slot !== undefined &&
          itemsById[item.itemId]?.slot !== 'material' &&
          isItemInstance(storedInstance) &&
          storedInstance.itemId === item.itemId
        );
      },
    ) &&
    Array.isArray(value.recruitment.candidates) &&
    value.recruitment.candidates.length >= 3 &&
    value.recruitment.candidates.every(
      (candidate) =>
        isHero(candidate) &&
        candidate.activityId === null &&
        candidate.injuredUntil === null &&
        candidate.fatigue === 0 &&
        Object.keys(candidate.equipment).length === 0 &&
        !Object.prototype.hasOwnProperty.call(value.heroes, candidate.id),
    ) &&
    new Set(value.recruitment.candidates.map((candidate) => (candidate as Hero).id)).size ===
      value.recruitment.candidates.length &&
    new Set(
      value.recruitment.candidates.map((candidate) => (candidate as Hero).classId),
    ).size >= 2 &&
    typeof value.recruitment.refreshAt === 'number' &&
    Number.isFinite(value.recruitment.refreshAt) &&
    value.recruitment.refreshAt >= 0 &&
    isRecord(value.materials) &&
    Object.entries(value.materials).every(
      ([itemId, quantity]) =>
        itemId.length > 0 &&
        itemsById[itemId]?.slot === 'material' &&
        typeof quantity === 'number' &&
        Number.isInteger(quantity) &&
        quantity > 0,
    ) &&
    value.seenMonsters.every(
      (monsterId) => typeof monsterId === 'string' && Boolean(monstersById[monsterId]),
    ) &&
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
