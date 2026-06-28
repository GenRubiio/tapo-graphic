# Apply Progress — tapo-consumption-dashboard

Delivery path: all 5 chained slices implemented in one autonomous run
(feature-branch-chain), directly on `main`. No git branches created, no commits
made — branch/PR creation deferred to the user per instructions.

Strict TDD: INACTIVE (`openspec/config.yaml` strict_tdd=false). Vitest was added
as part of the scaffold and real test coverage was written for all pure
functions, with `vitest run` evidence captured below.

---

## Completed work by slice

### Slice 1 — scaffold + types + tariff + Vitest
- `package.json` (vite, typescript, xlsx, chart.js, chartjs-plugin-annotation, vitest, @types/node), scripts `dev`/`build` (`tsc --noEmit && vite build`)/`preview`/`test` (`vitest run`)/`test:watch`.
- `tsconfig.json` (strict, bundler resolution, `types: vitest/globals + node`).
- `vite.config.ts` (`base: './'`, vitest `environment: 'node'`, `include test/**`).
- `index.html` shell (header + Add item button, `#items`, `#calendar`, `#charts` with two `.chart-wrapper` canvases + `.chart-empty` nodes), `lang="es"`.
- `src/types.ts` — `HourlyRecord`, `TapoItem`, `AppState`, `DaySeries`.
- `src/data/tariff.ts` — `TARIFF_2_0TD` (6 bands), `TARIFF_COLORS`, `tariffBoxes()`.
- `src/styles/main.css` skeleton (extended in slice 5 for responsive + toasts).
- `test/tariff.test.ts`.

### Slice 2 — excel parsing + store
- `src/parsing/parseConsumo.ts` — PURE, injected `xlsxModule` seam. Reads `Día` sheet, validates header contains `"Consumo de energía(kWh)"`, normalizes `YYYY/MM/DD HH:00:00` rows, sums duplicate `(dateISO,hour)`, header-only => `{ok:true, records:[]}`, error codes `SHEETJS_READ_FAILED | DIA_SHEET_MISSING | HEADER_MISMATCH | ROW_PARSE_FAILED`.
- `src/store.ts` — `KEYS`, `loadState` (re-hydrates `timestamp` Dates), `saveRegistry` (strips `consumo`), `saveRecords`, `deleteItem`, quota-guarded (`QUOTA_EXCEEDED`/`WRITE_FAILED`).
- `test/parseConsumo.test.ts` — against the REAL binary `.xls` files.

### Slice 3 — store + item-management UI + calendar + aggregation
- `src/data/aggregate.ts` — `unionDays`, `itemDaySeries` (24-slot 0-fill), `sumDaySeries`, `totalKWh`.
- `src/ui/colors.ts` — `colorForIndex`, `PALETTE_HUE_COUNT=12`.
- `src/ui/itemCard.ts` — name input (rename on change/blur), delete button, active Consumo drop zone (drag-and-drop + click-to-pick re-upload), disabled inert Potencia(W) zone, status line.
- `src/ui/calendar.ts` — union day picker, `DD/MM/YYYY` display, active state, empty message.
- `src/ui/chartPanel.ts` — Chart.js instance lifecycle, empty-state toggle.
- `src/main.ts` — wiring: load/render/recompute, add/rename/delete, drop -> FileReader -> lazy `import('xlsx')` -> parseConsumo -> save -> recompute, default-day selection.
- `test/aggregate.test.ts`, `test/colors.test.ts`.

### Slice 4 — charts
- `src/charts/perItemChart.ts` — `HOUR_LABELS` (`00 - 01 h` … `23 - 24 h`), `buildPerItemConfig` (line, tension 0.4, pointRadius 3, legend, tariff annotations, kWh axis).
- `src/charts/aggregateChart.ts` — `buildAggregateConfig` (single dark-blue `#1a4fa0` series, `kWh – días` title, no legend, tariff annotations).
- Chart.js + annotation plugin registered in `main.ts`.

### Slice 5 — toasts + responsive + a11y + polish
- `src/ui/toasts.ts` — DOM toasts (`role="alert"`, auto-dismiss, slide-in).
- `main.ts` — full toast integration (parse failures, quota, success info), soft >10-item readability warning.
- `src/styles/main.css` — mobile-first single column; `#calendar` horizontal scroll < 768px; `@media (min-width:768px)` grid sidebar + chart area; toast styles; disabled Potencia styling.
- A11y: HTML5 landmarks, ARIA labels, `aria-pressed` on day buttons, `aria-disabled`/`tabindex=-1` on Potencia zone, `aria-busy` on cards during upload, `:focus-visible` preserved.

---

## Files changed (created)

Config: `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore` (added node_modules/dist).
HTML/CSS: `index.html`, `src/styles/main.css`.
Source: `src/types.ts`, `src/data/tariff.ts`, `src/data/aggregate.ts`, `src/parsing/parseConsumo.ts`, `src/store.ts`, `src/ui/colors.ts`, `src/ui/itemCard.ts`, `src/ui/calendar.ts`, `src/ui/chartPanel.ts`, `src/ui/toasts.ts`, `src/charts/perItemChart.ts`, `src/charts/aggregateChart.ts`, `src/main.ts`.
Tests: `test/tariff.test.ts`, `test/colors.test.ts`, `test/aggregate.test.ts`, `test/parseConsumo.test.ts`.

---

## Test-run evidence (`npx vitest run`)

| Suite | Tests | Result | Notes |
|-------|-------|--------|-------|
| test/tariff.test.ts | 5 | PASS | 6 bands, 0-24 no gap/overlap, boundary periods, 6 boxes |
| test/colors.test.ts | 4 | PASS | hsl() format, determinism, 12 distinct, index 12 recycles index 0 |
| test/aggregate.test.ts | 10 | PASS | union (5-day, single, empty); sum 5+5=10; 0-fill 3+∅=3; all-zero; itemDaySeries; totalKWh |
| test/parseConsumo.test.ts | 6 | PASS | REAL boiler + cuarto-1 binaries -> ok; Potencia -> HEADER_MISMATCH; synthetic missing-Día -> DIA_SHEET_MISSING; header-only -> []; dup 0.4+0.6 -> 1.0 |
| **Total** | **25** | **25 passed (4 files)** | Duration ~0.46s |

```
 ✓ test/colors.test.ts  (4 tests)
 ✓ test/aggregate.test.ts  (10 tests)
 ✓ test/tariff.test.ts  (5 tests)
 ✓ test/parseConsumo.test.ts  (6 tests)
 Test Files  4 passed (4)
      Tests  25 passed (25)
```

## Function-creation order (no strict TDD; honest record)

- `tariff.ts`, `aggregate.ts`, `colors.ts`, `parseConsumo.ts`: production written first
  (structure confirmed by inspecting the real `.xls` files), then tests written and run.
  No RED→GREEN cycle claimed.
- The real-file inspection (xlsx parse of `Día` sheet) was done before writing the
  parser, so the parser matched the genuine `[timestamp, kWh]` row shape on first run.

## Build evidence (`npm run build` = `tsc --noEmit && vite build`)

```
✓ 23 modules transformed.
dist/index.html                 1.21 kB
dist/assets/index-*.css         3.94 kB
dist/assets/index-*.js        257.81 kB  (entry)
dist/assets/xlsx-*.js         428.99 kB  (separate chunk — dynamic import OK)
✓ built in ~0.54s
```

`tsc --noEmit` exits 0. `xlsx` is correctly code-split (lazy `import('xlsx')`), not in the entry chunk.

## Dependency versions (installed)

chart.js 4.5.1 · chartjs-plugin-annotation 3.1.0 (chart.js 4 compatible) ·
xlsx 0.18.5 · vite 5.4.21 · vitest 1.6.1 · typescript 5.x · @types/node 20.x.

---

## Deviations from design

1. `deleteItem` signature: design wrote `deleteItem(itemId)`. Implemented as
   `deleteItem(itemId, items)` so the registry can be rewritten purely (no hidden
   global). Behavior identical (removes `tapo_data_{id}` + drops from registry).
2. Added `@types/node` (devDep, not listed in design `package.json`) — required so
   `tsc --noEmit` resolves `node:fs/path/url` used by `parseConsumo.test.ts`.
3. UI/domain copy is Spanish (matches the reference product and the Spanish user);
   code identifiers/comments are English per the artifact-language contract. Exact
   domain terms preserved verbatim: `Consumo de energía(kWh)`, `Potencia(W)`,
   `Día`, `kWh – días`.
4. `tariffBoxes()` omits an explicit `yMax` so bands span the full plot height
   automatically (Chart.js draws box to axis max); `yMin: 0`.

## Remaining tasks (human-owned, non-blocking)

- Manual browser QA of the 13 proposal §Success criteria (drag-and-drop, refresh
  persistence, 375px viewport, DevTools "0 network calls"). The automated portions
  (parsing, aggregation, tariff, palette, build) are green.
- Git: create the chained PR branches and commits (deferred to user — instructions
  said do NOT create branches or commit).

## Workload / PR boundary

All five planned slices are implemented in the working tree. When the user opts to
split into the documented feature-branch chain, the natural commit/PR boundaries
map 1:1 to the slices above (scaffold → parser+store → ui+aggregation → charts →
polish), each carrying its own tests.
