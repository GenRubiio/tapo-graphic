import './styles/main.css';
import { Chart, registerables } from 'chart.js';
import Annotation from 'chartjs-plugin-annotation';

import type { AppState, TapoItem, TariffPrices } from './types';
import {
  loadState,
  saveRegistry,
  saveRecords,
  deleteItem,
  loadPrices,
  savePrices,
} from './store';
import {
  unionDays,
  itemDaySeries,
  sumDaySeries,
  totalKWh,
} from './data/aggregate';
import { DEFAULT_PRICES, costForDaySeries } from './data/cost';
import {
  dailyTotals,
  peakHour,
  topConsumer,
  averagePerDay,
} from './data/stats';
import { sampleItems } from './data/sampleData';
import { colorForIndex } from './ui/colors';
import { renderItemCard } from './ui/itemCard';
import { renderCalendar } from './ui/calendar';
import { renderStats, clearStats } from './ui/statsPanel';
import { initChartPanel, type ChartPanel } from './ui/chartPanel';
import { buildPerItemConfig } from './charts/perItemChart';
import { buildAggregateConfig } from './charts/aggregateChart';
import { buildDailyConfig } from './charts/dailyChart';
import { showError, showInfo } from './ui/toasts';
import { parseConsumo } from './parsing/parseConsumo';

/**
 * Paint a white background behind every chart so exported PNGs are not
 * transparent (and match the on-screen white card).
 */
const whiteBackground = {
  id: 'whiteBackground',
  beforeDraw(chart: Chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  },
};

Chart.register(...registerables, Annotation, whiteBackground);

const READABILITY_THRESHOLD = 10;

/** Format a kWh total for the chart readout. */
function formatKWh(value: number): string {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 3 })} kWh`;
}

/** Format a € amount for the chart/stat readouts. */
function formatMoney(value: number): string {
  return `€${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const state: AppState = {
  items: [],
  selectedDay: null,
  prices: { ...DEFAULT_PRICES },
};
let perItemPanel: ChartPanel;
let aggregatePanel: ChartPanel;
let dailyPanel: ChartPanel;

function newId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function renderAllItems(): void {
  const container = document.getElementById('items');
  if (!container) return;
  container.innerHTML = '';
  for (const item of state.items) {
    container.appendChild(
      renderItemCard(item, {
        onRename: handleRename,
        onDelete: handleDelete,
        onConsumoDrop: handleConsumoDrop,
      }),
    );
  }

  const empty = document.getElementById('items-empty');
  empty?.classList.toggle('hidden', state.items.length > 0);

  const badge = document.getElementById('items-count');
  if (badge) {
    badge.textContent =
      state.items.length === 0 ? '' : `${state.items.length} item(s)`;
  }
}

function setTotals(label: string): void {
  const perItemEl = document.getElementById('total-per-item');
  const aggregateEl = document.getElementById('total-aggregate');
  if (perItemEl) perItemEl.textContent = label;
  if (aggregateEl) aggregateEl.textContent = label;
}

function setDownloadEnabled(enabled: boolean): void {
  for (const id of ['dl-per-item', 'dl-aggregate', 'dl-daily']) {
    const btn = document.getElementById(id) as HTMLButtonElement | null;
    if (btn) btn.disabled = !enabled;
  }
}

function updateCharts(): void {
  const days = unionDays(state.items);
  const day = state.selectedDay;

  // Daily-totals chart spans the whole range, independent of the selected day.
  if (days.length === 0) {
    dailyPanel.update(null);
  } else {
    dailyPanel.update(
      buildDailyConfig(dailyTotals(state.items, days), day, handleDaySelect),
    );
  }

  if (!day || state.items.length === 0) {
    perItemPanel.update(null);
    aggregatePanel.update(null);
    setTotals('');
    clearStats();
    setDownloadEnabled(days.length > 0);
    return;
  }

  const series = state.items.map((item) => ({
    name: item.name,
    color: item.color,
    data: itemDaySeries(item, day),
  }));
  const sum = sumDaySeries(state.items, day);
  const cost = costForDaySeries(sum, state.prices);

  perItemPanel.update(buildPerItemConfig(series));
  aggregatePanel.update(buildAggregateConfig(sum));
  setTotals(
    `Total consumed: ${formatKWh(totalKWh(sum))} · ${formatMoney(cost.total)}`,
  );

  renderStats({
    dayTotalKWh: totalKWh(sum),
    dayCost: cost.total,
    peakHour: peakHour(sum),
    topConsumer: topConsumer(state.items, day),
    avgPerDay: averagePerDay(dailyTotals(state.items, days)),
    cost,
  });
  setDownloadEnabled(true);
}

function recompute(): void {
  const days = unionDays(state.items);
  if (days.length === 0) {
    state.selectedDay = null;
  } else if (!state.selectedDay || !days.includes(state.selectedDay)) {
    state.selectedDay = days[0];
  }
  renderCalendar(days, state.selectedDay, handleDaySelect);
  updateCharts();
}

function handleDaySelect(day: string): void {
  state.selectedDay = day;
  renderCalendar(unionDays(state.items), state.selectedDay, handleDaySelect);
  updateCharts();
}

function handleRename(id: string, name: string): void {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  item.name = name;
  const result = saveRegistry(state.items);
  if (!result.ok) showError(result.message);
  renderAllItems();
  updateCharts(); // legend label propagation
}

function handleDelete(id: string): void {
  const result = deleteItem(id, state.items);
  state.items = state.items.filter((i) => i.id !== id);
  if (!result.ok) showError(result.message);
  renderAllItems();
  recompute();
}

function handleAddItem(): void {
  const index = state.items.length;
  const item: TapoItem = {
    id: newId(),
    name: `Tapo ${index + 1}`,
    color: colorForIndex(index),
    consumo: null,
  };
  state.items.push(item);
  const result = saveRegistry(state.items);
  if (!result.ok) showError(result.message);
  renderAllItems();
  recompute();
  if (state.items.length > READABILITY_THRESHOLD) {
    showInfo('More than 10 items may reduce chart readability.');
  }
}

function handleConsumoDrop(id: string, file: File): void {
  const item = state.items.find((i) => i.id === id);
  if (!item) return;
  const card = document.querySelector<HTMLElement>(
    `.item-card[data-item-id="${id}"]`,
  );
  card?.setAttribute('aria-busy', 'true');

  const reader = new FileReader();
  reader.onerror = () => {
    card?.removeAttribute('aria-busy');
    showError('Could not read the file.');
  };
  reader.onload = async () => {
    try {
      const buffer = reader.result as ArrayBuffer;
      const xlsxModule = await import('xlsx');
      const result = parseConsumo(buffer, xlsxModule);
      if (!result.ok) {
        showError(result.message);
        return; // prior data untouched
      }
      const saved = saveRecords(id, result.records);
      if (!saved.ok) {
        showError(saved.message);
        return;
      }
      item.consumo = result.records;
      renderAllItems();
      recompute();
      showInfo('File processed successfully.');
    } catch {
      showError('Unexpected error while processing the file.');
    } finally {
      card?.removeAttribute('aria-busy');
    }
  };
  reader.readAsArrayBuffer(file);
}

function handleLoadSample(): void {
  if (state.items.length > 0) return;
  const base = state.items.length;
  sampleItems().forEach((sample, i) => {
    const item: TapoItem = {
      id: newId(),
      name: sample.name,
      color: colorForIndex(base + i),
      consumo: sample.consumo,
    };
    state.items.push(item);
    saveRecords(item.id, sample.consumo);
  });
  const result = saveRegistry(state.items);
  if (!result.ok) showError(result.message);
  renderAllItems();
  recompute();
  showInfo('Sample data loaded.');
}

function readPrices(): TariffPrices {
  const read = (id: string): number => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    const value = el ? Number.parseFloat(el.value) : Number.NaN;
    return Number.isFinite(value) && value >= 0 ? value : 0;
  };
  return {
    valley: read('price-valley'),
    flat: read('price-flat'),
    peak: read('price-peak'),
  };
}

function handlePriceChange(): void {
  state.prices = readPrices();
  const result = savePrices(state.prices);
  if (!result.ok) showError(result.message);
  updateCharts();
}

function initPriceInputs(): void {
  const fields: Array<[string, number]> = [
    ['price-valley', state.prices.valley],
    ['price-flat', state.prices.flat],
    ['price-peak', state.prices.peak],
  ];
  for (const [id, value] of fields) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) continue;
    el.value = String(value);
    el.addEventListener('input', handlePriceChange);
  }
}

function downloadChartImage(panel: ChartPanel, baseName: string): void {
  const url = panel.toImage();
  if (!url) {
    showInfo('No chart to download yet.');
    return;
  }
  const day = state.selectedDay
    ? state.selectedDay.replace(/\//g, '-')
    : 'no-day';
  const link = document.createElement('a');
  link.href = url;
  link.download = `tapo-${baseName}-${day}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function init(): void {
  state.items = loadState();
  state.prices = loadPrices();
  perItemPanel = initChartPanel('chart-per-item');
  aggregatePanel = initChartPanel('chart-aggregate');
  dailyPanel = initChartPanel('chart-daily');

  document
    .getElementById('btn-add-item')
    ?.addEventListener('click', handleAddItem);
  document
    .getElementById('btn-load-sample')
    ?.addEventListener('click', handleLoadSample);

  document
    .getElementById('dl-per-item')
    ?.addEventListener('click', () =>
      downloadChartImage(perItemPanel, 'per-item'),
    );
  document
    .getElementById('dl-aggregate')
    ?.addEventListener('click', () =>
      downloadChartImage(aggregatePanel, 'aggregate'),
    );
  document
    .getElementById('dl-daily')
    ?.addEventListener('click', () => downloadChartImage(dailyPanel, 'daily'));

  initPriceInputs();
  renderAllItems();
  recompute();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
