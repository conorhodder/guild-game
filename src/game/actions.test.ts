import { describe, expect, it } from 'vitest';
import { equip, foundGuild, sell, sellMaterial, unequip } from './actions';
import { createItemInstance } from './itemIds';
import { createNewGame } from './newGame';

function foundedGame() {
  return foundGuild('The Wayfarers')(
    createNewGame({ seed: 42, wallMs: 0, guildName: '' }),
  );
}

function addItem(state: ReturnType<typeof foundedGame>, itemId: string): string {
  const instance = createItemInstance(state, itemId);
  state.itemInstances[instance.uid] = instance;
  state.stash[instance.uid] = instance;
  return instance.uid;
}

function firstHero(state: ReturnType<typeof foundedGame>) {
  const heroId = state.heroOrder[0];
  const hero = heroId ? state.heroes[heroId] : undefined;
  if (!hero) throw new Error('Expected a starter hero.');
  return hero;
}

describe('equipment and vendor actions', () => {
  it('founds a tank, healer, and damage hero with starter gear equipped', () => {
    const state = foundedGame();
    const heroes = state.heroOrder.map((heroId) => state.heroes[heroId]);

    expect(heroes).toHaveLength(3);
    expect(heroes[0]?.classId).toBe('warrior');
    expect(heroes[1]?.classId).toBe('cleric');
    expect(['rogue', 'wizard']).toContain(heroes[2]?.classId);
    for (const hero of heroes) {
      expect(hero?.equipment.mainHand).toBeDefined();
      expect(hero?.equipment.body).toBeDefined();
      expect(hero?.equipment.mainHand).toMatch(/^i\d+$/);
      expect(hero?.equipment.body).toMatch(/^i\d+$/);
    }
    expect(heroes[0]?.equipment.offHand).toMatch(/^i\d+$/);
  });

  it('equips an item and returns the replaced item to the stash', () => {
    const state = foundedGame();
    const hero = firstHero(state);
    const uid = addItem(state, 'warrior-iron-sword');
    const result = equip(hero.id, uid)(state, 0);

    expect('state' in result).toBe(true);
    if (!('state' in result)) return;
    expect(result.reason).toBeUndefined();
    expect(result.state.heroes[hero.id]?.equipment.mainHand).toBe(uid);
    expect(result.state.stash[uid]).toBeUndefined();
    expect(result.state.stash[hero.equipment.mainHand ?? '']).toEqual({
      uid: hero.equipment.mainHand,
      itemId: 'warrior-iron-sword',
    });
    expect(hero.equipment.mainHand).not.toBe(uid);
  });

  it('returns reasons for missing, level-locked, class-locked, and busy equips', () => {
    const state = foundedGame();
    const hero = firstHero(state);
    const missing = equip(hero.id, 'i999')(state, 0);
    expect('reason' in missing && missing.reason).toBe('That item is not in the stash.');

    const levelLocked = addItem(state, 'reinforced-mail');
    const levelResult = equip(hero.id, levelLocked)(state, 0);
    expect('reason' in levelResult && levelResult.reason).toBe('Requires level 6.');

    const classLocked = addItem(state, 'rogue-rusty-dagger');
    const classResult = equip(hero.id, classLocked)(state, 0);
    expect('reason' in classResult && classResult.reason).toBe('Not available to warrior.');

    const material = addItem(state, 'copper-ore');
    const materialResult = equip(hero.id, material)(state, 0);
    expect('reason' in materialResult && materialResult.reason).toBe('Materials cannot be equipped.');

    const restId = 'a77';
    state.activities[restId] = { kind: 'rest', id: restId, heroId: hero.id, startedAt: 0 };
    hero.activityId = restId;
    const busyResult = equip(hero.id, classLocked)(state, 0);
    expect('reason' in busyResult && busyResult.reason).toBe('Hero must be Idle to equip gear.');
  });

  it('unequips gear back into the shared stash', () => {
    const state = foundedGame();
    const hero = firstHero(state);
    const uid = hero.equipment.mainHand;
    if (!uid) throw new Error('Expected starter main-hand gear.');

    const result = unequip(hero.id, 'mainHand')(state, 0);
    expect('state' in result).toBe(true);
    if (!('state' in result)) return;
    expect(result.state.heroes[hero.id]?.equipment.mainHand).toBeUndefined();
    expect(result.state.stash[uid]).toEqual({ uid, itemId: 'warrior-iron-sword' });
  });

  it('rejects unequipping a hero who is busy', () => {
    const state = foundedGame();
    const hero = firstHero(state);
    const activityId = 'a78';
    state.activities[activityId] = {
      kind: 'rest',
      id: activityId,
      heroId: hero.id,
      startedAt: 0,
    };
    hero.activityId = activityId;

    const result = unequip(hero.id, 'mainHand')(state, 0);

    expect('reason' in result && result.reason).toBe('Hero must be Idle to unequip gear.');
  });

  it('sells stash gear and materials for their listed value', () => {
    const state = foundedGame();
    const uid = addItem(state, 'copper-band');
    const itemResult = sell(uid)(state, 0);
    expect('state' in itemResult).toBe(true);
    if (!('state' in itemResult)) return;
    expect(itemResult.state.gold).toBe(state.gold + 8);
    expect(itemResult.state.stash[uid]).toBeUndefined();

    state.materials['copper-ore'] = 3;
    const materialResult = sellMaterial('copper-ore', 2)(state, 0);
    expect('state' in materialResult).toBe(true);
    if (!('state' in materialResult)) return;
    expect(materialResult.state.gold).toBe(state.gold + 4);
    expect(materialResult.state.materials['copper-ore']).toBe(1);
  });

  it('rejects invalid sales without throwing or changing state', () => {
    const state = foundedGame();
    const missing = sell('i999')(state, 0);
    expect('reason' in missing && missing.reason).toContain('not in the stash');

    const equippedUid = firstHero(state).equipment.mainHand;
    if (!equippedUid) throw new Error('Expected starter gear.');
    const equipped = sell(equippedUid)(state, 0);
    expect('reason' in equipped && equipped.reason).toContain('not in the stash');

    const invalidQuantity = sellMaterial('copper-ore', 0)(state, 0);
    expect('reason' in invalidQuantity && invalidQuantity.reason).toContain('positive whole');
    const insufficient = sellMaterial('copper-ore', 1)(state, 0);
    expect('reason' in insufficient && insufficient.reason).toBe('Not enough materials.');
    expect(state.gold).toBe(50);
  });
});
