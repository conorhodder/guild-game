import { useState } from 'react';
import { classes } from '../game/data/classes';
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
}

function HeroSheet({ game, hero }: { game: GameState; hero: Hero }) {
  const status = heroStatus(hero, game);
  const stats = heroStats(hero, game);
  const xpRequired = xpToNext(hero.level);
  const health = hero.injuredUntil !== null && hero.injuredUntil > game.clock.simMs
    ? 'Injured'
    : 'Healthy';

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
          <dd>{status}</dd>
        </div>
        <div>
          <dt>Health</dt>
          <dd>{health}</dd>
        </div>
        <div>
          <dt>Fatigue</dt>
          <dd>{hero.fatigue}</dd>
        </div>
        <div>
          <dt>Max HP</dt>
          <dd>{stats.maxHp}</dd>
        </div>
        <div>
          <dt>Attack</dt>
          <dd>{stats.attack}</dd>
        </div>
        <div>
          <dt>Armor</dt>
          <dd>{stats.armor}</dd>
        </div>
        <div>
          <dt>Heal</dt>
          <dd>{stats.heal}</dd>
        </div>
      </dl>

      <section aria-labelledby="hero-xp-heading">
        <h4 id="hero-xp-heading">Experience</h4>
        <progress aria-label={`${hero.name} experience`} max={xpRequired} value={hero.xp} />
        <p>{hero.xp} / {xpRequired} XP</p>
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
        <ul className="hero-gear">
          {gearSlots.map((slot) => (
            <li key={slot.id}>
              {slot.label}: {hero.equipment[slot.id] ?? '—'}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

export function RosterPanel({ game }: RosterPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
        <p>Your roster is empty.</p>
      ) : (
        <div className="roster-layout">
          <ul aria-label="Heroes" className="hero-list">
            {heroes.map((hero) => (
              <li key={hero.id}>
                <button
                  aria-pressed={selectedHero?.id === hero.id}
                  onClick={() => setSelectedId(hero.id)}
                  type="button"
                >
                  {hero.glyph} {hero.name} · {classes[hero.classId].name} · Level {hero.level}
                  <span>{heroStatus(hero, game)} · Fatigue {hero.fatigue}</span>
                </button>
              </li>
            ))}
          </ul>
          {selectedHero && <HeroSheet game={game} hero={selectedHero} />}
        </div>
      )}
    </section>
  );
}
