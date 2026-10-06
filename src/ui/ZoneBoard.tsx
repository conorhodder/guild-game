import { useState } from 'react';
import { getQuestEligibilityReason } from '../game/actions';
import { campChannel } from '../game/activityChannels';
import { itemsById } from '../game/data/items';
import { monstersById } from '../game/data/monsters';
import { campsById, zones } from '../game/data/zones';
import { conTier } from '../game/systems/con';
import { heroStatus } from '../game/systems/heroes';
import type { Activity, GameState } from '../game/types';
import { ConBadge } from './ConBadge';

interface ZoneBoardProps {
  game: GameState;
  onStartCamp: (zoneId: string, campId: string, heroIds: string[]) => string | null;
  onRecall: (activityId: string) => string | null;
  onViewLog: (channel: string) => void;
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, durationMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatChance(chance: number): string {
  return `${Number((chance * 100).toFixed(1))}%`;
}

function activityForCamp(
  activities: Record<string, Activity>,
  campId: string,
): Extract<Activity, { kind: 'camp' }> | undefined {
  return Object.values(activities).find(
    (activity): activity is Extract<Activity, { kind: 'camp' }> =>
      activity.kind === 'camp' && activity.campId === campId,
  );
}

export function ZoneBoard({ game, onStartCamp, onRecall, onViewLog }: ZoneBoardProps) {
  const [selectedHeroIds, setSelectedHeroIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const heroes = game.heroOrder.flatMap((heroId) => {
    const hero = game.heroes[heroId];
    return hero ? [hero] : [];
  });
  const eligibleHeroes = heroes.filter(
    (hero) => getQuestEligibilityReason(game, hero.id) === null,
  );
  const selectedLevels = selectedHeroIds.flatMap((heroId) => {
    const hero = game.heroes[heroId];
    return hero ? [hero.level] : [];
  });
  const idleLevels = heroes
    .filter((hero) => heroStatus(hero, game) === 'Idle')
    .map((hero) => hero.level);
  const conLevels = selectedLevels.length > 0
    ? selectedLevels
    : idleLevels.length > 0
      ? idleLevels
      : heroes.map((hero) => hero.level);
  const activeCamps = Object.values(game.activities).filter(
    (activity): activity is Extract<Activity, { kind: 'camp' }> =>
      activity.kind === 'camp',
  );

  function startCamp(zoneId: string, campId: string) {
    const reason = onStartCamp(zoneId, campId, selectedHeroIds);
    if (reason) {
      setError(reason);
      return;
    }
    setError('');
    setSelectedHeroIds([]);
  }

  return (
    <section aria-labelledby="zones-heading" className="zone-board">
      <h2 id="zones-heading">Zones</h2>
      <details className="con-help">
        <summary>What do the colours mean?</summary>
        <ul>
          <li>Trivial: target is at least 5 levels below the party.</li>
          <li>Easy: target is 2–4 levels below the party.</li>
          <li>Even: target is within 1 level of the party.</li>
          <li>Tough: target is 2–3 levels above the party.</li>
          <li>Deadly: target is at least 4 levels above the party.</li>
        </ul>
      </details>
      <fieldset className="zone-party">
        <legend>Choose a camping party (1–4 heroes)</legend>
        {eligibleHeroes.length === 0 && (
          <p>No eligible heroes. Rest or wait for recovery before camping.</p>
        )}
        {heroes.map((hero) => {
          const reason = getQuestEligibilityReason(game, hero.id);
          const selected = selectedHeroIds.includes(hero.id);
          const partyFull = !selected && selectedHeroIds.length >= 4;
          return (
            <label className="quest-hero-choice" key={hero.id}>
              <input
                checked={selected}
                disabled={reason !== null || partyFull}
                onChange={(event) =>
                  setSelectedHeroIds((current) =>
                    event.target.checked
                      ? [...current, hero.id]
                      : current.filter((id) => id !== hero.id),
                  )
                }
                type="checkbox"
                value={hero.id}
              />
              <span>
                {hero.glyph} {hero.name} — {hero.level} · {heroStatus(hero, game)}
                {reason && <small className="quest-ineligible">Unavailable: {reason}</small>}
                {partyFull && <small className="quest-ineligible">Party limit reached.</small>}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="zone-list">
        {zones.map((zone) => {
          const zoneLevel = zone.levelRange[0];
          return (
            <article className="zone-card" key={zone.id}>
              <h3>{zone.name}</h3>
              <p>
                Levels {zone.levelRange[0]}–{zone.levelRange[1]}{' '}
                <ConBadge con={conTier(zoneLevel, conLevels)} />
              </p>
              <div className="camp-list">
                {zone.camps.map((camp) => {
                  const active = activityForCamp(game.activities, camp.id);
                  const monsterIds = camp.namedId
                    ? [...camp.monsters, camp.namedId]
                    : camp.monsters;
                  const campMonsterLevels = monsterIds.flatMap((id) => {
                    const level = monstersById[id]?.level;
                    return level === undefined ? [] : [level];
                  });
                  const campLevel = campMonsterLevels.length > 0
                    ? Math.min(...campMonsterLevels)
                    : zone.levelRange[0];
                  const monsterNames = monsterIds.map(
                    (id) => game.seenMonsters.includes(id) ? monstersById[id]?.name ?? '???' : '???',
                  );
                  const namedMonster = camp.namedId
                    ? monstersById[camp.namedId]
                    : undefined;
                  const dropList = namedMonster && game.seenMonsters.includes(namedMonster.id)
                    ? namedMonster.lootTable.entries.flatMap((entry) => {
                        const item = itemsById[entry.itemId];
                        return item ? [`${item.name} (${formatChance(entry.chance)})`] : [];
                      })
                    : [];

                  return (
                    <article className="camp-card" key={camp.id}>
                      <h4>{camp.name}</h4>
                      <p>Monsters: {monsterNames.join(', ')}</p>
                      <p>
                        Camp con: <ConBadge con={conTier(campLevel, conLevels)} />
                      </p>
                      <p>Named spawn chance: {camp.namedId ? formatChance(camp.namedChance) : 'None'}</p>
                      <p>Respawn: {camp.respawnSec} seconds</p>
                      {dropList.length > 0 && (
                        <p>
                          Named drops: {dropList.join(', ')}
                        </p>
                      )}
                      {active ? (
                        <p>
                          Next spawn in:{' '}
                          {formatDuration(active.spawnReadyAt - game.clock.simMs)}
                          {active.nextSpawnNamed && namedMonster
                            ? ` — ${namedMonster.name}`
                            : ''}
                        </p>
                      ) : (
                        <button
                          disabled={
                            selectedHeroIds.length < 1 ||
                            selectedHeroIds.length > 4 ||
                            selectedHeroIds.some(
                              (heroId) => getQuestEligibilityReason(game, heroId) !== null,
                            )
                          }
                          onClick={() => startCamp(zone.id, camp.id)}
                          type="button"
                        >
                          Start at {camp.name}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
      {error && <p role="alert">{error}</p>}

      <section aria-labelledby="active-camps-heading" className="active-camps">
        <h3 id="active-camps-heading">Active camps</h3>
        {activeCamps.length === 0 ? (
          <>
            <p>No active camps.</p>
            <p>Choose eligible heroes above and start a camp to hunt monsters.</p>
          </>
        ) : (
          activeCamps.map((activity) => {
            const camp = campsById[activity.campId];
            if (!camp) return null;
            return (
              <article className="active-camp" key={activity.id}>
                <h4>{camp.name}</h4>
                <p>Party:</p>
                <ul>
                  {activity.heroIds.map((heroId) => {
                    const hero = game.heroes[heroId];
                    if (!hero) return null;
                    return (
                      <li key={heroId}>
                        {hero.glyph} {hero.name} —{' '}
                        {hero.activityId === activity.id ? 'Camping' : 'Knocked out'}
                      </li>
                    );
                  })}
                </ul>
                <p>
                  Time camping: {formatDuration(game.clock.simMs - activity.startedAt)}
                </p>
                <p>Kills: {activity.kills} · Named kills: {activity.namedKills}</p>
                <button
                  disabled={activity.recallAt !== null}
                  onClick={() => {
                    const reason = onRecall(activity.id);
                    if (reason) setError(reason);
                    else setError('');
                  }}
                  type="button"
                >
                  {activity.recallAt === null ? 'Recall' : 'Recall pending'}
                </button>
                <button
                  onClick={() => onViewLog(campChannel(activity.id, camp.id))}
                  type="button"
                >
                  View log
                </button>
              </article>
            );
          })
        )}
      </section>
    </section>
  );
}
