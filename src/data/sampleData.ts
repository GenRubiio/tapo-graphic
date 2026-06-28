/** Deterministic demo dataset so first-time visitors can explore the app. */

import type { HourlyRecord } from '../types';

const SAMPLE_DAYS = [
  '2026/06/24',
  '2026/06/25',
  '2026/06/26',
  '2026/06/27',
  '2026/06/28',
];

/** 24-hour kWh profile for a fridge-like steady load. */
const FRIDGE_PROFILE = [
  0.04, 0.04, 0.03, 0.03, 0.03, 0.04, 0.05, 0.06, 0.06, 0.05, 0.05, 0.06,
  0.07, 0.06, 0.05, 0.05, 0.06, 0.07, 0.08, 0.07, 0.06, 0.05, 0.05, 0.04,
];

/** 24-hour kWh profile for a boiler/heater with morning + evening peaks. */
const BOILER_PROFILE = [
  0, 0, 0, 0, 0, 0.1, 0.55, 0.78, 0.62, 0.2, 0.05, 0, 0, 0, 0, 0, 0.05, 0.2,
  0.6, 0.75, 0.5, 0.15, 0, 0,
];

/** Per-day multiplier so daily totals are not flat (deterministic). */
const DAY_FACTORS = [0.9, 1.05, 1.0, 1.15, 0.85];

function buildRecords(profile: number[]): HourlyRecord[] {
  const out: HourlyRecord[] = [];
  SAMPLE_DAYS.forEach((dateISO, dayIdx) => {
    const [y, mo, d] = dateISO.split('/').map((n) => Number.parseInt(n, 10));
    const factor = DAY_FACTORS[dayIdx];
    for (let hour = 0; hour < 24; hour++) {
      const kWh = Math.round(profile[hour] * factor * 1000) / 1000;
      out.push({
        timestamp: new Date(y, mo - 1, d, hour, 0, 0, 0),
        dateISO,
        hour,
        kWh,
      });
    }
  });
  return out;
}

export interface SampleItem {
  name: string;
  consumo: HourlyRecord[];
}

/** Two demo items with realistic-looking daily curves. */
export function sampleItems(): SampleItem[] {
  return [
    { name: 'Fridge (demo)', consumo: buildRecords(FRIDGE_PROFILE) },
    { name: 'Boiler (demo)', consumo: buildRecords(BOILER_PROFILE) },
  ];
}
