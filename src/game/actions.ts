import { itemsById, starterGear } from './data/items';
import { createItemInstance } from './itemIds';
import { rngPick } from './rng';
import type { GameState, Hero, ItemData, ItemInstance, Slot } from './types';
import { appendLog } from './systems/log';
import { createHero, heroStatus } from './systems/heroes';
import { questsById } from './data/quests';
import { encounterTime } from './questSchedule';
import { questChannel } from './activityChannels';

export interface GameActionResult {
  state: GameState;
  reason?: string;
}

export type GameAction = (
  state: GameState,
  wallMs: number,
) => GameState | GameActionResult;

type EquipInspection =
  | { hero: Hero; item: ItemData; instance: ItemInstance }
  | { reason: string };

export function foundGuild(name: string): (state: GameState, wallMs?: number) => GameState {
  const guildName = name.trim();
  if (guildName.length < 1 || guildName.length > 32) {
    throw new RangeError('Guild name must be between 1 and 32 characters.');
  }

  return (currentState) => {
    if (currentState.guildName !== '') throw new Error('A guild has already been founded.');
    const state = structuredClone(currentState);
    state.guildName = guildName;
    const starterClasses = [
      'warrior',
      'cleric',
      rngPick(state, ['rogue', 'wizard'] as const),
    ] as const;

    for (const classId of starterClasses) {
      const hero = createHero(state, classId, 1);
      state.heroes[hero.id] = hero;
      state.heroOrder.push(hero.id);
    }

    for (const heroId of state.heroOrder) {
      const hero = state.heroes[heroId];
      if (!hero) continue;
      for (const [slot, itemId] of Object.entries(starterGear[hero.classId])) {
        if (!itemId) continue;
        const instance = createItemInstance(state, itemId);
        state.itemInstances[instance.uid] = instance;
        hero.equipment[slot as Slot] = instance.uid;
      }
    }

    appendLog(state, 'guild', 'system', `Welcome to ${guildName}. Your adventurers are ready.`);
    return state;
  };
}

function inspectEquip(
  state: GameState,
  heroId: string,
  uid: string,
  targetSlot?: Slot,
): EquipInspection {
  const hero = state.heroes[heroId];
  if (!hero) return { reason: 'Hero not found.' };
  if (heroStatus(hero, state) !== 'Idle') return { reason: 'Hero must be Idle to equip gear.' };

  const instance = state.stash[uid];
  if (!instance) return { reason: 'That item is not in the stash.' };
  if (
    instance.uid !== uid ||
    state.itemInstances[uid]?.itemId !== instance.itemId
  ) {
    return { reason: 'That item instance is invalid.' };
  }
  const item = itemsById[instance.itemId];
  if (!item) return { reason: 'That item is unknown.' };
  if (item.slot === 'material') return { reason: 'Materials cannot be equipped.' };
  if (targetSlot && item.slot !== targetSlot) return { reason: 'That item does not fit this slot.' };
  if (hero.level < item.levelReq) {
    return { reason: `Requires level ${item.levelReq}.` };
  }
  if (item.classes !== 'all' && !item.classes.includes(hero.classId)) {
    return { reason: `Not available to ${hero.classId}.` };
  }
  if (
    Object.values(state.heroes).some((otherHero) =>
      Object.values(otherHero.equipment).includes(uid),
    )
  ) {
    return { reason: 'That item is already equipped.' };
  }

  return { hero, item, instance };
}

export function getEquipReason(
  state: GameState,
  heroId: string,
  uid: string,
  targetSlot?: Slot,
): string | null {
  const inspection = inspectEquip(state, heroId, uid, targetSlot);
  return 'reason' in inspection ? inspection.reason : null;
}

export function equip(heroId: string, uid: string): GameAction {
  return (currentState) => {
    const inspection = inspectEquip(currentState, heroId, uid);
    if ('reason' in inspection) return { state: currentState, reason: inspection.reason };

    const state = structuredClone(currentState);
    const hero = state.heroes[heroId];
    if (!hero) return { state: currentState, reason: 'Hero not found.' };
    if (inspection.item.slot === 'material') {
      return { state: currentState, reason: 'Materials cannot be equipped.' };
    }
    const slot = inspection.item.slot;
    const previousUid = hero.equipment[slot];
    if (previousUid) {
      const previousInstance = state.itemInstances[previousUid];
      if (!previousInstance || !itemsById[previousInstance.itemId]) {
        return { state: currentState, reason: 'The equipped item instance is invalid.' };
      }
      state.stash[previousUid] = previousInstance;
    }

    delete state.stash[uid];
    hero.equipment[slot] = uid;
    return { state };
  };
}

export function unequip(heroId: string, slot: Slot): GameAction {
  return (currentState) => {
    const hero = currentState.heroes[heroId];
    if (!hero) return { state: currentState, reason: 'Hero not found.' };
    if (heroStatus(hero, currentState) !== 'Idle') {
      return { state: currentState, reason: 'Hero must be Idle to unequip gear.' };
    }
    const uid = hero.equipment[slot];
    if (!uid) return { state: currentState, reason: 'There is no item in that slot.' };
    const instance = currentState.itemInstances[uid];
    if (!instance || !itemsById[instance.itemId]) {
      return { state: currentState, reason: 'The equipped item instance is invalid.' };
    }

    const state = structuredClone(currentState);
    const nextHero = state.heroes[heroId];
    if (!nextHero) return { state: currentState, reason: 'Hero not found.' };
    state.stash[uid] = instance;
    delete nextHero.equipment[slot];
    return { state };
  };
}

export function sell(uid: string): GameAction {
  return (currentState) => {
    const instance = currentState.stash[uid];
    if (!instance) return { state: currentState, reason: 'That item is not in the stash.' };
    if (
      instance.uid !== uid ||
      currentState.itemInstances[uid]?.itemId !== instance.itemId
    ) {
      return { state: currentState, reason: 'That item instance is invalid.' };
    }
    const item = itemsById[instance.itemId];
    if (!item || item.slot === 'material') {
      return { state: currentState, reason: 'That item cannot be sold from the stash.' };
    }

    const state = structuredClone(currentState);
    delete state.stash[uid];
    delete state.itemInstances[uid];
    state.gold += item.value;
    return { state };
  };
}

export function sellMaterial(itemId: string, quantity: number): GameAction {
  return (currentState) => {
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { state: currentState, reason: 'Enter a positive whole quantity.' };
    }
    const item = itemsById[itemId];
    if (!item || item.slot !== 'material') {
      return { state: currentState, reason: 'That material cannot be sold.' };
    }
    const owned = currentState.materials[itemId] ?? 0;
    if (owned < quantity) return { state: currentState, reason: 'Not enough materials.' };

    const state = structuredClone(currentState);
    const remaining = owned - quantity;
    if (remaining === 0) delete state.materials[itemId];
    else state.materials[itemId] = remaining;
    state.gold += item.value * quantity;
    return { state };
  };
}

export function getQuestEligibilityReason(state: GameState, heroId: string): string | null {
  const hero = state.heroes[heroId];
  if (!hero) return 'Hero not found.';
  if (heroStatus(hero, state) === 'Injured') return 'Hero is Injured.';
  if (heroStatus(hero, state) !== 'Idle') return 'Hero must be Idle.';
  if (hero.fatigue >= 100) return 'Fatigue must be below 100.';
  return null;
}

export function dispatchQuest(questId: string, heroIds: string[]): GameAction {
  return (currentState) => {
    const quest = questsById[questId];
    if (!quest) return { state: currentState, reason: 'Quest not found.' };
    if (heroIds.length < 1 || heroIds.length > 4) {
      return { state: currentState, reason: 'Choose between 1 and 4 heroes.' };
    }
    if (new Set(heroIds).size !== heroIds.length) {
      return { state: currentState, reason: 'Choose each hero only once.' };
    }

    for (const heroId of heroIds) {
      const reason = getQuestEligibilityReason(currentState, heroId);
      if (reason) return { state: currentState, reason };
    }

    const state = structuredClone(currentState);
    const id = `a${state.nextId}`;
    state.nextId += 1;
    const startedAt = state.clock.simMs;
    const durationMs = quest.durationMin * 60_000;
    const activity = {
      kind: 'quest' as const,
      id,
      questId,
      heroIds: [...heroIds],
      startedAt,
      endsAt: startedAt + durationMs,
      nextEncounterAt: encounterTime(startedAt, durationMs, 0, quest.encounters.length),
      encountersLeft: quest.encounters.length,
    };
    state.activities[id] = activity;
    for (const heroId of heroIds) {
      const hero = state.heroes[heroId];
      if (hero) hero.activityId = id;
    }

    appendLog(
      state,
      questChannel(id, questId),
      'system',
      `Your party has set out on ${quest.name}.`,
      undefined,
      startedAt,
    );
    return { state };
  };
}

export function rest(heroId: string): GameAction {
  return (currentState) => {
    const hero = currentState.heroes[heroId];
    if (!hero) return { state: currentState, reason: 'Hero not found.' };
    if (heroStatus(hero, currentState) !== 'Idle') {
      return { state: currentState, reason: 'Hero must be Idle to rest.' };
    }
    if (hero.fatigue <= 0) {
      return { state: currentState, reason: 'Hero is not fatigued.' };
    }

    const state = structuredClone(currentState);
    const nextHero = state.heroes[heroId];
    if (!nextHero) return { state: currentState, reason: 'Hero not found.' };
    const id = `a${state.nextId}`;
    state.nextId += 1;
    state.activities[id] = {
      kind: 'rest',
      id,
      heroId,
      startedAt: state.clock.simMs,
    };
    nextHero.activityId = id;
    appendLog(state, 'guild', 'system', `${nextHero.name} is resting.`);
    return { state };
  };
}

export function recall(activityId: string): GameAction {
  return (currentState) => {
    const activity = currentState.activities[activityId];
    if (!activity) return { state: currentState, reason: 'Activity not found.' };
    if (activity.kind !== 'rest') {
      return { state: currentState, reason: 'That activity cannot be recalled yet.' };
    }

    const state = structuredClone(currentState);
    const nextActivity = state.activities[activityId];
    if (!nextActivity || nextActivity.kind !== 'rest') {
      return { state: currentState, reason: 'Activity not found.' };
    }
    const hero = state.heroes[nextActivity.heroId];
    if (hero?.activityId === activityId) hero.activityId = null;
    delete state.activities[activityId];
    return { state };
  };
}
