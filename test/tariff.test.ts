import { describe, it, expect } from 'vitest';
import {
  TARIFF_2_0TD,
  tariffBoxes,
  type TariffPeriod,
} from '../src/data/tariff';

/** Find the period covering a given hour. */
function periodAt(hour: number): TariffPeriod | undefined {
  return TARIFF_2_0TD.find((b) => hour >= b.startHour && hour < b.endHour)
    ?.period;
}

describe('TARIFF_2_0TD', () => {
  it('has exactly 6 bands', () => {
    expect(TARIFF_2_0TD).toHaveLength(6);
  });

  it('covers hours 0-24 with no gap', () => {
    expect(TARIFF_2_0TD[0].startHour).toBe(0);
    expect(TARIFF_2_0TD[TARIFF_2_0TD.length - 1].endHour).toBe(24);
    for (let i = 1; i < TARIFF_2_0TD.length; i++) {
      expect(TARIFF_2_0TD[i].startHour).toBe(TARIFF_2_0TD[i - 1].endHour);
    }
  });

  it('has no overlap (each endHour <= next startHour)', () => {
    const sorted = [...TARIFF_2_0TD].sort((a, b) => a.startHour - b.startHour);
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].endHour).toBeLessThanOrEqual(sorted[i + 1].startHour);
    }
  });

  it('has correct periods at exact boundaries', () => {
    expect(periodAt(0)).toBe('valley');
    expect(periodAt(8)).toBe('peak');
    expect(periodAt(10)).toBe('flat');
    expect(periodAt(14)).toBe('peak');
    expect(periodAt(18)).toBe('flat');
    expect(periodAt(22)).toBe('valley');
  });

  it('tariffBoxes() returns exactly 6 box annotations', () => {
    const boxes = tariffBoxes();
    expect(Object.keys(boxes)).toHaveLength(6);
    for (const box of Object.values(boxes)) {
      expect(box).toMatchObject({ type: 'box', drawTime: 'beforeDatasetsDraw' });
    }
  });
});
