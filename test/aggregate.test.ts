import { describe, it, expect } from 'vitest';
import {
  unionDays,
  itemDaySeries,
  sumDaySeries,
  totalKWh,
} from '../src/data/aggregate';
import type { TapoItem, HourlyRecord } from '../src/types';

function rec(dateISO: string, hour: number, kWh: number): HourlyRecord {
  return { timestamp: new Date(), dateISO, hour, kWh };
}

function item(
  id: string,
  consumo: HourlyRecord[] | null,
): TapoItem {
  return { id, name: id, color: '#000', consumo };
}

function daysFor(dates: string[]): HourlyRecord[] {
  return dates.map((d) => rec(d, 0, 1));
}

describe('unionDays', () => {
  it('returns the union of two items with different coverage, newest first', () => {
    const a = item('A', daysFor(['2026/06/01', '2026/06/02', '2026/06/03']));
    const b = item('B', daysFor(['2026/06/02', '2026/06/03', '2026/06/04', '2026/06/05']));
    expect(unionDays([a, b])).toEqual([
      '2026/06/05',
      '2026/06/04',
      '2026/06/03',
      '2026/06/02',
      '2026/06/01',
    ]);
  });

  it('returns a single item own days, newest first', () => {
    const a = item('A', daysFor(['2026/06/10', '2026/06/11', '2026/06/12']));
    expect(unionDays([a])).toEqual(['2026/06/12', '2026/06/11', '2026/06/10']);
  });

  it('returns [] when no items have data', () => {
    expect(unionDays([])).toEqual([]);
    expect(unionDays([item('A', null), item('B', null)])).toEqual([]);
  });
});

describe('sumDaySeries', () => {
  it('sums two items each 5 kWh at hour 9 to 10', () => {
    const a = item('A', [rec('2026/06/01', 9, 5)]);
    const b = item('B', [rec('2026/06/01', 9, 5)]);
    const result = sumDaySeries([a, b], '2026/06/01');
    expect(result).toHaveLength(24);
    expect(result[9]).toBe(10);
  });

  it('0-fills a missing item (3 + nothing = 3)', () => {
    const a = item('A', [rec('2026/06/01', 9, 3)]);
    const b = item('B', [rec('2026/06/02', 9, 99)]); // no data for 06/01
    const result = sumDaySeries([a, b], '2026/06/01');
    expect(result[9]).toBe(3);
  });

  it('returns length-24 zeros for an all-zero day without throwing', () => {
    const a = item('A', [rec('2026/06/01', 0, 0), rec('2026/06/01', 9, 0)]);
    const result = sumDaySeries([a], '2026/06/01');
    expect(result).toHaveLength(24);
    expect(result.every((v) => v === 0)).toBe(true);
  });
});

describe('itemDaySeries', () => {
  it('returns length-24 zeros for an item with no data', () => {
    const result = itemDaySeries(item('A', null), '2026/06/01');
    expect(result).toHaveLength(24);
    expect(result.every((v) => v === 0)).toBe(true);
  });

  it('places kWh at the matching hour index', () => {
    const a = item('A', [rec('2026/06/01', 14, 2.5)]);
    const result = itemDaySeries(a, '2026/06/01');
    expect(result[14]).toBe(2.5);
    expect(result[13]).toBe(0);
  });
});

describe('totalKWh', () => {
  it('returns 0 for an all-zero series', () => {
    expect(totalKWh(new Array(24).fill(0))).toBe(0);
  });

  it('sums a series', () => {
    const series = [1, 2, 3, ...new Array(21).fill(0)];
    expect(totalKWh(series)).toBe(6);
  });
});
