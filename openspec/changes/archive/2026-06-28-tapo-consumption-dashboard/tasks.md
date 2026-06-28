# Tasks: Tapo Consumption Dashboard

Change: `tapo-consumption-dashboard`
Design: `openspec/changes/tapo-consumption-dashboard/design.md`
Preflight: `chainedPrStrategy = force-chained`, `reviewBudgetLines = 400`

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1 400–1 800 (human-meaningful); ~2 200–2 800 raw including generated artifacts |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (scaffold+types+tariff) → PR 2 (parser+store) → PR 3 (store+item-management UI) → PR 4 (calendar+aggregation+charts) → PR 5 (charts visual+responsive+polish) |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

**Generated / low-review-cost lines note:** `package.json`, `package-lock.json`, `tsconfig.json`, and `vite.config.ts` together add ~120–200 raw diff lines but represent minimal human-review burden (config declarations, dependency version pins, lockfile). They are listed in PR 1 and counted separately below so the budget reflects the code reviewers must actually read.

### Per-slice budget breakdown (human-meaningful lines only)

| PR | Key files | Estimated human-review lines | Within 400-line budget? |
|----|-----------|------------------------------|------------------------|
| PR 1 | `index.html`, `src/types.ts`, `src/data/tariff.ts`, `src/styles/main.css` skeleton, `test/tariff.test.ts`, `vitest.config.ts` | ~220–280 | Yes |
| PR 2 | `src/parsing/parseConsumo.ts`, `src/store.ts`, `test/parseConsumo.test.ts` | ~280–340 | Yes |
| PR 3 | `src/data/aggregate.ts`, `src/ui/colors.ts`, `src/ui/itemCard.ts`, `src/ui/calendar.ts`, `src/ui/chartPanel.ts`, `src/main.ts` (initial wire), `test/aggregate.test.ts`, `test/colors.test.ts` | ~360–400 | Yes (at ceiling) |
| PR 4 | `src/charts/perItemChart.ts`, `src/charts/aggregateChart.ts`, `src/main.ts` (chart wiring), `src/ui/toasts.ts` (stub) | ~260–320 | Yes |
| PR 5 | `src/styles/main.css` (responsive rules), `src/ui/toasts.ts` (full), disabled Potencia copy, a11y attrs, soft warning, `src/main.ts` (quota/toast integration) | ~200–260 | Yes |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

---

## Branch topology

```
main
 └── feat/tapo-dashboard          (tracker — draft, no-merge)
      └── feat/tapo-dashboard/scaffold      (PR 1)
           └── feat/tapo-dashboard/parser-store   (PR 2)
                └── feat/tapo-dashboard/ui-components  (PR 3)
                     └── feat/tapo-dashboard/charts     (PR 4)
                          └── feat/tapo-dashboard/polish (PR 5)
```

Each child PR targets the immediately preceding child branch. After all 5 reviews pass, PR 5 merges into the tracker branch, then the tracker merges into `main`.

---

## PR 1 — Scaffold + Types + Tariff constant + Vitest

**Branch:** `feat/tapo-dashboard/scaffold`
**Targets:** `feat/tapo-dashboard` (tracker)
**Start state:** empty repo (only `test-data/`, `image.png`, `openspec/`, `.gitignore`)
**Finish state:** `vite dev` starts, `vite build` succeeds, `npm test` (`npx vitest run`) passes with 1 test suite (`tariff.test.ts`)
**Rollback:** delete branch; no files modified in the working tree

Specs / design sections satisfied: Design §Project scaffold, §Decisions D1–D2–D7, §Contracts `src/data/tariff.ts`, §Testing (runner setup); charts spec §Spanish 2.0TD tariff-band annotations (constant definition).

### T1.1 — Create tracker branch and PR 1 branch

> DEFERRED: per the resolved delivery instruction, all slices were implemented on
> the current branch with no git branches/commits. Branch/PR creation is left to
> the user. The slice boundaries below still map 1:1 to the planned chain.

- Create `feat/tapo-dashboard` off `main` (empty commit: "chore: open tracker for tapo-consumption-dashboard").
- Create `feat/tapo-dashboard/scaffold` off the tracker branch.
- Verification: `git log --oneline feat/tapo-dashboard` shows the tracker commit.

### T1.2 — Initialize npm package and install dependencies

- Create `package.json` with the exact shape from design §Project scaffold:
  - `"type": "module"`, scripts: `dev`, `build` (`tsc --noEmit && vite build`), `preview`, `test` (`vitest run`), `test:watch` (`vitest`).
  - `dependencies`: `xlsx@^0.18.5`, `chart.js@^4.4.0`, `chartjs-plugin-annotation@^3.0.1`.
  - `devDependencies`: `vite@^5.0.0`, `typescript@^5.4.0`, `vitest@^1.6.0`.
- Run `npm install` to produce `package-lock.json`.
- Verification: `npm install` exits 0; `node_modules/vite` and `node_modules/vitest` exist.

### T1.3 — Add TypeScript and Vite configuration

- Create `tsconfig.json` targeting ESNext modules, strict mode enabled, `rootDir: "src"`, `types: ["vitest/globals"]` (so test files share globals without extra imports).
- Create `vite.config.ts`:
  - `base: './'` so `dist/` works from any sub-path.
  - `test` block: `environment: 'node'`, `include: ['test/**/*.test.ts']`.
  - Design reference: §Project scaffold `vite.config.ts`.
- Verification: `npx tsc --noEmit` exits 0 on an empty `src/types.ts`.

### T1.4 — Write `src/types.ts` with shared interfaces

Files: `src/types.ts`

- Define and export `HourlyRecord`, `TapoItem`, `AppState`, `DaySeries` exactly as specified in design §Contracts `src/types.ts`.
- `HourlyRecord`: `timestamp: Date`, `dateISO: string`, `hour: number`, `kWh: number`.
- `TapoItem`: `id: string`, `name: string`, `color: string`, `consumo: HourlyRecord[] | null`, `potenciaPlaceholder: true`.
- `AppState`: `items: TapoItem[]`, `selectedDay: string | null`.
- `DaySeries = number[]` (length 24 by convention).
- Verification: `npx tsc --noEmit` exits 0.

### T1.5 — Write `src/data/tariff.ts` — TARIFF_2_0TD constant

Files: `src/data/tariff.ts`

- Export `TariffPeriod` type (`'valley' | 'flat' | 'peak'`).
- Export `TariffBand` interface: `startHour`, `endHour`, `period`.
- Export `TARIFF_2_0TD: readonly TariffBand[]` with exactly 6 bands:
  `{ 0, 8, 'valley' }`, `{ 8, 10, 'peak' }`, `{ 10, 14, 'flat' }`, `{ 14, 18, 'peak' }`, `{ 18, 22, 'flat' }`, `{ 22, 24, 'valley' }`.
- Export `TARIFF_COLORS: Record<TariffPeriod, string>` with color tokens matching `image.png` alternating shading (e.g. valley: light blue `rgba(173,216,230,0.35)`, peak: light red `rgba(255,182,193,0.35)`, flat: light grey `rgba(200,200,200,0.25)`).
- Export `tariffBoxes(): Record<string, object>` — maps each band to a `chartjs-plugin-annotation` box annotation: `type:'box'`, `xMin: band.startHour - 0.5`, `xMax: band.endHour - 0.5`, `yMin: 0`, `yMax: 'max'` (or a large sentinel), `backgroundColor: TARIFF_COLORS[band.period]`, `drawTime: 'beforeDatasetsDraw'`, `borderWidth: 0`.
- Design reference: §Contracts `src/data/tariff.ts`.
- Proposal reference: proposal §Tariff bands.
- Spec reference: charts spec §Spanish 2.0TD tariff-band annotations.

### T1.6 — Write `test/tariff.test.ts` and confirm `npm test` passes (RED → GREEN)

Files: `test/tariff.test.ts`

Test cases (design §Testing `test/tariff.test.ts`):
1. `TARIFF_2_0TD` has exactly 6 bands.
2. Bands cover hours 0–24 without gap: each band's `startHour` equals the previous band's `endHour`; first `startHour` is 0, last `endHour` is 24.
3. Bands have no overlap: sorted by `startHour`, each `endHour <= next startHour`.
4. Band periods match the spec values at exact boundaries: hour 0 is 'valley', hour 8 is 'peak', hour 10 is 'flat', hour 14 is 'peak', hour 18 is 'flat', hour 22 is 'valley'.
5. `tariffBoxes()` returns an object with exactly 6 keys.

- Run `npx vitest run` — all 5 cases must pass.
- Verification: `npx vitest run` exits 0 with `5 passed`.

### T1.7 — Write `index.html` shell

Files: `index.html`

- HTML5 document, charset UTF-8, viewport meta, title "Tapo Consumption Dashboard".
- `<header>`: app title `<h1>`, "Add item" `<button id="btn-add-item">`.
- `<section id="items">`: empty container for item cards.
- `<nav id="calendar">`: empty container for day picker.
- `<main id="charts">`: two `<div>` chart wrappers each containing a `<canvas>` — `#chart-per-item` and `#chart-aggregate` — plus sibling `<p class="chart-empty">` empty-state nodes (hidden by default).
- `<script type="module" src="/src/main.ts">`.
- Design reference: §Project scaffold `index.html`.

### T1.8 — Write `src/styles/main.css` skeleton

Files: `src/styles/main.css`

- CSS custom properties: tariff color tokens mirroring `TARIFF_COLORS`, per-item chart height variable (`--chart-height: 320px`).
- Base reset: `box-sizing: border-box`, `margin: 0`.
- `#items`: basic flex/block container.
- `.chart-wrapper`: `position: relative; height: var(--chart-height)` (required so Chart.js `maintainAspectRatio: false` has a bounding box).
- `.chart-empty`: `display: none` by default; shown via `.chart-empty.visible`.
- No responsive rules yet (added in PR 5).
- Design reference: §Responsive layout, §Project scaffold.

### T1.9 — Write minimal `src/main.ts` entry (stub)

Files: `src/main.ts`

- Import `'./styles/main.css'`.
- Single `console.log('Tapo Dashboard initializing')` placeholder.
- Purpose: lets `vite build` resolve the module graph without errors.
- Verification: `npm run build` exits 0, `dist/index.html` exists.

### PR 1 verification checklist

- [x] `npm install` exits 0.
- [x] `npx tsc --noEmit` exits 0.
- [x] `npx vitest run` exits 0 (5 tariff tests pass).
- [x] `npm run build` exits 0; `dist/index.html` exists.
- [ ] `dist/index.html` opens in a browser with no console errors and shows the shell. (manual — pending human QA)

---

## PR 2 — Excel Parser + Store

**Branch:** `feat/tapo-dashboard/parser-store`
**Targets:** `feat/tapo-dashboard/scaffold` (PR 1 branch)
**Start state:** PR 1 merged; scaffold + types + tariff constant in place
**Finish state:** `npx vitest run` passes all suites including `parseConsumo.test.ts` against real binary `.xls` files; `store.ts` compiles cleanly
**Rollback:** revert branch; PR 1 branch state is unchanged

Specs / design sections satisfied: excel-ingestion spec (all requirements); item-management spec §localStorage persistence, §quota handling; design §Contracts `parseConsumo.ts` and `store.ts`, §Data flow (parse path), §Testing `parseConsumo.test.ts`.

### T2.1 — Write `src/parsing/parseConsumo.ts` (PURE)

Files: `src/parsing/parseConsumo.ts`

- Export `ParseErrorCode`, `ParseError`, `ParseOk`, `ParseResult` as defined in design §Contracts.
- Implement `parseConsumo(buffer: ArrayBuffer, xlsxModule: typeof import('xlsx')): ParseResult`:
  1. Try `xlsxModule.read(buffer, { type: 'array' })` — catch and return `{ ok: false, code: 'SHEETJS_READ_FAILED', message: '...' }`.
  2. Check `wb.Sheets['Día']` exists — else return `DIA_SHEET_MISSING`.
  3. `sheet_to_json(wb.Sheets['Día'], { header: 1 })` → rows array.
  4. Validate header row (row 0): some cell `.includes("Consumo de energía(kWh)")` — else return `HEADER_MISMATCH`. Preserve exact domain term verbatim.
  5. If no data rows (header-only), return `{ ok: true, records: [] }`.
  6. For each data row: parse timestamp string `YYYY/MM/DD HH:00:00` → `dateISO = "YYYY/MM/DD"`, `hour = parseInt(HH)`, `kWh = Number(row[1])`. Non-finite kWh → `ROW_PARSE_FAILED`.
  7. Deduplicate by `(dateISO, hour)` — sum kWh of duplicate pairs (design §Contracts, excel-ingestion spec §Duplicate-timestamp handling).
  8. Return `{ ok: true, records: HourlyRecord[] }`.
- `xlsxModule` injection seam makes the function pure and trivially unit-testable (design D3 tradeoff).
- Spec reference: excel-ingestion spec §Drag-and-drop binary ingestion, §Read the "Día" sheet, §Header validation, §HourlyRecord normalization, §Duplicate-timestamp handling, §Parse-failure reporting.

### T2.2 — Write `test/parseConsumo.test.ts` — real-file integration (RED → GREEN)

Files: `test/parseConsumo.test.ts`

Load strategy (design §Testing): use Node `fs.readFileSync` to load the binary fixture into a `Buffer`, call `.buffer` to get `ArrayBuffer`, import the real `xlsx` module, pass both into `parseConsumo`.

Test cases (design §Testing `parseConsumo.test.ts`):
1. `test-data/boiler/Consumo de energía.xls` → `ok: true`, `records.length > 0`, all `hour` values in range `[0, 23]`, all `dateISO` match `/^\d{4}\/\d{2}\/\d{2}$/`.
2. `test-data/cuarto-1/Consumo de energía (1).xls` → same shape assertions.
3. Potencia file (`test-data/boiler/Potencia.xls`) on the Consumo parser → `ok: false`, `code: 'HEADER_MISMATCH'`.
4. Synthetic missing-`Día` sheet: build a minimal SheetJS workbook in-memory with no `Día` sheet → `DIA_SHEET_MISSING`.
5. Header-only workbook (valid header, zero data rows) → `{ ok: true, records: [] }`.
6. Duplicate `(date, hour)` rows `0.4 + 0.6` → single bucket value `1.0` (tolerance `< 0.0001`).

- Run `npx vitest run` — all 6 cases must pass.
- Verification: `npx vitest run` exits 0; test output shows `parseConsumo.test.ts` and `tariff.test.ts` both passing.

### T2.3 — Write `src/store.ts`

Files: `src/store.ts`

- Export `KEYS = { registry: 'tapo_items', data: (id) => \`tapo_data_\${id}\` }` as const.
- Export `SaveResult` type: `{ ok: true } | { ok: false; reason: 'QUOTA_EXCEEDED' | 'WRITE_FAILED'; message: string }`.
- Implement `loadState(): TapoItem[]`:
  - Read `localStorage.getItem(KEYS.registry)` → parse JSON → for each item read `localStorage.getItem(KEYS.data(id))` → parse records JSON.
  - Re-hydrate `HourlyRecord.timestamp` from ISO string to `Date` (design D9).
  - Return `[]` on any missing/parse error (graceful degradation).
- Implement `saveRegistry(items: TapoItem[]): SaveResult`:
  - Serialize items (strip `consumo` array to avoid double-storage — records are under separate keys).
  - `localStorage.setItem(KEYS.registry, JSON.stringify(...))` inside try/catch.
  - `QuotaExceededError` → `{ ok: false, reason: 'QUOTA_EXCEEDED', message: 'Storage full. Delete an item to free space.' }`.
  - Any other error → `{ ok: false, reason: 'WRITE_FAILED', message: '...' }`.
- Implement `saveRecords(itemId: string, records: HourlyRecord[]): SaveResult`: serialize only parsed JSON (design D5, item-management spec §Only parsed JSON persisted). Same quota guard.
- Implement `deleteItem(itemId: string): void`: remove `KEYS.data(id)` then update registry via `saveRegistry`.
- Design reference: §Contracts `src/store.ts`; item-management spec §localStorage persistence, §quota handling.

### T2.4 — Verify full build with PR 2 additions

- `npx tsc --noEmit` exits 0 (no type errors in `parseConsumo.ts` + `store.ts`).
- `npm run build` exits 0.
- `npx vitest run` exits 0 (all suites: `tariff.test.ts` + `parseConsumo.test.ts`).

### PR 2 verification checklist

- [x] `npx vitest run` exits 0; `parseConsumo.test.ts` shows 6 passed.
- [x] Real `boiler` and `cuarto-1` `.xls` files parse to non-empty `HourlyRecord[]` arrays with valid `dateISO` and `hour` fields.
- [x] Potencia file dropped into `parseConsumo` returns `HEADER_MISMATCH`.
- [x] `npx tsc --noEmit` exits 0.
- [x] `npm run build` exits 0.

---

## PR 3 — Store + Item-Management UI + Calendar + Aggregation

**Branch:** `feat/tapo-dashboard/ui-components`
**Targets:** `feat/tapo-dashboard/parser-store` (PR 2 branch)
**Start state:** PR 2 merged; parser and store compiled and tested
**Finish state:** running app shows item cards with drop zones, calendar populates after file drop, day selection triggers chart stub; `npx vitest run` passes aggregate and colors test suites
**Rollback:** revert branch; PR 2 state is unchanged

Specs / design sections satisfied: item-management spec (all requirements); calendar spec (all requirements); design §Contracts `aggregate.ts`, `colors.ts`, §Data flow (recompute path), §Module map PR 3 files, §Testing `aggregate.test.ts` and `colors.test.ts`.

### T3.1 — Write `src/data/aggregate.ts` (PURE)

Files: `src/data/aggregate.ts`

- Implement `unionDays(items: TapoItem[]): string[]`:
  - Collect all `dateISO` values from every item's `consumo` array (skip null).
  - Deduplicate, sort ascending (lexicographic on `YYYY/MM/DD` is correct).
  - Return sorted unique string array.
  - Calendar spec §Day set derived from union of all items.
- Implement `itemDaySeries(item: TapoItem, dateISO: string): DaySeries`:
  - Return a 24-element array (index = hour, 0-indexed).
  - If item has no consumo or no records for `dateISO`, return all-zeros array.
  - Fill from matching records; hours not present in records stay 0.
  - Design D10: always a fixed 24-slot array.
- Implement `sumDaySeries(items: TapoItem[], dateISO: string): DaySeries`:
  - Sum `itemDaySeries(item, dateISO)` across all items element-wise.
  - Result is a 24-element array.
  - Calendar spec §Partial coverage with 0-fill; charts spec §Aggregate sums items per hour bucket.
- Implement `totalKWh(series: DaySeries): number`:
  - `series.reduce((acc, v) => acc + v, 0)`.
  - Design §Contracts `aggregate.ts`.

### T3.2 — Write `src/ui/colors.ts` (PURE)

Files: `src/ui/colors.ts`

- Export `PALETTE_HUE_COUNT = 12`.
- Export `colorForIndex(index: number): string`:
  - `hue = (index * Math.floor(360 / PALETTE_HUE_COUNT)) % 360`.
  - Return `hsl(${hue}, 70%, 50%)`.
  - Deterministic: same index always returns same string.
  - Index 12 recycles index 0's hue (design §Contracts `colors.ts`).
- Charts spec §Many items color assignment.

### T3.3 — Write `test/aggregate.test.ts` and `test/colors.test.ts` (RED → GREEN)

Files: `test/aggregate.test.ts`, `test/colors.test.ts`

**`aggregate.test.ts`** (design §Testing):
1. `unionDays` over item A (days 06/01–06/03) + item B (days 06/02–06/05) → 5 days `06/01` through `06/05`.
2. Single item with 3 days → `unionDays` returns exactly those 3 days.
3. No items or all-null consumo → `unionDays` returns `[]`.
4. `sumDaySeries` two items both with 5 kWh at hour 9 → `result[9] === 10`.
5. `sumDaySeries` with one item missing data for the day → missing item contributes 0 (result[9] === 5 for item with data).
6. All-zero day (records present, all kWh 0) → `sumDaySeries` returns length-24 array of zeros, no throw.
7. `itemDaySeries` for item with no data → length-24 zeros array.
8. `totalKWh` of an all-zero series → 0; `totalKWh` of `[1,2,3,...(21 zeros)]` → 6.

**`colors.test.ts`** (design §Testing):
1. `colorForIndex(0)` returns a string starting with `hsl(`.
2. `colorForIndex(0)` called twice returns the identical string (deterministic).
3. Indices 0–11 produce 12 distinct return values.
4. `colorForIndex(12)` produces the same hue component as `colorForIndex(0)`.

- Run `npx vitest run` — all suites pass.

### T3.4 — Write `src/ui/itemCard.ts`

Files: `src/ui/itemCard.ts`

- Export `renderItemCard(item: TapoItem, callbacks: ItemCardCallbacks): HTMLElement`:
  - `ItemCardCallbacks`: `{ onRename(id, name): void; onDelete(id): void; onConsumoDrop(id, file: File): void }`.
- Card HTML structure:
  - Name `<input type="text">` pre-filled with `item.name`; `blur` or `change` event fires `onRename`.
  - "Delete" `<button>` fires `onDelete`.
  - Two drop zones as `<div class="drop-zone">`:
    - **Active zone** labelled "Consumo de energía(kWh)": `ondragover preventDefault`, `ondrop` reads `event.dataTransfer.files[0]` and fires `onConsumoDrop`. Shows file name or "No file" placeholder. Preserve exact domain term.
    - **Disabled zone** labelled "Potencia(W)" with `aria-disabled="true"` and class `drop-zone--disabled`: `ondragover` and `ondrop` are no-ops (spec: dropping has no effect). Shows "Coming soon" copy.
  - Status indicator: if `item.consumo !== null`, show record count and date range summary; else show "Drop Consumo de energía(kWh) file to load data".
- Item-management spec §Per-item file drop zones, §Potencia zone is inert in v1, §Per-item re-upload.

### T3.5 — Write `src/ui/calendar.ts`

Files: `src/ui/calendar.ts`

- Export `renderCalendar(days: string[], selectedDay: string | null, onSelect: (day: string) => void): void`:
  - Targets `<nav id="calendar">`.
  - If `days` is empty: show "No data loaded" message; calendar spec §No data at all.
  - Render one `<button>` per day, formatted as `DD/MM/YYYY` for display (parse `YYYY/MM/DD`).
  - Active day button gets class `calendar__day--active` and `aria-pressed="true"`.
  - Clicking a button calls `onSelect(dateISO)`.
  - Calendar spec §Day picker UI drives both charts, §Default selection when days exist.

### T3.6 — Write `src/ui/chartPanel.ts`

Files: `src/ui/chartPanel.ts`

- Export `initChartPanel(canvasId: string): ChartPanel`.
- `ChartPanel` interface: `{ update(config: ChartConfiguration | null): void; destroy(): void }`.
- `update(null)` → destroy existing Chart instance and show `.chart-empty.visible` sibling; `update(config)` → hide empty state, create or update `Chart` instance on the canvas.
- Manages Chart.js instance lifecycle (destroy before re-create on update).
- Design §Data flow (chartPanel.update calls); charts spec §Empty / no-data states.

### T3.7 — Wire `src/main.ts` — initial store + UI binding (charts stubbed)

Files: `src/main.ts`

- On DOMContentLoaded:
  1. `loadState()` → `AppState`.
  2. `renderAllItems()`: iterate `state.items`, render each `itemCard` into `#items`.
  3. `recompute()`: `unionDays(state.items)` → `renderCalendar(days, state.selectedDay, onDaySelect)`. Default `selectedDay` to `days[0]` if null and days exist.
  4. `initChartPanel('#chart-per-item')` and `initChartPanel('#chart-aggregate')` — pass `null` config initially (shows empty state).
  5. "Add item" button handler: `store.addItem(...)` → `saveRegistry` → re-render card → `recompute()`.
  6. `onConsumoDrop(itemId, file)`: show spinner (simple `aria-busy`), `FileReader.readAsArrayBuffer(file)` → `await import('xlsx')` → `parseConsumo(buffer, xlsxModule)`. On error: show inline error (placeholder — full toasts in PR 5). On ok: `saveRecords(itemId, records)` → `recompute()`.
  7. `onRename(id, name)`: update `state`, `saveRegistry` → update chart legend (re-trigger `onDaySelect`).
  8. `onDelete(id)`: `deleteItem(id)` → remove card → `recompute()`.
  9. `onDaySelect(day)`: update `state.selectedDay` → call `updateCharts()` stub (passes `null` config until PR 4 lands).
- Item-management spec: all scenarios. Calendar spec: all scenarios.

### T3.8 — Verify PR 3 end state

- `npx vitest run` exits 0 (4 suites: tariff, parseConsumo, aggregate, colors).
- `npm run build` exits 0.
- Manual smoke: `vite dev` → add two items → drop `test-data/boiler/Consumo de energía.xls` on item 1 → calendar renders days → selecting a day shows empty chart state (stub).

### PR 3 verification checklist

- [x] `npx vitest run` exits 0 with aggregate and colors suites passing.
- [x] `npm run build` exits 0.
- [x] Adding items, renaming, deleting items all persist to `tapo_items` in localStorage. (implemented in store.ts + main.ts)
- [x] Dropping `Consumo de energía.xls` parses and populates the calendar. (implemented; parser proven via tests)
- [x] Dropping a Potencia file on the Consumo zone shows an error (no data corruption). (HEADER_MISMATCH -> toast; prior data untouched)
- [x] Dropping any file on the disabled Potencia zone has no effect. (no-op handlers, no preventDefault)
- [x] Page refresh restores item registry and parsed data. (loadState re-hydrates Dates)

---

## PR 4 — Charts (per-item + aggregate visual implementation)

**Branch:** `feat/tapo-dashboard/charts`
**Targets:** `feat/tapo-dashboard/ui-components` (PR 3 branch)
**Start state:** PR 3 merged; UI renders, calendar works, charts show empty state
**Finish state:** both charts render fully for the selected day with tariff bands, correct axis labels, and responsive sizing
**Rollback:** revert branch; PR 3 branch state unchanged

Specs / design sections satisfied: charts spec (all requirements); design §Contracts chart builders, §Shared chart conventions, §Testing (palette covered in PR 3, chart builders have no pure tests — verified manually per design §Tradeoffs).

### T4.1 — Write `src/charts/perItemChart.ts`

Files: `src/charts/perItemChart.ts`

- Export `HOUR_LABELS: string[]` — 24 labels: `` `${pad(h)} - ${pad(h + 1)} h` `` where `pad = (n) => String(n).padStart(2, '0')`.
  - Result: `['00 - 01 h', '01 - 02 h', ..., '23 - 24 h']`. Matches `image.png` x-axis exactly.
- Export `buildPerItemConfig(series: { name: string; color: string; data: DaySeries }[]): ChartConfiguration`:
  - `type: 'line'`.
  - `data.labels = HOUR_LABELS`.
  - `data.datasets`: one per series entry — `label: name`, `data: data`, `borderColor: color`, `backgroundColor: color + '33'` (10% fill), `tension: 0.4`, `pointRadius: 3`, `pointStyle: 'circle'`.
  - `options.responsive: true`, `options.maintainAspectRatio: false`.
  - `options.scales.x.title.text: 'Hora'`, `options.scales.y.title.text: 'kWh'`.
  - `options.plugins.annotation.annotations = tariffBoxes()`.
  - `options.plugins.legend.display: true`.
  - If `series` is empty, return config with empty datasets (renders as flat empty — not an error).
  - Design §Contracts `perItemChart.ts`; charts spec §Chart 1 — per-item line chart, §Reference-matching visual style, §Tariff-band annotations.

### T4.2 — Write `src/charts/aggregateChart.ts`

Files: `src/charts/aggregateChart.ts`

- Export `buildAggregateConfig(sum: DaySeries): ChartConfiguration`:
  - Same shared conventions as `perItemChart.ts` (HOUR_LABELS, tension, pointRadius, responsive, tariffBoxes).
  - Single dataset: `label: 'Consumo total'`, `data: sum`, `borderColor: '#1a4fa0'` (dark blue matching `image.png`), `pointStyle: 'circle'`.
  - `options.plugins.legend.display: false` (single series, no legend needed).
  - `options.plugins.title.display: true`, `text: 'kWh – días'` (preserve exact domain term).
  - Design §Contracts `aggregateChart.ts`; charts spec §Chart 2 — aggregate line chart.

### T4.3 — Add `src/ui/toasts.ts` (stub — full implementation in PR 5)

Files: `src/ui/toasts.ts`

- Export `showError(message: string): void` and `showInfo(message: string): void` — minimal implementation: `console.error` / `console.info` wrappers that also `alert()` as a placeholder.
- This unblocks `main.ts` import; PR 5 replaces `alert()` with DOM-based toasts.

### T4.4 — Wire charts into `src/main.ts`

Files: `src/main.ts` (extend)

- Replace chart stub in `updateCharts()`:
  - If `selectedDay` is null or `state.items` is empty: call `perItemPanel.update(null)` and `aggregatePanel.update(null)`.
  - Else:
    - Build `series` array: for each item, `{ name: item.name, color: item.color, data: itemDaySeries(item, selectedDay) }`.
    - `perItemPanel.update(buildPerItemConfig(series))`.
    - `sum = sumDaySeries(state.items, selectedDay)`.
    - `aggregatePanel.update(buildAggregateConfig(sum))`.
- Import `buildPerItemConfig` from `src/charts/perItemChart.ts`, `buildAggregateConfig` from `src/charts/aggregateChart.ts`.
- Design §Data flow (chart rendering path); charts spec §Selecting a day updates both charts.

### T4.5 — Integrate `chartjs-plugin-annotation` registration

Files: `src/main.ts` (extend) or `src/charts/index.ts` (new helper)

- Add at app startup: `import { Chart } from 'chart.js'; import Annotation from 'chartjs-plugin-annotation'; Chart.register(...registerables, Annotation)`.
- Registers all Chart.js components + annotation plugin globally so `tariffBoxes()` annotations render.
- Charts spec §Six bands rendered behind the data.

### T4.6 — Verify PR 4 end state

- Manual smoke: `vite dev` → add two items → drop both `Consumo de energía` files → calendar shows union of days → select a day → Chart 1 shows two colored series with tariff bands → Chart 2 shows summed series with tariff bands and `kWh – días` title.
- Confirm x-axis labels read `00 - 01 h` … `23 - 24 h`.
- Confirm Chart 2 blue line matches `image.png` color.
- Confirm 6 tariff background bands visible behind data.
- Confirm dropping a Potencia file on the Consumo zone shows error (toast stub → alert) and no data corruption.
- `npm run build` exits 0.
- `npx vitest run` exits 0.

### PR 4 verification checklist

- [x] Chart 1 renders one colored series per item with distinct colors and a legend. (buildPerItemConfig)
- [x] Chart 2 renders a single dark-blue series with `kWh – días` title. (buildAggregateConfig)
- [x] Both charts show six Spanish 2.0TD tariff bands. (tariffBoxes via annotation plugin)
- [x] X-axis labels: `00 - 01 h` … `23 - 24 h`. (HOUR_LABELS)
- [x] Item with no data on selected day renders as flat 0 line in Chart 1. (itemDaySeries 0-fill)
- [x] Aggregate sums correctly (verified with two items at same hour). (aggregate.test.ts: 5+5=10)
- [x] Empty/all-zero day shows flat 0 line, not an error. (aggregate.test.ts all-zero case)
- [x] `npm run build` and `npx vitest run` both exit 0.

---

## PR 5 — Charts Visual Polish + Responsive Layout + Accessibility + Toasts

**Branch:** `feat/tapo-dashboard/polish`
**Targets:** `feat/tapo-dashboard/charts` (PR 4 branch)
**Start state:** PR 4 merged; both charts render and work functionally
**Finish state:** all acceptance criteria from all 5 specs pass; `vite build` exits 0; `npx vitest run` exits 0; app passes manual 375 px viewport check
**Rollback:** revert branch; PR 4 state unchanged

Specs / design sections satisfied: responsive-layout spec (all requirements); item-management spec §quota handling (toast), §soft readability warning; excel-ingestion spec §parse-failure reporting (full toast); design §Responsive layout, §Open items.

### T5.1 — Implement full `src/ui/toasts.ts`

Files: `src/ui/toasts.ts`

- Replace alert()-based stub with DOM-based toast container:
  - `showError(message: string): void` — appends a `<div role="alert" class="toast toast--error">` to `<body>`, auto-removes after 5 s.
  - `showInfo(message: string): void` — same with `class="toast toast--info"`, auto-removes after 3 s.
- Add `.toast`, `.toast--error`, `.toast--info` CSS to `src/styles/main.css`: fixed position (bottom-right), slide-in animation, appropriate colors.
- Item-management spec §quota handling; excel-ingestion spec §parse-failure reporting; proposal §Risks (user-visible errors).

### T5.2 — Implement responsive CSS in `src/styles/main.css`

Files: `src/styles/main.css`

Mobile-first layout rules:
- **Base (< 768 px):** single-column stacking order — `#items`, then `#calendar` (`display: flex; overflow-x: auto; gap: 0.5rem; padding-bottom: 0.5rem`), then `#charts` (two `.chart-wrapper` divs stacked with `margin-bottom`). No horizontal overflow at 375 px.
- **`@media (min-width: 768px)`:** apply `display: grid; grid-template-columns: minmax(220px, 280px) 1fr` to the outer layout container. `#calendar` becomes a vertical sidebar (`flex-direction: column; overflow-x: hidden; overflow-y: auto`). `#charts` fills the right column.
- **Item cards** (`#items` children): `display: grid; grid-template-columns: 1fr auto; gap: 0.5rem` for name + delete button row; drop zones use `display: grid; gap: 0.5rem` so they reflow.
- **Chart wrappers:** `min-height: 280px` at mobile, `min-height: 320px` at `>=768px`.
- Responsive-layout spec: all requirements; design §Responsive layout.

### T5.3 — Wire full toast integration into `src/main.ts`

Files: `src/main.ts`

- Replace console/alert fallbacks with `showError` / `showInfo` from `src/ui/toasts.ts`:
  - Parse failure (`HEADER_MISMATCH`, `DIA_SHEET_MISSING`, `SHEETJS_READ_FAILED`, `ROW_PARSE_FAILED`) → `showError(parseResult.message)`.
  - `saveRegistry` / `saveRecords` returns `ok: false, reason: 'QUOTA_EXCEEDED'` → `showError(result.message)`.
  - Successful upload → `showInfo('File parsed successfully')`.
- Item-management spec §quota handling; excel-ingestion spec §parse-failure reporting.

### T5.4 — Add soft readability warning for >10 items

Files: `src/main.ts`, `src/ui/toasts.ts`

- After `addItem()`, if `state.items.length > 10`: `showInfo('More than 10 items may reduce chart readability.')`.
- Non-blocking; not a hard cap. Item-management spec §No item-count cap in v1.

### T5.5 — Finalize disabled Potencia zone copy and ARIA attributes

Files: `src/ui/itemCard.ts`, `src/styles/main.css`

- Disabled Potencia zone:
  - Text: "Potencia(W) — Coming soon". Preserve exact domain term "Potencia(W)".
  - `aria-disabled="true"`, `tabindex="-1"` on the zone element.
  - Visual: `opacity: 0.5; cursor: not-allowed` via `.drop-zone--disabled` CSS.
  - `ondrop` and `ondragover` return immediately without `preventDefault()` to allow browser's default drag-reject behavior. (Spec: dropping has no effect.)
- Item-management spec §Potencia zone is inert in v1; proposal §Out of scope.

### T5.6 — Accessibility pass

Files: `src/ui/itemCard.ts`, `src/ui/calendar.ts`, `index.html`, `src/styles/main.css`

- `index.html`: add `<main>`, `<nav>`, `<header>` landmark roles (already structural HTML5 elements; confirm ARIA labels).
- Calendar day buttons: `aria-label="Select day DD/MM/YYYY"`, `aria-pressed="true/false"`.
- Item name input: `<label>` associated via `for`/`id` or `aria-label`.
- Drop zones: `role="button"`, `aria-label="Drop Consumo de energía(kWh) file here"` (active zone). Disabled zone: `aria-label="Potencia(W) drop zone, coming soon"`.
- Chart canvases: `aria-label` describing each chart.
- Focus ring: ensure `:focus-visible` is not suppressed globally.
- Design §Rollout PR 5 (accessibility pass).

### T5.7 — Final end-to-end acceptance verification

Manual steps against the proposal §Success criteria checklist:
1. `npm run build` exits 0; `dist/index.html` opens with no console errors.
2. Add two items with distinct names.
3. Drop `test-data/boiler/Consumo de energía.xls` onto item 1; drop `test-data/cuarto-1/Consumo de energía (1).xls` onto item 2.
4. Calendar shows union of both items' days; all days are selectable.
5. Select a day → Chart 1 shows two colored lines; item with no data on that day shows flat 0.
6. Select a day → Chart 2 shows one summed line with six tariff-band background regions.
7. Chart 2 matches `image.png`: x-axis `00 - 01 h` … `23 - 24 h`, circular markers, blue line, alternating tariff shading.
8. Potencia drop zone visible but disabled on each card; dropping any file does nothing.
9. Refresh page → items and data restored without re-uploading.
10. Re-upload replaces only the targeted item's data.
11. Drop a Potencia file onto the Consumo zone → visible error toast → prior data unchanged.
12. Set browser viewport to 375 px → calendar scrolls horizontally, charts stack vertically, no horizontal overflow.
13. Open DevTools Network tab → 0 external requests after initial page load.

### PR 5 verification checklist

- [x] `npm run build` exits 0.
- [x] `npx vitest run` exits 0 (all 4 suites).
- [x] Toast errors appear for parse failures and quota exceeded (no more alerts). (DOM toasts in toasts.ts; wired in main.ts)
- [x] Soft warning shows when >10 items registered. (READABILITY_THRESHOLD in main.ts)
- [x] Disabled Potencia zone shows "Potencia(W) — Coming soon"; dropping any file does nothing.
- [x] At 375 px: calendar scrolls horizontally, charts stack, no horizontal overflow. (mobile-first CSS)
- [x] At >=768 px: calendar sidebar + chart area side-by-side. (grid-template-areas @media 768px)
- [x] Charts redraw on container resize (resize browser window). (responsive:true + maintainAspectRatio:false)
- [x] All accessibility checks: landmarks, labels, `aria-pressed`, `aria-disabled`. (HTML5 landmarks + ARIA attrs)
- [ ] All 13 proposal §Success criteria pass. (automated portions verified; full browser walk-through pending human QA)
- [ ] Merge PR 5 into tracker branch `feat/tapo-dashboard`; merge tracker into `main`. (deferred to user — no branches/commits per instructions)

---

## Cross-cutting conventions

- **Commit messages:** Conventional Commits — `feat(scope): outcome description`. Example: `feat(parser): add parseConsumo with real-file Vitest coverage`.
- **Domain term preservation:** the strings `"Consumo de energía(kWh)"`, `"Potencia(W)"`, `"Día"`, and `"kWh – días"` must appear verbatim in code and UI copy; never transliterate or abbreviate.
- **Tests with code:** each PR includes the test files for the pure functions it introduces. No deferred test commits.
- **`src/main.ts` grows across PRs:** it is intentionally extended in PR 3, 4, and 5. Each extension is a focused, reviewable diff. If the file approaches 200 lines, extract helper modules before the next PR.
- **No network requests:** `dist/` must be openable from the filesystem (`file://`) or any static host with no external API calls at runtime. Verify via DevTools Network tab on PR 5 acceptance.
