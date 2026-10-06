export interface CampData {
  id: string;
  name: string;
  monsters: string[];
  namedId?: string;
  namedChance: number;
  respawnSec: number;
}

export interface ZoneData {
  id: string;
  name: string;
  levelRange: [number, number];
  camps: CampData[];
}

export const zones: ZoneData[] = [
  {
    id: 'reedlands',
    name: 'The Reedlands',
    levelRange: [1, 7],
    camps: [
      {
        id: 'marsh-edge',
        name: 'Marsh Edge',
        monsters: ['marsh-rat', 'bog-crawler'],
        namedId: 'grizzlefang',
        namedChance: 0.05,
        respawnSec: 90,
      },
      {
        id: 'hollow-mire',
        name: 'Hollow Mire',
        monsters: ['grave-wisp', 'thorn-wolf'],
        namedId: 'morrow-the-hollow',
        namedChance: 0.05,
        respawnSec: 120,
      },
    ],
  },
  {
    id: 'cinder-march',
    name: 'The Cinder March',
    levelRange: [6, 13],
    camps: [
      {
        id: 'cinder-fields',
        name: 'Cinder Fields',
        monsters: ['iron-golem', 'ember-sprite', 'ash-stalker'],
        namedId: 'ashen-wyrm',
        namedChance: 0.05,
        respawnSec: 100,
      },
      {
        id: 'glasswood',
        name: 'Glasswood',
        monsters: ['glasswing-moth', 'grave-knight', 'moonfang-hound'],
        namedId: 'glasswing-queen',
        namedChance: 0.07,
        respawnSec: 150,
      },
    ],
  },
  {
    id: 'shattered-reach',
    name: 'The Shattered Reach',
    levelRange: [12, 20],
    camps: [
      {
        id: 'shattered-ridge',
        name: 'Shattered Ridge',
        monsters: ['rift-hydra', 'obsidian-titan', 'dusk-stalker'],
        namedId: 'cindermaw',
        namedChance: 0.05,
        respawnSec: 120,
      },
      {
        id: 'starfall-trench',
        name: 'Starfall Trench',
        monsters: ['void-colossus', 'frost-lich', 'star-devourer'],
        namedId: 'star-eater',
        namedChance: 0.06,
        respawnSec: 180,
      },
    ],
  },
];

export const zonesById: Record<string, ZoneData> = Object.fromEntries(
  zones.map((zone) => [zone.id, zone]),
);

export const campsById: Record<string, CampData> = Object.fromEntries(
  zones.flatMap((zone) => zone.camps.map((camp) => [camp.id, camp])),
);
