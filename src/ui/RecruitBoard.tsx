import { useState } from 'react';
import { getDismissReason, getHireReason } from '../game/actions';
import { classes } from '../game/data/classes';
import { heroStatus } from '../game/systems/heroes';
import { hireCost } from '../game/systems/recruitment';
import type { GameState } from '../game/types';

interface RecruitBoardProps {
  game: GameState;
  onHire: (candidateIndex: number) => string | null;
  onDismiss: (heroId: string) => string | null;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function RecruitBoard({ game, onHire, onDismiss }: RecruitBoardProps) {
  const [confirmingHeroId, setConfirmingHeroId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const heroes = game.heroOrder.flatMap((heroId) => {
    const hero = game.heroes[heroId];
    return hero ? [hero] : [];
  });

  function hireCandidate(index: number) {
    const reason = onHire(index);
    setError(reason ?? '');
  }

  function dismissHero(heroId: string) {
    const reason = onDismiss(heroId);
    setError(reason ?? '');
    setConfirmingHeroId(null);
  }

  return (
    <section aria-labelledby="recruit-heading" className="recruit-board">
      <h2 id="recruit-heading">Recruitment board</h2>
      <p>
        Refreshes in:{' '}
        {formatRemaining(game.recruitment.refreshAt - game.clock.simMs)}
      </p>
      <div className="recruit-candidates">
        {game.recruitment.candidates.map((candidate, index) => {
          const classInfo = classes[candidate.classId];
          const reason = getHireReason(game, index);
          const skills = Object.entries(candidate.skills)
            .map(([skill, value]) => `${skill} ${value}`)
            .join(' · ');
          return (
            <article className="recruit-candidate" key={candidate.id}>
              <h3>
                {candidate.glyph} {candidate.name}
              </h3>
              <p>
                {classInfo.name} · Level {candidate.level}
              </p>
              <p>{candidate.flavour}</p>
              <p>Skills: {skills}</p>
              <p>Cost: {hireCost(candidate.level)} gold</p>
              <button
                aria-label={
                  reason
                    ? `Cannot hire ${candidate.name}: ${reason}`
                    : `Hire ${candidate.name} for ${hireCost(candidate.level)} gold`
                }
                disabled={reason !== null}
                onClick={() => hireCandidate(index)}
                type="button"
              >
                {reason ? `Cannot hire: ${reason}` : `Hire — ${hireCost(candidate.level)} gold`}
              </button>
            </article>
          );
        })}
      </div>
      <section aria-labelledby="dismiss-heading" className="recruit-roster">
        <h3 id="dismiss-heading">Guild roster ({heroes.length}/8)</h3>
        {heroes.map((hero) => {
          const reason = getDismissReason(game, hero.id);
          return (
            <article className="recruit-roster-member" key={hero.id}>
              <p>
                {hero.glyph} {hero.name} — {classes[hero.classId].name} ·{' '}
                {heroStatus(hero, game)}
              </p>
              {confirmingHeroId === hero.id ? (
                <div className="dismiss-confirmation">
                  <p>Dismiss {hero.name}? Equipped gear returns to the stash.</p>
                  <button onClick={() => dismissHero(hero.id)} type="button">
                    Confirm dismissal
                  </button>
                  <button
                    onClick={() => setConfirmingHeroId(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  disabled={reason !== null}
                  onClick={() => setConfirmingHeroId(hero.id)}
                  type="button"
                >
                  {reason ? `Cannot dismiss: ${reason}` : `Dismiss ${hero.name}`}
                </button>
              )}
            </article>
          );
        })}
      </section>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
