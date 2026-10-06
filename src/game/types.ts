export type LogCategory = 'combat' | 'loot' | 'skill' | 'system';
export type ClassId = 'warrior' | 'cleric' | 'rogue' | 'wizard';
export type CombatSkill = 'offense' | 'defense' | 'healing' | 'evocation' | 'backstab';
export type GatherSkill = 'mining' | 'herbalism';
export type Slot = 'mainHand' | 'offHand' | 'body' | 'trinket';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'named';
export type Con = 'trivial' | 'easy' | 'even' | 'tough' | 'deadly';
export type ItemSlot = Slot | 'material';

export interface ItemStats {
  attack?: number;
  armor?: number;
  hp?: number;
  heal?: number;
}

export interface ItemData {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: Rarity;
  levelReq: number;
  gatherSkill?: GatherSkill;
  classes: ClassId[] | 'all';
  stats: ItemStats;
  value: number;
}

export interface ItemInstance {
  uid: string;
  itemId: string;
}

export interface LogLine {
  id: number;
  simMs: number;
  channel: string;
  category: LogCategory;
  text: string;
  highlight?: boolean;
}

export interface GuildLedger {
  firstLoadWall: number;
  firstDispatchWall: number | null;
  firstDispatchAt: number | null;
  firstQuestCompleteAt: number | null;
  sessions: number;
  lastActiveWall: number;
  playDays: string[];
  kills: number;
  namedKills: number;
  namedDrops: number;
  highestLevel: number;
  questsCompleted: number;
  questsFailed: number;
  goldEarned: number;
  itemsByRarity: Record<Rarity, number>;
  knockouts: number;
  skillUps: number;
  levelsGained: number;
  totalSimMsPlayed: number;
  namedMonstersSlainById: Record<string, number>;
}

export interface Hero {
  id: string;
  name: string;
  classId: ClassId;
  glyph: string;
  flavour: string;
  level: number;
  xp: number;
  skills: Partial<Record<CombatSkill, number>>;
  gather: Record<GatherSkill, number>;
  equipment: Partial<Record<Slot, string>>;
  fatigue: number;
  activityId: string | null;
  injuredUntil: number | null;
}

export type Activity =
  | {
      kind: 'quest';
      id: string;
      questId: string;
      heroIds: string[];
      startedAt: number;
      endsAt: number;
      nextEncounterAt: number;
      encountersLeft: number;
    }
  | {
      kind: 'camp';
      id: string;
      zoneId: string;
      campId: string;
      heroIds: string[];
      startedAt: number;
      spawnReadyAt: number;
      nextSpawnNamed: boolean;
      kills: number;
      namedKills: number;
      recallAt: number | null;
    }
  | {
      kind: 'gather';
      id: string;
      heroId: string;
      skill: GatherSkill;
      startedAt: number;
      nextYieldAt: number;
      yields: number;
    }
  | { kind: 'rest'; id: string; heroId: string; startedAt: number };

export interface GameState {
  guildName: string;
  gold: number;
  clock: {
    simMs: number;
    lastWallMs: number;
  };
  rng: number;
  nextId: number;
  heroes: Record<string, Hero>;
  heroOrder: string[];
  activities: Record<string, Activity>;
  itemInstances: Record<string, ItemInstance>;
  stash: Record<string, ItemInstance>;
  materials: Record<string, number>;
  seenMonsters: string[];
  recruitment: {
    candidates: Hero[];
    refreshAt: number;
  };
  ledger: GuildLedger;
  log: LogLine[];
  nextLogId: number;
}
