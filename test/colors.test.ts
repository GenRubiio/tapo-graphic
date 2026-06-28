import { describe, it, expect } from 'vitest';
import { colorForIndex, PALETTE_HUE_COUNT } from '../src/ui/colors';

describe('colorForIndex', () => {
  it('returns an hsl() string', () => {
    expect(colorForIndex(0)).toMatch(/^hsl\(/);
  });

  it('is deterministic for the same index', () => {
    expect(colorForIndex(3)).toBe(colorForIndex(3));
  });

  it('produces 12 distinct values for indices 0-11', () => {
    const values = new Set<string>();
    for (let i = 0; i < PALETTE_HUE_COUNT; i++) {
      values.add(colorForIndex(i));
    }
    expect(values.size).toBe(PALETTE_HUE_COUNT);
  });

  it('recycles index 0 hue at index 12', () => {
    expect(colorForIndex(PALETTE_HUE_COUNT)).toBe(colorForIndex(0));
  });
});
