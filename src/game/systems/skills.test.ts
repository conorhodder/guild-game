import { describe, expect, it } from 'vitest';
import { foundGuild } from '../actions';
import { createNewGame } from '../newGame';
import { skillCap } from './heroes';
import { recordSkillUse, trySkillUp } from './skills';

function createHeroState(seed: number) {
  const state = foundGuild('The Wayfarers')(
    createNewGame({ seed, wallMs: 0, guildName: '' }),
  );
  const heroId = state.heroOrder[0];
  const hero = heroId ? state.heroes[heroId] : undefined;
  if (!hero) throw new Error('Expected a starter hero.');
  return { state, hero };
}

describe('skill progression', () => {
  it('never exceeds a cap and does not roll at the cap', () => {
    const { state, hero } = createHeroState(42);
    const cap = skillCap(hero.level);
    hero.skills.offense = cap - 1;
    const events: Parameters<typeof recordSkillUse>[4] = [];

    for (let attempt = 0; attempt < 1000; attempt += 1) {
      recordSkillUse(state, hero.id, 'offense', 'guild', events);
    }

    expect(hero.skills.offense).toBe(cap);
    const rngAtCap = state.rng;
    recordSkillUse(state, hero.id, 'offense', 'guild', events);
    expect(state.rng).toBe(rngAtCap);
    expect(hero.skills.offense).toBe(cap);
  });

  it('logs skill-ups with the skill name and new value', () => {
    let result: ReturnType<typeof createHeroState> | undefined;
    let events: Parameters<typeof recordSkillUse>[4] = [];

    for (let seed = 1; seed <= 1000; seed += 1) {
      const candidate = createHeroState(seed);
      events = [];
      candidate.hero.skills.defense = 0;
      recordSkillUse(candidate.state, candidate.hero.id, 'defense', 'quest:a1', events, 8_000);
      if (candidate.state.log.some((line) => line.category === 'skill')) {
        result = candidate;
        break;
      }
    }

    if (!result) throw new Error('Expected one seeded skill-up.');
    expect(result.state.log.at(-1)).toMatchObject({
      simMs: 8_000,
      channel: 'quest:a1',
      category: 'skill',
      text: `${result.hero.name} has become better at Defense! (1)`,
    });
    expect(events).toHaveLength(1);
  });

  it('matches the seeded skill-up probability at a fixed value', () => {
    let successes = 0;
    const attempts = 5000;

    for (let seed = 1; seed <= attempts; seed += 1) {
      const { state, hero } = createHeroState(seed);
      hero.skills.offense = 0;
      const before = state.log.length;
      trySkillUp(state, hero, 'offense', 10, 'guild', []);
      if (state.log.length > before) successes += 1;
    }

    const rate = successes / attempts;
    expect(rate).toBeGreaterThan(0.17);
    expect(rate).toBeLessThan(0.23);
  });
});
