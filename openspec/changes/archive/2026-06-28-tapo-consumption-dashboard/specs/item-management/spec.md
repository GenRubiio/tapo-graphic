# Item Management Specification

## Purpose

Define the lifecycle of named "Tapo" items in the dashboard. An item represents one Tapo
smart plug. The user registers, renames, and deletes items; each item exposes two file
drop zones (an active "Consumo de energía" zone and a disabled "Potencia" zone reserved
for v2). The item registry and the parsed records persist in localStorage so data survives
a page refresh without re-uploading.

## Requirements

### Requirement: Item registration

The system MUST allow the user to register one or more items, with no enforced upper limit
in v1. Each registered item MUST have a unique internal identifier and an editable display
name. The system MUST support more than one item simultaneously so that the per-item and
aggregate charts can compare plugs.

#### Scenario: Register the first item

- GIVEN an empty dashboard with no registered items
- WHEN the user adds a new item
- THEN a new item card appears with a unique id and a default editable name
- AND the item is written to the localStorage registry key `tapo_items`

#### Scenario: Register multiple items

- GIVEN one item is already registered
- WHEN the user adds a second item
- THEN both items are listed independently
- AND each item has a distinct internal id

#### Scenario: No item-count cap in v1

- GIVEN any number of already-registered items
- WHEN the user adds another item
- THEN registration MUST succeed (no hard cap is enforced)
- AND the system MAY show a soft readability warning when the count exceeds 10 items

### Requirement: Item renaming

The system MUST allow the user to rename any item. The new name MUST persist to the
localStorage registry. The name MUST be the label used for that item's chart series and
legend entry.

#### Scenario: Rename an item

- GIVEN an item named with its default name
- WHEN the user edits the name to "Tapo Boiler"
- THEN the displayed item name updates to "Tapo Boiler"
- AND the registry in `tapo_items` reflects the new name after the edit

#### Scenario: Renamed item label propagates to charts

- GIVEN an item with parsed data rendered in the per-item chart
- WHEN the user renames the item
- THEN the chart legend entry for that item's series MUST update to the new name

### Requirement: Item deletion

The system MUST allow the user to delete any item. Deletion MUST remove the item from the
registry AND remove its parsed-records entry from localStorage. After deletion, the calendar
and both charts MUST recompute to exclude the deleted item.

#### Scenario: Delete an item with data

- GIVEN two items each with parsed data
- WHEN the user deletes the first item
- THEN the first item card is removed
- AND the localStorage keys `tapo_items` and `tapo_data_{deletedId}` no longer contain that item
- AND the calendar union and both charts recompute from the remaining item only

#### Scenario: Delete the last remaining item

- GIVEN a single registered item
- WHEN the user deletes it
- THEN the dashboard returns to the empty state with no selectable days and empty-data chart states

### Requirement: Per-item file drop zones

Each item card MUST present exactly two drop zones: a "Consumo de energía" zone that is
active in v1, and a "Potencia" zone that is visible but disabled and labelled as
coming-soon. Dropping a file on the disabled "Potencia" zone MUST have no effect.

#### Scenario: Two zones rendered per card

- GIVEN a registered item
- WHEN its card renders
- THEN exactly two drop zones are visible: an active "Consumo de energía" zone and a disabled "Potencia" zone

#### Scenario: Potencia zone is inert in v1

- GIVEN an item card with a disabled "Potencia" zone showing coming-soon copy
- WHEN the user drops any file onto the "Potencia" zone
- THEN no file is read or parsed
- AND no item data is changed and no error is shown

### Requirement: Per-item re-upload

The system MUST provide a per-item action to replace the stored "Consumo de energía"
records by dropping or selecting a new file. A successful re-upload MUST overwrite the
previous parsed records for that item only.

#### Scenario: Re-upload replaces stored data

- GIVEN an item that already has parsed records stored
- WHEN the user re-uploads a valid "Consumo de energía" file to that item
- THEN the new parsed records replace the prior records under `tapo_data_{itemId}`
- AND no other item's data is modified

#### Scenario: Failed re-upload preserves prior data

- GIVEN an item that already has parsed records stored
- WHEN the user drops an invalid file during re-upload
- THEN the prior stored records for that item MUST remain unchanged
- AND a visible error is shown (see excel-ingestion validation)

### Requirement: localStorage persistence and restoration

The system MUST persist the item registry under `tapo_items` and each item's parsed
`HourlyRecord[]` under `tapo_data_{itemId}`. On page load, the system MUST restore the
registry and parsed records without requiring re-upload. The system MUST NOT store raw
binary `.xls` file contents in localStorage; only parsed JSON records are stored.

#### Scenario: State survives refresh

- GIVEN two items with parsed records persisted to localStorage
- WHEN the user refreshes the page
- THEN both items reappear with their names
- AND their parsed records are restored so the calendar and charts render without re-uploading

#### Scenario: Only parsed JSON persisted

- GIVEN a successful "Consumo de energía" upload
- WHEN the system persists the result
- THEN only the parsed `HourlyRecord[]` JSON is written, not the raw `.xls` binary

### Requirement: localStorage quota handling

When a write to localStorage fails because the storage quota is exceeded, the system MUST
catch the failure, show a user-visible error message, and MUST NOT silently corrupt or
partially write the existing registry or parsed-records entries.

#### Scenario: Quota exceeded on save

- GIVEN localStorage is at or near its quota
- WHEN a persistence write throws a quota-exceeded error
- THEN the system catches the error and shows a visible message to the user
- AND previously persisted registry and item data remain readable and uncorrupted

## Acceptance Criteria

- [ ] A user can register at least two items, each with a distinct id and an editable name.
- [ ] Renaming an item persists to `tapo_items` and updates the corresponding chart legend label.
- [ ] Deleting an item removes `tapo_items` membership and the `tapo_data_{itemId}` entry, and recomputes the calendar and both charts.
- [ ] Each item card shows an active "Consumo de energía" drop zone and a disabled "Potencia" zone with coming-soon copy.
- [ ] Dropping any file on the disabled "Potencia" zone does nothing.
- [ ] Per-item re-upload overwrites only that item's records; a failed re-upload preserves prior data.
- [ ] After a page refresh, the registry and parsed records restore without re-uploading.
- [ ] Only parsed JSON (not raw `.xls` binary) is written to localStorage.
- [ ] A localStorage quota-exceeded error produces a visible message and does not corrupt existing data.
