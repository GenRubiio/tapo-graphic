# Excel Ingestion Specification

## Purpose

Define how the dashboard ingests a Tapo "Consumo de energía" Excel export. Files are binary
BIFF8/OLE2 (CDFV2) `.xls` workbooks. The system reads them client-side via SheetJS, reads the
`Día` sheet, validates that the file is a Consumo export, and produces a normalized
`HourlyRecord[]`. Wrong files (e.g. a "Potencia" export or a non-Tapo file) dropped on the
Consumo zone MUST be rejected with a user-visible error.

## Requirements

### Requirement: Drag-and-drop binary ingestion

The system MUST accept a `.xls` file dropped on an item's "Consumo de energía" zone, read it
as an ArrayBuffer in the browser, and parse it with SheetJS. No network upload of the file
MUST occur — parsing is fully client-side.

#### Scenario: Drop a valid Consumo file

- GIVEN an item with an active "Consumo de energía" zone
- WHEN the user drops a valid "Consumo de energía*.xls" file
- THEN the file is read as an ArrayBuffer and parsed via SheetJS in the browser
- AND no network request is made to transmit the file

#### Scenario: Binary BIFF8/OLE2 workbook is parsed

- GIVEN a genuine binary Tapo `.xls` export (BIFF8/CDFV2 compound document)
- WHEN it is parsed
- THEN SheetJS MUST successfully open the workbook without converting it as HTML

### Requirement: Read the "Día" sheet

The system MUST read the worksheet named `Día` from the workbook. The Consumo workbook is
known to contain sheets `Día`, `Mes`, and `Año`; only `Día` is read in v1. If the `Día`
sheet is missing, the system MUST reject the file with a user-visible error.

#### Scenario: Día sheet present

- GIVEN a Consumo workbook containing the sheet `Día`
- WHEN it is parsed
- THEN rows are read from the `Día` sheet via header-array extraction

#### Scenario: Día sheet missing

- GIVEN a workbook with no `Día` sheet
- WHEN it is parsed
- THEN the file is rejected with a visible error and no records are stored

### Requirement: Header validation

After reading the `Día` sheet, the system MUST validate that the header row contains a column
whose name contains the exact string `"Consumo de energía(kWh)"`. If the header does not
contain this string, the system MUST reject the file as the wrong type, show a user-visible
error (toast), clear the drop zone, and MUST NOT overwrite any previously stored data for the
item.

#### Scenario: Header contains the Consumo column

- GIVEN a `Día` sheet whose header row contains `"Consumo de energía(kWh)"`
- WHEN validation runs
- THEN the file is accepted and parsing continues

#### Scenario: Potencia file dropped on the Consumo zone

- GIVEN the user drops a "Potencia*.xls" file (header contains `"Potencia(W)"`, not `"Consumo de energía(kWh)"`) onto the Consumo zone
- WHEN validation runs
- THEN the file is rejected with a visible toast error
- AND any previously stored records for the item remain unchanged

#### Scenario: Non-Tapo file dropped on the Consumo zone

- GIVEN the user drops an unrelated `.xls` file that has neither a `Día` sheet nor the `"Consumo de energía(kWh)"` header
- WHEN validation runs
- THEN the file is rejected with a visible error and no records are stored

### Requirement: HourlyRecord normalization

For each data row after the header, the system MUST parse the timestamp string of the form
`YYYY/MM/DD HH:00:00` and the numeric kWh value into a normalized record. Each record MUST
expose the original timestamp, an ISO/date portion, the integer hour in the range 0 through 23,
and the kWh value as a number. The system MUST produce a `HourlyRecord[]` for the file.

#### Scenario: Parse a data row

- GIVEN a `Día` data row `["2026/06/01 09:00:00", 0.123]`
- WHEN it is normalized
- THEN a record is produced with the date portion `2026/06/01`, hour `9`, and kWh `0.123`

#### Scenario: Hour extracted from top-of-hour timestamp

- GIVEN timestamps are always at the top of the hour (`HH:00:00`)
- WHEN normalization runs
- THEN each record's hour is the integer `HH` in the range 0–23

#### Scenario: Empty data file

- GIVEN a valid Consumo workbook with a `Día` sheet header but no data rows
- WHEN parsing completes
- THEN an empty `HourlyRecord[]` is produced and no error is raised
- AND the item is treated as having no days (see calendar empty-data handling)

### Requirement: Duplicate-timestamp handling

When two data rows resolve to the same `(date, hour)` for a single item, the system MUST apply
a single deterministic rule (sum the kWh of duplicate `(date, hour)` rows) so that the same
hour bucket is not double-counted ambiguously. The chosen rule MUST be applied consistently.

#### Scenario: Two rows with the same date and hour

- GIVEN two rows `["2026/06/01 09:00:00", 0.4]` and `["2026/06/01 09:00:00", 0.6]` in one file
- WHEN normalization runs
- THEN the item exposes a single value of `1.0` kWh for `2026/06/01` hour `9`
- AND no `(date, hour)` bucket is double-counted ambiguously

### Requirement: Parse-failure reporting

When SheetJS fails to open the workbook or a row cannot be parsed into a valid number, the
system MUST surface a descriptive, user-visible error and MUST NOT corrupt previously stored
data for the item.

#### Scenario: SheetJS cannot read the file

- GIVEN a corrupt or unsupported file dropped on the Consumo zone
- WHEN SheetJS throws during read
- THEN the system shows a descriptive error to the user
- AND prior stored records for the item remain unchanged

## Acceptance Criteria

- [ ] Dropping a valid "Consumo de energía*.xls" file parses it client-side via SheetJS with no network upload.
- [ ] The `Día` sheet is read; a missing `Día` sheet is rejected with a visible error.
- [ ] A file whose header lacks `"Consumo de energía(kWh)"` is rejected with a toast, the zone is cleared, and prior data is preserved.
- [ ] A "Potencia*.xls" file dropped on the Consumo zone is rejected.
- [ ] Each data row `YYYY/MM/DD HH:00:00` yields a `HourlyRecord` with date, hour (0–23), and numeric kWh.
- [ ] A valid file with a header but zero data rows yields an empty `HourlyRecord[]` and no error.
- [ ] Duplicate `(date, hour)` rows are combined by a single deterministic rule (sum) without ambiguous double counting.
- [ ] SheetJS read failures and unparsable rows produce a descriptive error and never corrupt stored data.
