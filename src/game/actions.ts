import { rngPick } from './rng';
import type { GameState } from './types';
import { appendLog } from './systems/log';
import { createHero } from './systems/heroes';

export function foundGuild(name: string): (state: GameState) => GameState {
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

    appendLog(state, 'guild', 'system', `Welcome to ${guildName}. Your adventurers are ready.`);
    return state;
  };
}
