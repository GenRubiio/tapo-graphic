/** Cost estimation from the Spanish 2.0TD tariff periods (PURE). */

import { TARIFF_2_0TD, type TariffPeriod } from './tariff';
import type { DaySeries } from '../types';

/** Price in €/kWh for each 2.0TD period. */
export interface TariffPrices {
  valley: number; // P3
  flat: number; // P2
  peak: number; // P1
}

/** Editable defaults (typical Spanish 2.0TD order of magnitude, €/kWh). */
export const DEFAULT_PRICES: TariffPrices = {
  valley: 0.09,
  flat: 0.14,
  peak: 0.19,
};

export const PERIODS: readonly TariffPeriod[] = ['valley', 'flat', 'peak'];

/** Which 2.0TD period an hour (0-23) belongs to. */
export function periodForHour(hour: number): TariffPeriod {
  const band = TARIFF_2_0TD.find(
    (b) => hour >= b.startHour && hour < b.endHour,
  );
  return band ? band.period : 'flat';
}

export interface PeriodBreakdown {
  kWh: number;
  cost: number;
}

export interface CostBreakdown {
  total: number;
  byPeriod: Record<TariffPeriod, PeriodBreakdown>;
}

/** kWh and € per tariff period for a 24-slot day series. */
export function costForDaySeries(
  series: DaySeries,
  prices: TariffPrices,
): CostBreakdown {
  const byPeriod: Record<TariffPeriod, PeriodBreakdown> = {
    valley: { kWh: 0, cost: 0 },
    flat: { kWh: 0, cost: 0 },
    peak: { kWh: 0, cost: 0 },
  };
  for (let h = 0; h < series.length; h++) {
    byPeriod[periodForHour(h)].kWh += series[h];
  }
  let total = 0;
  for (const p of PERIODS) {
    byPeriod[p].cost = byPeriod[p].kWh * prices[p];
    total += byPeriod[p].cost;
  }
  return { total, byPeriod };
}
