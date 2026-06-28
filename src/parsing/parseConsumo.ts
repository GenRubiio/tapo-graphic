import type { HourlyRecord } from '../types';

export type ParseErrorCode =
  | 'SHEETJS_READ_FAILED' // workbook could not be opened
  | 'DIA_SHEET_MISSING' // no "Día" sheet
  | 'HEADER_MISMATCH' // header lacks "Consumo de energía(kWh)"
  | 'ROW_PARSE_FAILED'; // a value/timestamp could not be parsed

export interface ParseError {
  ok: false;
  code: ParseErrorCode;
  /** User-facing message (already copy-ready). */
  message: string;
}

export interface ParseOk {
  ok: true;
  records: HourlyRecord[];
}

export type ParseResult = ParseOk | ParseError;

/** Exact domain term that MUST appear in the Consumo header. */
const CONSUMO_HEADER_TERM = 'Consumo de energía(kWh)';
/** Worksheet name read verbatim. */
const DIA_SHEET = 'Día';

const ERROR_MESSAGES: Record<ParseErrorCode, string> = {
  SHEETJS_READ_FAILED:
    'Could not read the file. Make sure it is a valid Tapo .xls file.',
  DIA_SHEET_MISSING:
    'The file has no "Día" sheet. It does not look like a "Consumo de energía" export.',
  HEADER_MISMATCH:
    'Wrong file: a "Consumo de energía(kWh)" export was expected.',
  ROW_PARSE_FAILED: 'The file contains a row with an invalid value or date.',
};

function fail(code: ParseErrorCode): ParseError {
  return { ok: false, code, message: ERROR_MESSAGES[code] };
}

/**
 * Parse a "YYYY/MM/DD HH:00:00" timestamp into a date key and hour.
 * Returns null when the string does not match the expected top-of-hour shape.
 */
function parseTimestamp(
  raw: unknown,
): { dateISO: string; hour: number; timestamp: Date } | null {
  if (typeof raw !== 'string') return null;
  const match = raw.match(/^(\d{4}\/\d{2}\/\d{2})\s+(\d{2}):\d{2}:\d{2}$/);
  if (!match) return null;
  const dateISO = match[1];
  const hour = Number.parseInt(match[2], 10);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  // Build a Date for display/sort only; dateISO is the source of truth.
  const [y, mo, d] = dateISO.split('/').map((n) => Number.parseInt(n, 10));
  const timestamp = new Date(y, mo - 1, d, hour, 0, 0, 0);
  return { dateISO, hour, timestamp };
}

/**
 * PURE: takes the file bytes, reads the "Día" sheet via SheetJS, validates the
 * header contains the exact string "Consumo de energía(kWh)", normalizes rows
 * into HourlyRecord[], and sums kWh of duplicate (dateISO, hour) rows.
 *
 * `xlsxModule` is injected so tests pass the real lib and production passes the
 * lazily-imported module — keeps the function dependency-free at the type level
 * and trivially unit-testable.
 */
export function parseConsumo(
  buffer: ArrayBuffer,
  xlsxModule: typeof import('xlsx'),
): ParseResult {
  let workbook: ReturnType<typeof xlsxModule.read>;
  try {
    workbook = xlsxModule.read(buffer, { type: 'array' });
  } catch {
    return fail('SHEETJS_READ_FAILED');
  }

  const sheet = workbook.Sheets[DIA_SHEET];
  if (!sheet) {
    return fail('DIA_SHEET_MISSING');
  }

  const rows = xlsxModule.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  // Header validation: some cell in row 0 must contain the exact domain term.
  const header = rows[0] ?? [];
  const headerOk = header.some(
    (cell) => typeof cell === 'string' && cell.includes(CONSUMO_HEADER_TERM),
  );
  if (!headerOk) {
    return fail('HEADER_MISMATCH');
  }

  // Header-only file => valid, no records.
  if (rows.length <= 1) {
    return { ok: true, records: [] };
  }

  // Accumulate by (dateISO, hour); sum duplicate buckets deterministically.
  const buckets = new Map<string, HourlyRecord>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue; // tolerate blank trailing rows
    const parsedTs = parseTimestamp(row[0]);
    if (!parsedTs) {
      return fail('ROW_PARSE_FAILED');
    }
    const kWh = Number(row[1]);
    if (!Number.isFinite(kWh)) {
      return fail('ROW_PARSE_FAILED');
    }
    const key = `${parsedTs.dateISO}#${parsedTs.hour}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.kWh += kWh;
    } else {
      buckets.set(key, {
        timestamp: parsedTs.timestamp,
        dateISO: parsedTs.dateISO,
        hour: parsedTs.hour,
        kWh,
      });
    }
  }

  const records = Array.from(buckets.values()).sort((a, b) => {
    if (a.dateISO !== b.dateISO) return a.dateISO < b.dateISO ? -1 : 1;
    return a.hour - b.hour;
  });

  return { ok: true, records };
}
