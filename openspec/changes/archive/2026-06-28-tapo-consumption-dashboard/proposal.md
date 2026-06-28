# Proposal: Tapo Consumption Dashboard (v1)

A no-backend, frontend-only web app that reads Tapo smart-plug Excel exports,
builds a calendar from the days present in any item's data, and renders two
energy-consumption charts. Zero server. Deployable as a static folder.

---

## Problem statement

Tapo smart plugs export energy data as `.xls` (BIFF8/OLE2 compound) files named
"Consumo de energía(kWh)" and "Potencia(W)". There is no official cross-device
dashboard: users must open each file separately in Excel and cannot compare
plugs or see a combined hourly aggregate. This tool closes that gap entirely
in the browser.

---

## Intent

Give users a single local page where they can:

1. Register named "items" (one item = one Tapo smart plug with optional peripherals).
2. Drop the "Consumo de energía(kWh)" file onto each item to upload hourly kWh data.
3. See a calendar covering every day present in any item's data.
4. Navigate days and view two charts:
   - **Chart 1** — per-item hourly kWh for the selected day, each item in a
     distinct color.
   - **Chart 2** — summed kWh across all items by hour-slot for the selected day
     (Endesa-style "kWh – días" view matching `image.png`), with Spanish 2.0TD
     tariff-band shading.

Session state (item registry + parsed records) persists in localStorage so data
survives page refresh without re-uploading.

---

## Scope

### In scope — v1

| Area | Detail |
|------|--------|
| Item registry | Add / rename / delete items; stored in localStorage |
| File ingestion | Drag-and-drop `.xls` drop zone for "Consumo de energía(kWh)" per item; parsed via SheetJS; parsed JSON stored in localStorage keyed by item ID |
| Calendar | Union of all days found in any item's "Consumo de energía" data; items missing data on a day contribute 0 kWh |
| Chart 1 — per-item | Line chart, one colored series per item, 24 hour-slots on x-axis, circular markers on each point |
| Chart 2 — aggregate | Line chart, summed kWh per hour-slot across all items, circular markers, Spanish 2.0TD tariff-band background shading (hardcoded constant) |
| Tariff bands | Hardcoded `TARIFF_2_0TD` exported constant: valley 00-08h, peak 08-10h, flat 10-14h, peak 14-18h, flat 18-22h, valley 22-24h; rendered as annotation bands matching `image.png` |
| Validation | After parsing, check header column name contains `"Consumo de energía(kWh)"`; reject with user-visible error if wrong file dropped |
| Re-upload | Per-item button to replace stored data (triggers new file-picker or drop) |
| Responsive layout | CSS Grid: calendar sidebar + chart area; mobile: vertical stack |
| Build | Vite + TypeScript; `vite build` emits a self-contained `dist/` directory |

### Out of scope — v1 (reserved for v2)

| Area | Note |
|------|------|
| "Potencia(W)" parsing | Drop zone appears on each item card, labelled "coming soon" / disabled; file is NOT parsed or rendered |
| Potencia chart | Not rendered; design slot reserved |
| Item-order drag-and-drop | Not in v1 |
| Export to PDF / PNG | Not in v1 |
| Tariff band editor UI | Bands are a hardcoded constant; no edit UI |
| Maximum-item limit | No enforced cap in v1; a soft UI warning may be added if >10 items degrade chart readability |

---

## Affected areas

| Area | Change type | Notes |
|------|-------------|-------|
| Project root | New | Greenfield — no prior source files |
| `index.html` | New | Single-page shell |
| `vite.config.ts` | New | Static output, no server |
| `src/store/items.ts` | New | Item registry, localStorage serialisation |
| `src/parser/consumo.ts` | New | SheetJS parse of "Consumo de energía" `Día` sheet → `HourlyRecord[]` |
| `src/charts/perItem.ts` | New | Chart.js line chart, one series per item |
| `src/charts/aggregate.ts` | New | Chart.js line chart, summed by hour-slot + tariff annotation |
| `src/components/ItemCard.ts` | New | Name input, Consumo drop zone (active), Potencia drop zone (disabled) |
| `src/components/Calendar.ts` | New | Day-grid picker derived from union of all item dates |
| `src/components/ChartPanel.ts` | New | Canvas wrapper + chart instance lifecycle |
| `src/constants/tariff.ts` | New | `TARIFF_2_0TD` band definitions exported as const |
| `src/styles/main.css` | New | Layout, color tokens for tariff bands and per-item series |
| `localStorage` | New keys | `tapo_items` (registry JSON), `tapo_data_{itemId}` (parsed records JSON) |
| `test-data/` | Read-only reference | Used during manual QA; not bundled |

---

## Tech stack decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Excel parsing | SheetJS (`xlsx`) | Only browser library that handles BIFF8/OLE2 (confirmed format from exploration); lazy-loaded on first drop to defer ~900 KB cost |
| Charting | Chart.js 4 + `chartjs-plugin-annotation` | Lightweight canvas chart; annotation plugin provides tariff-band background rectangles matching reference image |
| Build | Vite + TypeScript | Fast HMR, native ESM, `vite build` → static `dist/`; no framework dependency |
| State | localStorage (parsed JSON) | ~6 KB per item file; 20 items ≈ 120 KB — well within 5 MB cap; no backend required |
| Framework | Vanilla TypeScript | Keeps bundle minimal; no React/Vue dependency |
| Drag-and-drop | Native HTML5 `ondrop` + `FileReader.readAsArrayBuffer` | No extra library needed |

---

## Data flow

```
User drops "Consumo de energía.xls"
  └─ FileReader.readAsArrayBuffer
       └─ SheetJS XLSX.read(buffer)
            └─ sheet_to_json(wb.Sheets['Día'], { header: 1 })
                 └─ consumo.ts: validate header → parse rows → HourlyRecord[]
                      └─ store/items.ts: persist to localStorage["tapo_data_{id}"]
                           └─ Calendar: recompute union of dates → re-render day grid
                                └─ On day select:
                                     ├─ Chart 1: filter records by date → one series per item
                                     └─ Chart 2: sum kWh by hour across items → single series + tariff bands
```

`HourlyRecord` shape:
```typescript
interface HourlyRecord {
  date: string;   // "YYYY/MM/DD"
  hour: number;   // 0–23
  kWh: number;
}
```

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| SheetJS cannot parse a specific Tapo export variant | Medium | Test against both `boiler/` and `cuarto-1/` files during build; display descriptive parse error to user on failure |
| SheetJS bundle size (~900 KB) blocks initial load | Low | Dynamic `import()` on first file drop; spinner shown during load |
| localStorage quota exceeded (many items) | Low | ~6 KB per item; cap becomes visible only beyond ~800 items; add a quota-exceeded error handler with a user-visible message |
| User drops Potencia file onto the Consumo slot | Low | Validate header after parsing: column must contain `"Consumo de energía(kWh)"`; reject with toast notification and clear the drop zone |
| 0-fill for missing item-days distorts aggregate visually | Low | Tooltip per data point will show which items contributed; items with no data are listed as "—" in the tooltip |
| Two charts + calendar on narrow viewport | Low | CSS Grid responsive breakpoint: below 768 px, calendar collapses to a horizontal scrollable row above the charts |
| Tariff band boundaries change (regulatory update) | Low | `TARIFF_2_0TD` is a single exported constant in `src/constants/tariff.ts`; updating requires one file edit, no chart-code changes |
| Chart color collisions for many items | Low | Generate colors from a deterministic HSL palette; up to 12 distinct hues before recycling; document limit in UI |

---

## Rollback

This is a greenfield project. Rollback means:

1. Delete the repository or revert to the empty state (`git revert` / branch deletion).
2. No database migrations, no backend services, and no external API keys to revoke.
3. localStorage data is scoped to the user's browser; clearing browser storage removes all persisted item data.

---

## Success criteria

The proposal is considered implemented when all of the following are verifiable:

- [ ] `vite build` completes without errors; `dist/index.html` opens in a browser with no console errors.
- [ ] A user can add at least two items with distinct names.
- [ ] Dropping `test-data/boiler/Consumo de energía.xls` onto item 1 and `test-data/cuarto-1/Consumo de energía (1).xls` onto item 2 parses without error.
- [ ] The calendar renders all days from both files (union); both items' day ranges appear as selectable day buttons.
- [ ] Selecting a day renders Chart 1 with two colored lines (one per item); item with no data for that day shows a flat 0 line.
- [ ] Selecting a day renders Chart 2 with one summed line and six tariff-band background regions matching the Spanish 2.0TD schedule.
- [ ] Chart 2 visually matches the layout of `image.png`: x-axis labels `00-01h` … `23-24h`, circular markers on each data point, blue line color, tariff-band alternating shading.
- [ ] The "Potencia(W)" drop zone is visible on each item card but is disabled / shows "coming soon" copy; dropping a file onto it has no effect.
- [ ] Refreshing the page restores the item registry and parsed data without re-uploading files.
- [ ] Per-item re-upload button replaces stored data with a newly dropped file.
- [ ] Dropping a wrong file (e.g., Potencia file on the Consumo slot) shows a visible error and does not corrupt stored data.
- [ ] Layout is usable on a 375 px wide viewport (mobile): calendar scrolls horizontally, charts stack vertically.
- [ ] No network requests are made at runtime (confirmed via browser DevTools Network tab — 0 external calls after initial page load).

---

## Delivery strategy (chained PRs)

The implementation spans multiple independent work units, each expected to exceed
400 changed lines in total. Per the chained-PR skill, work is split into a
**Feature Branch Chain** with a no-merge tracker:

| PR | Branch | Scope |
|----|--------|-------|
| Tracker (draft) | `feat/tapo-dashboard` | Umbrella — no-merge until all children land |
| PR 1 | `feat/tapo-dashboard/scaffold` | Vite + TS project scaffold, `index.html`, `vite.config.ts`, `main.css` skeleton, `TARIFF_2_0TD` constant |
| PR 2 | `feat/tapo-dashboard/parser-store` | SheetJS integration, `consumo.ts` parser, `store/items.ts` localStorage layer |
| PR 3 | `feat/tapo-dashboard/ui-components` | `ItemCard`, `Calendar`, `ChartPanel` components; drag-and-drop wiring |
| PR 4 | `feat/tapo-dashboard/charts` | `perItem.ts` and `aggregate.ts` chart implementations with annotation bands |
| PR 5 | `feat/tapo-dashboard/polish` | Responsive layout, error toasts, disabled Potencia slot, accessibility pass |

Each child PR targets the immediately preceding child branch; PR 5 merges into the tracker; tracker merges into `main` after all reviews pass.

---

## References

- `openspec/changes/tapo-consumption-dashboard/exploration.md` — ground-truth findings on Excel format, reference image analysis, and tech options
- `image.png` — reference chart design ("kWh – días" Endesa-style view)
- `test-data/boiler/` and `test-data/cuarto-1/` — real Tapo `.xls` exports for manual QA
- Spanish 2.0TD tariff schedule — [CNMC public reference](https://www.cnmc.es/)
