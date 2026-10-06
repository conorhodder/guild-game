import { classes } from '../data/classes';
import { itemsById } from '../data/items';
import { familyNames, firstNames, flavourLines } from '../data/names';
import { rngPick } from '../rng';
import type { GameState, Hero, ClassId, GatherSkill, CombatSkill } from '../types';
import { appendLog } from './log';
import type { SimEvent } from '../sim';

export const XP_BASE = 100;
export const XP_EXP = 2.2;
export const HERO_LEVEL_CAP = 20;

export type HeroStatus = 'Idle' | 'On quest' | 'Camping' | 'Gathering' | 'Resting' | 'Injured';

export interface HeroStats {
  maxHp: number;
  attack: number;
  armor: number;
  heal: number;
}

export function skillCap(level: number): number {
  return 5 * (level + 1);
}

export function gatherCap(level: number): number {
  return 10 + 4 * level;
}

export function xpToNext(level: number): number {
  if (!Number.isInteger(level) || level < 1) throw new RangeError('Level must be a positive integer.');
  return Math.round(XP_BASE * level ** XP_EXP);
}

export function createHero(state: GameState, classId: ClassId, level: number): Hero {
  const classDefinition = classes[classId];
  if (!classDefinition) throw new RangeError(`Unknown hero class: ${classId}`);
  if (!Number.isInteger(level) || level < 1 || level > HERO_LEVEL_CAP) {
    throw new RangeError(`Hero level must be between 1 and ${HERO_LEVEL_CAP}.`);
  }

  const startingSkill = Math.min(skillCap(level), 5 + 2 * level);
  const skills = Object.fromEntries(
    classDefinition.skills.map((skill) => [skill, startingSkill]),
  ) as Partial<Record<CombatSkill, number>>;
  const gather: Record<GatherSkill, number> = { mining: 1, herbalism: 1 };

  const hero: Hero = {
    id: `h${state.nextId}`,
    name: `${rngPick(state, firstNames)} ${rngPick(state, familyNames)}`,
    classId,
    glyph: classDefinition.glyph,
    flavour: rngPick(state, flavourLines),
    level,
    xp: 0,
    skills,
    gather,
    equipment: {},
    fatigue: 0,
    activityId: null,
    injuredUntil: null,
  };
  state.nextId += 1;
  return hero;
}

export function heroStatus(hero: Hero, state: GameState): HeroStatus {
  if (hero.injuredUntil !== null && hero.injuredUntil > state.clock.simMs) return 'Injured';

  if (hero.activityId !== null) {
    const activity = state.activities[hero.activityId];
    if (activity) {
      if (activity.kind === 'quest') return 'On quest';
      if (activity.kind === 'camp') return 'Camping';
      if (activity.kind === 'gather') return 'Gathering';
      return 'Resting';
    }
  }

  return 'Idle';
}

export function heroStats(hero: Hero, state: GameState): HeroStats {
  const currentHero = state.heroes[hero.id] ?? hero;
  const classDefinition = classes[currentHero.classId];
  const result: HeroStats = {
    maxHp: classDefinition.baseHp + classDefinition.hpPerLevel * (currentHero.level - 1),
    attack:
      classDefinition.baseAttack +
      classDefinition.attackPerLevel * (currentHero.level - 1),
    armor: 0,
    heal: 0,
  };

  for (const uid of Object.values(currentHero.equipment)) {
    const instance = state.itemInstances[uid];
    const item = instance ? itemsById[instance.itemId] : undefined;
    if (!item) continue;
    result.maxHp += item.stats.hp ?? 0;
    result.attack += item.stats.attack ?? 0;
    result.armor += item.stats.armor ?? 0;
    result.heal += item.stats.heal ?? 0;
  }

  return result;
}

export function grantXp(
  state: GameState,
  heroId: string,
  amount: number,
  events: SimEvent[],
  simMs: number = state.clock.simMs,
): void {
  if (!Number.isFinite(amount) || amount < 0) throw new RangeError('XP must be a non-negative finite number.');
  const hero = state.heroes[heroId];
  if (!hero) return;
  if (hero.level >= HERO_LEVEL_CAP) {
    hero.xp = 0;
    return;
  }

  hero.xp += amount;
  while (hero.level < HERO_LEVEL_CAP) {
    const required = xpToNext(hero.level);
    if (hero.xp < required) break;
    hero.xp -= required;
    hero.level += 1;
    const line = appendLog(
      state,
      'guild',
      'system',
      `${hero.name} has gained a level! Welcome to level ${hero.level}!`,
      true,
      simMs,
    );
    events.push({ type: 'log', line });
    events.push({ type: 'levelUp', heroId: hero.id, level: hero.level });
  }
  if (hero.level >= HERO_LEVEL_CAP) hero.xp = 0;
}
