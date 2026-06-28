import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { parseConsumo } from '../src/parsing/parseConsumo';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function loadBuffer(relPath: string): ArrayBuffer {
  const buf = readFileSync(resolve(root, relPath));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

const BOILER = 'test-data/boiler/Consumo de energía.xls';
const CUARTO1 = 'test-data/cuarto-1/Consumo de energía (1).xls';
const POTENCIA = 'test-data/boiler/Potencia.xls';

describe('parseConsumo (real binary .xls)', () => {
  it('parses the boiler Consumo file into non-empty valid records', () => {
    const result = parseConsumo(loadBuffer(BOILER), XLSX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records.length).toBeGreaterThan(0);
    for (const r of result.records) {
      expect(r.hour).toBeGreaterThanOrEqual(0);
      expect(r.hour).toBeLessThanOrEqual(23);
      expect(r.dateISO).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
      expect(Number.isFinite(r.kWh)).toBe(true);
    }
  });

  it('parses the cuarto-1 Consumo file into non-empty valid records', () => {
    const result = parseConsumo(loadBuffer(CUARTO1), XLSX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records.length).toBeGreaterThan(0);
    for (const r of result.records) {
      expect(r.hour).toBeGreaterThanOrEqual(0);
      expect(r.hour).toBeLessThanOrEqual(23);
      expect(r.dateISO).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    }
  });

  it('rejects a Potencia file with HEADER_MISMATCH', () => {
    const result = parseConsumo(loadBuffer(POTENCIA), XLSX);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('HEADER_MISMATCH');
  });

  it('returns DIA_SHEET_MISSING for a workbook with no Día sheet', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['x'], ['y']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Otra');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const result = parseConsumo(out, XLSX);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('DIA_SHEET_MISSING');
  });

  it('returns ok with empty records for a header-only workbook', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['range', 'Consumo de energía(kWh)'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Día');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const result = parseConsumo(out, XLSX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toEqual([]);
  });

  it('sums duplicate (date, hour) rows 0.4 + 0.6 to 1.0', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['range', 'Consumo de energía(kWh)'],
      ['2026/06/01 09:00:00', 0.4],
      ['2026/06/01 09:00:00', 0.6],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Día');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const result = parseConsumo(out, XLSX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const bucket = result.records.filter(
      (r) => r.dateISO === '2026/06/01' && r.hour === 9,
    );
    expect(bucket).toHaveLength(1);
    expect(bucket[0].kWh).toBeCloseTo(1.0, 4);
  });
});
