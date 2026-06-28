import type { ChartConfiguration } from 'chart.js';
import type { DaySeries } from '../types';
import { tariffBoxes } from '../data/tariff';
import { HOUR_LABELS } from './perItemChart';

/** Dark blue matching image.png. */
const AGGREGATE_COLOR = '#1a4fa0';

/** Build the Chart.js config for the aggregate chart (Chart 2). */
export function buildAggregateConfig(sum: DaySeries): ChartConfiguration {
  return {
    type: 'line',
    data: {
      labels: HOUR_LABELS,
      datasets: [
        {
          label: 'Total consumption',
          data: sum,
          borderColor: AGGREGATE_COLOR,
          backgroundColor: `${AGGREGATE_COLOR}33`,
          tension: 0.4,
          pointRadius: 3,
          pointStyle: 'circle',
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Hour' } },
        y: { title: { display: true, text: 'kWh' }, beginAtZero: true },
      },
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'kWh – days' },
        annotation: { annotations: tariffBoxes() },
      },
    },
  } as ChartConfiguration;
}
