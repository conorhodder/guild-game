# The Guildmaster's Ledger

A single-player fantasy guild manager for the browser, with an old-school
EverQuest/RuneScape feel. You run a roster of heroes: recruit them, equip them,
send parties on quests and to camp dungeons, grind skills and hunt rare drops.

The project is built with [The Agentic SDLC](https://github.com/conorhodder/sdlc)
and is currently at the **Frame** stage. Only the app shell exists so far, with no gameplay yet.

- **[Product Requirements Document (PRD-001)](docs/prd.md)**: the problem,
  audience, core loop, acceptance and success criteria, scope and resolved
  decisions.
- Living specification: [docs/spec.md](docs/spec.md)
- **[Proposed technical features](docs/features.md)**: the thin, ordered
  slices that would deliver the MVP, one PR each.

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
