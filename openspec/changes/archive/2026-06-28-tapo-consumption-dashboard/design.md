# Design: Tapo Consumption Dashboard

A static, no-backend SPA (Vite + vanilla TypeScript) that parses Tapo `.xls`
exports in the browser, builds a union-of-days calendar, and renders two
energy charts. This design fixes the module layout, the pure/DOM boundary, the
TypeScript contracts, the test strategy (Vitest against the real `test-data/`
files), and how the work maps onto the 5 chained PRs from the proposal.

The design intentionally separates **pure logic** (parsing, aggregation,
tariff, color, store serialization helpers) from **DOM/Chart.js side effects**
so the testable core can be verified without a browser. The most valuable unit
is `parseConsumo`, tested against the actual binary exports.

---

## Quick path (reviewer orientation)

1. Read **Decisions** for the framework/lib/storage choices and the pure/DOM
   split rule.
2. Read **Module map** to see every file and which PR slice creates it.
3. Read **Contracts** for the exact TypeScript interfaces and function
   signatures other modules depend on.
4. Read **Testing** for what Vitest covers and why a runner must be added in
   PR 1.
5. Read **Tradeoffs** for the rejected alternatives and accepted costs.

---

## Decisions

| # | Decision | Choice | Why |
|---|----------|--------|-----|
| D1 | Framework | Vanilla TypeScript, no UI framework | Keeps bundle minimal; the UI is a handful of cards + 2 canvases; no reconciliation needed |
| D2 | Build | Vite + TypeScript, `vite build` -> static `dist/` | Fast HMR, native ESM, zero-config static output, no server |
| D3 | Excel parsing | SheetJS (`xlsx`), dynamically imported on first drop | Only browser lib that reads BIFF8/OLE2 (CDFV2); lazy import defers ~900 KB off the initial load |
| D4 | Charting | Chart.js 4 + `chartjs-plugin-annotation` | Canvas line+marker out of the box; annotation plugin draws tariff `box` regions matching `image.png` |
| D5 | Persistence | localStorage, parsed JSON only | ~6 KB per item; no backend; raw `.xls` binary never stored |
| D6 | Drag-and-drop | Native HTML5 `ondrop` + `FileReader.readAsArrayBuffer` | No extra dependency |
| D7 | Test runner | **Add Vitest** + `test` script in PR 1 | Repo currently has no runner; pure functions (esp. `parseConsumo`) need automated evidence for apply/verify. Config `strict_tdd` is currently false — this design recommends enabling a Vitest runner as part of the scaffold so apply can produce TDD-style evidence |
| D8 | Pure/DOM split | `parsing/`, `data/`, plus `store` serialization helpers and `color` are pure; `ui/`, `charts/` builders touch DOM/Chart.js | Pure core is unit-testable headless; DOM layer is thin and verified manually + via acceptance criteria |
| D9 | Date handling | Store canonical `dateISO` as the verbatim `YYYY/MM/DD` portion; keep a `Date` only for display/sorting, re-hydrated on load | Avoids timezone drift from `new Date(string)`; the string key is the source of truth for grouping and the calendar union |
| D10 | Aggregation model | Always build a fixed 24-slot array (hours 0–23) with 0-fill | Charts and sums are total functions over a known domain; missing item-days become flat 0 lines with no special-casing |

### Module layout reconciliation

The proposal sketch used `src/parser/consumo.ts`, `src/store/items.ts`,
`src/charts/perItem.ts`, `src/components/*`. This design adopts the more
granular, test-oriented layout requested for execution:

| Proposal sketch | This design | Note |
|-----------------|-------------|------|
| `src/parser/consumo.ts` | `src/parsing/parseConsumo.ts` | Same responsibility, pure |
| `src/store/items.ts` | `src/store.ts` | Single store module (registry + records) |
| `src/charts/perItem.ts` | `src/charts/perItemChart.ts` | Config builder only |
| `src/charts/aggregate.ts` | `src/charts/aggregateChart.ts` | Config builder only |
| `src/constants/tariff.ts` | `src/data/tariff.ts` | Co-located with aggregation |
| `src/components/*` | `src/ui/*` | Thin DOM modules |
| (new) | `src/data/aggregate.ts` | Pure aggregation extracted for testing |
| (new) | `src/ui/colors.ts` | HSL palette generator |

This is an internal naming refinement of the same architecture; the public
behavior in the specs is unchanged.

---

## Project scaffold

Output: a static SPA. `vite dev` runs the dev server; `vite build` emits a
self-contained `dist/`.

### `package.json` (shape)

```jsonc
{
  "name": "tapo-consumption-dashboard",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "xlsx": "^0.18.5",
    "chart.js": "^4.4.0",
    "chartjs-plugin-annotation": "^3.0.1"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

Notes:
- `xlsx` is a runtime dep but is **dynamically imported** (`await import('xlsx')`)
  so it lands in a separate chunk, not the entry bundle.
- `build` runs `tsc --noEmit` first so type errors fail the build (success
  criterion: `vite build` completes without errors).
- `vitest` added per D7 so `npm test` exists.

### `index.html`

Single shell: `<header>` (title + "Add item" button), a `<section id="items">`
container for item cards, a `<nav id="calendar">` day picker, and a
`<main id="charts">` holding two `<canvas>` elements (`#chart-per-item`,
`#chart-aggregate`) plus empty-state nodes. Loads `/src/main.ts` as a module.

### `vite.config.ts`

Minimal: `base: './'` so `dist/` works when opened from a static folder/any
sub-path, and a `test` block (or separate `vitest.config.ts`) with
`environment: 'node'` for the pure-function tests (no DOM needed).

### `src/` layout

```
src/
  main.ts                  entry: wires store -> ui -> charts (DOM)
  types.ts                 shared interfaces (pure)
  parsing/
    parseConsumo.ts        PURE: ArrayBuffer -> HourlyRecord[] | ParseError
  data/
    aggregate.ts           PURE: union days, per-item 24h series, summed series
    tariff.ts              PURE: TARIFF_2_0TD constant + annotation boxes
  store.ts                 localStorage load/save, quota handling, re-hydrate
  charts/
    perItemChart.ts        Chart.js config builder (Chart 1)
    aggregateChart.ts      Chart.js config builder (Chart 2)
  ui/
    colors.ts              PURE: deterministic HSL palette generator
    itemCard.ts            item card render + drop zones (DOM)
    calendar.ts            day-picker render (DOM)
    chartPanel.ts          canvas + Chart instance lifecycle (DOM)
    toasts.ts              transient error/info messages (DOM)
  styles/
    main.css               mobile-first responsive layout
test/
  parseConsumo.test.ts     against real test-data/*.xls
  aggregate.test.ts        union + sum + 0-fill
  tariff.test.ts           band boundaries
  colors.test.ts           determinism + hue limit
```

---

## Data flow

```
Add item button
  -> store.addItem()  -> persist tapo_items -> ui.itemCard renders

User drops "Consumo de energía.xls" on the active Consumo zone
  -> FileReader.readAsArrayBuffer(file)
       -> await import('xlsx')  (lazy, spinner)
            -> parseConsumo(buffer)            [PURE]
                 |-- ok:  HourlyRecord[]
                 |        -> store.saveRecords(itemId, records)  (quota-guarded)
                 |             -> recompute()
                 |-- err: ParseError
                          -> toasts.error(msg); zone cleared; prior data kept

recompute():
  -> aggregate.unionDays(items)                [PURE]
       -> calendar.render(days, selectedDay)
            -> ensure a valid selectedDay (default = first/last day)

On day select (or after recompute):
  -> for each item: aggregate.itemDaySeries(item, day)   [PURE] -> number[24]
       -> perItemChart.build(series[], names[], colors[], tariffBoxes)
            -> chartPanel.update('#chart-per-item', config)
  -> aggregate.sumDaySeries(items, day)         [PURE] -> number[24]
       -> aggregateChart.build(sum, tariffBoxes)
            -> chartPanel.update('#chart-aggregate', config)
```

The dropped `Potencia` zone is rendered disabled (D-spec item-management) and
its `ondrop` is a no-op — no FileReader, no parse, no toast.

---

## Contracts (TypeScript)

### `src/types.ts`

```typescript
/** One hour-bucket of consumption for a single item. */
export interface HourlyRecord {
  /** Original timestamp re-hydrated as a Date (display/sort only). */
  timestamp: Date;
  /** Canonical date key, verbatim "YYYY/MM/DD" portion. Source of truth. */
  dateISO: string;
  /** Integer hour 0–23 (top-of-hour). */
  hour: number;
  /** Consumption in kWh. */
  kWh: number;
}

/** A registered Tapo item (one smart plug). */
export interface TapoItem {
  id: string;
  name: string;
  /** Deterministic HSL color assigned by index. */
  color: string;
  /** Parsed Consumo records, or null if none uploaded yet. */
  consumo: HourlyRecord[] | null;
  /** v2 reservation; always inert in v1. */
  potenciaPlaceholder: true;
}

export interface AppState {
  items: TapoItem[];
  /** Currently selected calendar day ("YYYY/MM/DD") or null when no days. */
  selectedDay: string | null;
}

/** 24-slot kWh series, index === hour (0–23). */
export type DaySeries = number[]; // length 24
```

### `src/parsing/parseConsumo.ts` (PURE — most testable unit)

```typescript
import type { HourlyRecord } from '../types';

export type ParseErrorCode =
  | 'SHEETJS_READ_FAILED'   // workbook could not be opened
  | 'DIA_SHEET_MISSING'     // no "Día" sheet
  | 'HEADER_MISMATCH'       // header lacks "Consumo de energía(kWh)"
  | 'ROW_PARSE_FAILED';     // a value/timestamp could not be parsed

export interface ParseError {
  ok: false;
  code: ParseErrorCode;
  /** User-facing message (already localized/copy-ready). */
  message: string;
}

export interface ParseOk {
  ok: true;
  records: HourlyRecord[];
}

export type ParseResult = ParseOk | ParseError;

/**
 * PURE: takes the file bytes, reads the "Día" sheet via SheetJS, validates the
 * header contains the exact string "Consumo de energía(kWh)", normalizes rows
 * into HourlyRecord[], and sums kWh of duplicate (dateISO, hour) rows.
 *
 * `xlsxModule` is injected so tests can pass the real lib and production passes
 * the lazily-imported module — keeps the function dependency-free at the type
 * level and trivially unit-testable.
 */
export function parseConsumo(
  buffer: ArrayBuffer,
  xlsxModule: typeof import('xlsx'),
): ParseResult;
```

Contract details enforced by `parseConsumo`:
- Sheet name read verbatim: `'Día'`.
- Header validation: some header cell `.includes("Consumo de energía(kWh)")`.
- Timestamp `YYYY/MM/DD HH:00:00` -> `dateISO = "YYYY/MM/DD"`, `hour = HH`.
- Duplicate `(dateISO, hour)` rows are **summed** (deterministic rule).
- Empty data (header only) -> `{ ok: true, records: [] }` (no error).
- `kWh` coerced to `Number`; non-finite -> `ROW_PARSE_FAILED`.

### `src/data/aggregate.ts` (PURE)

```typescript
import type { TapoItem, DaySeries } from '../types';

/** Union of every item's distinct dateISO values, sorted ascending. */
export function unionDays(items: TapoItem[]): string[];

/** 24-slot kWh series for one item on one day, 0-filled for missing hours. */
export function itemDaySeries(item: TapoItem, dateISO: string): DaySeries;

/** Per-bucket SUM across all items for one day (0-fill for missing items). */
export function sumDaySeries(items: TapoItem[], dateISO: string): DaySeries;

/** Total kWh for a DaySeries (for the "Total consumida" label). */
export function totalKWh(series: DaySeries): number;
```

Invariants: every returned `DaySeries` has length 24, index === hour. Example
guaranteed by spec/tests: two items each 5 kWh at hour 9 ->
`sumDaySeries(...)[9] === 10`.

### `src/data/tariff.ts` (PURE)

```typescript
export type TariffPeriod = 'valley' | 'flat' | 'peak'; // P3 | P2 | P1

export interface TariffBand {
  startHour: number; // inclusive
  endHour: number;   // exclusive
  period: TariffPeriod;
}

/** Spanish 2.0TD schedule — single source of truth (D-spec: charts). */
export const TARIFF_2_0TD: readonly TariffBand[] = [
  { startHour: 0,  endHour: 8,  period: 'valley' },
  { startHour: 8,  endHour: 10, period: 'peak'   },
  { startHour: 10, endHour: 14, period: 'flat'   },
  { startHour: 14, endHour: 18, period: 'peak'   },
  { startHour: 18, endHour: 22, period: 'flat'   },
  { startHour: 22, endHour: 24, period: 'valley' },
];

/** Color tokens per period (alternating shading matching image.png). */
export const TARIFF_COLORS: Record<TariffPeriod, string>;

/** Build chartjs-plugin-annotation box configs from the constant. */
export function tariffBoxes(): Record<string, object>;
```

`tariffBoxes()` maps each band to an annotation `box` with `xMin/xMax` aligned
to the category axis (hour indices), `yMin`/`yMax` spanning the plot, drawn
behind the dataset (`drawTime: 'beforeDatasetsDraw'`).

### `src/ui/colors.ts` (PURE)

```typescript
/**
 * Deterministic HSL palette. Index 0..n maps to evenly-spaced hues.
 * Up to 12 distinct hues before recycling; hue = (index * 360 / 12) % 360.
 */
export function colorForIndex(index: number): string;
export const PALETTE_HUE_COUNT = 12;
```

### `src/store.ts`

```typescript
import type { TapoItem } from './types';

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'QUOTA_EXCEEDED' | 'WRITE_FAILED'; message: string };

export const KEYS = {
  registry: 'tapo_items',
  data: (id: string) => `tapo_data_${id}`,
} as const;

/** Load registry + parsed records; re-hydrate HourlyRecord.timestamp Dates. */
export function loadState(): TapoItem[];

/** Persist registry (names, ids, colors — NOT raw binary). Quota-guarded. */
export function saveRegistry(items: TapoItem[]): SaveResult;

/** Persist one item's parsed records as JSON. Quota-guarded, atomic per key. */
export function saveRecords(itemId: string, records: HourlyRecord[]): SaveResult;

/** Remove tapo_items membership + tapo_data_{id}. */
export function deleteItem(itemId: string): void;
```

Store rules:
- Only parsed JSON written; raw `.xls` ArrayBuffer never persisted.
- On `QuotaExceededError`, the catch returns `{ ok:false, reason:'QUOTA_EXCEEDED' }`
  and leaves existing keys untouched (no partial write); `main.ts` shows a toast.
- `Date` objects are serialized as ISO strings and re-hydrated on `loadState`.

### Chart builders (DOM-adjacent, take pure inputs)

```typescript
// src/charts/perItemChart.ts
import type { DaySeries } from '../types';
export function buildPerItemConfig(
  series: { name: string; color: string; data: DaySeries }[],
): ChartConfiguration; // line, tension>0, pointRadius>0, tariff annotations, hour labels

// src/charts/aggregateChart.ts
export function buildAggregateConfig(sum: DaySeries): ChartConfiguration;
```

Shared chart conventions:
- X labels: `HOUR_LABELS[h] = \`${pad(h)} - ${pad(h + 1)} h\`` -> `00 - 01 h` … `23 - 24 h`.
- Y axis title: kWh.
- `tension: 0.4`, `pointRadius: 3`, `pointStyle: 'circle'`.
- `responsive: true`, `maintainAspectRatio: false` (container controls height).
- `plugins.annotation.annotations = tariffBoxes()`.

---

## File / module changes

All files are **new** (greenfield). Mapping to PR slices and pure/DOM:

| Path | New | Pure? | PR slice |
|------|-----|-------|----------|
| `package.json`, `vite.config.ts`, `tsconfig.json` | new | n/a | PR 1 |
| `index.html` | new | n/a | PR 1 |
| `src/styles/main.css` (skeleton) | new | n/a | PR 1 |
| `src/types.ts` | new | yes | PR 1 |
| `src/data/tariff.ts` | new | yes | PR 1 |
| `test/tariff.test.ts` | new | yes | PR 1 |
| `src/parsing/parseConsumo.ts` | new | yes | PR 2 |
| `src/store.ts` | new | mostly | PR 2 |
| `test/parseConsumo.test.ts` | new | yes | PR 2 |
| `src/ui/itemCard.ts` | new | no | PR 3 |
| `src/ui/calendar.ts` | new | no | PR 3 |
| `src/ui/chartPanel.ts` | new | no | PR 3 |
| `src/data/aggregate.ts` | new | yes | PR 3 |
| `src/ui/colors.ts` | new | yes | PR 3 |
| `test/aggregate.test.ts`, `test/colors.test.ts` | new | yes | PR 3 |
| `src/charts/perItemChart.ts` | new | no | PR 4 |
| `src/charts/aggregateChart.ts` | new | no | PR 4 |
| `src/ui/toasts.ts` | new | no | PR 5 |
| `src/main.ts` | new (grows) | no | PR 3→5 |
| `src/styles/main.css` (responsive) | extended | n/a | PR 5 |

localStorage keys introduced: `tapo_items`, `tapo_data_{itemId}`.

---

## Responsive layout

Mobile-first CSS (`src/styles/main.css`):

- Base (mobile, < 768 px): single column. Order = items, then calendar as a
  `display:flex; overflow-x:auto` horizontal strip, then charts stacked
  vertically. Each chart sits in a fixed-height wrapper (e.g. `min-height:280px`)
  so `maintainAspectRatio:false` has a box to fill.
- `@media (min-width: 768px)`: CSS Grid
  `grid-template-columns: minmax(220px, 280px) 1fr` — calendar/sidebar left,
  chart area right. Charts can stack or sit side-by-side per width.
- Item cards: `display:grid` with `auto-fit, minmax(...)` so name field + two
  drop zones reflow without clipping.
- No horizontal overflow at 375 px (acceptance criterion).

Chart.js side: `responsive:true` + `maintainAspectRatio:false`; Chart.js's
internal `ResizeObserver` redraws on container/breakpoint changes, satisfying
the charts + responsive-layout resize requirements without manual listeners.

---

## Testing

Vitest (added in PR 1, D7). Tests target the **pure** functions; DOM/Chart.js
layers are covered by the spec acceptance criteria via manual QA.

| Test file | Covers (spec) | Key cases |
|-----------|---------------|-----------|
| `test/parseConsumo.test.ts` | excel-ingestion | Reads real `test-data/boiler/Consumo de energía.xls` and `test-data/cuarto-1/Consumo de energía (1).xls` -> `ok:true`, records non-empty, hours in 0–23, dateISO format `YYYY/MM/DD`. Reads a `Potencia` file -> `HEADER_MISMATCH`. Synthetic missing-`Día` -> `DIA_SHEET_MISSING`. Header-only -> `ok:true, records:[]`. Duplicate `(date,hour)` 0.4+0.6 -> single 1.0 bucket. |
| `test/aggregate.test.ts` | calendar, charts | `unionDays` over A(06/01–06/03)+B(06/02–06/05) -> 06/01–06/05. Single item -> own days. `sumDaySeries` two items 5+5 at hour 9 -> `[9]===10`. Missing item -> 0-fill flat 0. All-zero day -> length-24 zeros, no throw. |
| `test/tariff.test.ts` | charts | `TARIFF_2_0TD` has 6 bands covering 0–24 with no gap/overlap; boundaries exactly 0/8/10/14/18/22/24; `tariffBoxes()` returns 6 boxes. |
| `test/colors.test.ts` | charts (palette) | `colorForIndex` deterministic; index 0..11 distinct; index 12 recycles index 0's hue. |

Loading the binary fixtures in Vitest (node env): read the file with Node `fs`
to a `Buffer`, convert to `ArrayBuffer`, and pass the **real** `xlsx` module
into `parseConsumo` (the injected-dependency contract). This validates against
genuine BIFF8/OLE2 files — the highest-value evidence per the proposal risks.

> `strict_tdd` is currently false and no runner exists. This design recommends
> enabling a Vitest runner in PR 1 (D7) so apply/verify can produce
> TDD-style evidence; with the runner in place, PR 2's parser can be written
> test-first.

---

## Rollout (chained PRs)

Module boundaries are drawn so each PR is an independent, reviewable work unit
(work-unit-commits skill) and aligns with the proposal's 5-PR chain. Each PR
keeps tests with the code they verify.

| PR | Branch | Work unit | Independently sensible? |
|----|--------|-----------|-------------------------|
| Tracker | `feat/tapo-dashboard` | Umbrella, no-merge | n/a |
| PR 1 | `…/scaffold` | Vite+TS+Vitest scaffold, `index.html`, css skeleton, `types.ts`, `tariff.ts` + tariff test | Yes — builds, `npm test` passes |
| PR 2 | `…/parser-store` | `parseConsumo.ts` (+ real-file tests), `store.ts` | Yes — parser tests pass headless |
| PR 3 | `…/ui-components` | `aggregate.ts` (+tests), `colors.ts` (+tests), `itemCard`/`calendar`/`chartPanel`, `main.ts` wiring (charts stubbed) | Yes — app renders, days selectable |
| PR 4 | `…/charts` | `perItemChart.ts`, `aggregateChart.ts` with annotation bands | Yes — both charts render |
| PR 5 | `…/polish` | Responsive css, `toasts.ts`, disabled Potencia copy, a11y, quota messaging | Yes — final acceptance pass |

Each child PR targets the prior child branch; PR 5 -> tracker -> `main` after
all reviews pass. Pure-logic PRs (1–3) carry their own Vitest evidence; UI PRs
(3–5) carry the relevant spec acceptance-criteria checks.

Rollback: greenfield — revert branch/commit; no migrations, no backend, no
secrets. localStorage is per-browser and user-clearable.

---

## Tradeoffs

| Decision | Chosen | Rejected alternative(s) | Cost we accept |
|----------|--------|-------------------------|----------------|
| Framework | Vanilla TS | React / Vue | Manual DOM wiring in `ui/*` and `main.ts`; no component reactivity. Accepted because the UI surface is tiny (cards + calendar + 2 canvases) and avoiding a framework keeps the bundle and mental model small. |
| Charting | Chart.js 4 + annotation | ECharts (~700 KB, overkill), uPlot (~40 KB, hard band shading), Recharts (pulls in React) | Chart.js is ~200 KB and its annotation plugin draws the tariff `box` regions directly; matching `image.png` is straightforward. We accept Chart.js's heavier weight vs uPlot for far easier band rendering and markers. |
| Persistence | localStorage JSON | IndexedDB | localStorage is synchronous and size-capped (~5 MB) but parsed records are ~6 KB/item, so capacity is a non-issue in v1. We accept the synchronous API and add explicit quota handling; IndexedDB's async complexity isn't justified at this scale. |
| SheetJS | Dynamic `import('xlsx')` | Static import; or `xlsx.mini.min.js` slim build | Dynamic import keeps ~900 KB out of the entry chunk at the cost of a one-time load (spinner) on first drop and an injected-module seam in `parseConsumo`. We accept the seam — it also makes the parser trivially unit-testable. |
| Date model | String `dateISO` as source of truth, `Date` for display only (D9) | Parse everything to `Date` | Slight redundancy (both fields on each record) in exchange for timezone-safe grouping and a calendar union that never drifts. |
| Test scope | Vitest on pure functions only | Full DOM/e2e (Playwright) | UI behaviors are verified by spec acceptance criteria + manual QA rather than automated browser tests. We accept lighter automated UI coverage to keep the v1 toolchain small; the highest-risk logic (binary parsing, aggregation) is automatically tested against real files. |
| Adding Vitest now | Add runner in PR 1 (D7) | Defer testing | Small upfront scaffold cost; pays back immediately by enabling test-first parsing and machine-checkable evidence despite `strict_tdd` currently being off. |

---

## Open items carried from specs

- Soft readability warning above 10 items (item-management) — implement as a
  non-blocking toast/badge in PR 5; not gating.
- Aggregate 0-fill tooltip listing contributing items ("—" for none)
  (proposal risk) — nice-to-have in PR 4 tooltip callback; core sum is
  unaffected.
