import type { ChartConfiguration } from 'chart.js';
import type { DailyTotal } from '../data/stats';

const BAR_COLOR = '#1a4fa0';

/** Format "YYYY/MM/DD" as "DD/MM" for compact bar labels. */
function shortLabel(dateISO: string): string {
  const [, m, d] = dateISO.split('/');
  return `${d}/${m}`;
}

/**
 * Build the Chart.js config for the daily-totals bar chart (whole range).
 * `selectedDay` is highlighted so it links visually to the day picker.
 */
export function buildDailyConfig(
  totals: DailyTotal[],
  selectedDay: string | null,
  onPick?: (day: string) => void,
): ChartConfiguration {
  // Chronological order (oldest -> newest) reads better on a time bar chart.
  const ordered = [...totals].reverse();
  return {
    type: 'bar',
    data: {
      labels: ordered.map((t) => shortLabel(t.day)),
      datasets: [
        {
          label: 'kWh per day',
          data: ordered.map((t) => t.kWh),
          backgroundColor: ordered.map((t) =>
            t.day === selectedDay ? BAR_COLOR : 'rgba(26, 79, 160, 0.35)',
          ),
          borderColor: BAR_COLOR,
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (_evt, elements) => {
        if (!onPick || elements.length === 0) return;
        const day = ordered[elements[0].index]?.day;
        if (day) onPick(day);
      },
      scales: {
        x: { title: { display: true, text: 'Day' } },
        y: { title: { display: true, text: 'kWh' }, beginAtZero: true },
      },
      plugins: {
        legend: { display: false },
        title: { display: false },
      },
    },
  } as ChartConfiguration;
}
