# Exploration: tapo-consumption-dashboard

Client-side-only energy monitoring dashboard that reads binary Tapo Excel exports, renders per-item and aggregated consumption charts, and requires zero backend.

## Quick summary

| Area | Finding |
|------|---------|
| Greenfield? | Yes — only `test-data/` and `image.png` exist |
| Excel format | Binary BIFF8/CDFV2 `.xls` — must use SheetJS (`xlsx`) in browser |
| "Consumo de energía" sheet | Sheet `Día`: hourly kWh, ~155 rows, spans ~6-7 days |
| "Potencia" sheet | Sheet `Día`: 5-minute Watts, ~289 rows, spans ~1 day |
| Chart target | Endesa-style "kWh – días" — 24 hour-slots on x-axis, smooth line + markers, tariff-band shading |
| Persistence | localStorage (no backend) |
| Build tooling | Vite + TypeScript recommended |
| Charting | Chart.js (lightweight, canvas, low bundle cost) |

---

## 1. Tapo Excel data format — ground-truth findings

### File inventory (confirmed in `test-data/`)

```
test-data/
  boiler/
    Consumo de energía.xls     (binary, ~verified by read-tool rejection = CDFV2/BIFF)
    Potencia.xls               (binary, same reason)
  cuarto-1/
    Consumo de energía (1).xls
    Potencia (1).xls
```

Both items follow the same two-file pattern. The read tool returned `binary file` errors for all four `.xls` files — this confirms they are genuine BIFF/OLE2 compound documents, NOT HTML-disguised-as-xls. openpyxl and xlrd (BIFF5-only) would fail; SheetJS handles BIFF8/CDFV2 correctly.

### "Consumo de energía\*.xls" workbook

| Property | Value |
|----------|-------|
| Sheets present | `Día`, `Mes`, `Año` |
| Sheet of interest | `Día` |
| Row 0 (header) | `["YYYY/MM/DD HH:00:00 - YYYY/MM/DD HH:MM:SS", "Consumo de energía(kWh)"]` |
| Data rows | `["YYYY/MM/DD HH:00:00", <number>]` |
| Granularity | 1 hour per row |
| Day span | ~6-7 days (~155 data rows) |
| Time string pattern | `YYYY/MM/DD HH:00:00` — always at the top of the hour |

Parsing approach: read all rows after row 0 from sheet `Día`. Split timestamp string on space to extract date (`YYYY/MM/DD`) and hour (`HH`). Group by date to build the calendar. For chart 1 (per-item over time), key is `(date, hour)`. For chart 2 (Endesa aggregate), bucket only by `hour` and sum across all items and all days.

### "Potencia\*.xls" workbook

| Property | Value |
|----------|-------|
| Sheets present | `Día`, `Semana` |
| Sheet of interest | `Día` |
| Row 0 (header) | `[<range string>, "Potencia(W)"]` |
| Data rows | `["YYYY/MM/DD HH:MM:00", <number>]` |
| Granularity | 5 minutes per row |
| Day span | ~1 day (~289 rows) |
| Time string pattern | `YYYY/MM/DD HH:MM:00` |

The Potencia sheet covers far less time than Consumo de energía (1 day vs 6-7 days) and at finer granularity (5 min vs 1 hour). The two files serve different purposes and cannot be directly merged without resampling. See Risks section.

---

## 2. Reference image analysis (`image.png`)

Confirmed visual characteristics:

| Element | Description |
|---------|-------------|
| Chart title (top-left) | `kWh – días` (blue text) |
| Total label (top-right) | `Total consumida 14,957 kWh` (blue text) |
| X-axis | 24 hour-slots: `00-01h`, `01-02h`, … `23-24h` |
| Y-axis | kWh with labels `0,0 kWh`, `0,8 kWh`, `1,6 kWh`, `2,4 kWh`, `3,2 kWh` |
| Line style | Smooth curve with filled circular markers at each data point |
| Tariff bands | Alternating background bands: light blue / medium grey / light blue / medium grey … (Spanish electricity tariff periods P1/P2/P3) |
| Navigation | Left/right arrows (`<` `>`) for day navigation |
| Color | Single dark blue line — this is a single-item or single-day view |

Design notes for implementation:
- The chart is per-day, showing summed kWh per hour slot across all items (or per item in the per-item chart).
- The tariff-band shading uses approx. Spanish 2.0TD schedule: valley (00-08h), peak (08-10h), flat (10-14h), peak (14-18h), flat (18-22h), valley (22-24h) — the exact band boundaries should be configurable or at minimum hardcoded to the observed pattern.
- Markers on every data point are mandatory per the reference.
- Navigation arrows suggest a calendar-date picker to move between days.

---

## 3. Tech options — client-side only

### Excel parsing

**SheetJS (`xlsx` npm package)** — the only viable browser choice.

```
XLSX.read(arrayBuffer, { type: 'array' })
// then:
const sheet = wb.Sheets['Día']
const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1 })
```

SheetJS handles CDFV2/OLE2 compound files (BIFF8), which is what Tapo exports. The library is ~900 KB minified but tree-shaking with the `xlsx/dist/xlsx.mini.min.js` bundle is available to reduce size.

### Charting

| Library | Bundle | Canvas/SVG | Verdict |
|---------|--------|-----------|---------|
| **Chart.js 4** | ~200 KB | Canvas | Best fit — easy line+point, custom plugin for background bands, responsive by default |
| ECharts | ~700 KB | Canvas | Overkill; stronger for large datasets |
| Recharts | ~400 KB + React | SVG | React dependency adds weight; SVG slower for many points |
| uPlot | ~40 KB | Canvas | Minimal API, harder to customise band shading |

**Recommendation: Chart.js 4** with `chartjs-plugin-annotation` for tariff-band background rectangles.

### Build tooling

**Vite + TypeScript** — fast HMR, native ESM, zero-config for static output (`vite build` → `dist/`). No backend. Deploy as static files anywhere.

Alternative: plain `index.html` + importmap + CDN — viable but worse DX and no type safety.

### State / persistence

**localStorage** — store the item registry (name + file metadata) as JSON. Actual file binary data should NOT be stored in localStorage (size limits ~5 MB). Options:

1. Store parsed data (JSON arrays of `{date, hour, kWh}`) per item in localStorage — ~acceptable size for 155 rows × 2 items.
2. Re-upload on every session — simpler, no stale-data risk.

Recommended: parse on drop, store parsed JSON in localStorage keyed by item ID. Show a "re-upload" button per item when data is stale/missing.

### Drag-and-drop

Native HTML5 `ondrop` / `FileReader.readAsArrayBuffer` → pass to SheetJS. No extra library needed.

---

## 4. Architecture sketch

```
src/
  main.ts                  — app entry, mounts root component
  store/
    items.ts               — item registry, localStorage serialisation
  parser/
    consumo.ts             — parse "Consumo de energía" Día sheet → HourlyRecord[]
    potencia.ts            — parse "Potencia" Día sheet → MinuteRecord[]
  charts/
    perItem.ts             — Chart.js line chart, one series per item
    aggregate.ts           — Chart.js line chart, summed kWh by hour (Endesa style)
  components/
    ItemCard.tsx / .ts     — name input + two drop zones (Consumo / Potencia)
    Calendar.tsx / .ts     — day picker derived from days present in Consumo data
    ChartPanel.tsx / .ts   — wraps canvas + chart instance
  styles/
    main.css               — responsive grid, tariff band colour tokens
index.html
vite.config.ts
```

Data flow:
1. User creates item → enters name → drops two `.xls` files.
2. App parses both files via SheetJS → `HourlyRecord[]` (Consumo) + `MinuteRecord[]` (Potencia).
3. Parsed data stored in localStorage under item ID.
4. Calendar built from unique dates found in `HourlyRecord[]` of all items (union).
5. User selects a day → Chart 1 renders per-item hourly kWh for that day.
6. Chart 2 renders summed hourly kWh across all items for that day (Endesa-style).

---

## 5. Calendar derivation

From the "Consumo de energía" `Día` sheet, extract all unique date strings (`YYYY/MM/DD` portion of the timestamp). Union across all items. Render as a simple grid of day buttons. Days present in some but not all items still appear — missing-item hours contribute 0 kWh to the aggregate.

---

## 6. Risks and mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Binary `.xls` parsing in browser | Medium | SheetJS is the established solution; CDN/npm bundle confirmed to handle BIFF8. Test against both `boiler` and `cuarto-1` files before shipping. |
| Granularity mismatch: Consumo (1h, ~7 days) vs Potencia (5 min, ~1 day) | Medium | Treat the two files as independent datasets. Potencia is used only for power-over-time chart (if implemented); Consumo is the primary source for kWh charts. Do not attempt to merge/resample unless explicitly required. |
| Items have different day coverage | Low | Use 0-fill for hours/days where an item has no data. Aggregate chart sums whatever is present. |
| localStorage size for parsed JSON | Low | ~155 rows × ~40 bytes ≈ 6 KB per Consumo file. Even 20 items = 120 KB — well within limit. |
| Tariff band boundaries hardcoded | Low | Spanish 2.0TD schedule is public. Make the band config an exported constant so it can be updated without touching chart code. |
| SheetJS bundle size (~900 KB) | Low | Use the `xlsx.mini.min.js` slim build or dynamic import for lazy loading on first file drop. |
| Responsive layout with two charts + calendar | Low | CSS Grid: calendar sidebar + main chart area. Charts use `responsive: true` in Chart.js. Mobile: stack vertically. |
| User uploads wrong file to wrong slot | Low | Read the header row after parsing; validate column name contains `"Consumo de energía(kWh)"` or `"Potencia(W)"` and reject/warn accordingly. |

---

## 7. Open questions for spec phase

1. Should the Potencia (5-min Watts) data drive a separate chart panel, or is it out of scope for v1?
2. Are tariff band colours and boundaries fixed to Spanish 2.0TD, or should they be user-configurable?
3. Should the calendar show only days where ALL items have data, or the union of all days?
4. Is there a maximum number of items, or is the list unbounded?
5. Should item order in charts be user-draggable?
6. Export / share requirement? (PDF, PNG of chart)

---

## Artifacts written

- `openspec/changes/tapo-consumption-dashboard/exploration.md` (this file)
