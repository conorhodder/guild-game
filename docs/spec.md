# Living specification: The Guildmaster's Ledger (MVP)

This is the `Specify`-stage artifact for [PRD-001](prd.md). It turns the
technical features in [features.md](features.md) into contracts. Each section
lists the PRD criteria it serves. Numbers marked *(tunable)* are starting values
and may be retuned by TF-16, as long as the PRD targets still hold.

## 1. Architecture

```
src/
  game/            pure, deterministic engine (no DOM, no React, no Date.now, no Math.random)
    types.ts       GameState and all persisted types
    rng.ts         seeded PRNG stored in GameState
    clock.ts       wall-time -> sim-time mapping, offline cap, clock guards
    sim.ts         advance(state, toSimMs): fixed-tick simulation loop
    actions.ts     every player action as (state, action, wallMs) -> state
    systems/       heroes, items, combat, quests, skills, fatigue, loot, camps,
                   recruitment, gathering, ledger, log
    data/          static game data (classes, items, monsters, quests, zones, names)
  save/            envelope, migrations, autosave, export/import, fixtures/
  ui/              React screens and components
  store.ts         GameStore: holds GameState, runs the clock, autosaves, notifies React
```

- The engine works on plain JSON-serialisable data. Each action or `advance`
  call clones the state once (`structuredClone`) and mutates the clone, so React
  always gets a new top-level object.
- An ESLint rule bans `Math.random`, `Date.now` and `new Date()` inside
  `src/game/**`. Wall time is passed in as an argument.
- React reads the store through `useSyncExternalStore`.

## 2. Determinism and time (AC-13, AC-14, G-4, G-5; Q1, Q2)

- **Sim time** (`state.clock.simMs`) is the game's own monotonic clock in ms.
  **Wall time** is `Date.now()`, read only by `store.ts`.
- `TICK_MS = 1000`. `advance(state, toSimMs)` processes every whole tick
  `t` with `state.clock.simMs < t <= toSimMs`, in order, then sets
  `simMs = toSimMs`. All scheduled things (`endsAt`, `nextEncounterAt`,
  `spawnReadyAt`, `nextYieldAt`, `injuredUntil`, board refresh) are compared
  against tick times only. **Chunking invariance:** advancing by N one-second
  calls must produce a state deep-equal to one call of N seconds. This is
  tested.
- `syncToWall(state, nowWall)` in `clock.ts`:
  - `delta = nowWall - state.clock.lastWallMs`
  - if `delta <= 0`: grant no progress and leave `lastWallMs` unchanged (a
    high-water mark), so winding the clock back and forward again never
    re-grants time.
  - else: `credit = min(delta, OFFLINE_CAP_MS)` with
    `OFFLINE_CAP_MS = 12 * 3600 * 1000`, then `advance(state, simMs + credit)`
    and set `lastWallMs = nowWall`.
  - It returns `{ state, credited, events }`.
- The store calls `syncToWall` every second while the tab is visible. It stops
  its interval when the tab is hidden and calls `syncToWall` once on becoming
  visible again. It also calls it on load. If `credited >= 60_000` (an
  "absence"), the UI shows the *While you were away* summary built from the
  returned `events`.
- All randomness comes from `state.rng` (a uint32, mulberry32).
  `rngNext(state)` returns a float in [0,1) and advances `state.rng`. Helpers:
  `rngInt(state, lo, hi)` and `rngPick(state, arr)`.
- IDs come from `state.nextId` (an incrementing integer), formatted
  `h12`, `i40`, `a7` and so on.

## 3. Save format (AC-16, G-1, J6)

- localStorage key `guildmasters-ledger.save`. Envelope:
  `{ format: 'tgl-save', version: number, savedAt: number, state: GameState }`.
- `SAVE_VERSION` is a constant. `migrations[v]` upgrades version `v` to `v+1`
  and is purely additive (it fills defaults). `loadEnvelope(json)` validates
  the format, rejects versions newer than `SAVE_VERSION`, migrates in order and
  returns a `GameState`.
- **Every change to the persisted shape bumps `SAVE_VERSION` and adds a
  migration.** It also adds a fixture `src/save/fixtures/v{N}.json`, captured
  from the previous version before the change. A test loads every fixture and
  asserts it migrates to a valid current state (G-1).
- Released item, monster, quest, and zone IDs are save-format contracts: never
  rename or remove them; add new IDs instead.
- Autosave: the store saves at least every 30 s and immediately after every
  dispatched action.
- Export: the envelope JSON, UTF-8, base64-encoded, shown in a textarea with a
  Copy button and a "Download .txt" button. Import: paste, validate, confirm,
  replace. Invalid input shows an error and changes nothing.
- A corrupted local save is never silently overwritten. Its raw text is moved
  to `guildmasters-ledger.save.corrupt-<wallMs>`, and the player is told before
  a new game starts.

## 4. Game state (target MVP shape)

```ts
type ClassId = 'warrior' | 'cleric' | 'rogue' | 'wizard';
type CombatSkill = 'offense' | 'defense' | 'healing' | 'evocation' | 'backstab';
type GatherSkill = 'mining' | 'herbalism';
type Slot = 'mainHand' | 'offHand' | 'body' | 'trinket';
type Rarity = 'common' | 'uncommon' | 'rare' | 'named';
type Con = 'trivial' | 'easy' | 'even' | 'tough' | 'deadly';
type LogCategory = 'combat' | 'loot' | 'skill' | 'system';

interface Hero {
  id: string; name: string; classId: ClassId; glyph: string; flavour: string;
  level: number; xp: number;                       // xp = progress within current level
  skills: Partial<Record<CombatSkill, number>>;
  gather: Record<GatherSkill, number>;
  equipment: Partial<Record<Slot, string>>;        // item instance uid
  fatigue: number;                                 // 0..100, float
  activityId: string | null;
  injuredUntil: number | null;                     // simMs
}
interface ItemInstance { uid: string; itemId: string }
type Activity =
  | { kind: 'quest'; id: string; questId: string; heroIds: string[]; startedAt: number; endsAt: number; nextEncounterAt: number; encountersLeft: number }
  | { kind: 'camp'; id: string; zoneId: string; campId: string; heroIds: string[]; startedAt: number; spawnReadyAt: number; nextSpawnNamed: boolean }
  | { kind: 'gather'; id: string; heroId: string; skill: GatherSkill; startedAt: number; nextYieldAt: number; yields: number }
  | { kind: 'rest'; id: string; heroId: string; startedAt: number };
interface LogLine { id: number; simMs: number; channel: string; category: LogCategory; text: string; highlight?: boolean }

interface GameState {
  guildName: string;
  gold: number;
  clock: { simMs: number; lastWallMs: number };
  rng: number; nextId: number;
  heroes: Record<string, Hero>; heroOrder: string[];
  stash: Record<string, ItemInstance>;             // unequipped gear
  materials: Record<string, number>;               // itemId -> qty
  activities: Record<string, Activity>;
  recruitment: { candidates: Hero[]; refreshAt: number };
  seenMonsters: string[];                          // for the named lookup (PRD §4.5)
  log: LogLine[]; nextLogId: number;
  ledger: Ledger;
  onboarding: { dismissed: string[] };
}
```

- Hero **status** is derived and never stored. It is *Injured* if
  `injuredUntil > simMs`, otherwise it comes from the kind of `activityId`
  (*On quest* / *Camping* / *Gathering* / *Resting*), otherwise *Idle*.
- **Log retention (AC-15):** each channel (an activity id, or `guild`) keeps at
  least its last 500 lines. Older lines are trimmed per channel. A finished
  activity's channel is kept, so the player can read it afterwards, until it
  ages out under a global cap of 5,000 lines.

## 5. Systems

### Heroes and classes (TF-4, AC-3)

| Class | Role | Skills | Base HP / +per level | Base attack / +per level |
|---|---|---|---|---|
| Warrior | tank | offense, defense | 60 / +12 | 6 / +1.5 |
| Cleric | healer | offense, defense, healing | 45 / +8 | 4 / +1.0 |
| Rogue | melee dps | offense, defense, backstab | 45 / +8 | 8 / +2.0 |
| Wizard | ranged dps | offense, defense, evocation | 35 / +6 | 9 / +2.2 |

*(tunable)*. Effective stats are class base + level growth + the sum of gear
stats. Skill cap = `5 * (level + 1)`. New heroes start each of their skills at
`min(cap, 5 + 2*level)`. Gathering skills start at 1 and cap at
`10 + 4 * level`. XP to the next level is
`xpToNext(L) = round(34 * L ^ 1.823)` (`XP_BASE = 34`, `XP_EXP = 1.823`).
Level cap is 20. XP above the cap is discarded.

New game: the player enters a guild name and gets a Warrior, a Cleric, and
either a Rogue or a Wizard (rng), all level 1, each with starter gear equipped.
The guild starts with 50 gold. Names, glyphs and flavour lines are generated
from original word lists in `data/names.ts`.

### Items (TF-5, AC-4)

Item data: `{ id, name, slot | 'material', rarity, levelReq, classes: ClassId[] | 'all', stats: { attack?, armor?, hp?, heal? }, value }`.
To equip, the item must be in the stash, `hero.level >= levelReq`, the class
must be allowed and the hero must be *Idle*. Any item already in that slot goes
back to the stash. The equip dialog shows a before → after stat diff, with
signed deltas, before the player confirms. Selling an item from the stash gives
`value` gold. Materials sell per unit.

### Con tiers (AC-17)

`diff = targetLevel - partyAvgLevel` (rounded):
`<= -5` trivial · `-4..-2` easy · `-1..+1` even · `+2..+3` tough · `>= +4` deadly.
Each tier always shows a text label next to its colour. Trivial targets give no
XP.

### Combat (TF-6, AC-15, PRD §4.1/4.8)

Every fight is one party against one monster, resolved in a single call at its
scheduled tick. Rounds are 3 s apart, and each log line is stamped with its
round's sim time. Heroes start each fight at full HP. A fight lasts at most 30
rounds; after that the monster flees and the fight is logged, with no XP or
loot.

Each round, every standing hero acts in `heroIds` order, then the monster acts.

- Hero hit chance: `clamp(0.65 + (offense - 5*mLevel)/200, 0.05, 0.95)`.
  Damage is `max(1, round(attack * U(0.8,1.2) - mArmor/2))`. A Rogue crits (×2)
  with chance `0.05 + backstab/400`. A Wizard adds `evocation/10` damage. Each
  attack is a use of offense, and of backstab or evocation where they apply.
- Cleric: if any standing ally is below 60% HP, the cleric heals the lowest one
  for `round(heal + healing/4 + 4)` (a healing use) instead of attacking.
- Monster target: the Warrior if one is standing, otherwise a random standing
  hero. Monster hit chance: `clamp(0.65 + (5*mLevel - defense)/200, 0.05, 0.95)`,
  and each attempt is a defense use for the target. Damage:
  `max(1, round(mDamage * U(0.8,1.2) - armor/2))`.
- Fatigue above 75 means the hero deals ×0.8 damage and has −0.1 hit chance.
- Win: base XP `monster.xp * conMult` (trivial 0, easy 0.5, even 1, tough 1.3,
  deadly 1.6), times a group bonus of `1 + 0.1*(n-1)`, split evenly among
  standing heroes. Then the loot roll (TF-10).
- Log voice: *"Brannoc hits a marsh rat for 7 points of damage."*,
  *"A marsh rat tries to hit Ysolde, but misses!"*,
  *"Ysolde has been knocked out!"*, *"You have slain a marsh rat!"*.

### Quests (TF-7, AC-5, AC-7)

Quest data: `{ id, name, level, durationMin, encounters: monsterId[], rewardXp, rewardGold, lootTable }`.
The party has 1–4 heroes, each *Idle*, not *Injured* and with fatigue < 100.
Encounters are spaced evenly across the duration. A party that is entirely
knocked out fails the quest: there is no completion reward, and survivors (if
any) return. On completion, the party receives `rewardXp` split evenly, plus
`rewardGold` and one roll on `lootTable`. Quest cards show recommended level,
con, duration and possible rewards before dispatch. A new game always offers
"Rats in the Cellar" (level 1, 2 minutes), labelled **Easy first quest**.

XP remains fractional internally, but the UI displays it rounded down.

### Skills (TF-8, AC-9, AC-10)

On each use where `value < cap`: skill-up chance `max(0.01, 0.2 * (1 - value/cap))`.
On success: `value += 1`, and the log reads
*"Brannoc has become better at Defense! (37)"*, category `skill`. A level-up
shows *"Brannoc has gained a level! Welcome to level 5!"* (highlighted) and
recomputes the caps. The XP bar always shows `xp / xpToNext(level)`.

### Fatigue, knockout and recovery (TF-9, AC-7, AC-12, J5)

*(tunable)* Fatigue rises by +1.0 per sim minute on a quest or at a camp, and by
+0.5 per minute while gathering. It falls by −3.0 per minute while resting and
−1.0 per minute while *Idle*. It is clamped to 0..100. At 100, the hero is
removed from gathering. A rest activity ends automatically at fatigue 0.

Knockout: the hero loses `floor(0.25 * xp)` of their current-level progress
(never a level) and leaves the activity. They become *Injured* with
`injuredUntil = now + (5 + level) minutes`. The log line is highlighted. There
is no permadeath.

### Loot (TF-10, AC-11, S-5)

Loot tables: `{ gold: [min, max], entries: { itemId, chance }[] }`. Each entry
is rolled independently. Named-rarity items may only appear in tables belonging
to named monsters, and a data-validation test enforces this. A drop goes to the
stash with the log line *"You receive a Rusted Shortsword."*. Rare and Named
drops are highlighted. Test: at least 10,000 seeded simulated kills (more if
the rate is low), and every named spawn rate and named drop rate must land
within ±10% relative of its data rate.

### Zones and camps (TF-11, AC-6, J3)

Zone data: `{ id, name, levelRange, camps: { id, name, monsters: string[], namedId?, namedChance, respawnSec }[] }`.
`namedChance` is between 0.05 and 0.12; `respawnSec` is between 60 and 180.
A camping party fights the current spawn when `spawnReadyAt <= t`. When a spawn
is scheduled, `nextSpawnNamed` is rolled with `namedChance`. After each fight,
`spawnReadyAt = fightEnd + respawnSec`. Monsters are added to `seenMonsters`
when fought, and the named lookup shows a named monster's drop list only once
it has been seen. Recall ends the camp on the next simulation tick, keeps
everything earned and sends the heroes back *Idle*. Automatic retreat happens
when fewer than half of the starting party remain or any current member reaches
fatigue 100; a full-party wipe ends the camp. Active camps retain kill and named
kill counts in their activity state.

### Recruitment (TF-12, AC-2, J4)

The board always has 3 candidates and refreshes every 30 sim minutes. Candidate
classes are random, with at least 2 distinct classes on the board. Candidate
level is `clamp(round(avg roster level) + rng(-1..1), 1, 20)` (use average
level 1 for an empty roster). A visible countdown shows the next refresh. Hire
cost is `40 + 30 * level` gold. Hiring replaces the candidate so the board
stays at 3. The roster cap is 8; at the cap, hiring is disabled and a message
explains why. Dismissal is limited to Idle heroes, requires UI confirmation and
returns their equipped gear to the stash.

### Gathering (TF-13, AC-8)

A gathering job takes one *Idle* hero with fatigue below 100. Mining and
Herbalism each have three material tiers with increasing value and skill
requirements (1, 30 and 60); their per-unit values are 1, 2 and 3 gold.
Every `max(20, 60 - skillValue/2)` seconds, the hero gathers one unit of the
best tier their skill allows, with a 10% chance to gather the tier below. Each
yield can raise the skill using `trySkillUp` and the gathering cap. Materials
stack in `materials` and can be sold. Gathering stops at fatigue 100; its
activity tracks the total yield count.

### Offline and "While you were away" (TF-14, AC-13, AC-14, G-4, G-5, J2)

Offline progress uses the same `syncToWall` path as online play, so online and
offline are identical by construction. On load and when returning to a visible
tab, a sync that credits at least 60 seconds produces a summary from structured
simulation events and before/after hero snapshots, never from the retained log.
The modal reports raw time away, credited time and whether the 12-hour cap was
hit; it lists per-hero floored XP, levels, skill-ups and knockouts, plus gold,
items by rarity, rare and named item names, materials, kills, named kills and
quest outcomes. Empty sections are omitted, heroes needing attention appear
first, and each hero has a "Go to hero" button. Live one-second ticks do not
produce a summary. If no progress events or hero changes occurred, the dialog
says "All quiet while you were away." The modal has an accessible labelled
dialog role, traps Tab, closes with Escape or "Back to the guild", and restores
focus when dismissed.

### Guild Ledger (TF-15, S-1, S-2)

```ts
interface Ledger { firstLoadWall: number; firstDispatchWall: number | null; sessions: number;
  lastActiveWall: number; playDays: string[]; kills: number; namedKills: number;
  firstDispatchAt: number | null; firstQuestCompleteAt: number | null;
  namedDrops: number; highestLevel: number; questsCompleted: number; questsFailed: number;
  goldEarned: number; itemsByRarity: Record<Rarity, number>; knockouts: number;
  skillUps: number; levelsGained: number; totalSimMsPlayed: number;
  namedMonstersSlainById: Record<string, number> }
```
A session starts on load, or after more than 30 minutes with no actions.
`playDays` holds local `YYYY-MM-DD` dates on which the player took at least one
state-changing action. Structured simulation events are folded into the lifetime
counters after each `advance`; dispatch actions record their first wall and
simulation timestamps. The Ledger screen shows every stat, a named-slay list
and an "Export ledger (JSON)" button. The export contains only the Ledger and is
downloaded locally; the Ledger never leaves the device.

## 6. UI

The UI uses one screen with a header and tabs: Roster · Quests · Zones · Recruit
· Gathering · Stash · Log · Ledger · Settings. The header shows the guild name,
gold and a sim clock. Selecting a hero in Roster opens their hero sheet. The
style is text and glyphs in a dark parchment palette, using the existing
`index.css` tokens. Accessibility: semantic landmarks and headings, real
`<button>`s, tabs following the WAI-ARIA tabs pattern, visible focus, a
`role="log"` live region for new highlighted lines only, and colour never used
as the only signal. The minimum supported viewport is 1280×720.

## 7. Verification gates

These must pass before every push to `main`: `npm run lint`, `npm run typecheck`,
`npm test` and `npm run build`. Each feature adds unit tests for its system in
`src/game/**` and, where it has UI, at least one React Testing Library test of
its main interaction. TF-18 adds an `axe-core` scan of every screen (dev
dependency only) and a performance test: `advance` over 12 h with 8 heroes and
2 camps must finish in under 2 s in CI.

TF-16 records the three-seed progression and named-camp balance measurements in
[docs/balance.md](balance.md); `npm run balance` runs the full deterministic
simulation.
