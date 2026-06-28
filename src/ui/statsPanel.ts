/** Renders the summary-statistics cards (DOM side effects only). */

import { HOUR_LABELS } from '../charts/perItemChart';
import type { CostBreakdown } from '../data/cost';
import type { ConsumerTotal } from '../data/stats';

export interface StatsViewModel {
  dayTotalKWh: number;
  dayCost: number;
  peakHour: number; // -1 when none
  topConsumer: ConsumerTotal | null;
  avgPerDay: number;
  cost: CostBreakdown;
}

function fmtKWh(v: number): string {
  return `${v.toLocaleString('en-US', { maximumFractionDigits: 3 })} kWh`;
}

function fmtMoney(v: number): string {
  return `€${v.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function clearStats(): void {
  const el = document.getElementById('stats');
  if (el) el.innerHTML = '';
}

export function renderStats(vm: StatsViewModel): void {
  const el = document.getElementById('stats');
  if (!el) return;

  const peakLabel = vm.peakHour >= 0 ? HOUR_LABELS[vm.peakHour] : '—';
  const top =
    vm.topConsumer && vm.topConsumer.kWh > 0
      ? `<span class="stat__dot" style="background:${escapeHtml(
          vm.topConsumer.color,
        )}"></span>${escapeHtml(vm.topConsumer.name)} · ${fmtKWh(
          vm.topConsumer.kWh,
        )}`
      : '—';

  const bp = vm.cost.byPeriod;

  el.innerHTML = `
    <div class="stat">
      <span class="stat__label">Total (day)</span>
      <span class="stat__value">${fmtKWh(vm.dayTotalKWh)}</span>
      <span class="stat__sub">${fmtMoney(vm.dayCost)} estimated</span>
    </div>
    <div class="stat">
      <span class="stat__label">Peak hour</span>
      <span class="stat__value">${peakLabel}</span>
    </div>
    <div class="stat">
      <span class="stat__label">Top consumer</span>
      <span class="stat__value">${top}</span>
    </div>
    <div class="stat">
      <span class="stat__label">Daily average (range)</span>
      <span class="stat__value">${fmtKWh(vm.avgPerDay)}</span>
    </div>
    <div class="stat stat--wide">
      <span class="stat__label">By tariff period (day)</span>
      <span class="stat__periods">
        <span class="badge badge--valley">Valley · ${fmtKWh(bp.valley.kWh)} · ${fmtMoney(bp.valley.cost)}</span>
        <span class="badge badge--flat">Flat · ${fmtKWh(bp.flat.kWh)} · ${fmtMoney(bp.flat.cost)}</span>
        <span class="badge badge--peak">Peak · ${fmtKWh(bp.peak.kWh)} · ${fmtMoney(bp.peak.cost)}</span>
      </span>
    </div>
  `;
}
