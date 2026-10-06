import { itemsById } from '../data/items';
import type { GameState, Rarity } from '../types';
import type { SimEvent } from '../sim';
import { OFFLINE_CAP_MS } from '../clock';
import { xpToNext, heroStatus } from './heroes';

export interface AwaySkillUp {
  skill: string;
  count: number;
  value: number;
}

export interface AwayHeroSummary {
  heroId: string;
  name: string;
  levelsGained: number;
  xpGained: number;
  skillUps: AwaySkillUp[];
  knockouts: number;
  needsAttention: boolean;
}

export interface AwayMaterialSummary {
  itemId: string;
  name: string;
  quantity: number;
}

export interface AwaySummary {
  rawDelta: number;
  credited: number;
  capped: boolean;
  heroes: AwayHeroSummary[];
  goldGained: number;
  itemsByRarity: Record<Rarity, number>;
  rareDrops: string[];
  namedDrops: string[];
  materials: AwayMaterialSummary[];
  kills: number;
  namedKills: number;
  questsCompleted: number;
  questsFailed: number;
  knockouts: number;
  allQuiet: boolean;
}

function totalExperience(level: number, xp: number): number {
  let total = xp;
  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    total += xpToNext(currentLevel);
  }
  return total;
}

export function summarizeAbsence(
  before: GameState,
  after: GameState,
  events: readonly SimEvent[],
  credited: number,
  rawDelta: number,
): AwaySummary {
  const skillUps = new Map<string, Map<string, AwaySkillUp>>();
  const knockoutCounts = new Map<string, number>();
  const itemsByRarity: Record<Rarity, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    named: 0,
  };
  const materials = new Map<string, AwayMaterialSummary>();
  const rareDrops: string[] = [];
  const namedDrops: string[] = [];
  let goldGained = 0;
  let kills = 0;
  let namedKills = 0;
  let questsCompleted = 0;
  let questsFailed = 0;
  let knockouts = 0;

  for (const event of events) {
    if (event.type === 'gold') {
      goldGained += event.amount;
    } else if (event.type === 'loot') {
      const item = itemsById[event.itemId];
      if (!item) continue;
      if (item.slot === 'material') {
        const current = materials.get(item.id);
        materials.set(item.id, {
          itemId: item.id,
          name: item.name,
          quantity: (current?.quantity ?? 0) + 1,
        });
      } else {
        itemsByRarity[event.rarity] += 1;
        if (event.rarity === 'rare') rareDrops.push(item.name);
        if (event.rarity === 'named') namedDrops.push(item.name);
      }
    } else if (event.type === 'kill') {
      kills += 1;
      if (event.named) namedKills += 1;
    } else if (event.type === 'quest') {
      if (event.outcome === 'complete') questsCompleted += 1;
      else questsFailed += 1;
    } else if (event.type === 'knockout') {
      knockouts += 1;
      knockoutCounts.set(event.heroId, (knockoutCounts.get(event.heroId) ?? 0) + 1);
    } else if (event.type === 'skillUp') {
      let heroSkillUps = skillUps.get(event.heroId);
      if (!heroSkillUps) {
        heroSkillUps = new Map();
        skillUps.set(event.heroId, heroSkillUps);
      }
      const current = heroSkillUps.get(event.skill);
      heroSkillUps.set(event.skill, {
        skill: event.skill,
        count: (current?.count ?? 0) + 1,
        value: event.value,
      });
    }
  }

  const heroIds = [...new Set([...before.heroOrder, ...after.heroOrder])];
  const heroes = heroIds.flatMap((heroId) => {
    const beforeHero = before.heroes[heroId];
    const afterHero = after.heroes[heroId];
    if (!afterHero) return [];
    const levelsGained = Math.max(0, afterHero.level - (beforeHero?.level ?? afterHero.level));
    const xpGained = Math.floor(
      Math.max(
        0,
        totalExperience(afterHero.level, afterHero.xp) -
          (beforeHero
            ? totalExperience(beforeHero.level, beforeHero.xp)
            : totalExperience(afterHero.level, afterHero.xp)),
      ),
    );
    const heroSkillUps = [...(skillUps.get(heroId)?.values() ?? [])];
    const heroKnockouts = knockoutCounts.get(heroId) ?? 0;
    const status = heroStatus(afterHero, after);
    const needsAttention =
      status === 'Injured' || (status === 'Idle' && afterHero.fatigue >= 75);
    if (
      levelsGained === 0 &&
      xpGained === 0 &&
      heroSkillUps.length === 0 &&
      heroKnockouts === 0 &&
      !needsAttention
    ) {
      return [];
    }
    return [{
      heroId,
      name: afterHero.name,
      levelsGained,
      xpGained,
      skillUps: heroSkillUps,
      knockouts: heroKnockouts,
      needsAttention,
    }];
  });
  heroes.sort((first, second) => Number(second.needsAttention) - Number(first.needsAttention));

  const summary: AwaySummary = {
    rawDelta,
    credited,
    capped: rawDelta > OFFLINE_CAP_MS,
    heroes,
    goldGained,
    itemsByRarity,
    rareDrops,
    namedDrops,
    materials: [...materials.values()].sort((first, second) =>
      first.name.localeCompare(second.name),
    ),
    kills,
    namedKills,
    questsCompleted,
    questsFailed,
    knockouts,
    allQuiet: false,
  };
  summary.allQuiet =
    summary.heroes.length === 0 &&
    goldGained === 0 &&
    Object.values(itemsByRarity).every((count) => count === 0) &&
    summary.materials.length === 0 &&
    kills === 0 &&
    questsCompleted === 0 &&
    questsFailed === 0 &&
    knockouts === 0;
  return summary;
}
