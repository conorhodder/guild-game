import { describe, expect, it } from 'vitest';
import { itemsById } from './items';
import { monsters } from './monsters';
import { monstersById } from './monsters';
import { campsById, zones } from './zones';

describe('zone data', () => {
  it('covers the requested level bands with valid camps and named monsters', () => {
    expect(zones.map((zone) => zone.levelRange)).toEqual([
      [1, 7],
      [6, 13],
      [12, 20],
    ]);
    expect(Object.keys(campsById)).toHaveLength(zones.reduce(
      (total, zone) => total + zone.camps.length,
      0,
    ));

    for (const [zoneIndex, zone] of zones.entries()) {
      expect(zone.camps.length).toBeGreaterThanOrEqual(2);
      expect(zone.camps.length).toBeLessThanOrEqual(3);
      for (const camp of zone.camps) {
        expect(camp.namedChance).toBeGreaterThanOrEqual(0.05);
        expect(camp.namedChance).toBeLessThanOrEqual(0.12);
        expect(camp.respawnSec).toBeGreaterThanOrEqual(60);
        expect(camp.respawnSec).toBeLessThanOrEqual(180);
        for (const monsterId of camp.monsters) {
          expect(monstersById[monsterId]).toBeDefined();
        }
        if (zoneIndex > 0) {
          expect(camp.namedId).toBeDefined();
        }
        if (camp.namedId) expect(monstersById[camp.namedId]?.named).toBe(true);
      }
    }
    expect(monstersById['grizzlefang']?.named).toBe(true);
    expect(monstersById['morrow-the-hollow']?.named).toBe(true);
    expect(monstersById['ashen-wyrm']?.named).toBe(true);
  });

  it('makes Rare loot available from camp monsters and keeps camp levels in their zone bands', () => {
    const campMonsterIds = new Set(zones.flatMap((zone) => zone.camps.flatMap((camp) => camp.monsters)));
    const campMonsters = monsters.filter((monster) => campMonsterIds.has(monster.id));

    expect(
      campMonsters.some((monster) =>
        monster.lootTable.entries.some((entry) => itemsById[entry.itemId]?.rarity === 'rare'),
      ),
    ).toBe(true);

    for (const zone of zones) {
      for (const camp of zone.camps) {
        for (const monsterId of [...camp.monsters, ...(camp.namedId ? [camp.namedId] : [])]) {
          const monster = monstersById[monsterId];
          expect(monster?.level).toBeGreaterThanOrEqual(zone.levelRange[0]);
          expect(monster?.level).toBeLessThanOrEqual(zone.levelRange[1]);
        }
      }
    }
  });
});
