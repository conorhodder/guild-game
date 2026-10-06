import type { SimEvent } from '../sim';
import { rngNext } from '../rng';
import { skillCap } from './heroes';
import { appendLog } from './log';
import type { CombatSkill, GatherSkill, GameState, Hero } from '../types';

export type SkillKey = CombatSkill | GatherSkill;

const skillLabels: Record<SkillKey, string> = {
  offense: 'Offense',
  defense: 'Defense',
  healing: 'Healing',
  evocation: 'Evocation',
  backstab: 'Backstab',
  mining: 'Mining',
  herbalism: 'Herbalism',
};

function skillValue(hero: Hero, skill: SkillKey): number {
  if (skill === 'mining' || skill === 'herbalism') return hero.gather[skill];
  return hero.skills[skill] ?? 0;
}

function setSkillValue(hero: Hero, skill: SkillKey, value: number): void {
  if (skill === 'mining' || skill === 'herbalism') {
    hero.gather[skill] = value;
  } else {
    hero.skills[skill] = value;
  }
}

export function trySkillUp(
  state: GameState,
  hero: Hero,
  skill: SkillKey,
  cap: number,
  channel: string,
  events: SimEvent[],
  simMs: number = state.clock.simMs,
): void {
  const value = skillValue(hero, skill);
  if (value >= cap) return;

  const chance = Math.max(0.01, 0.2 * (1 - value / cap));
  if (rngNext(state) >= chance) return;

  const nextValue = Math.min(cap, value + 1);
  setSkillValue(hero, skill, nextValue);
  const line = appendLog(
    state,
    channel,
    'skill',
    `${hero.name} has become better at ${skillLabels[skill]}! (${nextValue})`,
    undefined,
    simMs,
  );
  events.push({ type: 'log', line });
}

export function recordSkillUse(
  state: GameState,
  heroId: string,
  skill: CombatSkill,
  channel: string,
  events: SimEvent[],
  simMs: number = state.clock.simMs,
): void {
  const hero = state.heroes[heroId];
  if (!hero) return;
  trySkillUp(state, hero, skill, skillCap(hero.level), channel, events, simMs);
}
