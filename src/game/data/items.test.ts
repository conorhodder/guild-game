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
      (item) =>
        item.slot !== 'material' &&
        !starterIds.has(item.id) &&
        (item.rarity === 'common' || item.rarity === 'uncommon'),
    );

    for (const classId of validClasses) {
      const gear = starterGear[classId as keyof typeof starterGear];
      expect(gear.mainHand).toBeDefined();
      expect(gear.body).toBeDefined();
    }
    expect(starterGear.warrior.offHand).toBeDefined();
    expect(additionalGear.filter((item) => item.levelReq <= 6).length).toBeGreaterThanOrEqual(8);
    expect(
      additionalGear.every(
        (item) =>
          (item.rarity === 'common' || item.rarity === 'uncommon') &&
          item.levelReq >= 1 &&
          item.levelReq <= 20,
      ),
    ).toBe(true);
  });

  it('provides common and uncommon upgrades in every slot for each class through level 20', () => {
    const milestones = [4, 7, 10, 13, 16, 19];
    const slots = ['mainHand', 'offHand', 'body', 'trinket'];

    for (const level of milestones) {
      for (const slot of slots) {
        const item = items.find(
          (candidate) =>
            candidate.id.startsWith(`all-${level}-`) &&
            candidate.slot === slot &&
            (candidate.rarity === 'common' || candidate.rarity === 'uncommon'),
        );
        expect(item).toBeDefined();
        expect(item?.classes).toBe('all');
      }
    }
  });

  it('defines three increasingly valuable and demanding materials for each gathering skill', () => {
    for (const skill of ['mining', 'herbalism'] as const) {
      const materials = items
        .filter((item) => item.slot === 'material' && item.gatherSkill === skill)
        .sort((first, second) => first.levelReq - second.levelReq);

      expect(materials).toHaveLength(3);
      expect(materials.map((item) => item.levelReq)).toEqual([1, 30, 60]);
      for (let index = 1; index < materials.length; index += 1) {
        const previous = materials[index - 1];
        const current = materials[index];
        if (!previous || !current) throw new Error('Expected three material tiers.');
        expect(current.levelReq).toBeGreaterThan(previous.levelReq);
        expect(current.value).toBeGreaterThan(previous.value);
      }
      expect(materials.at(-1)?.value).toBeLessThanOrEqual(3);
    }
    expect(
      items
        .filter((item) => item.slot === 'material')
        .every((item) => item.gatherSkill === 'mining' || item.gatherSkill === 'herbalism'),
    ).toBe(true);
  });
});
