# Responsive Layout Specification

## Purpose

Define the mobile-first responsive layout of the dashboard. Item cards, the calendar day
picker, and the two charts MUST adapt to the viewport. On wide viewports the layout uses a
calendar/sidebar plus a chart area; on narrow viewports the content stacks vertically and the
calendar becomes horizontally scrollable.

## Requirements

### Requirement: Mobile-first responsive layout

The layout MUST be usable on a narrow mobile viewport (at least as small as 375 px wide) and
MUST scale up to wider viewports. Content MUST NOT overflow horizontally or clip at the
supported minimum width.

#### Scenario: Narrow mobile viewport

- GIVEN a 375 px wide viewport
- WHEN the dashboard renders
- THEN item cards, the calendar, and both charts are usable
- AND the calendar scrolls horizontally and the charts stack vertically
- AND no content is clipped or overflows the viewport

#### Scenario: Wide viewport layout

- GIVEN a wide desktop viewport
- WHEN the dashboard renders
- THEN the layout presents a calendar/sidebar area alongside the chart area

### Requirement: Responsive breakpoint behavior

The layout MUST switch between the stacked mobile arrangement and the wider arrangement at a
defined breakpoint (below 768 px collapses the calendar to a horizontal scrollable row above
the charts). The two charts MUST stack vertically on narrow viewports.

#### Scenario: Below the breakpoint

- GIVEN a viewport narrower than 768 px
- WHEN the dashboard renders
- THEN the calendar collapses to a horizontally scrollable row above the charts
- AND the two charts are stacked vertically

#### Scenario: At or above the breakpoint

- GIVEN a viewport at or above 768 px
- WHEN the dashboard renders
- THEN the calendar and chart area use the side-by-side arrangement

### Requirement: Adaptive item cards

Item cards MUST reflow to the available width so the name field and the two drop zones remain
usable across viewport sizes.

#### Scenario: Cards reflow on narrow viewport

- GIVEN multiple item cards on a narrow viewport
- WHEN the dashboard renders
- THEN the cards reflow to fit the width with the name field and both drop zones still usable

### Requirement: Charts resize with layout

When the layout changes (breakpoint crossing or container resize), the charts MUST redraw to
fit their new container, consistent with the charts domain responsive-resize requirement.

#### Scenario: Chart redraw on layout change

- GIVEN rendered charts
- WHEN the viewport crosses the breakpoint or the container resizes
- THEN the charts redraw to fit the new container without overflow

## Acceptance Criteria

- [ ] The dashboard is usable at 375 px wide: calendar scrolls horizontally, charts stack vertically, nothing clips.
- [ ] On wide viewports the layout uses a calendar/sidebar plus chart area arrangement.
- [ ] Below 768 px the calendar collapses to a horizontal scrollable row above the charts and charts stack vertically.
- [ ] Item cards reflow to the available width with name field and both drop zones usable.
- [ ] Charts redraw to fit their container on breakpoint crossing or container resize.
