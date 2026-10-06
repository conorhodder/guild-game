import { monstersById, type MonsterData } from '../data/monsters';
import type { Con, GameState } from '../types';
import { rngNext, rngPick } from '../rng';
import type { SimEvent } from '../sim';
import { heroStats, grantXp } from './heroes';
import { appendLog } from './log';
import { knockOut } from './recovery';
import { rollLoot } from './loot';
import { recordSkillUse } from './skills';
import { conTier } from './con';

export const COMBAT_ROUND_MS = 3000;
export const MAX_COMBAT_ROUNDS = 30;

const xpMultipliers: Record<Con, number> = {
  trivial: 0,
  easy: 0.5,
  even: 1,
  tough: 1.3,
  deadly: 1.6,
};

export interface FightRequest {
  heroIds: string[];
  monsterId: string;
  channel: string;
  startMs: number;
}

export interface FightResult {
  outcome: 'won' | 'lost' | 'fled';
  endMs: number;
  knockedOut: string[];
}

function clampChance(chance: number): number {
  return Math.max(0.05, Math.min(0.95, chance));
}

function monsterPhrase(monster: MonsterData): string {
  return monster.article ? `${monster.article} ${monster.name}` : monster.name;
}

function logCombat(
  state: GameState,
  channel: string,
  text: string,
  events: SimEvent[],
  simMs: number,
  highlight = false,
): void {
  const line = appendLog(state, channel, 'combat', text, highlight, simMs);
  events.push({ type: 'log', line });
}

function standingHeroes(
  heroIds: string[],
  hpByHero: Record<string, number>,
): string[] {
  return heroIds.filter((heroId) => (hpByHero[heroId] ?? 0) > 0);
}

function damageValue(value: number): number {
  return Math.max(1, Math.round(value));
}

function applyExperience(
  state: GameState,
  heroIds: string[],
  standingHeroIds: string[],
  monster: MonsterData,
  events: SimEvent[],
  simMs: number,
): void {
  const standing = standingHeroIds.filter((heroId) => state.heroes[heroId] !== undefined);
  if (standing.length === 0) return;
  const levels = heroIds.flatMap((heroId) => {
    const hero = state.heroes[heroId];
    return hero ? [hero.level] : [];
  });
  const tier = conTier(monster.level, levels);
  const totalXp =
    monster.xp *
    xpMultipliers[tier] *
    (1 + 0.1 * (heroIds.length - 1));
  const xpEach = totalXp / standing.length;

  if (xpEach > 0) {
    for (const heroId of standing) grantXp(state, heroId, xpEach, events, simMs);
  }
}

export function resolveFight(
  state: GameState,
  { heroIds, monsterId, channel, startMs }: FightRequest,
  events: SimEvent[],
): FightResult {
  const monster = monstersById[monsterId];
  if (!monster) throw new RangeError(`Unknown monster: ${monsterId}`);
  if (!state.seenMonsters.includes(monsterId)) state.seenMonsters.push(monsterId);

  const party = heroIds.flatMap((heroId) => {
    const hero = state.heroes[heroId];
    return hero ? [hero] : [];
  });
  if (party.length === 0) return { outcome: 'lost', endMs: startMs, knockedOut: [] };

  const hpByHero: Record<string, number> = {};
  const maxHpByHero: Record<string, number> = {};
  for (const hero of party) {
    const maxHp = heroStats(hero, state).maxHp;
    hpByHero[hero.id] = maxHp;
    maxHpByHero[hero.id] = maxHp;
  }

  const knockedOut: string[] = [];
  const targetName = monsterPhrase(monster);
  let monsterHp = monster.hp;
  let outcome: FightResult['outcome'] = 'fled';
  let roundsCompleted = 0;

  for (let round = 1; round <= MAX_COMBAT_ROUNDS; round += 1) {
    roundsCompleted = round;
    const roundMs = startMs + (round - 1) * COMBAT_ROUND_MS;

    for (const heroId of heroIds) {
      const hero = state.heroes[heroId];
      if (!hero || (hpByHero[heroId] ?? 0) <= 0) continue;

      if (hero.classId === 'cleric') {
        const healTargetId = heroIds
          .filter((otherId) => otherId !== heroId)
          .filter(
            (otherId) =>
              (hpByHero[otherId] ?? 0) > 0 &&
              (hpByHero[otherId] ?? 0) < (maxHpByHero[otherId] ?? 0) * 0.6,
          )
          .sort(
            (first, second) =>
              (hpByHero[first] ?? 0) / (maxHpByHero[first] ?? 1) -
              (hpByHero[second] ?? 0) / (maxHpByHero[second] ?? 1),
          )[0];
        if (healTargetId) {
          const target = state.heroes[healTargetId];
          if (target) {
            const healAmount = Math.round(
              heroStats(hero, state).heal + (hero.skills.healing ?? 0) / 4 + 4,
            );
            const currentHp = hpByHero[healTargetId] ?? 0;
            const healed = Math.min(
              healAmount,
              (maxHpByHero[healTargetId] ?? currentHp) - currentHp,
            );
            hpByHero[healTargetId] = currentHp + healed;
            recordSkillUse(state, heroId, 'healing', channel, events);
            logCombat(
              state,
              channel,
              `${hero.name} heals ${target.name} for ${healed} HP.`,
              events,
              roundMs,
            );
            continue;
          }
        }
      }

      recordSkillUse(state, heroId, 'offense', channel, events);
      if (hero.classId === 'rogue') {
        recordSkillUse(state, heroId, 'backstab', channel, events);
      } else if (hero.classId === 'wizard') {
        recordSkillUse(state, heroId, 'evocation', channel, events);
      }

      const offense = hero.skills.offense ?? 0;
      const fatiguePenalty = hero.fatigue > 75;
      const hitChance = clampChance(
        0.65 + (offense - 5 * monster.level) / 200 - (fatiguePenalty ? 0.1 : 0),
      );
      if (rngNext(state) >= hitChance) {
        logCombat(state, channel, `${hero.name} misses ${targetName}.`, events, roundMs);
        continue;
      }

      let damage =
        heroStats(hero, state).attack * (0.8 + rngNext(state) * 0.4) - monster.armor / 2;
      if (hero.classId === 'rogue') {
        const critChance = 0.05 + (hero.skills.backstab ?? 0) / 400;
        if (rngNext(state) < critChance) damage *= 2;
      } else if (hero.classId === 'wizard') {
        damage += (hero.skills.evocation ?? 0) / 10;
      }
      if (fatiguePenalty) damage *= 0.8;

      const dealt = damageValue(damage);
      monsterHp -= dealt;
      logCombat(
        state,
        channel,
        `${hero.name} hits ${targetName} for ${dealt} points of damage.`,
        events,
        roundMs,
      );
      if (monsterHp <= 0) break;
    }

    if (monsterHp <= 0) {
      outcome = 'won';
      break;
    }

    const standing = standingHeroes(heroIds, hpByHero);
    if (standing.length === 0) {
      outcome = 'lost';
      break;
    }

    const warriors = standing.filter((heroId) => state.heroes[heroId]?.classId === 'warrior');
    const targetId = warriors[0] ?? rngPick(state, standing);
    const target = state.heroes[targetId];
    if (!target) continue;

    recordSkillUse(state, targetId, 'defense', channel, events);
    const defense = target.skills.defense ?? 0;
    const monsterHitChance = clampChance(
      0.65 + (5 * monster.level - defense) / 200,
    );
    const attackLead = monster.article
      ? `${monster.article[0]?.toUpperCase()}${monster.article.slice(1)} ${monster.name}`
      : monster.name;
    if (rngNext(state) >= monsterHitChance) {
      logCombat(
        state,
        channel,
        `${attackLead} tries to hit ${target.name}, but misses!`,
        events,
        roundMs,
      );
      continue;
    }

    const armor = heroStats(target, state).armor;
    const dealt = damageValue(monster.damage * (0.8 + rngNext(state) * 0.4) - armor / 2);
    hpByHero[targetId] = (hpByHero[targetId] ?? 0) - dealt;
    logCombat(
      state,
      channel,
      `${attackLead} hits ${target.name} for ${dealt} points of damage.`,
      events,
      roundMs,
    );
    if ((hpByHero[targetId] ?? 0) <= 0) {
      knockedOut.push(targetId);
      knockOut(state, targetId, channel, events, roundMs);
      if (standingHeroes(heroIds, hpByHero).length === 0) {
        outcome = 'lost';
        break;
      }
    }
  }

  if (outcome === 'fled' && standingHeroes(heroIds, hpByHero).length === 0) {
    outcome = 'lost';
  }

  const endMs = startMs + roundsCompleted * COMBAT_ROUND_MS;
  if (outcome === 'fled') {
    logCombat(state, channel, `${targetName} flees after ${MAX_COMBAT_ROUNDS} rounds.`, events, endMs);
    return { outcome, endMs, knockedOut };
  }

  if (outcome === 'won') {
    const lastRoundMs = startMs + (roundsCompleted - 1) * COMBAT_ROUND_MS;
    logCombat(state, channel, `You have slain ${targetName}!`, events, lastRoundMs);
    applyExperience(state, heroIds, standingHeroes(heroIds, hpByHero), monster, events, endMs);
    rollLoot(state, monster.lootTable, channel, events, endMs);
  } else {
    logCombat(state, channel, `Your party has been defeated by ${targetName}.`, events, endMs);
  }

  return { outcome, endMs, knockedOut };
}
