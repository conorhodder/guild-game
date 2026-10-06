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
];

export const questsById: Record<string, QuestData> = Object.fromEntries(
  quests.map((quest) => [quest.id, quest]),
);
