export interface LootEntry {
  itemId: string;
  chance: number;
}

export interface LootTable {
  gold: [number, number];
  entries: LootEntry[];
}

export interface MonsterData {
  id: string;
  name: string;
  article?: 'a' | 'an';
  level: number;
  hp: number;
  damage: number;
  armor: number;
  xp: number;
  lootTable: LootTable;
  named?: true;
  glyph: string;
}

export const monsters: MonsterData[] = [
  {
    id: 'marsh-rat',
    name: 'marsh rat',
    article: 'a',
    level: 1,
    hp: 18,
    damage: 5,
    armor: 0,
    xp: 12,
    lootTable: {
      gold: [1, 3],
      entries: [
        { itemId: 'copper-ore', chance: 0.25 },
        { itemId: 'copper-band', chance: 0.04 },
      ],
    },
    glyph: '🐀',
  },
  {
    id: 'cellar-spider',
    name: 'cellar spider',
    article: 'a',
    level: 1,
    hp: 24,
    damage: 6,
    armor: 1,
    xp: 16,
    lootTable: {
      gold: [2, 4],
      entries: [{ itemId: 'bitterleaf', chance: 0.3 }],
    },
    glyph: '🕷️',
  },
  {
    id: 'bog-crawler',
    name: 'bog crawler',
    article: 'a',
    level: 2,
    hp: 38,
    damage: 8,
    armor: 2,
    xp: 25,
    lootTable: {
      gold: [3, 6],
      entries: [{ itemId: 'field-kit', chance: 0.12 }],
    },
    glyph: '🦎',
  },
  {
    id: 'grave-wisp',
    name: 'grave wisp',
    article: 'a',
    level: 3,
    hp: 46,
    damage: 10,
    armor: 1,
    xp: 38,
    lootTable: {
      gold: [4, 8],
      entries: [{ itemId: 'marshglass-pendant', chance: 0.03 }],
    },
    glyph: '👻',
  },
  {
    id: 'thorn-wolf',
    name: 'thorn wolf',
    article: 'a',
    level: 4,
    hp: 68,
    damage: 13,
    armor: 3,
    xp: 55,
    lootTable: {
      gold: [6, 11],
      entries: [{ itemId: 'silver-talisman', chance: 0.1 }],
    },
    glyph: '🐺',
  },
  {
    id: 'stone-ogre',
    name: 'stone ogre',
    article: 'a',
    level: 5,
    hp: 108,
    damage: 17,
    armor: 6,
    xp: 82,
    lootTable: {
      gold: [8, 14],
      entries: [{ itemId: 'steel-mace', chance: 0.08 }],
    },
    glyph: '👹',
  },
  {
    id: 'ember-drake',
    name: 'ember drake',
    article: 'an',
    level: 6,
    hp: 140,
    damage: 20,
    armor: 5,
    xp: 112,
    lootTable: {
      gold: [12, 20],
      entries: [{ itemId: 'reinforced-mail', chance: 0.08 }],
    },
    glyph: '🐉',
  },
  {
    id: 'morrow-the-hollow',
    name: 'Morrow the Hollow',
    level: 7,
    hp: 260,
    damage: 23,
    armor: 8,
    xp: 260,
    lootTable: {
      gold: [25, 45],
      entries: [{ itemId: 'morrow-heartstone', chance: 0.03 }],
    },
    named: true,
    glyph: '💀',
  },
  {
    id: 'grizzlefang',
    name: 'Grizzlefang',
    level: 5,
    hp: 152,
    damage: 19,
    armor: 5,
    xp: 225,
    lootTable: {
      gold: [28, 46],
      entries: [
        { itemId: 'grizzlefang-tooth', chance: 0.04 },
        { itemId: 'wolfheart-charm', chance: 0.08 },
      ],
    },
    named: true,
    glyph: '🐺',
  },
  {
    id: 'ashen-wyrm',
    name: 'Ashen Wyrm',
    level: 10,
    hp: 420,
    damage: 36,
    armor: 12,
    xp: 720,
    lootTable: {
      gold: [90, 145],
      entries: [
        { itemId: 'ashen-wyrm-scale', chance: 0.025 },
        { itemId: 'star-iron-ring', chance: 0.05 },
      ],
    },
    named: true,
    glyph: '🐉',
  },
];

export const monstersById: Record<string, MonsterData> = Object.fromEntries(
  monsters.map((monster) => [monster.id, monster]),
);
