/** Deterministic HSL palette generator (PURE). */

/** Number of distinct hues before the palette recycles. */
export const PALETTE_HUE_COUNT = 12;

/**
 * Map an index to an evenly-spaced HSL hue. Indices 0..PALETTE_HUE_COUNT-1 are
 * distinct; index PALETTE_HUE_COUNT recycles index 0's hue.
 */
export function colorForIndex(index: number): string {
  const step = Math.floor(360 / PALETTE_HUE_COUNT);
  const hue = ((index * step) % 360 + 360) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}
