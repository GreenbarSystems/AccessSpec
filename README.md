# AccessSpec

Unlike mobile accessibility scanners that find issues after an app is built,
AccessSpec catches problems at the spec and PR stage. It combines WCAG 2.2
mobile checks with iOS vs Android native component guidance, helping teams
design accessible, platform-consistent experiences before code ships.

## What it does

- **Upload an app** — paste source, single/multiple files, ZIP, or import a
  public repo from GitHub / GitLab / Bitbucket
- **Audit the whole project** — WCAG 2.2 ruleset across three categories
  (accessibility, mobile usability, platform parity) with 0–100 scores
- **Inspect every issue** — rule reference, suggested fix, copy-as-markdown
  remediation playbook, in-DOM heatmap, before/after refactoring diffs
- **Simulate** — render the live app inside iPhone SE / 15, Pixel 8,
  Galaxy S24, and iPad frames, with accessibility overlay and runtime DOM scan
- **Analyze screenshots** — upload a PNG/JPEG and AccessSpec measures the
  contrast palette, simulates protanopia/deuteranopia/tritanopia, and runs
  on-device OCR (Tesseract.js) for real text-level WCAG checks
- **Export** — PDF / HTML / JSON / CSV reports plus a structured
  remediation playbook

## Tech stack

Vite 8 · React 19 · TypeScript · Tailwind 3 · React Router 7 · JSZip ·
Tesseract.js (lazy-loaded for OCR).

No backend — everything runs in the browser, including the contrast and CSS
resolvers, OCR, and repository fetchers. Uploaded code and screenshots are
never transmitted anywhere; even the Tesseract.js WASM core, worker, and
English language model are self-hosted (see `scripts/vendor-tesseract.mjs`)
so the OCR feature doesn't ping a third-party CDN on first use.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

`npm run dev` and `npm run build` automatically stage Tesseract.js assets
into `public/tesseract/` via the `predev` / `prebuild` hooks — that
directory is gitignored and rebuilt on demand. The first run downloads the
~3 MB English language file from jsdelivr; subsequent runs reuse the cache.

```bash
npm run build           # production bundle to dist/
npm run preview         # serve dist/
npm run lint            # eslint
npm run vendor:tesseract  # manually re-stage public/tesseract/
```

Requires Node 20+.

## Project layout

```
src/
├── pages/                  # Dashboard / Analyzer / Simulator / Reports / Settings
├── components/             # UI panels per feature (upload, scoring, inventory, …)
└── services/               # Pure-TS engines
    ├── ComponentDetector   # JSX/Vue/HTML scanner → UIElement[] (15 categories)
    ├── CssResolver         # className → computed declarations
    ├── RuleEngine          # rule defs + runner
    ├── rules/              # accessibility · mobile · parity packs (17 rules)
    ├── Scoring             # per-category 0–100 + severity tallies
    ├── AuditService        # orchestrator
    ├── TouchTargetAnalyzer # WCAG 2.5.8 / HIG / Material 3
    ├── ContrastChecker     # WCAG AA/AAA with opacity composition
    ├── DynamicTextSimulator# canvas-measured text reflow at 100–200%
    ├── ReflowAnalyzer      # 320 / 375 / 414 / 768 px viewport audit
    ├── PatternRecognizer   # date-picker, modal, tabs, search, …
    ├── IOSPatterns         # native iOS mapping (UIDatePicker, UISwitch, …)
    ├── AndroidPatterns     # native Android mapping (MaterialSwitch, …)
    ├── PlatformParityEngine# current vs iOS native vs Android native
    ├── DomRuntimeScanner   # live-DOM walk in the simulator iframe
    ├── ScreenshotAnalyzer  # palette + contrast blocks + CVD simulation
    ├── ScreenshotOcr       # lazy tesseract.js + per-word contrast
    ├── RepoFetcher         # GitHub / GitLab / Bitbucket dispatch
    ├── ReportGenerator     # PDF / HTML / JSON / CSV export
    ├── RemediationGenerator# per-finding playbook + markdown serializer
    ├── RefactoringGenerator# before/after code diffs in 4 categories
    └── AssistantEngine     # rule-database-backed Q&A
```

## License

Internal — see repository owner.
