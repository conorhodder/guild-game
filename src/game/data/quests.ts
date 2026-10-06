import type { LootTable } from './monsters';

export interface QuestData {
  id: string;
  name: string;
  level: number;
  durationMin: number;
  encounters: string[];
  rewardXp: number;
  rewardGold: number;
  lootTable: LootTable;
  firstQuest?: true;
}

export const quests: QuestData[] = [
  {
    id: 'rats-in-the-cellar',
    name: 'Rats in the Cellar',
    level: 1,
    durationMin: 2,
    encounters: ['marsh-rat', 'cellar-spider'],
    rewardXp: 55,
    rewardGold: 15,
    lootTable: {
      gold: [1, 5],
      entries: [
        { itemId: 'copper-ore', chance: 0.35 },
        { itemId: 'copper-band', chance: 0.08 },
      ],
    },
    firstQuest: true,
  },
  {
    id: 'spiders-under-stonebridge',
    name: 'Spiders Under Stonebridge',
    level: 2,
    durationMin: 3,
    encounters: ['cellar-spider', 'bog-crawler'],
    rewardXp: 95,
    rewardGold: 22,
    lootTable: {
      gold: [3, 7],
      entries: [
        { itemId: 'bitterleaf', chance: 0.3 },
        { itemId: 'field-kit', chance: 0.1 },
      ],
    },
  },
  {
    id: 'lights-in-the-chapel',
    name: 'Lights in the Chapel',
    level: 4,
    durationMin: 4,
    encounters: ['grave-wisp', 'thorn-wolf'],
    rewardXp: 190,
    rewardGold: 36,
    lootTable: {
      gold: [5, 10],
      entries: [
        { itemId: 'marshglass-pendant', chance: 0.03 },
        { itemId: 'silver-talisman', chance: 0.12 },
      ],
    },
  },
  {
    id: 'the-ember-road',
    name: 'The Ember Road',
    level: 6,
    durationMin: 5,
    encounters: ['thorn-wolf', 'ember-drake'],
    rewardXp: 320,
    rewardGold: 55,
    lootTable: {
      gold: [8, 14],
      entries: [
        { itemId: 'reinforced-mail', chance: 0.1 },
        { itemId: 'steel-mace', chance: 0.08 },
      ],
    },
  },
  {
    id: 'lanterns-in-the-vault',
    name: 'Lanterns in the Vault',
    level: 8,
    durationMin: 6,
    encounters: ['iron-golem', 'ember-sprite'],
    rewardXp: 450,
    rewardGold: 80,
    lootTable: {
      gold: [12, 24],
      entries: [{ itemId: 'all-7-hearthguard-blade', chance: 0.08 }],
    },
  },
  {
    id: 'the-saltwind-road',
    name: 'The Saltwind Road',
    level: 10,
    durationMin: 7,
    encounters: ['ember-sprite', 'ash-stalker'],
    rewardXp: 550,
    rewardGold: 100,
    lootTable: {
      gold: [16, 28],
      entries: [{ itemId: 'all-10-moonsilver-hauberk', chance: 0.08 }],
    },
  },
  {
    id: 'a-glasswood-oath',
    name: 'A Glasswood Oath',
    level: 12,
    durationMin: 8,
    encounters: ['glasswing-moth', 'grave-knight'],
    rewardXp: 700,
    rewardGold: 125,
    lootTable: {
      gold: [20, 34],
      entries: [{ itemId: 'all-13-ashen-charm', chance: 0.08 }],
    },
  },
  {
    id: 'the-sunken-bell',
    name: 'The Sunken Bell',
    level: 14,
    durationMin: 9,
    encounters: ['rift-hydra', 'obsidian-titan'],
    rewardXp: 850,
    rewardGold: 155,
    lootTable: {
      gold: [24, 40],
      entries: [{ itemId: 'all-16-starfall-ward', chance: 0.08 }],
    },
  },
  {
    id: 'the-dusk-crown',
    name: 'The Dusk Crown',
    level: 17,
    durationMin: 10,
    encounters: ['dusk-stalker', 'void-colossus'],
    rewardXp: 1_000,
    rewardGold: 190,
    lootTable: {
      gold: [30, 48],
      entries: [{ itemId: 'all-19-dawnforged-blade', chance: 0.08 }],
    },
  },
  {
    id: 'a-star-beyond',
    name: 'A Star Beyond',
    level: 20,
    durationMin: 12,
    encounters: ['frost-lich', 'star-devourer'],
    rewardXp: 1_200,
    rewardGold: 240,
    lootTable: {
      gold: [38, 60],
      entries: [{ itemId: 'star-iron-ring', chance: 0.08 }],
    },
  },
];

export const questsById: Record<string, QuestData> = Object.fromEntries(
  quests.map((quest) => [quest.id, quest]),
);
