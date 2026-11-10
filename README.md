# Pick Three

Pick three. Get stronger. Choose one lower body lift, one push and one pull, log what actually happened with taps, and see two separate views: **Training attention** (what your logged training covered) and **Strength progress** (where comparable lift performances improved). Neither view claims to measure muscle size, recovery or anything outside the app.

Local first, installable, no account, no cloud, no analytics, no runtime AI.

Expected URL: `https://<OWNER>.github.io/pick-three/` (for this repo, `https://mschellekens.github.io/pick-three/`).

## Develop

Requires Node 20.19+ (CI uses Node 22, see `.nvmrc`).

```bash
npm ci
npm run dev            # http://localhost:5173/
npm run typecheck
npm test               # Vitest: progression, attention, strength, backup, draft, storage
npm run build:pages    # production build under /pick-three/
npm run test:e2e       # Playwright against the built app under /pick-three/
npm run check          # all of the above
```

E2E uses an iPhone 13 viewport on Chromium. Set `PW_WEBKIT=1` to add a WebKit project. If Playwright browsers can't be downloaded, point at a local Chrome with `CHROME_PATH=/path/to/chrome npm run test:e2e`. WebKit emulation is not a physical iPhone.

## Deploy to GitHub Pages

1. Push this repository to GitHub as `pick-three` (any name works; the base path follows the repo).
2. In GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Push to the default branch or run the **Deploy to GitHub Pages** workflow manually (Actions tab → Run workflow).

The workflow (`.github/workflows/deploy.yml`) type checks, runs unit tests, builds with `BASE_PATH` taken from `actions/configure-pages`, verifies the artifact (entry point, manifest, service worker, icons, base-scoped asset paths), runs the mobile browser tests, then uploads and deploys with minimum permissions.

References: [Vite static deploy, GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages) · [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

Routing uses hash routes (`#/progress`), so any page reloads correctly under the project subpath. The manifest `start_url`/`scope`, icons and service worker registration are all scoped to the base path.

## Install on iPhone

Open the deployed URL in **Safari**, tap **Share**, then **Add to Home Screen**. After the first visit the app opens offline. Updates download in the background and are offered after a workout is saved, never mid set.

## Your data

- Everything is stored in IndexedDB on the device (`pick-three` database). Nothing is uploaded. The service worker caches only the app shell, never your data.
- Browsers can clear storage, and an iPhone Home Screen app may use separate storage from Safari. **Settings → Export backup** writes a versioned JSON file; **Import backup** validates it fully (size, schema, version, ids, exercise references, load modes, numeric bounds, dates), previews the workout count and replaces local data in one transaction. A failed import changes nothing. Use export/import to move data between Safari and the installed app or to a new phone.
- **Reset data** deletes everything after confirmation.

### Data model (schema v2)

| Record | Key fields |
| --- | --- |
| `Workout` | `id` (equals the draft id, so finishing is idempotent), `startedAt`/`finishedAt`/`updatedAt` (ISO), `localDate` (YYYY-MM-DD captured at start, never recomputed), `partial`, `entries[]` |
| `WorkoutEntry` | `slot` (lower, push, pull), `exerciseId`, `seriesId` (`<exercise>:<n>`, a comparison series; New setup starts n+1), `sets[]` |
| `LoggedSet` | `id`, `loadKg` (normalized physical load: total, per hand, added or assistance), `input {value, unit}` (exact original entry), `reps` (clean reps; lower side for unilateral), optional `sideReps`, `loggedAt` |
| `Draft` | one active draft with picks, in-flight stepper values, logged sets, frozen suggestions and a revision number used to detect writes from another tab |
| `Settings` | unit, usual frequency (1–5), equipment filter, avatar look, per lift per unit increments, favorites |
| `Meta` | current series per exercise, series list, celebrated milestone keys (dedupe across edits and reloads) |

Unit conversion is display only. Increments are stored per unit and never converted. Comparisons use `loadKg` with a small tolerance, so switching units can't create a PR.

## Progression knobs

All in `src/domain/progression.ts` (`PROGRESSION_DEFAULTS`) and `src/domain/strength.ts` (`STRENGTH_DEFAULTS`). These are conservative app defaults, not claims of what is optimal.

| Knob | Default |
| --- | --- |
| Loaded working rep range | 6–10 clean reps |
| Bodyweight and assisted rep range | 6–12 clean reps |
| Sets at the top of the range to advance | 2 |
| Recent repeat window | under 48 elapsed hours |
| Stale history | over 28 elapsed days |
| Clear decline | 2 consecutive sessions below the anchor (≥2 fewer reps at the same load, or lower load at the same reps) |
| Attention frequency | 3 sessions per week; Worth attention at max(4, 2 × ceil(7 ÷ frequency)) days |
| Estimated strength | Epley on clean sets of 3–10 reps, externally loaded lifts only; ≥4 sessions; median of first two vs latest two; under 2% reads as About the same; overall needs ≥2 lifts |

Decision order: baseline → stale → recent → decline → top of range → one more rep (or easier if below range). Weighted, assisted and bodyweight pull-ups are separate lifts; body weight is never added.

General principles: [ACSM position stand](https://pubmed.ncbi.nlm.nih.gov/41843416/). Peer comparisons stay off because no validated reference data is bundled.

## Structure

```
src/domain     pure rules and tests (catalog, progression, attention, strength, draft, backup, demo)
src/storage    IndexedDB with atomic finish/import, revision checks, failure hook for tests
src/state      store: persist first, then commit; serialized write queue; cross-tab sync
src/ui         screens, original SVG avatar (two looks, addressable regions), sheets, share card
tests/e2e      Playwright mobile flows against the production build under /pick-three/
```
