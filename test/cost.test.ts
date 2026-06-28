import { describe, it, expect } from 'vitest';
import {
  periodForHour,
  costForDaySeries,
  DEFAULT_PRICES,
  type TariffPrices,
} from '../src/data/cost';
import type { DaySeries } from '../src/types';

function zeros(): DaySeries {
  return new Array(24).fill(0);
}

describe('periodForHour', () => {
  it('maps 2.0TD boundaries correctly', () => {
    expect(periodForHour(0)).toBe('valley'); // 00-08
    expect(periodForHour(7)).toBe('valley');
    expect(periodForHour(8)).toBe('peak'); // 08-10
    expect(periodForHour(9)).toBe('peak');
    expect(periodForHour(10)).toBe('flat'); // 10-14
    expect(periodForHour(14)).toBe('peak'); // 14-18
    expect(periodForHour(18)).toBe('flat'); // 18-22
    expect(periodForHour(22)).toBe('valley'); // 22-24
    expect(periodForHour(23)).toBe('valley');
  });
});

describe('costForDaySeries', () => {
  const prices: TariffPrices = { valley: 0.1, flat: 0.2, peak: 0.3 };

  it('multiplies kWh per period by its price and sums the total', () => {
    const series = zeros();
    series[2] = 5; // valley -> 5 * 0.1 = 0.5
    series[9] = 2; // peak   -> 2 * 0.3 = 0.6
    series[12] = 4; // flat  -> 4 * 0.2 = 0.8
    const result = costForDaySeries(series, prices);
    expect(result.byPeriod.valley.kWh).toBe(5);
    expect(result.byPeriod.peak.kWh).toBe(2);
    expect(result.byPeriod.flat.kWh).toBe(4);
    expect(result.byPeriod.valley.cost).toBeCloseTo(0.5, 6);
    expect(result.byPeriod.peak.cost).toBeCloseTo(0.6, 6);
    expect(result.byPeriod.flat.cost).toBeCloseTo(0.8, 6);
    expect(result.total).toBeCloseTo(1.9, 6);
  });

  it('returns zero cost for an empty day', () => {
    const result = costForDaySeries(zeros(), DEFAULT_PRICES);
    expect(result.total).toBe(0);
  });
});
