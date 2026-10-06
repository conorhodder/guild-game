import {
  dispatchQuest,
  equip,
  foundGuild,
  getHireReason,
  hire,
  recall,
  rest,
  sell,
  sellMaterial,
  startCamp,
  startGather,
  type GameAction,
} from '../actions';
import { campsById, zones } from '../data/zones';
import { classes } from '../data/classes';
import { items, itemsById, starterGear } from '../data/items';
import { monstersById } from '../data/monsters';
import { quests } from '../data/quests';
import { createItemInstance } from '../itemIds';
import { createNewGame } from '../newGame';
import type { GameState, Hero, ItemData, Slot } from '../types';
import { advance } from '../sim';
import { conTier } from '../systems/con';
import { createHero, gatherCap, heroStats, heroStatus, skillCap } from '../systems/heroes';

const POLICY_INTERVAL_MS = 5 * 60_000;
const CAMP_CHECK_MS = 60_000;
const conMultipliers = {
  trivial: 0,
  easy: 0.5,
  even: 1,
  tough: 1.3,
  deadly: 1.6,
} as const;
const slots: Slot[] = ['mainHand', 'offHand', 'body', 'trinket'];

export interface ProgressionMetrics {
  seed: number;
  level10Hours: number;
  level20Hours: number;
}

export interface NamedCampMetrics {
  seed: number;
  zoneId: string;
  campId: string;
  hoursToNamedDrop: number;
}

interface ActivityChoice {
  kind: 'quest' | 'camp';
  id: string;
  score: number;
  zoneId?: string;
}

function applyAction(state: GameState, action: GameAction): GameState {
  const result = action(state, state.clock.lastWallMs);
  return 'state' in result ? result.state : result;
}

function itemScore(item: ItemData | undefined): number {
  if (!item) return 0;
  return (
    (item.stats.attack ?? 0) +
    (item.stats.armor ?? 0) * 0.8 +
    (item.stats.hp ?? 0) * 0.04 +
    (item.stats.heal ?? 0) * 0.6
  );
}

function eligibleForHero(item: ItemData, hero: Hero): boolean {
  return (
    item.slot !== 'material' &&
    item.levelReq <= hero.level &&
    (item.classes === 'all' || item.classes.includes(hero.classId))
  );
}

function equippedItem(state: GameState, hero: Hero, slot: Slot): ItemData | undefined {
  const uid = hero.equipment[slot];
  const instance = uid ? state.itemInstances[uid] : undefined;
  return instance ? itemsById[instance.itemId] : undefined;
}

function equipBestUpgrades(state: GameState): GameState {
  for (const heroId of state.heroOrder) {
    const initialHero = state.heroes[heroId];
    if (!initialHero || heroStatus(initialHero, state) !== 'Idle') continue;

    for (const slot of slots) {
      const hero = state.heroes[heroId];
      if (!hero) break;
      const currentScore = itemScore(equippedItem(state, hero, slot));
      const candidate = Object.values(state.stash)
        .flatMap((instance) => {
          const item = itemsById[instance.itemId];
          return item?.slot === slot && eligibleForHero(item, hero)
            ? [{ uid: instance.uid, item }]
            : [];
        })
        .filter(({ item }) => itemScore(item) > currentScore)
        .sort((first, second) => itemScore(second.item) - itemScore(first.item))[0];
      if (candidate) state = applyAction(state, equip(hero.id, candidate.uid));
    }
  }
  return state;
}

function restTiredHeroes(state: GameState): GameState {
  for (const activity of Object.values(state.activities)) {
    if (
      (activity.kind === 'camp' &&
        activity.heroIds.some((heroId) => (state.heroes[heroId]?.fatigue ?? 0) > 75)) ||
      (activity.kind === 'gather' &&
        (state.heroes[activity.heroId]?.fatigue ?? 0) > 75)
    ) {
      state = applyAction(state, recall(activity.id));
    }
  }
  for (const heroId of state.heroOrder) {
    const hero = state.heroes[heroId];
    if (hero && hero.fatigue > 75 && heroStatus(hero, state) === 'Idle') {
      state = applyAction(state, rest(heroId));
    }
  }
  return state;
}

function hireWhileAffordable(state: GameState): GameState {
  while (state.heroOrder.length < 8) {
    const candidateIndex = state.recruitment.candidates
      .map((candidate, index) => ({ candidate, index }))
      .filter(({ index }) => getHireReason(state, index) === null)
      .sort((first, second) => first.candidate.level - second.candidate.level)[0]?.index;
    if (candidateIndex === undefined) break;
    const next = applyAction(state, hire(candidateIndex));
    if (next === state) break;
    state = next;
  }
  return state;
}

function sellNonUpgrades(state: GameState): GameState {
  for (const [itemId, quantity] of Object.entries(state.materials)) {
    state = applyAction(state, sellMaterial(itemId, quantity));
  }

  for (const instance of Object.values(state.stash)) {
    const item = itemsById[instance.itemId];
    if (!item) continue;
    const slot = item.slot;
    if (slot === 'material') continue;
    const remainsUseful = state.heroOrder.some((heroId) => {
      const hero = state.heroes[heroId];
      return Boolean(
        hero &&
          eligibleForHero(item, hero) &&
          itemScore(item) > itemScore(equippedItem(state, hero, slot)),
      );
    });
    if (!remainsUseful) state = applyAction(state, sell(instance.uid));
  }
  return state;
}

function groupHeroes(state: GameState, heroIds: string[]): string[] {
  const selected: string[] = [];
  const takeClass = (classId: string) => {
    const index = heroIds.findIndex((heroId) => state.heroes[heroId]?.classId === classId);
    if (index >= 0) selected.push(...heroIds.splice(index, 1));
  };
  takeClass('warrior');
  takeClass('cleric');
  while (selected.length < 4 && heroIds.length > 0) selected.push(heroIds.shift() ?? '');
  return selected.filter(Boolean);
}

function activityScore(state: GameState, heroIds: string[]): ActivityChoice | null {
  const partyLevels = heroIds.flatMap((heroId) => {
    const level = state.heroes[heroId]?.level;
    return level === undefined ? [] : [level];
  });
  const groupBonus = 1 + 0.1 * (heroIds.length - 1);
  const eligibleCon = (level: number) => {
    const tier = conTier(level, partyLevels);
    return tier === 'easy' || tier === 'even' || tier === 'tough'
      ? conMultipliers[tier]
      : 0;
  };
  const candidates: ActivityChoice[] = [];

  for (const quest of quests) {
    const multiplier = eligibleCon(quest.level);
    if (multiplier === 0) continue;
    const expectedXp = quest.encounters.reduce((total, monsterId) => {
      const monster = monstersById[monsterId];
      return total + (monster ? monster.xp * eligibleCon(monster.level) * groupBonus : 0);
    }, quest.rewardXp);
    candidates.push({
      kind: 'quest',
      id: quest.id,
      score: expectedXp / quest.durationMin,
    });
  }

  for (const zone of zones) {
    for (const camp of zone.camps) {
      if (
        Object.values(state.activities).some(
          (activity) => activity.kind === 'camp' && activity.campId === camp.id,
        )
      ) {
        continue;
      }
      const campMonsters = camp.monsters.flatMap((monsterId) => {
        const monster = monstersById[monsterId];
        return monster ? [monster] : [];
      });
      if (campMonsters.length === 0) continue;
      const campCon = eligibleCon(
        Math.min(...campMonsters.map((monster) => monster.level)),
      );
      if (campCon === 0) continue;
      const named = camp.namedId ? monstersById[camp.namedId] : undefined;
      const expectedXp =
        (campMonsters.reduce(
          (total, monster) => total + monster.xp * eligibleCon(monster.level),
          0,
        ) /
          campMonsters.length +
          (named ? named.xp * camp.namedChance * eligibleCon(named.level) : 0)) *
        groupBonus;
      const partyAttack = heroIds.reduce(
        (total, heroId) => total + heroStats(state.heroes[heroId]!, state).attack,
        0,
      );
      const averageHp =
        campMonsters.reduce((total, monster) => total + monster.hp, 0) /
        campMonsters.length;
      const averageArmor =
        campMonsters.reduce((total, monster) => total + monster.armor, 0) /
        campMonsters.length;
      const damagePerRound = Math.max(
        1,
        partyAttack * 0.65 - averageArmor * heroIds.length * 0.5,
      );
      const fightSec = Math.max(3, Math.ceil(averageHp / damagePerRound) * 3);
      candidates.push({
        kind: 'camp',
        id: camp.id,
        zoneId: zone.id,
        score: (expectedXp * 60) / (camp.respawnSec + fightSec),
      });
    }
  }

  return candidates.sort((first, second) => second.score - first.score)[0] ?? null;
}

function assignGroup(
  state: GameState,
  heroIds: string[],
): GameState {
  const party = groupHeroes(state, heroIds);
  const activity = activityScore(state, party);
  if (activity?.kind === 'quest') {
    const result = applyAction(state, dispatchQuest(activity.id, party));
    if (result !== state) return result;
  }
  if (activity?.kind === 'camp' && activity.zoneId) {
    const result = applyAction(state, startCamp(activity.zoneId, activity.id, party));
    if (result !== state) return result;
  }
  return party.reduce(
    (current, heroId) => applyAction(current, startGather(heroId, 'mining')),
    state,
  );
}

function assignIdleHeroes(state: GameState): GameState {
  const idle = state.heroOrder.filter((heroId) => {
    const hero = state.heroes[heroId];
    return Boolean(
      hero &&
        heroStatus(hero, state) === 'Idle' &&
        hero.fatigue <= 75 &&
      hero.injuredUntil === null,
    );
  });
  const holdLeftovers =
    idle.length < 3 &&
    state.heroOrder.some(
      (heroId) =>
        !idle.includes(heroId) &&
        state.heroes[heroId] !== undefined,
    );
  while (idle.length >= 3) {
    const size = idle.length >= 4 ? 4 : 3;
    const party = idle.splice(0, size);
    state = assignGroup(state, party);
  }
  if (holdLeftovers) return state;
  for (const heroId of idle) {
    const hero = state.heroes[heroId];
    if (!hero) continue;
    const skill = hero.gather.mining >= hero.gather.herbalism ? 'mining' : 'herbalism';
    state = applyAction(state, startGather(heroId, skill));
  }
  return state;
}

function runPolicy(state: GameState): GameState {
  state = equipBestUpgrades(state);
  state = restTiredHeroes(state);
  state = hireWhileAffordable(state);
  state = sellNonUpgrades(state);
  return assignIdleHeroes(state);
}

export function simulateProgression(
  seed: number,
  maxHours = 120,
): ProgressionMetrics {
  let state = foundGuild('Balance Sim')(
    createNewGame({ seed, wallMs: 0, guildName: '' }),
  );
  const starterIds = [...state.heroOrder];
  let level10At: number | null = null;
  let level20At: number | null = null;

  while (state.clock.simMs < maxHours * 60 * 60_000 && level20At === null) {
    state = runPolicy(state);
    state = advance(state, state.clock.simMs + POLICY_INTERVAL_MS).state;
    const starterLevels = starterIds.flatMap((heroId) => {
      const level = state.heroes[heroId]?.level;
      return level === undefined ? [] : [level];
    });
    if (level10At === null && starterLevels.some((level) => level >= 10)) {
      level10At = state.clock.simMs;
    }
    if (starterLevels.some((level) => level >= 20)) level20At = state.clock.simMs;
  }

  if (level10At === null || level20At === null) {
    const progress = starterIds
      .map((heroId) => {
        const hero = state.heroes[heroId];
        return hero
          ? `${hero.name}: L${hero.level} ${Math.floor(hero.xp)} XP, fatigue ${Math.floor(hero.fatigue)}, ${heroStatus(hero, state)}`
          : `${heroId}: missing`;
      })
      .join('; ');
    throw new Error(
      `Seed ${seed} did not reach level 20 within ${maxHours} hours (${progress}; ` +
        `${state.ledger.questsCompleted} quests, ${state.ledger.questsFailed} failures, ` +
        `${state.ledger.kills} kills, ${state.ledger.namedKills} named kills, ` +
        `${state.heroOrder.length} heroes, ${state.gold} gold; ` +
        `candidate ${JSON.stringify(activityScore(state, starterIds))}; ` +
        `activities ${Object.values(state.activities).map((activity) => activity.kind).join(',')}).`,
    );
  }
  return {
    seed,
    level10Hours: level10At / 3_600_000,
    level20Hours: level20At / 3_600_000,
  };
}

function equipCampParty(state: GameState, heroIds: string[], level: number): GameState {
  for (const heroId of heroIds) {
    const hero = state.heroes[heroId];
    if (!hero) continue;
    hero.level = level;
    hero.xp = 0;
    hero.fatigue = 0;
    hero.injuredUntil = null;
    hero.skills = Object.fromEntries(
      classes[hero.classId].skills.map((skill) => [skill, skillCap(level)]),
    ) as Hero['skills'];
    hero.gather = { mining: Math.min(60, gatherCap(level)), herbalism: Math.min(60, gatherCap(level)) };
  }

  for (const heroId of heroIds) {
    const hero = state.heroes[heroId];
    if (!hero) continue;
    for (const slot of slots) {
      const best = items
        .filter(
          (item) =>
            item.slot === slot &&
            (item.rarity === 'common' || item.rarity === 'uncommon') &&
            eligibleForHero(item, hero),
        )
        .sort((first, second) => itemScore(second) - itemScore(first))[0];
      if (!best || itemScore(best) <= itemScore(equippedItem(state, hero, slot))) continue;
      const instance = createItemInstance(state, best.id);
      state.itemInstances[instance.uid] = instance;
      state.stash[instance.uid] = instance;
      state = applyAction(state, equip(heroId, instance.uid));
    }
  }
  return state;
}

export function simulateNamedCamp(
  seed: number,
  zoneId: string,
  campId: string,
  maxHours = 24,
): NamedCampMetrics {
  const zone = zones.find((candidate) => candidate.id === zoneId);
  const camp = campsById[campId];
  const namedMonster = camp?.namedId ? monstersById[camp.namedId] : undefined;
  if (!zone || !camp || !namedMonster) throw new RangeError('Unknown named camp.');
  const namedItemIds = new Set(
    namedMonster.lootTable.entries
      .filter((entry) => itemsById[entry.itemId]?.rarity === 'named')
      .map((entry) => entry.itemId),
  );
  if (namedItemIds.size === 0) throw new Error(`Named monster ${namedMonster.id} has no Named item.`);

  let state = foundGuild('Camp Sim')(
    createNewGame({ seed, wallMs: 0, guildName: '' }),
  );
  const partyIds = [...state.heroOrder];
  const partyClasses = partyIds.flatMap((heroId) => {
    const classId = state.heroes[heroId]?.classId;
    return classId ? [classId] : [];
  });
  const missingDamageClass = partyClasses.includes('rogue') ? 'wizard' : 'rogue';
  const extra = createHeroForCamp(state, missingDamageClass, namedMonster.level);
  state.heroes[extra.id] = extra;
  state.heroOrder.push(extra.id);
  for (const [slot, itemId] of Object.entries(starterGear[extra.classId])) {
    if (!itemId) continue;
    const instance = createItemInstance(state, itemId);
    state.itemInstances[instance.uid] = instance;
    extra.equipment[slot as Slot] = instance.uid;
  }
  partyIds.push(extra.id);
  state = equipCampParty(state, partyIds, namedMonster.level);

  const campAction = () => startCamp(zoneId, campId, partyIds);
  state = applyAction(state, campAction());
  const initialCamp = Object.values(state.activities).find(
    (activity) => activity.kind === 'camp' && activity.campId === campId,
  );
  if (!initialCamp) throw new Error(`Could not start named camp ${camp.name}.`);

  const limitMs = maxHours * 3_600_000;
  while (state.clock.simMs < limitMs) {
    const runningCamp = Object.values(state.activities).some(
      (activity) => activity.kind === 'camp' && activity.campId === campId,
    );
    if (!runningCamp) {
      for (const heroId of partyIds) {
        const hero = state.heroes[heroId];
        if (
          hero &&
          hero.activityId === null &&
          hero.injuredUntil === null &&
          hero.fatigue > 0
        ) {
          state = applyAction(state, rest(heroId));
        }
      }
      const ready = partyIds.every((heroId) => {
        const hero = state.heroes[heroId];
        return Boolean(
          hero &&
            hero.activityId === null &&
            hero.injuredUntil === null &&
            hero.fatigue === 0,
        );
      });
      if (ready) state = applyAction(state, campAction());
    }

    const result = advance(state, state.clock.simMs + CAMP_CHECK_MS);
    state = result.state;
    if (
      result.events.some(
        (event) => event.type === 'loot' && event.rarity === 'named' && namedItemIds.has(event.itemId),
      )
    ) {
      return {
        seed,
        zoneId,
        campId,
        hoursToNamedDrop: state.clock.simMs / 3_600_000,
      };
    }
  }
  throw new Error(
    `Seed ${seed} found no Named drop at ${camp.name} within ${maxHours} hours ` +
      `(${state.ledger.namedKills} named kills, ${state.ledger.knockouts} knockouts).`,
  );
}

function createHeroForCamp(
  state: GameState,
  classId: Hero['classId'],
  level: number,
): Hero {
  const hero = createHero(state, classId, level);
  return hero;
}
