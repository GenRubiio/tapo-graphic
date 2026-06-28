# Charts Specification

## Purpose

Define the two consumption charts rendered for the selected day. Chart 1 is a per-item line
chart of kWh across the 24 hour-buckets, one distinctly-colored series per item with a legend.
Chart 2 is an aggregate line chart summing kWh across all items per hour-bucket. Both charts
render the Spanish 2.0TD tariff bands as background annotations and match the reference
`image.png` "kWh – días" view (smooth line with point markers, kWh y-axis, hour x-axis labels
like `00 - 01 h`).

## Requirements

### Requirement: Chart 1 — per-item line chart

The system MUST render a line chart for the selected day with one series per item. Each series
MUST plot kWh against the 24 hour-buckets (hours 0–23) of that day. Each item's series MUST use
a distinct color, and the chart MUST include a legend mapping each color to its item name.

#### Scenario: Two items, distinct colored series

- GIVEN two items with data on the selected day
- WHEN Chart 1 renders
- THEN two line series appear, each with a distinct color
- AND the legend lists each item's current name next to its color

#### Scenario: Single item series

- GIVEN exactly one item with data on the selected day
- WHEN Chart 1 renders
- THEN one series is plotted across the 24 hour-buckets with its color and legend entry

#### Scenario: Item with no data plotted as flat 0

- GIVEN an item with no records on the selected day
- WHEN Chart 1 renders
- THEN that item's series is a flat 0 line across all 24 hour-buckets (0-fill)

#### Scenario: Many items color assignment

- GIVEN more than the number of base palette hues of items
- WHEN Chart 1 renders
- THEN colors are assigned deterministically from an HSL palette
- AND the UI documents that distinct hues are limited before recycling

### Requirement: Chart 2 — aggregate line chart

The system MUST render a single-series line chart for the selected day where each hour-bucket
value is the SUM of all items' kWh for that hour (with 0-fill for missing items). The aggregate
MUST equal the arithmetic sum per bucket.

#### Scenario: Aggregate sums items per hour bucket

- GIVEN item TAPO1 has 5 kWh and item TAPO2 has 5 kWh in the `09 - 10 h` bucket of the selected day
- WHEN Chart 2 renders
- THEN the `09 - 10 h` bucket shows 10 kWh

#### Scenario: Aggregate with a missing item

- GIVEN item TAPO1 has 3 kWh in a bucket and item TAPO2 has no data that day
- WHEN Chart 2 renders
- THEN that bucket shows 3 kWh (TAPO2 contributes 0)

### Requirement: Spanish 2.0TD tariff-band annotations

Both charts MUST render the Spanish 2.0TD tariff bands as background annotation regions behind
the data. The bands MUST be: valley `00–08`, peak `08–10`, flat `10–14`, peak `14–18`, flat
`18–22`, valley `22–24`. The band boundaries MUST come from a single hardcoded constant so a
regulatory change requires only that constant edit, with no chart-code change.

#### Scenario: Six bands rendered behind the data

- GIVEN any selected day with data
- WHEN either chart renders
- THEN six background regions are drawn matching valley 00–08, peak 08–10, flat 10–14, peak 14–18, flat 18–22, valley 22–24

#### Scenario: Bands match the reference image

- GIVEN the reference `image.png` "kWh – días" layout
- WHEN Chart 2 renders
- THEN the tariff bands use alternating shading consistent with the reference

#### Scenario: Band boundaries come from a constant

- GIVEN the tariff schedule is defined by a single exported constant
- WHEN a boundary changes
- THEN updating only that constant changes the rendered bands without modifying chart code

### Requirement: Reference-matching visual style

Both charts MUST use a smooth line with circular point markers at each data point, a kWh y-axis,
and an x-axis labelled per hour-bucket in the form `00 - 01 h` through `23 - 24 h`. The visual
layout MUST match the reference `image.png`.

#### Scenario: Markers and axis labels

- GIVEN a chart with data for the selected day
- WHEN it renders
- THEN each data point shows a circular marker on a smooth line
- AND the x-axis labels read `00 - 01 h`, `01 - 02 h`, … `23 - 24 h`
- AND the y-axis is labelled in kWh

### Requirement: Empty / no-data states

When there is no selectable day or no data for the selected day, each chart MUST render a clear
empty-data state rather than an error or a blank canvas.

#### Scenario: No data at all

- GIVEN no item has any parsed records
- WHEN the charts render
- THEN both charts show an empty-data state message

#### Scenario: Selected day all zeros

- GIVEN a selected day where every bucket sums to 0
- WHEN the charts render
- THEN the charts render valid axes and a flat 0 line, not an error

### Requirement: Responsive resize

Both charts MUST resize responsively to their container so they remain usable across viewport
sizes, including a narrow mobile viewport.

#### Scenario: Viewport resize

- GIVEN a rendered chart
- WHEN the browser viewport or container width changes
- THEN the chart redraws to fit the new container without overflow or clipping

## Acceptance Criteria

- [ ] Chart 1 renders one distinctly-colored series per item over the 24 hour-buckets, with a legend showing item names.
- [ ] An item with no data for the selected day appears as a flat 0 line in Chart 1.
- [ ] Chart 2 renders a single series equal to the per-bucket sum across all items (e.g. 5 + 5 = 10 kWh in `09 - 10 h`).
- [ ] Both charts draw six Spanish 2.0TD tariff bands (valley 00–08, peak 08–10, flat 10–14, peak 14–18, flat 18–22, valley 22–24) from a single hardcoded constant.
- [ ] Both charts use a smooth line with circular markers, a kWh y-axis, and x-axis labels in the form `00 - 01 h` … `23 - 24 h`, matching `image.png`.
- [ ] No-data and all-zero-day states render a clear empty/flat state, not an error.
- [ ] Charts resize responsively to their container, including on a narrow mobile viewport.
- [ ] Colors for many items are assigned deterministically from an HSL palette with a documented hue limit.
