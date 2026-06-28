import type { ChartConfiguration } from 'chart.js';
import type { DaySeries } from '../types';
import { tariffBoxes } from '../data/tariff';
import { translucent } from '../ui/colors';

const pad = (n: number): string => String(n).padStart(2, '0');

/** 24 x-axis labels of the form "00 - 01 h" ... "23 - 24 h" (matches image.png). */
export const HOUR_LABELS: string[] = Array.from(
  { length: 24 },
  (_, h) => `${pad(h)} - ${pad(h + 1)} h`,
);

export interface PerItemSeries {
  name: string;
  color: string;
  data: DaySeries;
}

/** Build the Chart.js config for the per-item chart (Chart 1). */
export function buildPerItemConfig(
  series: PerItemSeries[],
): ChartConfiguration {
  return {
    type: 'line',
    data: {
      labels: HOUR_LABELS,
      datasets: series.map((s) => ({
        label: s.name,
        data: s.data,
        borderColor: s.color,
        backgroundColor: translucent(s.color),
        tension: 0.4,
        pointRadius: 3,
        pointStyle: 'circle',
        fill: false,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Hour' } },
        y: { title: { display: true, text: 'kWh' }, beginAtZero: true },
      },
      plugins: {
        legend: { display: true },
        annotation: { annotations: tariffBoxes() },
      },
    },
  } as ChartConfiguration;
}
