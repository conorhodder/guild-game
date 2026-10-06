import { useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { AwaySummary } from '../game/systems/offline';

function formatAwayDuration(durationMs: number): string {
  let minutes = Math.floor(Math.max(0, durationMs) / 60_000);
  const days = Math.floor(minutes / (24 * 60));
  minutes %= 24 * 60;
  const hours = Math.floor(minutes / 60);
  minutes %= 60;
  const parts = [
    days > 0 ? `${days}d` : '',
    hours > 0 ? `${hours}h` : '',
    minutes > 0 ? `${minutes}m` : '',
  ].filter(Boolean);
  return parts.join(' ') || 'less than a minute';
}

function hasItems(summary: AwaySummary): boolean {
  return Object.values(summary.itemsByRarity).some((count) => count > 0);
}

interface AwaySummaryDialogProps {
  summary: AwaySummary;
  onDismiss: () => void;
  onGoToHero?: (heroId: string) => void;
}

export function AwaySummaryDialog({
  summary,
  onDismiss,
  onGoToHero,
}: AwaySummaryDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current
      ?.querySelector<HTMLElement>('button:not([disabled])')
      ?.focus();
    return () => {
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onDismiss();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
      dialogRef.current?.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function goToHero(heroId: string) {
    onGoToHero?.(heroId);
    onDismiss();
  }

  return (
    <div className="away-backdrop">
      <div
        aria-labelledby="away-summary-heading"
        aria-modal="true"
        className="away-dialog"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <h2 id="away-summary-heading">While you were away</h2>
        {summary.capped ? (
          <p>
            You were away {formatAwayDuration(summary.rawDelta)}. Progress is capped at 12 hours.
          </p>
        ) : (
          <p>You were away {formatAwayDuration(summary.rawDelta)}.</p>
        )}
        <p>Time credited: {formatAwayDuration(summary.credited)}.</p>

        {summary.allQuiet ? (
          <p>All quiet while you were away.</p>
        ) : (
          <>
            {summary.heroes.length > 0 && (
              <section aria-labelledby="away-heroes-heading">
                <h3 id="away-heroes-heading">Heroes</h3>
                <ul>
                  {summary.heroes.map((hero) => (
                    <li key={hero.heroId}>
                      <strong>{hero.name}</strong>
                      {hero.levelsGained > 0 && <p>Levels gained: {hero.levelsGained}</p>}
                      {hero.xpGained > 0 && <p>XP gained: {hero.xpGained}</p>}
                      {hero.skillUps.length > 0 && (
                        <ul>
                          {hero.skillUps.map((skill) => (
                            <li key={skill.skill}>
                              {skill.skill}: {skill.count} skill-up{skill.count === 1 ? '' : 's'}{' '}
                              (now {skill.value})
                            </li>
                          ))}
                        </ul>
                      )}
                      {hero.knockouts > 0 && <p>Knocked out: {hero.knockouts}</p>}
                      {hero.needsAttention && <p>Needs attention.</p>}
                      <button onClick={() => goToHero(hero.heroId)} type="button">
                        Go to {hero.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {summary.goldGained > 0 && (
              <section aria-labelledby="away-gold-heading">
                <h3 id="away-gold-heading">Gold</h3>
                <p>{summary.goldGained} gold gained.</p>
              </section>
            )}

            {hasItems(summary) && (
              <section aria-labelledby="away-items-heading">
                <h3 id="away-items-heading">Items</h3>
                <ul>
                  {(['common', 'uncommon', 'rare', 'named'] as const).map((rarity) => {
                    const count = summary.itemsByRarity[rarity];
                    if (count === 0) return null;
                    const names = rarity === 'rare'
                      ? summary.rareDrops
                      : rarity === 'named'
                        ? summary.namedDrops
                        : [];
                    return (
                      <li key={rarity}>
                        {rarity}: {count}
                        {names.length > 0 ? ` — ${names.join(', ')}` : ''}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {summary.materials.length > 0 && (
              <section aria-labelledby="away-materials-heading">
                <h3 id="away-materials-heading">Materials</h3>
                <ul>
                  {summary.materials.map((material) => (
                    <li key={material.itemId}>
                      {material.name}: {material.quantity}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(summary.kills > 0 ||
              summary.questsCompleted > 0 ||
              summary.questsFailed > 0 ||
              summary.knockouts > 0) && (
              <section aria-labelledby="away-activity-heading">
                <h3 id="away-activity-heading">Activity</h3>
                <ul>
                  {summary.kills > 0 && (
                    <li>
                      Kills: {summary.kills} ({summary.namedKills} named)
                    </li>
                  )}
                  {summary.questsCompleted > 0 && (
                    <li>Quests completed: {summary.questsCompleted}</li>
                  )}
                  {summary.questsFailed > 0 && <li>Quests failed: {summary.questsFailed}</li>}
                  {summary.knockouts > 0 && <li>Knockouts: {summary.knockouts}</li>}
                </ul>
              </section>
            )}
          </>
        )}
        <button onClick={onDismiss} type="button">
          Back to the guild
        </button>
      </div>
    </div>
  );
}
