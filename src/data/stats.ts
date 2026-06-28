/** Summary statistics over parsed consumption (PURE). */

import type { TapoItem, DaySeries } from '../types';
import { itemDaySeries, sumDaySeries, totalKWh } from './aggregate';

export interface DailyTotal {
  day: string;
  kWh: number;
}

/** Total kWh (summed across items) for each given day. */
export function dailyTotals(items: TapoItem[], days: string[]): DailyTotal[] {
  return days.map((day) => ({ day, kWh: totalKWh(sumDaySeries(items, day)) }));
}

/** Index (0-23) of the highest bucket, or -1 when the series is empty/all zero. */
export function peakHour(series: DaySeries): number {
  let idx = -1;
  let max = 0;
  series.forEach((v, h) => {
    if (v > max) {
      max = v;
      idx = h;
    }
  });
  return idx;
}

export interface ConsumerTotal {
  name: string;
  color: string;
  kWh: number;
}

/**
 * Item with the highest total on a given day, or null when there are no items.
 * When every item is zero for the day it returns the first item with kWh 0;
 * callers should treat a 0 total as "no consumption" (the stats panel does).
 */
export function topConsumer(
  items: TapoItem[],
  day: string,
): ConsumerTotal | null {
  let best: ConsumerTotal | null = null;
  for (const item of items) {
    const kWh = totalKWh(itemDaySeries(item, day));
    if (!best || kWh > best.kWh) {
      best = { name: item.name, color: item.color, kWh };
    }
  }
  return best;
}

/** Mean of the given daily totals; 0 for an empty list. */
export function averagePerDay(totals: DailyTotal[]): number {
  if (totals.length === 0) return 0;
  return totals.reduce((acc, t) => acc + t.kWh, 0) / totals.length;
}
