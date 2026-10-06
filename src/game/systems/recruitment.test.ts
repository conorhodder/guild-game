import { describe, expect, it } from 'vitest';
import { foundGuild } from '../actions';
import { createNewGame } from '../newGame';
import { defaultSystems } from '../sim';
import type { SimEvent } from '../sim';
import {
  createRecruitmentCandidates,
  recruitmentSystem,
  RECRUITMENT_REFRESH_MS,
} from './recruitment';

describe('recruitment system', () => {
  it('generates three deterministic candidates with at least two classes', () => {
    const first = createNewGame({ seed: 7123, wallMs: 0, guildName: '' });
    const second = createNewGame({ seed: 7123, wallMs: 0, guildName: '' });

    expect(first.recruitment.candidates).toHaveLength(3);
    expect(first.recruitment.candidates).toEqual(second.recruitment.candidates);
    expect(
      new Set(first.recruitment.candidates.map((candidate) => candidate.classId)).size,
    ).toBeGreaterThan(1);
    expect(
      first.recruitment.candidates.every(
        (candidate) => candidate.level >= 1 && candidate.level <= 2,
      ),
    ).toBe(true);
    expect(first.nextId).toBe(1);
  });

  it('bases candidate levels on the average roster level and clamps them', () => {
    const state = foundGuild('The Wayfarers')(
      createNewGame({ seed: 82, wallMs: 0, guildName: '' }),
    );
    for (const [index, level] of [4, 6, 8].entries()) {
      const heroId = state.heroOrder[index];
      const hero = heroId ? state.heroes[heroId] : undefined;
      if (!hero) throw new Error('Expected the starter party.');
      hero.level = level;
    }
    const expectedRng = structuredClone(state);

    const candidates = createRecruitmentCandidates(state);
    const repeated = createRecruitmentCandidates(expectedRng);

    expect(candidates).toEqual(repeated);
    expect(candidates.every((candidate) => candidate.level >= 5 && candidate.level <= 7)).toBe(
      true,
    );
    expect(state.nextId).toBe(expectedRng.nextId);
  });

  it('refreshes the board every thirty simulation minutes and runs last', () => {
    const state = createNewGame({ seed: 913, wallMs: 0, guildName: '' });
    const previousRng = state.rng;
    const events: SimEvent[] = [];

    recruitmentSystem(state, RECRUITMENT_REFRESH_MS, events);

    expect(state.rng).not.toBe(previousRng);
    expect(state.recruitment.candidates).toHaveLength(3);
    expect(state.recruitment.refreshAt).toBe(2 * RECRUITMENT_REFRESH_MS);
    expect(defaultSystems.at(-1)).toBe(recruitmentSystem);
  });
});
