import { Chart, type ChartConfiguration } from 'chart.js';

export interface ChartPanel {
  /** Pass a config to render/update; pass null to clear and show the empty state. */
  update(config: ChartConfiguration | null): void;
  destroy(): void;
  /** PNG data URL of the current chart, or null when there is nothing to export. */
  toImage(): string | null;
}

/**
 * Wrap a canvas + its sibling empty-state node, managing the Chart.js instance
 * lifecycle (destroy before re-create on each update).
 */
export function initChartPanel(canvasId: string): ChartPanel {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error(`Canvas #${canvasId} not found`);
  }
  const wrapper = canvas.closest('.chart-wrapper');
  const emptyNode = wrapper?.querySelector<HTMLElement>('.chart-empty') ?? null;

  let chart: Chart | null = null;

  function setEmptyVisible(visible: boolean): void {
    if (emptyNode) emptyNode.classList.toggle('visible', visible);
    canvas!.style.display = visible ? 'none' : '';
  }

  function destroy(): void {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  }

  function update(config: ChartConfiguration | null): void {
    if (!config) {
      destroy();
      setEmptyVisible(true);
      return;
    }
    setEmptyVisible(false);
    // Recreate for simplicity and to guarantee annotation/scale refresh.
    destroy();
    chart = new Chart(canvas!, config);
  }

  function toImage(): string | null {
    if (!chart) return null;
    // White background is guaranteed by the global 'whiteBackground' plugin.
    return chart.toBase64Image('image/png', 1);
  }

  return { update, destroy, toImage };
}
