import { describe, it, expect } from 'vitest';
import {
  dailyTotals,
  peakHour,
  topConsumer,
  averagePerDay,
} from '../src/data/stats';
import type { TapoItem, HourlyRecord, DaySeries } from '../src/types';

function rec(dateISO: string, hour: number, kWh: number): HourlyRecord {
  return { timestamp: new Date(), dateISO, hour, kWh };
}

function item(id: string, consumo: HourlyRecord[] | null): TapoItem {
  return { id, name: id, color: '#000', consumo };
}

describe('dailyTotals', () => {
  it('sums kWh across items per day', () => {
    const a = item('A', [rec('2026/06/01', 9, 5), rec('2026/06/02', 9, 1)]);
    const b = item('B', [rec('2026/06/01', 9, 5)]);
    const totals = dailyTotals([a, b], ['2026/06/02', '2026/06/01']);
    expect(totals).toEqual([
      { day: '2026/06/02', kWh: 1 },
      { day: '2026/06/01', kWh: 10 },
    ]);
  });
});

describe('peakHour', () => {
  it('returns the index of the max bucket', () => {
    const series: DaySeries = new Array(24).fill(0);
    series[14] = 3;
    series[9] = 2;
    expect(peakHour(series)).toBe(14);
  });

  it('returns -1 for an all-zero series', () => {
    expect(peakHour(new Array(24).fill(0))).toBe(-1);
  });
});

describe('topConsumer', () => {
  it('picks the item with the highest day total', () => {
    const a = item('A', [rec('2026/06/01', 9, 2)]);
    const b = item('B', [rec('2026/06/01', 9, 7)]);
    expect(topConsumer([a, b], '2026/06/01')?.name).toBe('B');
  });

  it('returns null when there are no items', () => {
    expect(topConsumer([], '2026/06/01')).toBeNull();
  });
});

describe('averagePerDay', () => {
  it('averages the daily totals', () => {
    expect(
      averagePerDay([
        { day: 'a', kWh: 2 },
        { day: 'b', kWh: 4 },
      ]),
    ).toBe(3);
  });

  it('returns 0 for an empty list', () => {
    expect(averagePerDay([])).toBe(0);
  });
});
