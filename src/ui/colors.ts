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

/**
 * Return a translucent version of a color string. Handles the `hsl(h, s%, l%)`
 * shape produced by colorForIndex and 6-digit `#rrggbb` hex; anything else is
 * returned unchanged. Prevents the invalid `${hsl}33` concatenation bug.
 */
export function translucent(color: string, alpha = 0.18): string {
  const hsl = color.match(/^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/i);
  if (hsl) {
    return `hsla(${hsl[1]}, ${hsl[2]}%, ${hsl[3]}%, ${alpha})`;
  }
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
      .toString(16)
      .padStart(2, '0');
    return `#${hex[1]}${a}`;
  }
  return color;
}
