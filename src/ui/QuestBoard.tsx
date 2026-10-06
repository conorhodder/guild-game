import { useState } from 'react';
import { getQuestEligibilityReason } from '../game/actions';
import { questChannel } from '../game/activityChannels';
import { itemsById } from '../game/data/items';
import { quests, questsById } from '../game/data/quests';
import { conTier } from '../game/systems/con';
import { heroStatus } from '../game/systems/heroes';
import type { GameState } from '../game/types';
import { ConBadge } from './ConBadge';

interface QuestBoardProps {
  game: GameState;
  onDispatch: (questId: string, heroIds: string[]) => string | null;
  onViewLog: (channel: string) => void;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function QuestBoard({ game, onDispatch, onViewLog }: QuestBoardProps) {
  const hasDispatched =
    game.ledger.firstDispatchAt !== null || game.ledger.firstDispatchWall !== null;
  const [selectedHeroIds, setSelectedHeroIds] = useState<string[]>(() =>
    hasDispatched
      ? []
      : game.heroOrder
          .slice(0, 3)
          .filter((heroId) => getQuestEligibilityReason(game, heroId) === null),
  );
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
  const rosterLevels = heroes.map((hero) => hero.level);
  const conLevels =
    selectedLevels.length > 0
      ? selectedLevels
      : idleLevels.length > 0
        ? idleLevels
        : rosterLevels;
  const activeQuests = Object.values(game.activities).filter(
    (activity) => activity.kind === 'quest',
  );

  function dispatch(questId: string) {
    const reason = onDispatch(questId, selectedHeroIds);
    if (reason) {
      setError(reason);
      return;
    }
    setError('');
    setSelectedHeroIds([]);
  }

  return (
    <section aria-labelledby="quests-heading" className="quest-board">
      <h2 id="quests-heading">Quests</h2>
      <fieldset className="quest-party">
        <legend>Choose your party (1–4 heroes)</legend>
        {eligibleHeroes.length === 0 && (
          <p>No eligible heroes. Rest or wait for recovery before dispatching.</p>
        )}
        {heroes.map((hero) => {
          const reason = getQuestEligibilityReason(game, hero.id);
          const selected = selectedHeroIds.includes(hero.id);
          const partyFull = !selected && selectedHeroIds.length >= 4;
          const disabled = reason !== null || partyFull;
          return (
            <label className="quest-hero-choice" key={hero.id}>
              <input
                checked={selected}
                disabled={disabled}
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

      <div className="quest-cards">
        {quests.map((quest) => {
          const itemNames = quest.lootTable.entries.flatMap((entry) => {
            const item = itemsById[entry.itemId];
            return item ? [item.name] : [];
          });
          const canDispatch =
            selectedHeroIds.length >= 1 &&
            selectedHeroIds.length <= 4 &&
            selectedHeroIds.every((heroId) => getQuestEligibilityReason(game, heroId) === null);
          const recommended = !hasDispatched && quest.firstQuest === true;

          return (
            <article
              className={recommended ? 'quest-card quest-card-recommended' : 'quest-card'}
              key={quest.id}
            >
              <h3>{quest.name}</h3>
              {quest.firstQuest && <p className="first-quest-label">Easy first quest</p>}
              {recommended && <p className="recommended-quest-label">Recommended</p>}
              <p>
                Recommended level: {quest.level}
                {' '}
                <ConBadge con={conTier(quest.level, conLevels)} />
              </p>
              <p>Duration: {quest.durationMin} minutes</p>
              <p>
                Rewards: {quest.rewardXp} XP, {quest.rewardGold} gold
              </p>
              <p>Possible items: {itemNames.length > 0 ? itemNames.join(', ') : 'None'}</p>
              <button
                disabled={!canDispatch}
                onClick={() => dispatch(quest.id)}
                type="button"
              >
                Dispatch {quest.name}
              </button>
            </article>
          );
        })}
      </div>
      {error && <p role="alert">{error}</p>}

      <section aria-labelledby="active-quests-heading" className="active-quests">
        <h3 id="active-quests-heading">Active quests</h3>
        {activeQuests.length === 0 ? (
          <>
            <p>No active quests.</p>
            <p>Choose eligible heroes above and dispatch a quest to get started.</p>
          </>
        ) : (
          activeQuests.map((activity) => {
            if (activity.kind !== 'quest') return null;
            const quest = questsById[activity.questId];
            if (!quest) return null;
            const duration = activity.endsAt - activity.startedAt;
            const elapsed = Math.min(
              duration,
              Math.max(0, game.clock.simMs - activity.startedAt),
            );
            const progress = duration > 0 ? (elapsed / duration) * 100 : 100;
            const remaining = Math.max(0, activity.endsAt - game.clock.simMs);
            const channel = questChannel(activity.id, quest.id);

            return (
              <article className="active-quest" key={activity.id}>
                <h4>{quest.name}</h4>
                <p>Party:</p>
                <ul>
                  {activity.heroIds.map((heroId) => {
                    const hero = game.heroes[heroId];
                    if (!hero) return null;
                    return (
                      <li key={heroId}>
                        {hero.glyph} {hero.name} —{' '}
                        {hero.activityId === activity.id ? 'On quest' : 'Knocked out'}
                      </li>
                    );
                  })}
                </ul>
                <progress
                  aria-label={`${quest.name} progress`}
                  max={100}
                  value={progress}
                />
                <p>
                  Progress: {Math.floor(progress)}%. Time remaining: {formatRemaining(remaining)}
                </p>
                <button onClick={() => onViewLog(channel)} type="button">
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
