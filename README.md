# The Guildmaster's Ledger

A single-player fantasy guild manager for the browser, with an old-school
EverQuest/RuneScape feel. You run a roster of heroes: recruit them, equip them,
send parties on quests and to camp dungeons, grind skills and hunt rare drops.

The project is built with [The Agentic SDLC](https://github.com/conorhodder/sdlc)
and includes the playable MVP loop.

- **[Product Requirements Document (PRD-001)](docs/prd.md)**: the problem,
  audience, core loop, acceptance and success criteria, scope and resolved
  decisions.
- Living specification: [docs/spec.md](docs/spec.md)
- **[Proposed technical features](docs/features.md)**: the thin, ordered
  slices that would deliver the MVP, one PR each.

## How to play

Found your guild, then meet the starter heroes on the Roster tab. The Quests tab
recommends an easy first dispatch; the Zones tab sends a party to camp, and
Gather lets an idle hero collect materials. Equip upgrades from the Stash, hire
recruits, and rest tired heroes. Progress is saved on this device, including
offline progress (capped at 12 hours). The Ledger tab shows lifetime guild
statistics and exports only the ledger data you choose to download.

## Keyboard controls

- Use **Tab** and **Shift+Tab** to move between controls.
- Use **Left/Right Arrow** to move between game tabs; use arrow keys in selects.
- Use **Space** to toggle checkboxes and **Enter** to activate buttons.
- Press **Escape** to close the away summary.
- A visible gold outline marks the focused control.

## Develop

You need Node.js 22 or later (see `.nvmrc`).

```sh
npm install
npm run dev        # start the dev server
npm run lint       # run ESLint
npm run typecheck  # run tsc --noEmit
npm test           # run Vitest
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

CI runs lint, typecheck, test and build on every pull request and every push to
`main`. Each merge to `main` deploys to GitHub Pages at
<https://conorhodder.github.io/guild-game/>. This needs Pages enabled with
**Settings → Pages → Source: GitHub Actions**.

Owner: Conor Hodder.
