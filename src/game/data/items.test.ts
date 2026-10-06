import { describe, expect, it } from 'vitest';
import { items, starterGear } from './items';

const validSlots = ['mainHand', 'offHand', 'body', 'trinket', 'material'];
const validClasses = ['warrior', 'cleric', 'rogue', 'wizard'];

describe('item data', () => {
  it('uses unique ids and valid slots and class restrictions', () => {
    const ids = items.map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const item of items) {
      expect(validSlots).toContain(item.slot);
      if (item.classes !== 'all') {
        expect(item.classes.length).toBeGreaterThan(0);
        for (const classId of item.classes) expect(validClasses).toContain(classId);
      }
    }
  });

  it('provides starter gear for every class and eight other level 1–6 gear items', () => {
    const starterIds = new Set(
      Object.values(starterGear).flatMap((gear) => Object.values(gear)),
    );
    const additionalGear = items.filter(
      (item) => item.slot !== 'material' && !starterIds.has(item.id),
    );

    for (const classId of validClasses) {
      const gear = starterGear[classId as keyof typeof starterGear];
      expect(gear.mainHand).toBeDefined();
      expect(gear.body).toBeDefined();
    }
    expect(starterGear.warrior.offHand).toBeDefined();
    expect(additionalGear).toHaveLength(8);
    expect(
      additionalGear.every(
        (item) =>
          (item.rarity === 'common' || item.rarity === 'uncommon') &&
          item.levelReq >= 1 &&
          item.levelReq <= 6,
      ),
    ).toBe(true);
  });
});
