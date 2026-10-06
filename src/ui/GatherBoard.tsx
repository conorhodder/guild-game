import { useState } from 'react';
import { getGatherReason } from '../game/actions';
import { gatherCap, heroStatus } from '../game/systems/heroes';
import type { Activity, GatherSkill, GameState } from '../game/types';

interface GatherBoardProps {
  game: GameState;
  onStartGather: (heroId: string, skill: GatherSkill) => string | null;
  onRecall: (activityId: string) => string | null;
}

const skills: GatherSkill[] = ['mining', 'herbalism'];
const skillLabels: Record<GatherSkill, string> = {
  mining: 'Mining',
  herbalism: 'Herbalism',
};

function remainingSeconds(ms: number): number {
  return Math.ceil(Math.max(0, ms) / 1000);
}

export function GatherBoard({ game, onStartGather, onRecall }: GatherBoardProps) {
  const [error, setError] = useState('');
  const idleHeroes = game.heroOrder.flatMap((heroId) => {
    const hero = game.heroes[heroId];
    return hero && heroStatus(hero, game) === 'Idle' ? [hero] : [];
  });
  const activities = Object.values(game.activities).filter(
    (activity): activity is Extract<Activity, { kind: 'gather' }> =>
      activity.kind === 'gather',
  );
  const gatherers = activities.flatMap((activity) => {
    const hero = game.heroes[activity.heroId];
    return hero ? [{ activity, hero }] : [];
  });
  function start(heroId: string, skill: GatherSkill) {
    setError(onStartGather(heroId, skill) ?? '');
  }

  function recall(activityId: string) {
    setError(onRecall(activityId) ?? '');
  }

  return (
    <section aria-labelledby="gather-heading" className="gather-board">
      <h2 id="gather-heading">Gathering</h2>
      <section aria-labelledby="available-gatherers-heading">
        <h3 id="available-gatherers-heading">Available heroes</h3>
        {idleHeroes.length === 0 ? (
          <>
            <p>No Idle heroes are available to gather.</p>
            <p>Recall a gatherer or wait for heroes to recover fatigue or injuries.</p>
          </>
        ) : (
          <div className="gather-heroes">
            {idleHeroes.map((hero) => (
              <article className="gather-hero" key={hero.id}>
                <h4>
                  {hero.glyph} {hero.name}
                </h4>
                {skills.map((skill) => {
                  const reason = getGatherReason(game, hero.id, skill);
                  return (
                    <div className="gather-skill" key={skill}>
                      <p>
                        {skillLabels[skill]}: {hero.gather[skill]} / {gatherCap(hero.level)}
                      </p>
                      <button
                        aria-label={`Start ${skillLabels[skill]} for ${hero.name}`}
                        disabled={reason !== null}
                        onClick={() => start(hero.id, skill)}
                        type="button"
                      >
                        Start {skillLabels[skill]}
                      </button>
                      {reason && <small>{reason}</small>}
                    </div>
                  );
                })}
              </article>
            ))}
          </div>
        )}
      </section>
      <section aria-labelledby="active-gatherers-heading">
        <h3 id="active-gatherers-heading">Active gatherers</h3>
        {gatherers.length === 0 ? (
          <>
            <p>No active gatherers.</p>
            <p>Choose an Idle hero above and start Mining or Herbalism.</p>
          </>
        ) : (
          <div className="active-gatherers">
            {gatherers.map(({ activity, hero }) => (
              <article className="active-gatherer" key={activity.id}>
                <h4>
                  {hero.glyph} {hero.name} — {skillLabels[activity.skill]}
                </h4>
                <p>Yields: {activity.yields}</p>
                <p>
                  Next yield in: {remainingSeconds(activity.nextYieldAt - game.clock.simMs)}s
                </p>
                <button onClick={() => recall(activity.id)} type="button">
                  Recall {hero.name}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
