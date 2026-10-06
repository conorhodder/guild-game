import { useState } from 'react';
import { getEquipReason } from '../game/actions';
import { classes } from '../game/data/classes';
import { itemsById } from '../game/data/items';
import { equipPreview as getEquipPreview } from '../game/systems/items';
import { gatherCap, heroStats, heroStatus, skillCap, xpToNext } from '../game/systems/heroes';
import type { CombatSkill, GameState, GatherSkill, Hero, Slot } from '../game/types';

const gearSlots: { id: Slot; label: string }[] = [
  { id: 'mainHand', label: 'Main hand' },
  { id: 'offHand', label: 'Off hand' },
  { id: 'body', label: 'Body' },
  { id: 'trinket', label: 'Trinket' },
];

const skillLabels: Record<CombatSkill | GatherSkill, string> = {
  offense: 'Offense',
  defense: 'Defense',
  healing: 'Healing',
  evocation: 'Evocation',
  backstab: 'Backstab',
  mining: 'Mining',
  herbalism: 'Herbalism',
};

interface RosterPanelProps {
  game: GameState;
  onEquip: (heroId: string, uid: string) => string | null;
  onUnequip: (heroId: string, slot: Slot) => string | null;
  onRest: (heroId: string) => string | null;
  onRecall: (activityId: string) => string | null;
  selectedHeroId?: string | null;
  onHeroSelect?: (heroId: string) => void;
}

function formatStat(value: number): string {
  return String(Math.round(value));
}

function signedDelta(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatStat(value)}`;
}

function fatigueLabel(fatigue: number): string {
  if (fatigue >= 100) return 'Exhausted';
  if (fatigue > 75) return 'Weary';
  return 'Rested';
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, durationMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function statusText(hero: Hero, game: GameState): string {
  const status = heroStatus(hero, game);
  if (status !== 'Injured') return status;
  return `Injured — ${formatDuration((hero.injuredUntil ?? 0) - game.clock.simMs)}`;
}

function HeroSheet({
  game,
  hero,
  onEquip,
  onUnequip,
  onRest,
  onRecall,
}: {
  game: GameState;
  hero: Hero;
  onEquip: RosterPanelProps['onEquip'];
  onUnequip: RosterPanelProps['onUnequip'];
  onRest: RosterPanelProps['onRest'];
  onRecall: RosterPanelProps['onRecall'];
}) {
  const [selectedItems, setSelectedItems] = useState<Partial<Record<Slot, string>>>({});
  const [error, setError] = useState('');
  const status = heroStatus(hero, game);
  const displayedStatus = statusText(hero, game);
  const stats = heroStats(hero, game);
  const xpRequired = xpToNext(hero.level);
  const displayedXp = Math.floor(hero.xp);
  const health = status === 'Injured' ? displayedStatus : 'Healthy';
  const stashItems = Object.values(game.stash).flatMap((instance) => {
    const item = itemsById[instance.itemId];
    return item && item.slot !== 'material' ? [{ instance, item }] : [];
  });

  function equipSelected(slot: Slot, uid: string) {
    const reason = onEquip(hero.id, uid);
    if (reason) {
      setError(reason);
      return;
    }
    setError('');
    setSelectedItems((current) => ({ ...current, [slot]: '' }));
  }

  function unequipSlot(slot: Slot) {
    const reason = onUnequip(hero.id, slot);
    setError(reason ?? '');
  }

  function equippedItemName(slot: Slot): string {
    const uid = hero.equipment[slot];
    const instance = uid ? game.itemInstances[uid] : null;
    return instance ? itemsById[instance.itemId]?.name ?? '—' : '—';
  }

  return (
    <article aria-labelledby="hero-sheet-heading" className="hero-sheet">
      <h3 id="hero-sheet-heading">
        {hero.glyph} {hero.name}
      </h3>
      <p>{hero.flavour}</p>
      <dl className="hero-details">
        <div>
          <dt>Class</dt>
          <dd>{classes[hero.classId].name}</dd>
        </div>
        <div>
          <dt>Level</dt>
          <dd>{hero.level}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{displayedStatus}</dd>
        </div>
        <div>
          <dt>Health</dt>
          <dd>{health}</dd>
        </div>
        <div>
          <dt>Fatigue</dt>
          <dd>{Math.floor(hero.fatigue)} — {fatigueLabel(hero.fatigue)}</dd>
        </div>
        <div>
          <dt>Max HP</dt>
          <dd>{Math.round(stats.maxHp)}</dd>
        </div>
        <div>
          <dt>Attack</dt>
          <dd>{Math.round(stats.attack)}</dd>
        </div>
        <div>
          <dt>Armor</dt>
          <dd>{Math.round(stats.armor)}</dd>
        </div>
        <div>
          <dt>Heal</dt>
          <dd>{Math.round(stats.heal)}</dd>
        </div>
      </dl>

      <section aria-labelledby="hero-xp-heading">
        <h4 id="hero-xp-heading">Experience</h4>
        <progress aria-label={`${hero.name} experience`} max={xpRequired} value={displayedXp} />
        <p>{displayedXp} / {xpRequired} XP</p>
      </section>

      <section aria-labelledby="hero-skills-heading">
        <h4 id="hero-skills-heading">Skills</h4>
        <ul className="hero-skills">
          {Object.entries(hero.skills).map(([skill, value]) => (
            <li key={skill}>
              {skillLabels[skill as CombatSkill]}: {value} / {skillCap(hero.level)}
            </li>
          ))}
          {(Object.entries(hero.gather) as [GatherSkill, number][]).map(([skill, value]) => (
            <li key={skill}>
              {skillLabels[skill]}: {value} / {gatherCap(hero.level)}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="hero-gear-heading">
        <h4 id="hero-gear-heading">Gear</h4>
        <div className="hero-gear">
          {gearSlots.map((slot) => {
            const slotItems = stashItems.filter(({ item }) => item.slot === slot.id);
            return (
              <section className="gear-slot" key={slot.id}>
                <h5>{slot.label}: {equippedItemName(slot.id)}</h5>
                <label htmlFor={`equip-${hero.id}-${slot.id}`}>Choose {slot.label.toLowerCase()}</label>
                {slotItems.length === 0 && <p>No items for this slot in the stash.</p>}
                <select
                  id={`equip-${hero.id}-${slot.id}`}
                  onChange={(event) =>
                    setSelectedItems((current) => ({ ...current, [slot.id]: event.target.value }))
                  }
                  value={selectedItems[slot.id] ?? ''}
                >
                  <option value="">Choose an item</option>
                  {slotItems.map(({ instance, item }) => {
                    const reason = getEquipReason(game, hero.id, instance.uid, slot.id);
                    return (
                      <option disabled={reason !== null} key={instance.uid} value={instance.uid}>
                        {item.name}{reason ? ` — ${reason}` : ''}
                      </option>
                    );
                  })}
                </select>
                {hero.equipment[slot.id] && (
                  <button onClick={() => unequipSlot(slot.id)} type="button">
                    Unequip {slot.label.toLowerCase()}
                  </button>
                )}
                {selectedItems[slot.id] && (() => {
                  const preview = getEquipPreview(game, hero.id, selectedItems[slot.id] ?? '');
                  if ('reason' in preview) {
                    return <p role="alert">{preview.reason}</p>;
                  }
                  return (
                    <div aria-label={`${slot.label} stat preview`} className="equip-preview">
                      <p>Before → After</p>
                      <ul>
                        {([
                          ['Max HP', 'maxHp'],
                          ['Attack', 'attack'],
                          ['Armor', 'armor'],
                          ['Heal', 'heal'],
                        ] as const).map(([label, key]) => (
                          <li key={key}>
                            {label}: {formatStat(preview.before[key])} → {formatStat(preview.after[key])}
                            {' '}({signedDelta(preview.delta[key])})
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => equipSelected(slot.id, selectedItems[slot.id] ?? '')}
                        type="button"
                      >
                        Equip
                      </button>
                    </div>
                  );
                })()}
              </section>
            );
          })}
        </div>
      </section>
      {status === 'Idle' && hero.fatigue > 0 && (
        <button onClick={() => setError(onRest(hero.id) ?? '')} type="button">
          Rest
        </button>
      )}
      {status === 'Resting' && hero.activityId && (
        <button onClick={() => setError(onRecall(hero.activityId ?? '') ?? '')} type="button">
          Stop resting
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </article>
  );
}

export function RosterPanel({
  game,
  onEquip,
  onUnequip,
  onRest,
  onRecall,
  selectedHeroId: controlledSelectedId,
  onHeroSelect,
}: RosterPanelProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const selectedId = controlledSelectedId ?? internalSelectedId;
  const heroes = game.heroOrder.flatMap((id) => {
    const hero = game.heroes[id];
    return hero ? [hero] : [];
  });
  const selectedHero =
    heroes.find((hero) => hero.id === selectedId) ?? heroes[0] ?? null;

  return (
    <section aria-labelledby="roster-heading" className="roster">
      <h2 id="roster-heading">Roster</h2>
      {heroes.length === 0 ? (
        <>
          <p>Your roster is empty.</p>
          <p>Visit Recruitment to hire your first heroes.</p>
        </>
      ) : (
        <div className="roster-layout">
          <ul aria-label="Heroes" className="hero-list">
            {heroes.map((hero) => (
              <li key={hero.id}>
                <button
                  aria-pressed={selectedHero?.id === hero.id}
                  onClick={() => {
                    if (controlledSelectedId === undefined) setInternalSelectedId(hero.id);
                    onHeroSelect?.(hero.id);
                  }}
                  type="button"
                >
                  {hero.glyph} {hero.name} · {classes[hero.classId].name} · Level {hero.level}
                  <span>
                    {statusText(hero, game)} · Fatigue {Math.floor(hero.fatigue)} — {fatigueLabel(hero.fatigue)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {selectedHero && (
            <HeroSheet
              game={game}
              hero={selectedHero}
              onEquip={onEquip}
              onUnequip={onUnequip}
              onRest={onRest}
              onRecall={onRecall}
            />
          )}
        </div>
      )}
    </section>
  );
}
