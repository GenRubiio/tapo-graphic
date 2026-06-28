import type { TapoItem, DaySeries } from '../types';

const HOURS_PER_DAY = 24;

/** A fresh 24-slot zero-filled series (index === hour). */
function zeroSeries(): DaySeries {
  return new Array(HOURS_PER_DAY).fill(0);
}

/** Union of every item's distinct dateISO values, sorted descending (newest first). */
export function unionDays(items: TapoItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    if (!item.consumo) continue;
    for (const record of item.consumo) {
      set.add(record.dateISO);
    }
  }
  // Lexicographic sort is correct for YYYY/MM/DD; reverse => newest day first.
  return Array.from(set).sort().reverse();
}

/** 24-slot kWh series for one item on one day, 0-filled for missing hours. */
export function itemDaySeries(item: TapoItem, dateISO: string): DaySeries {
  const series = zeroSeries();
  if (!item.consumo) return series;
  for (const record of item.consumo) {
    if (record.dateISO !== dateISO) continue;
    if (record.hour >= 0 && record.hour < HOURS_PER_DAY) {
      series[record.hour] += record.kWh;
    }
  }
  return series;
}

/** Per-bucket SUM across all items for one day (0-fill for missing items). */
export function sumDaySeries(items: TapoItem[], dateISO: string): DaySeries {
  const sum = zeroSeries();
  for (const item of items) {
    const series = itemDaySeries(item, dateISO);
    for (let h = 0; h < HOURS_PER_DAY; h++) {
      sum[h] += series[h];
    }
  }
  return sum;
}

/** Total kWh for a DaySeries (for the "Total consumida" label). */
export function totalKWh(series: DaySeries): number {
  return series.reduce((acc, v) => acc + v, 0);
}
