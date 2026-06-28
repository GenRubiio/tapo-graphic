# Calendar Specification

## Purpose

Define how the dashboard derives the set of selectable days from parsed item data and how the
day picker drives both charts. The calendar is the union of all distinct days found across all
items' "Consumo de energía" records. Days where some items have no data are still selectable;
missing items contribute 0 kWh (0-fill) on that day.

## Requirements

### Requirement: Day set derived from union of all items

The system MUST compute the set of distinct days as the UNION of the date portions found in
every item's `HourlyRecord[]`. A day MUST appear in the calendar if at least one item has data
for it. The system MUST NOT restrict the calendar to days where all items have data.

#### Scenario: Union across two items with different coverage

- GIVEN item A has days `2026/06/01`–`2026/06/03` and item B has days `2026/06/02`–`2026/06/05`
- WHEN the calendar is derived
- THEN the selectable days are the union `2026/06/01`–`2026/06/05`

#### Scenario: Single item

- GIVEN exactly one item with data
- WHEN the calendar is derived
- THEN the selectable days are exactly that item's distinct days

#### Scenario: No data at all

- GIVEN no item has any parsed records
- WHEN the calendar is derived
- THEN the day set is empty and no day is selectable
- AND both charts show their empty-data state

### Requirement: Day picker UI drives both charts

The system MUST present a day-picker UI listing the derived days. Selecting a day MUST drive
both Chart 1 (per-item) and Chart 2 (aggregate) to render for that day. Exactly one day MUST
be the active selection when at least one day exists.

#### Scenario: Selecting a day updates both charts

- GIVEN a calendar with multiple selectable days
- WHEN the user selects a day
- THEN Chart 1 re-renders for that day's per-item hourly kWh
- AND Chart 2 re-renders for that day's summed hourly kWh

#### Scenario: Default selection when days exist

- GIVEN at least one selectable day after data loads
- WHEN the calendar first renders
- THEN one day is selected by default so the charts are not empty

### Requirement: Partial coverage with 0-fill

For a selected day, items that have no records for that day MUST contribute 0 kWh to that day's
buckets rather than being omitted. This 0-fill MUST apply to the per-item series (flat 0 line)
and to the aggregate sum.

#### Scenario: Item with no data on the selected day

- GIVEN item A has data for `2026/06/01` and item B does not
- WHEN the user selects `2026/06/01`
- THEN item B's per-item series is a flat 0 line across all 24 hour buckets
- AND item B contributes 0 to the aggregate sum for that day

#### Scenario: Recompute on item change

- GIVEN a selected day and rendered charts
- WHEN an item is added, deleted, or re-uploaded
- THEN the calendar day set recomputes from the new union
- AND if the previously selected day no longer exists, a valid day is selected

### Requirement: Day with zero consumption

A day that exists in the union but whose records are all 0 kWh MUST remain selectable and MUST
render valid charts (all hour buckets at 0), not an error or empty state.

#### Scenario: Selected day has only zero values

- GIVEN a day present in the union where every record's kWh is 0
- WHEN the user selects that day
- THEN both charts render with all 24 hour buckets at 0 kWh and no error

## Acceptance Criteria

- [ ] The selectable day set is the union of all items' distinct days; days with partial item coverage are included.
- [ ] With a single item, the calendar shows exactly that item's days.
- [ ] With no parsed data, the day set is empty and both charts show their empty-data state.
- [ ] Selecting a day re-renders both Chart 1 and Chart 2 for that day.
- [ ] When days exist, one day is selected by default so charts are populated on load.
- [ ] Items with no data for the selected day contribute a flat 0 series (Chart 1) and 0 to the sum (Chart 2).
- [ ] Adding, deleting, or re-uploading an item recomputes the day set and reselects a valid day when needed.
- [ ] A day whose records are all 0 kWh remains selectable and renders charts at 0 without error.
