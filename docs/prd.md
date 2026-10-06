# PRD-001 · The Guildmaster's Ledger: a single-player, old-school guild manager (MVP)

| | |
|---|---|
| **Status** | Draft: awaiting acceptance at the Frame gate |
| **Accountable owner** | Conor Hodder |
| **Stage** | Frame ([The Agentic SDLC](https://github.com/conorhodder/sdlc), `docs/stages/frame.md`) |
| **Supersedes** | none |
| **Technical features** | [docs/features.md](features.md) (proposed; to be confirmed in Specify) |

This PRD is the product-focused root that all work on The Guildmaster's Ledger traces back to. It
covers the *why*, *for whom* and *how we will know it worked*. It deliberately
carries no technical design: that belongs in the technical features and the
living specification produced in `Specify`.

Where a scope-changing decision was taken while framing, it is marked
**(decision: Qn)** and points to the matching entry in
[Resolved decisions](#12-resolved-decisions).

---

## 1. Problem and audience

### Problem

Old-school MMOs like EverQuest (1999) and RuneScape (2001) are remembered for
a particular feel: slow, steady skill grinds, rare drops from named monsters you
camp for hours, a scrolling text combat log, and a party of distinct classes
working together. You can't really get that feel today without:

- **a multiplayer time commitment**: playing those games well meant long sessions
  and coordinating groups with other people;
- **modern MMO design**: today's games lean towards fast levelling, guided quests and
  monetised progression.

The fantasy that lasts is *running a group of adventurers*. A single-player game
can deliver that without other players: the player runs a guild and manages a
whole roster of heroes rather than one character. Idle pacing lets that
progress happen in short check-ins instead of multi-hour sessions.

### Audience

- **Primary:** Conor Hodder, who owns the product and plays it daily. He has a
  nostalgic attachment to EverQuest and RuneScape and limited, fragmented play
  time.
- **Secondary:** a small circle of similar players (friends, colleagues) who are
  sent a link. They are adults who played or know of late-90s/early-2000s MMOs,
  play on a desktop browser, and want short check-ins plus occasional longer
  "active" sessions.
- **Not the audience (for this PRD):** players looking for multiplayer, real-time
  action combat, or a commercial free-to-play game.

### Why now

The repository is new and empty. This PRD is the first artifact and anchors
every later technical feature. The project is also an end-to-end dogfood of the
Agentic SDLC, so the product intent needs to be falsifiable before any code
exists.

---

## 2. Product summary and core loop

The Guildmaster's Ledger is an **idle-ish guild manager** (decision: Q1, Q2). The player is
the guild master and never fights directly. They recruit heroes, equip them,
form parties and send them on timed **quests**, or to **camp** a spot in a
dungeon. They also assign idle heroes to **gathering jobs**. Time passes, either
while the player watches or while they are away. Heroes fight, earn XP, raise
skills through use, collect loot and get tired. The player comes back, reads
the log, re-gears and sends them out again.

### Core gameplay loop

```
   ┌─────────────► Recruit ──► Equip ──► Assign ─────────────┐
   │                                     (quest · camp ·     │
   │                                      gather · rest)     ▼
 Manage ◄── Review ◄── Resolve (combat log, XP, skill-ups,  Time passes
 (gear, sell,  (log,    loot, fatigue, knockouts)           (watched or idle,
  roster)     summary)                                       incl. offline)
```

1. **Recruit**: hire heroes from a rotating recruitment board, paying gold.
2. **Equip**: give heroes gear from the guild stash, respecting class and level
   requirements.
3. **Assign**: form parties of 1–4 heroes and send them on a quest or to a camp,
   assign individual heroes to a gathering job, or rest them.
4. **Time passes**: activities resolve in real time, including while the game is
   closed, up to the offline cap (decision: Q2).
5. **Resolve**: combat and gathering happen without player input. Each outcome
   is written to a text log: hits, misses, heals, deaths, skill-ups, loot and
   level-ups ("dings").
6. **Review**: the player reads a summary (and the full log if they want it).
7. **Manage**: equip new loot, sell junk for gold, recruit or swap heroes, then
   send everyone out again on harder content.

Progression comes from **hero levels**, **skills that rise with use**, **better
gear** (especially rare drops) and **access to harder zones**.

---

## 3. Hero model (product altitude)

Exact numbers belong in the specification. The **shape** of the model is set here.

| Attribute | MVP intent |
|---|---|
| **Class** | Four classes covering the classic "holy trinity": **Warrior** (tank), **Cleric** (healer), **Rogue** (melee damage), **Wizard** (ranged/magic damage). Class sets which gear a hero can use, which combat skills they have and their role in party combat. |
| **Level** | 1–20 in MVP (cap raised later). XP comes from combat. The XP curve is steep: each level takes noticeably longer than the last, so a "ding" means something. |
| **Combat skills** | Two to three per class (e.g. *Offense*, *Defense*, and a class skill such as *Healing* or *Evocation*). They rise **through use** in combat, with a cap based on level. Each increase is logged in the classic style: *"Brannoc has become better at Defense! (37)"*. |
| **Gathering skills** | Two shared skills in MVP (**Mining**, **Herbalism**), trained by gathering jobs. Each skill has its own level, separate from hero level, RuneScape-style. |
| **Gear** | Four slots in MVP: **main hand**, **off hand**, **body**, **trinket**. Items have a level requirement, class restrictions, stats and a rarity tier: **Common**, **Uncommon**, **Rare** or **Named** (drops only from named monsters). |
| **Health** | Full at the start of each activity. Reaching zero in combat means the hero is **knocked out**. |
| **Fatigue** | 0–100. Rises during quests, camps and gathering, and falls while resting. Above **75**, heroes perform worse. At **100**, a hero can't be assigned until they have rested. |
| **Injury / knockout** | A knocked-out hero comes back **injured** and can't be assigned for a recovery period. They also lose part of their XP progress towards the next level, but never drop a level. No permadeath in MVP (decision: Q3). |
| **Status** | Exactly one of: *Idle*, *On quest*, *Camping*, *Gathering*, *Resting*, *Injured*. |
| **Identity** | Generated name, class, portrait glyph (decision: Q4), and a short generated flavour line. |

Out of MVP but planned: morale and personality traits, more classes, hybrid
classes, crafting skills, and more gear slots (see [Scope](#9-scope)).

---

## 4. The old-school MMO feel, made concrete

Here, "reminiscent of EverQuest or RuneScape" means the game has **all** of the
following. Each one is checkable.

1. **A text-heavy combat log** is the main way the player sees combat. Every
   attack, miss, heal, knockout, skill-up, loot drop and level-up is a line of
   text in a dry, period-appropriate voice. The log can be filtered by
   category: Combat, Loot, Skill-ups, System.
2. **Skill grinding:** skills go up through repetition, slowly, and every
   increase is announced in the log.
3. **"Consider" difficulty colours:** every monster, quest and zone shows a
   difficulty relative to the party's level, using EverQuest-style "con"
   tiers (*trivial / easy / even / tough / deadly*). Each tier always has a
   text label as well as a colour.
4. **Camp-able dungeons:** zones have fixed spawn points that respawn on a
   timer. A party can sit at a camp indefinitely and fight each spawn as it
   comes up.
5. **Rare named spawns:** some spawn points sometimes produce a **named** monster
   instead of the usual one (a "placeholder"). Named monsters can drop
   **Named** items that drop nowhere else. Both chances are low, and the player
   can look them up once the monster has been seen.
6. **Steep, visible progression:** XP bars, skill numbers and exact item stats are
   always visible. Nothing is hidden behind vague tiers.
7. **Meaningful death:** a knockout costs XP progress and recovery time, so
   "deadly" content stays risky.
8. **A trinity party:** party success depends on composition. A party with no
   healer or tank is noticeably worse at even-con content or harder.

---

## 5. User stories

The player is "guild master" throughout.

1. As a guild master, I want to start a new guild and send my first party out
   within a couple of minutes, so that I'm playing straight away instead of
   reading a tutorial.
2. As a guild master, I want to recruit heroes of different classes from a
   rotating board, so that I can build a balanced roster.
3. As a guild master, I want to see each hero's class, level, skills, gear,
   fatigue and status on one sheet, so that I can make decisions without hunting
   through menus.
4. As a guild master, I want to equip heroes from a shared stash, so that loot
   one party finds can make another party stronger.
5. As a guild master, I want to send a party on a timed quest with a known
   difficulty and duration, so that I can plan around my real-world schedule.
6. As a guild master, I want to send a party to camp a dungeon spot for as long
   as I like, so that I can farm XP or hunt a rare named drop.
7. As a guild master, I want heroes' skills to rise through use, and to see
   each increase, so that grinding feels rewarding.
8. As a guild master, I want rare, named-only drops, so that getting one feels
   like an event.
9. As a guild master, I want idle heroes to gather materials, so that nobody on
   the roster is wasted.
10. As a guild master, I want my guild to keep progressing while the game is
    closed, and to see what happened when I come back, so that short check-ins
    are worthwhile.
11. As a guild master, I want to read a full text combat log, so that I can
    understand why a fight went the way it did.
12. As a guild master, I want fatigue and injuries to force me to rotate heroes,
    so that managing the roster is a real decision and not "always send the
    best four".
13. As a guild master, I want my progress saved automatically and to be able to
    export and import it, so that I never lose a guild I have invested in.
14. As a guild master who uses a keyboard or assistive tech, I want to play
    fully without a mouse and without relying on colour, so that the game is
    accessible to me.

---

## 6. Key journeys and experience intent

### Experience intent

- **Dense, calm, text-forward.** The game should feel like reading the logbook of a
  1999 MMO, not a flashy mobile idle game. Information density beats spectacle.
  Numbers are shown, not hidden.
- **Respect the player's time.** No FOMO timers, no punishment for being away
  (beyond the stated knockout penalty), no dark patterns. Coming back after a day
  should feel rewarding, not stressful.
- **Rare things feel rare.** A named drop or a ding is an event: highlighted in
  the log and summary, not one of a hundred identical notifications.
- **Management is the game.** Interesting choices come from who goes where, with
  what gear, and when they rest. Combat resolves without player input; the
  player's skill shows in preparation.

### Session-length expectations

| Mode | Expected length | What the player does |
|---|---|---|
| **Check-in (idle)** | 1–3 minutes | Read the "while you were away" summary, equip loot, sell junk, re-assign everyone. |
| **Active session** | 10–30 minutes | Watch a camp's log live, swap heroes as fatigue builds, hunt a named, plan a new zone. |
| **Quest duration** | 2–60 minutes of real time | Short quests for active play, longer ones to cover an absence. |
| **Camp duration** | Open-ended, until recalled, retreated or capped by offline time | Overnight or workday farming. |
| **Offline cap** | 12 hours (decision: Q2) | Progress past the cap is not earned. |

### Key journeys

- **J1: First session.** Open the game → name the guild → get a starter roster of
  three heroes (one Warrior, one Cleric, one Rogue or Wizard) and starter gear →
  see the quest board with a clearly labelled "easy" first quest → form a party →
  dispatch → watch the log as the short first quest resolves → equip the drop →
  dispatch again.
- **J2: Check-in after time away.** Open the game → "While you were away" summary
  (duration simulated, XP, levels, skill-ups, loot, knockouts, gathered
  materials, gold) → jump to heroes needing attention (idle, fatigued, injured)
  → re-equip and re-assign → close.
- **J3: Camping for a named.** Open a zone → see its camps with con colours and
  respawn timers → send a balanced party to camp → watch spawns resolve in the
  log → named spawns appear occasionally → loot it (or not) → recall the party
  when fatigue climbs, or let it retreat on its own.
- **J4: Building the roster.** Visit the recruitment board → compare candidates
  (class, level, starting skills, cost) → hire within the roster cap → equip them
  → slot them into a party or a gathering job.
- **J5: Knockout and recovery.** A hero is knocked out → the log and summary say
  so clearly → the hero is *Injured* with a visible recovery countdown → the
  player swaps in a replacement → the hero returns to *Idle* after recovery.
- **J6: Protecting progress.** Open settings → export the save as text → (on
  another browser or after clearing data) import it → the guild is restored
  exactly.

---

## 7. High-level acceptance criteria

These are the bar for accepting the MVP. `Specify` sharpens each one into
testable behaviour. Specific numbers shown here are product targets. They can be
tuned in `Specify` without a new PRD, as long as the intent holds.

**New game and roster**

- **AC-1** From a fresh browser with no save, a player can name a guild and
  dispatch a first quest **without leaving the game or reading external
  instructions**, starting with three heroes covering at least tank, healer and
  damage roles.
- **AC-2** A recruitment board always offers **at least 3** candidates, refreshes
  on a visible timer, and charges gold to hire. The roster is capped at **8
  heroes** in MVP, and the cap is enforced with a clear message.
- **AC-3** Every hero has a single sheet showing class, level, XP to the next
  level, every skill with its current value and cap, every gear slot, fatigue,
  health state and status.
- **AC-4** Gear can be equipped from and returned to a shared stash. Class and
  level restrictions are enforced, and the effect of any equip on hero stats is
  shown **before** the player confirms.

**Activities**

- **AC-5** Quests show recommended level, con tier, duration and possible
  rewards before dispatch. A party of 1–4 eligible heroes can be dispatched.
  When the quest finishes, the party gets XP, loot and fatigue, and the log
  records it.
- **AC-6** A party can be sent to camp a zone. Spawns resolve on their respawn
  timers until the party is recalled, every member is knocked out or fatigued
  past the retreat threshold, or the offline cap is reached. The player can
  recall a camping party at any time and keeps everything already earned.
- **AC-7** Each hero can be in only one activity at a time. Heroes at 100
  fatigue or *Injured* cannot be assigned.
- **AC-8** Idle heroes can be assigned to a gathering job. Over time it produces
  materials and raises that gathering skill, and the materials can be sold for
  gold.

**Progression and loot**

- **AC-9** Combat and gathering skills rise only through use, never go above the
  current cap, and every increase appears in the log with the new value.
- **AC-10** XP to next level rises with each level, and levels 1–20 are reachable
  in MVP content.
- **AC-11** Loot comes in four rarity tiers. **Named** items drop only from named
  monsters. In a simulation of at least **10,000** resolved kills, each named
  spawn rate and named drop rate lands within **±10% (relative)** of the rate
  defined in the game data.
- **AC-12** A knocked-out hero loses part of their current-level XP progress
  (never a level), becomes *Injured* with a visible recovery time, and is never
  permanently removed in MVP.

**Time, log and persistence**

- **AC-13** After the game has been closed, reopening it gives the same outcome
  as if it had stayed open for that time, up to the offline cap, and shows a
  "While you were away" summary. Two runs of the same activity, one online and
  one offline, for the same duration and from the same starting state, produce
  identical results.
- **AC-14** Moving the device clock forward never grants more than the offline
  cap of progress. Moving it backwards never grants progress or corrupts the
  save.
- **AC-15** The combat log shows every combat, loot, skill-up, level-up and
  knockout event as text. It can be filtered by category and keeps at least the
  last **500** lines per party.
- **AC-16** The game saves automatically at least every **30 seconds** and after
  every player action that changes state. A reload restores the exact state.
  The save can be exported as text and imported on another browser.
- **AC-17** Every monster, quest and zone shows a con tier as both colour **and**
  text label.

**Platform and accessibility**

- **AC-18** The game needs no account, sends no network requests after the
  initial page load, and is fully playable offline once loaded.
- **AC-19** Every journey (J1–J6) can be completed using only the keyboard, and
  an automated accessibility scan reports **zero** serious or critical
  violations on every screen.
- **AC-20** The game is playable in the latest two versions of desktop Chrome,
  Firefox, Safari and Edge at a viewport of 1280×720 or larger.

---

## 8. Success criteria

The game has no backend and no telemetry (see [Constraints](#10-constraints)), so
measures come from three sources:

- a local, player-visible **Guild Ledger**: session and progress stats kept in the
  save, which the player can export;
- **timed playtests** with first-time players;
- **seeded balance simulations** of a scripted "reasonable player".

The measurement window is the **first 21 days after the MVP is released** to
GitHub Pages.

### Success measures

| ID | Measure | Target | Source |
|---|---|---|---|
| **S-1** | Owner retention: distinct days Conor plays (opens the game and takes at least one state-changing action) | **≥ 10 of 21** days | Guild Ledger export |
| **S-2** | Time to first dispatch: from first load to first quest dispatched, for first-time players | Median **≤ 2 minutes** across **≥ 3** playtesters | Guild Ledger timestamps + playtest |
| **S-3** | Check-in efficiency: collect, re-equip and re-assign a full 8-hero roster after an absence | **≤ 3 minutes** for a player who has done it before | Timed playtest |
| **S-4** | Progression pace: simulated reasonable player reaches level 10 and level 20 | Level 10 in **3–6 h**, level 20 in **20–40 h** of game time (idle + active) | Balance simulation |
| **S-5** | Rare-drop feel: simulated time camping a named spot before the first Named drop | Median **2–8 h** of camp time per Named item | Balance simulation |
| **S-6** | Old-school feel: playtesters' answer to "This feels like an old-school MMO" (1–5) | **≥ 2 of 3** playtesters answer **≥ 4** | Post-playtest question |

### Guardrail measures

| ID | Guardrail | Threshold | Source |
|---|---|---|---|
| **G-1** | Save integrity: saves from every released version load in every later version | **100%** of saved fixture files from each release load without loss; **zero** reported save losses | Automated check on every release + owner reports |
| **G-2** | Responsiveness: UI response to any player action with 8 heroes and 2 active camps | **≤ 100 ms** at p95 on a mid-range laptop | Performance check |
| **G-3** | Load time: first meaningful screen on a cold load | **≤ 3 s** on a mid-range laptop over a typical broadband connection | Performance check |
| **G-4** | No punishment for absence: worst-case state after leaving for the full offline cap | No hero worse off than when left, **except** the stated knockout XP penalty and recovery time; no lost items or gold | Simulation |
| **G-5** | Time-manipulation exploits: progress from changing the device clock | Never more than the offline cap (AC-14) | Automated check |
| **G-6** | Privacy: third-party requests, trackers, ads | **Zero** | Network inspection on release |
| **G-7** | Accessibility regression | **Zero** serious/critical automated violations (AC-19) | Automated check on every change |

### Delivery measures (not product success)

Delivery health is tracked with the five metrics in the Agentic SDLC
(`docs/teams/metrics.md`), not in this PRD. For this project,
"**deployment**" means a merge to `main` that publishes to GitHub Pages.

---

## 9. Scope

### In scope (MVP)

- New-game flow with a starter roster of 3 and starter gear.
- Recruitment board; roster cap of 8.
- Four classes (Warrior, Cleric, Rogue, Wizard), levels 1–20.
- Combat skills (2–3 per class) and two gathering skills (Mining, Herbalism).
- Four gear slots, four rarity tiers, shared stash, selling to a vendor for gold.
- Timed quests (about 10 quests across the MVP level range).
- Camp-able zones: **3** zones covering levels 1–20, each with a handful of
  monster types and at least one named spawn with Named-only drops.
- Gathering jobs for idle heroes.
- Fatigue, knockout, injury and recovery.
- Text combat log with category filters; con tiers with text labels.
- Real-time progress with offline catch-up up to the cap, and a "While you were
  away" summary.
- Autosave, save export and import.
- Guild Ledger (local play stats) for the success measures.
- Desktop-browser, keyboard-accessible, text and glyph presentation.

### Later (planned, out of MVP)

- Crafting and production skills that turn gathered materials into gear.
- Guild hall upgrades (roster cap, rest speed, stash size).
- Morale and personality traits, and hero relationships.
- More classes (e.g. Ranger, Paladin, Necromancer, Bard), more gear slots, and a
  level cap above 20.
- Raids (parties larger than 4) and multi-stage dungeons.
- Quest chains and light narrative.
- Optional hardcore / permadeath mode (decision: Q3).
- Bestiary/lore journal, achievements.
- Sprite or illustrated art, sound and music (decision: Q4).
- Mobile and touch-optimised layout (decision: Q6).
- Multiple save slots.

### Out of scope (not planned)

- Multiplayer of any kind, including trading, chat and leaderboards.
- Accounts, cloud saves or any backend service.
- Monetisation: purchases, ads, premium currency (decision: Q5).
- Player-controlled, real-time combat (decision: Q7).
- Content that reuses EverQuest, RuneScape or other third-party names, lore or
  assets.

---

## 10. Constraints

- **Platform:** runs entirely in the browser as a static site on **GitHub
  Pages**. No server, no backend, no accounts.
- **Data:** all game state stays on the player's device in browser storage. A save
  must fit comfortably within typical browser storage limits for a full MVP
  roster. Save files are a **compatibility contract**: once released, a save
  must keep loading in later versions (G-1).
- **Privacy:** no personal data is collected. No analytics, trackers, ads or
  third-party requests (G-6).
- **Performance:** G-2 and G-3. The game must not need a powerful machine.
- **Accessibility:** WCAG 2.2 AA as the target. Keyboard-operable; colour never
  the only signal (AC-17, AC-19).
- **Browsers:** latest two versions of desktop Chrome, Firefox, Safari, Edge
  (AC-20). English only.
- **IP:** original names, lore and content only. Any third-party assets must be
  CC0 or otherwise licensed for this use, with attribution recorded.
- **Cost:** zero running cost beyond free GitHub hosting.
- **Delivery:** one PR per technical feature ([features.md](features.md)). Every
  feature is independently buildable and reversible. Merging to `main` deploys.
- **Planned stack (for `Specify`, not binding on this PRD):** TypeScript, Vite,
  React; browser local storage for saves.

---

## 11. Risk and reversibility

| Dimension | Assessment |
|---|---|
| **Risk** | **Low.** Single-player hobby game: no PII, no money, no backend, no third-party data. The worst realistic failure is **a player losing their save** or **progress feeling broken** (e.g. an offline-progress exploit or a balance cliff). |
| **Reversibility** | **High for code**: a static site, so reverting a merge and redeploying undoes any feature. **Partial for save data**: once players have saves, changes to the save format can't simply be reverted, because older code may not read newer saves. Save-format changes must be additive and migrated forward. |
| **Autonomy level** | **A2 (Supervised)** by default: agents run the full inner loop to a verified change, and Conor audits each PR before merge (merge = release). **A1 (Bounded)** for any feature that changes the **save format** or **time/offline-progress rules**: Conor approves the plan and the change before merge. |
| **Always human-gated** | Save-format changes and migrations; changes to the offline cap or time model; anything adding a network request or third-party dependency loaded at runtime. |

---

## 12. Resolved decisions

These questions were open when this PRD was drafted. Each one changed MVP
scope. Conor Hodder accepted every working assumption as stated, so the PRD
above already reflects these answers.

| # | Decision | Accepted answer | Status |
|---|---|---|---|
| **Q1** | Time model: real-time vs turn-based ticks | Activities run in **real (wall-clock) time**: a 10-minute quest takes 10 real minutes. No turn-based ticks. | Accepted by Conor |
| **Q2** | Offline progress and its cap | **Yes**, at **full rate up to 12 hours**, then nothing. | Accepted by Conor |
| **Q3** | Permadeath | **No permadeath in MVP.** A knockout costs XP progress and recovery time. An optional hardcore mode stays in Later. | Accepted by Conor |
| **Q4** | Art style | **Text plus Unicode/emoji glyphs.** No sprites or illustrations in MVP. | Accepted by Conor |
| **Q5** | Monetisation | **Free, no monetisation, no ads, ever.** No backend, accounts or payment flows. | Accepted by Conor |
| **Q6** | Mobile | **Desktop browsers only for MVP.** No guarantee of a usable mobile layout. Mobile and touch stay in Later. | Accepted by Conor |
| **Q7** | Control over combat | **Fully auto-resolved.** The player controls who goes, with what gear, and when to recall. No stances or ability priorities in MVP. | Accepted by Conor |
| **Q8** | Audience and sharing | **Conor first, plus a small circle of friends**, with no telemetry. Success is measured from the Guild Ledger, playtests and simulations. | Accepted by Conor |
