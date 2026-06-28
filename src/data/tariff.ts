/** Spanish 2.0TD tariff schedule — single source of truth (PURE). */

export type TariffPeriod = 'valley' | 'flat' | 'peak'; // P3 | P2 | P1

export interface TariffBand {
  /** Inclusive start hour. */
  startHour: number;
  /** Exclusive end hour. */
  endHour: number;
  period: TariffPeriod;
}

/**
 * Spanish 2.0TD schedule. Changing the regulatory boundaries means editing only
 * this constant — no chart code changes required.
 */
export const TARIFF_2_0TD: readonly TariffBand[] = [
  { startHour: 0, endHour: 8, period: 'valley' },
  { startHour: 8, endHour: 10, period: 'peak' },
  { startHour: 10, endHour: 14, period: 'flat' },
  { startHour: 14, endHour: 18, period: 'peak' },
  { startHour: 18, endHour: 22, period: 'flat' },
  { startHour: 22, endHour: 24, period: 'valley' },
];

/** Color tokens per period (alternating shading matching image.png). */
export const TARIFF_COLORS: Record<TariffPeriod, string> = {
  valley: 'rgba(173, 216, 230, 0.35)', // light blue
  peak: 'rgba(255, 182, 193, 0.35)', // light red
  flat: 'rgba(200, 200, 200, 0.25)', // light grey
};

/**
 * Build chartjs-plugin-annotation box configs from the constant. Each band maps
 * to a background `box` aligned to the category axis (hour indices) and drawn
 * behind the dataset. Category index h spans [h - 0.5, h + 0.5], so a band
 * covering hours [start, end) spans [start - 0.5, end - 0.5].
 */
export function tariffBoxes(): Record<string, object> {
  const annotations: Record<string, object> = {};
  TARIFF_2_0TD.forEach((band, i) => {
    annotations[`tariff_${i}`] = {
      type: 'box',
      xMin: band.startHour - 0.5,
      xMax: band.endHour - 0.5,
      yMin: 0,
      backgroundColor: TARIFF_COLORS[band.period],
      borderWidth: 0,
      drawTime: 'beforeDatasetsDraw',
    };
  });
  return annotations;
}
