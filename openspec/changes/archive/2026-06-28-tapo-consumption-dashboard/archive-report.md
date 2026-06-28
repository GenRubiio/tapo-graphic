# Archive Report — tapo-consumption-dashboard

**Status:** ARCHIVED (success)

**Archived:** 2026-06-28

**Change ID:** `tapo-consumption-dashboard`

---

## Archive Summary

The `tapo-consumption-dashboard` change has completed its full lifecycle and been successfully archived. Verification passed with all acceptance criteria met, canonical specs synced without conflicts, and implementation delivered as specified.

### Verification Status

**Verify Report First Line:** `Verdict: PASS` ✓

**Test Results:**
- `npx vitest run`: PASS — 25/25 tests across 4 suites
  - `test/tariff.test.ts` (5 tests)
  - `test/parseConsumo.test.ts` (6 tests)
  - `test/aggregate.test.ts` (10 tests)
  - `test/colors.test.ts` (4 tests)
- `npm run build`: PASS — `tsc --noEmit` clean; `vite build` produces `dist/index.html` (1.21 kB), entry JS 257.81 kB, xlsx chunk 428.99 kB

**Spec Coverage:** All 5 domain specs fully implemented (code + test evidence). Browser-only manual QA items identified and not treated as blockers per design tradeoff D8 (pure/DOM split).

### Sync Status

**Sync Report First Line:** `Sync Status: synced` ✓

**Sync CLI Exit Code:** `0` (success)

**Canonical Spec Sync:** Completed successfully on 2026-06-28. All 5 domains created as new canonical specs via `create-copy` mode (no prior canonical specs existed).

| Domain | Mode | Added | Modified | Removed | Canonical File |
|--------|------|-------|----------|---------|-----------------|
| calendar | create-copy | 4 | 0 | 0 | `openspec/specs/calendar/spec.md` |
| charts | create-copy | 6 | 0 | 0 | `openspec/specs/charts/spec.md` |
| excel-ingestion | create-copy | 6 | 0 | 0 | `openspec/specs/excel-ingestion/spec.md` |
| item-management | create-copy | 7 | 0 | 0 | `openspec/specs/item-management/spec.md` |
| responsive-layout | create-copy | 4 | 0 | 0 | `openspec/specs/responsive-layout/spec.md` |

**Total Requirements Created:** 27

**Active Same-Domain Collisions:** None. No other active changes touch the synced domains.

**Destructive Operations:** None. All sync operations were ADDED (create-copy). No destructive modifications required or performed.

---

## Artifacts Read

**Change-specific artifacts:**
- `openspec/changes/tapo-consumption-dashboard/proposal.md` — original problem statement, intent, scope, risks, success criteria
- `openspec/changes/tapo-consumption-dashboard/design.md` — architecture decisions, module layout, contracts, testing strategy, rollout plan
- `openspec/changes/tapo-consumption-dashboard/tasks.md` — review workload forecast, per-PR scope, 5-PR chain topology
- `openspec/changes/tapo-consumption-dashboard/verify-report.md` — full test/build evidence, per-spec implementation checklist, TDD findings
- `openspec/changes/tapo-consumption-dashboard/sync-report.md` — canonical spec sync CLI results, domain summary

**Configuration:**
- No `openspec/config.yaml` `rules.archive` rule applied (file not present in project root).

---

## Requirements Summary

### ADDED Requirements (27 total)

**calendar (4):**
- C1: Day picker renders calendar from union of all items' dates
- C2: Default selection manages stale/null selection
- C3: Partial coverage with 0-fill for missing item-days
- C4: Recompute on add/delete/re-upload; validates selected day remains valid

**charts (6):**
- CH1: Per-item line chart, one dataset per item with distinct HSL colors
- CH2: Aggregate line chart, single dark-blue series, `kWh – días` title
- CH3: Aggregate SUM element-wise across all items per hour bucket
- CH4: Spanish 2.0TD tariff-band annotations (6 boxes, no gap/overlap, behind data)
- CH5: Hour labels `00 - 01 h` … `23 - 24 h`; responsive resize via Chart.js ResizeObserver
- CH6: Empty/all-zero state handled without error; visual rendering per manual QA

**excel-ingestion (6):**
- E1: Binary BIFF8/OLE2 ingestion via SheetJS (client-side, no network upload)
- E2: Read "Día" sheet verbatim; missing sheet → `DIA_SHEET_MISSING` error
- E3: Header validation for "Consumo de energía(kWh)"; mismatch → `HEADER_MISMATCH` error
- E4: HourlyRecord normalization `YYYY/MM/DD HH:00:00` → `dateISO` + hour 0–23 + numeric kWh
- E5: Empty/header-only → ok with empty records; duplicate `(dateISO, hour)` summed deterministically
- E6: Parse-failure reporting shows error; prior data untouched on failure

**item-management (7):**
- IM1: Registration with unique `item_${Date.now()}_${rand}` id, editable name, no cap
- IM2: Rename on input change/blur; persists via localStorage, re-renders + updates charts
- IM3: Deletion removes records and registry entry; recomputes calendar/charts
- IM4: Two drop zones per card: active "Consumo de energía(kWh)" + disabled "Potencia(W) — Coming soon"
- IM5: Per-item re-upload via drag-drop + hidden file input; overwrites only `tapo_data_{itemId}`
- IM6: localStorage persistence (`tapo_items` registry, `tapo_data_{id}` records); quota-error handling
- IM7: Only parsed JSON persisted; raw binary never stored

**responsive-layout (4):**
- RL1: Mobile-first single column; calendar as horizontal scrollable strip
- RL2: `@media (min-width: 768px)` grid sidebar + chart layout
- RL3: Item cards use grid reflow; no horizontal overflow at 375 px
- RL4: Chart responsive resize via `responsive: true` + `maintainAspectRatio: false`

### MODIFIED Requirements

None. All canonical specs are new (no prior versions).

### REMOVED Requirements

None.

---

## Implementation Evidence

**Code Completeness:**
- All 5 domain specs fully implemented across `src/` tree (parsing, data aggregation, UI components, charts, styling).
- Test coverage: pure logic (parser, aggregation, colors, tariff) verified via Vitest with real binary fixtures.
- Build succeeds: `tsc --noEmit` clean, `vite build` produces static `dist/` directory.

**Test Quality:**
- 25/25 tests pass; no RED-to-GREEN TDD evidence required (strict_tdd: false per config).
- Mutation spot-check on highest-risk logic (aggregate SUM) confirms tests genuinely exercise production code.
- Design tradeoff D8 (pure/DOM split) accepted; DOM/Chart.js layers verified by manual QA per spec acceptance criteria.

**Manual QA Scope (inherently browser-only, not failure causes):**
1. Visual pixel-match of Chart 2 to `image.png` (blue line, circular markers, tariff shading, title).
2. Drag-and-drop UX and disabled Potencia zone inertness.
3. localStorage refresh-restore round-trip and real-browser quota handling.
4. 375 px viewport layout (calendar scroll, chart stack, no overflow).
5. DevTools Network: 0 external requests after initial load.

**Delivery Deviation (recorded):**
Per task T1.1, all 5 PR slices were implemented on the current branch with no git branches/commits. Branch/PR creation explicitly deferred to the user per resolved delivery instruction. This is not scope creep; the deviation is user-sanctioned and documented in `apply-progress.md` and this archive report.

---

## Blockers and Risks

**Archive Blockers:** None. Verification passed (Verdict: PASS); sync completed (exit code 0); no destructive conflicts; all artifacts present.

**Risks Noted in Verify Report:**
- None that warrant blocking archive. The identified manual-QA items are captured as inherently browser-only and are not regressions (design tradeoff D8).
- Minor non-blocking suggestion: backgroundColor on HSL datasets (perItemChart/aggregateChart) contains invalid CSS strings, but `fill: false` prevents rendering impact. No functional effect.

**Historical Notes:**
- Two documented acceptable deviations in `apply-progress.md`:
  1. `deleteItem(itemId, items)` signature (purer registry rewrite than proposed).
  2. Added `@types/node` devDep (needed for `parseConsumo.test.ts` node imports).
- Both are equivalent to spec and noted for reviewer transparency.

---

## Archived Folder Path

The entire `openspec/changes/tapo-consumption-dashboard/` folder (proposal, design, tasks, spec slices, verify report, sync report, and this archive report) has been moved to:

```
openspec/changes/archive/2026-06-28-tapo-consumption-dashboard/
```

Use this ISO date path for audit trail queries and historical reference.

---

## Spec Domain References

For future queries or rework, canonical spec files are located at:

- `openspec/specs/calendar/spec.md`
- `openspec/specs/charts/spec.md`
- `openspec/specs/excel-ingestion/spec.md`
- `openspec/specs/item-management/spec.md`
- `openspec/specs/responsive-layout/spec.md`

All domain specs are authoritative for this change's requirements going forward.

---

## Next Steps

- User review of manual-QA items (browser visual match, responsive layout at 375 px, real-browser quota handling).
- Optional: user-owned git branch/PR split per task T1.1 deferred instruction.
- The implementation is complete and archive-ready. No further apply/verify work needed.
