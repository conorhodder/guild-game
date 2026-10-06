import { items } from './items';

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
      entries: [{ itemId: 'morrow-heartstone', chance: 0.2 }],
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
        { itemId: 'grizzlefang-tooth', chance: 0.2 },
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
        { itemId: 'ashen-wyrm-scale', chance: 0.2 },
        { itemId: 'star-iron-ring', chance: 0.05 },
      ],
    },
    named: true,
    glyph: '🐉',
  },
  {
    id: 'iron-golem',
    name: 'iron golem',
    article: 'an',
    level: 8,
    hp: 210,
    damage: 26,
    armor: 12,
    xp: 180,
    lootTable: {
      gold: [24, 38],
      entries: [{ itemId: 'steel-mace', chance: 0.08 }],
    },
    glyph: '🗿',
  },
  {
    id: 'ember-sprite',
    name: 'ember sprite',
    article: 'an',
    level: 9,
    hp: 175,
    damage: 29,
    armor: 7,
    xp: 195,
    lootTable: {
      gold: [26, 40],
      entries: [{ itemId: 'moon-salt', chance: 0.2 }],
    },
    glyph: '🔥',
  },
  {
    id: 'ash-stalker',
    name: 'ash stalker',
    article: 'an',
    level: 11,
    hp: 255,
    damage: 33,
    armor: 9,
    xp: 240,
    lootTable: {
      gold: [32, 48],
      entries: [{ itemId: 'star-iron-ring', chance: 0.035 }],
    },
    glyph: '🐈‍⬛',
  },
  {
    id: 'glasswing-moth',
    name: 'glasswing moth',
    article: 'a',
    level: 11,
    hp: 220,
    damage: 32,
    armor: 7,
    xp: 235,
    lootTable: {
      gold: [30, 46],
      entries: [{ itemId: 'marshglass-pendant', chance: 0.05 }],
    },
    glyph: '🦋',
  },
  {
    id: 'grave-knight',
    name: 'grave knight',
    article: 'a',
    level: 12,
    hp: 310,
    damage: 36,
    armor: 13,
    xp: 280,
    lootTable: {
      gold: [36, 54],
      entries: [{ itemId: 'reinforced-mail', chance: 0.06 }],
    },
    glyph: '⚔️',
  },
  {
    id: 'moonfang-hound',
    name: 'moonfang hound',
    article: 'a',
    level: 13,
    hp: 285,
    damage: 38,
    armor: 10,
    xp: 305,
    lootTable: {
      gold: [40, 60],
      entries: [{ itemId: 'wolfheart-charm', chance: 0.045 }],
    },
    glyph: '🐕',
  },
  {
    id: 'glasswing-queen',
    name: 'Glasswing Queen',
    level: 13,
    hp: 420,
    damage: 41,
    armor: 12,
    xp: 510,
    lootTable: {
      gold: [75, 110],
      entries: [
        { itemId: 'glasswing-filament', chance: 0.2 },
        { itemId: 'star-iron-ring', chance: 0.06 },
      ],
    },
    named: true,
    glyph: '🦋',
  },
  {
    id: 'rift-hydra',
    name: 'rift hydra',
    article: 'a',
    level: 14,
    hp: 390,
    damage: 43,
    armor: 11,
    xp: 350,
    lootTable: {
      gold: [45, 65],
      entries: [{ itemId: 'sunken-crown', chance: 0.045 }],
    },
    glyph: '🐍',
  },
  {
    id: 'obsidian-titan',
    name: 'obsidian titan',
    article: 'an',
    level: 15,
    hp: 510,
    damage: 47,
    armor: 16,
    xp: 390,
    lootTable: {
      gold: [52, 76],
      entries: [{ itemId: 'reinforced-mail', chance: 0.08 }],
    },
    glyph: '🗿',
  },
  {
    id: 'dusk-stalker',
    name: 'dusk stalker',
    article: 'a',
    level: 16,
    hp: 430,
    damage: 50,
    armor: 12,
    xp: 420,
    lootTable: {
      gold: [58, 84],
      entries: [{ itemId: 'wolfheart-charm', chance: 0.06 }],
    },
    glyph: '🐈‍⬛',
  },
  {
    id: 'cindermaw',
    name: "Cindermaw, the Furnace King",
    level: 17,
    hp: 760,
    damage: 56,
    armor: 18,
    xp: 860,
    lootTable: {
      gold: [130, 190],
      entries: [
        { itemId: 'cindermaw-heart', chance: 0.2 },
        { itemId: 'ashen-wyrm-scale', chance: 0.05 },
      ],
    },
    named: true,
    glyph: '🐲',
  },
  {
    id: 'void-colossus',
    name: 'void colossus',
    article: 'a',
    level: 18,
    hp: 640,
    damage: 58,
    armor: 17,
    xp: 510,
    lootTable: {
      gold: [68, 96],
      entries: [{ itemId: 'star-iron-ring', chance: 0.06 }],
    },
    glyph: '👾',
  },
  {
    id: 'frost-lich',
    name: 'frost lich',
    article: 'a',
    level: 19,
    hp: 590,
    damage: 62,
    armor: 14,
    xp: 560,
    lootTable: {
      gold: [75, 105],
      entries: [{ itemId: 'sunken-crown', chance: 0.075 }],
    },
    glyph: '☠️',
  },
  {
    id: 'star-devourer',
    name: 'star devourer',
    article: 'a',
    level: 20,
    hp: 720,
    damage: 68,
    armor: 16,
    xp: 620,
    lootTable: {
      gold: [82, 120],
      entries: [{ itemId: 'star-iron-ring', chance: 0.08 }],
    },
    glyph: '🐙',
  },
  {
    id: 'star-eater',
    name: 'The Star-Eater',
    level: 20,
    hp: 1_050,
    damage: 76,
    armor: 22,
    xp: 1_250,
    lootTable: {
      gold: [200, 300],
      entries: [
        { itemId: 'star-eater-eye', chance: 0.2 },
        { itemId: 'cindermaw-heart', chance: 0.045 },
      ],
    },
    named: true,
    glyph: '🌌',
  },
];

for (const item of items.filter(
  (candidate) =>
    candidate.id.startsWith('all-') &&
    candidate.slot !== 'material' &&
    (candidate.rarity === 'common' || candidate.rarity === 'uncommon'),
)) {
  if (
    monsters.some((monster) =>
      monster.lootTable.entries.some((entry) => entry.itemId === item.id),
    )
  ) {
    continue;
  }

  const source = monsters
    .filter((monster) => monster.named !== true)
    .sort(
      (first, second) =>
        Math.abs(first.level - item.levelReq) -
        Math.abs(second.level - item.levelReq),
    )[0];
  source?.lootTable.entries.push({ itemId: item.id, chance: 0.05 });
}

export const monstersById: Record<string, MonsterData> = Object.fromEntries(
  monsters.map((monster) => [monster.id, monster]),
);
