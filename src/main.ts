import './styles/main.css';
import { Chart, registerables } from 'chart.js';
import Annotation from 'chartjs-plugin-annotation';

import type { AppState, TapoItem } from './types';
import { loadState, saveRegistry, saveRecords, deleteItem } from './store';
import {
  unionDays,
  itemDaySeries,
  sumDaySeries,
  totalKWh,
} from './data/aggregate';
import { colorForIndex } from './ui/colors';
import { renderItemCard } from './ui/itemCard';
import { renderCalendar } from './ui/calendar';
import { initChartPanel, type ChartPanel } from './ui/chartPanel';
import { buildPerItemConfig } from './charts/perItemChart';
import { buildAggregateConfig } from './charts/aggregateChart';
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

const state: AppState = { items: [], selectedDay: null };
let perItemPanel: ChartPanel;
let aggregatePanel: ChartPanel;

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
  for (const id of ['dl-per-item', 'dl-aggregate']) {
    const btn = document.getElementById(id) as HTMLButtonElement | null;
    if (btn) btn.disabled = !enabled;
  }
}

function updateCharts(): void {
  const day = state.selectedDay;
  if (!day || state.items.length === 0) {
    perItemPanel.update(null);
    aggregatePanel.update(null);
    setTotals('');
    setDownloadEnabled(false);
    return;
  }
  const series = state.items.map((item) => ({
    name: item.name,
    color: item.color,
    data: itemDaySeries(item, day),
  }));
  const sum = sumDaySeries(state.items, day);
  perItemPanel.update(buildPerItemConfig(series));
  aggregatePanel.update(buildAggregateConfig(sum));
  setTotals(`Total consumed: ${formatKWh(totalKWh(sum))}`);
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
  perItemPanel = initChartPanel('chart-per-item');
  aggregatePanel = initChartPanel('chart-aggregate');

  const addBtn = document.getElementById('btn-add-item');
  addBtn?.addEventListener('click', handleAddItem);

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

  renderAllItems();
  recompute();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
