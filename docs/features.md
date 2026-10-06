# Proposed technical features: PRD-001 MVP

These are the **proposed** thin slices that would deliver
[PRD-001](prd.md). They are listed in build order. Each one is a single PR:
independently buildable, verifiable and revertible. Each one leaves the game
deployable, and playable from TF-5 onwards.

Following the Agentic SDLC, a technical feature here is a **thin scoping
label**, not a design document. Behaviour, contracts and detailed acceptance
for each feature will live in the living specification written during
`Specify`. This list is confirmed or reshaped there.

**Rules that apply to every feature**

- It traces to PRD-001 (the section is listed in the table).
- It keeps the accessibility (AC-19) and privacy (AC-18, G-6) guardrails green.
- **Reversible:** reverting the PR and redeploying removes it. Any feature that
  adds to the save format does so **additively**, with a forward migration, so
  that reverting the code doesn't break existing saves (G-1). Those features
  run at autonomy level **A1** (PRD §11). All others run at **A2**.

| # | Feature | Slice (one line) | Traces to (PRD-001) | Autonomy |
|---|---|---|---|---|
| TF-1 | App shell and deploy | Empty static app with lint, type-check and test gates in CI, deployed to GitHub Pages on merge to `main`. | §10 Constraints (platform, cost, delivery); §8 delivery measures | A2 |
| TF-2 | Save system | Versioned local save: autosave and restore on reload, text export and import, migration harness with fixture saves. | AC-16; G-1; J6 | A1 |
| TF-3 | Game clock | Real-time game clock with seeded, reproducible randomness that every later activity runs on; pauses cleanly when the tab is hidden. | §2 core loop; AC-13 (foundation); Q1 | A1 |
| TF-4 | Heroes and roster | Hero model (class, level, XP, stats, status), new-game flow with a starter roster of 3, roster list and hero sheet. | §3 Hero model; AC-1 (roster part); AC-3; J1 | A1 |
| TF-5 | Items, stash and equipment | Item model with four slots and four rarity tiers, shared stash, equip/unequip with class and level rules and a stat preview, vendor selling for gold. | §3 (gear); AC-4; J1, J4 | A1 |
| TF-6 | Combat resolver and combat log | Auto-resolved party-vs-monster encounters using the trinity roles, writing every event to a filterable text log; con tiers with text labels. | §4 items 1, 3, 8; AC-15; AC-17 | A2 |
| TF-7 | Quests | Quest board, party formation (1–4 heroes), timed dispatch and resolution with XP, loot and log; first dispatchable quest for new games. | AC-1; AC-5; AC-7; J1 | A1 |
| TF-8 | Skills and skill-ups | Combat skills that rise with use, with level-based caps and classic skill-up log lines; steep XP curve and level-up "dings". | §3 (skills, level); §4 items 2, 6; AC-9; AC-10 | A1 |
| TF-9 | Fatigue, knockout and recovery | Fatigue that builds with activity and recovers with rest; knockouts with XP-progress penalty, *Injured* status and recovery countdown. | §3 (fatigue, injury); §4 item 7; AC-7; AC-12; J5 | A1 |
| TF-10 | Loot tables and rare drops | Data-driven loot tables per monster, Named-only items, and a drop-rate simulation check. | §4 item 5; AC-11; S-5 | A2 |
| TF-11 | Zones and camps | Camp-able zones with spawn points, respawn timers, named spawns replacing placeholders, automatic retreat thresholds and recall at any time. | §4 items 4, 5; AC-6; J3 | A1 |
| TF-12 | Recruitment board | Rotating board of at least 3 candidates on a visible refresh timer, gold hiring cost, roster cap of 8. | AC-2; J4 | A1 |
| TF-13 | Gathering jobs | Assign idle heroes to Mining or Herbalism; produces sellable materials and raises gathering skills over time. | §3 (gathering skills); AC-8 | A1 |
| TF-14 | Offline progress and "While you were away" | Catch-up simulation on return, up to the offline cap; guards against clock changes; summary screen with jump-to-hero actions. | AC-13; AC-14; G-4; G-5; J2; Q2 | A1 |
| TF-15 | Guild Ledger | Player-visible local stats (sessions, play days, first-dispatch time, levels, Named drops) with export, feeding the success measures. | §8 S-1, S-2 (measurement source) | A1 |
| TF-16 | MVP content and balance simulation | Fill in 3 zones, about 10 quests and the item set for levels 1–20; scripted "reasonable player" simulation that reports progression and rare-drop pace. | §9 In scope (content); S-4; S-5 | A2 |
| TF-17 | First-session onboarding polish | Contextual first-run prompts and an "easy" first quest highlight so a new player dispatches within 2 minutes without external help. | AC-1; S-2; J1 | A2 |
| TF-18 | Accessibility and performance hardening | Whole-game keyboard walkthrough of J1–J6, automated accessibility scan on every screen, and responsiveness/load checks against the budgets. | AC-19; AC-20; G-2; G-3; G-7 | A2 |

## Notes on ordering

- **TF-1 to TF-3** are foundations. They add no visible gameplay but every later
  slice depends on them. The save system comes early because the save format
  is the one part that is hard to reverse (PRD §11).
- **TF-4 to TF-7** produce the first playable loop: recruit (starter roster) →
  equip → quest → log.
- **TF-8 to TF-11** add the old-school MMO feel: skill grinding, meaningful death,
  rare drops and camps.
- **TF-12 to TF-14** complete the management and idle loop.
- **TF-15 to TF-18** prepare for release: measurement, content, onboarding and
  hardening against the PRD's acceptance and guardrail criteria.
- The scope decisions Q1–Q8 are resolved (PRD-001 §12), and this list already
  reflects the accepted answers. It can still be reshaped in `Specify`.
