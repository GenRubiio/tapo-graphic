import type { TapoItem } from '../types';
import { unionDays } from '../data/aggregate';

export interface ItemCardCallbacks {
  onRename(id: string, name: string): void;
  onDelete(id: string): void;
  onConsumoDrop(id: string, file: File): void;
}

function statusSummary(item: TapoItem): string {
  if (!item.consumo || item.consumo.length === 0) {
    return 'Drop a "Consumo de energía(kWh)" file to load data.';
  }
  const days = unionDays([item]); // newest first
  const dayCount = days.length;
  // Display the range chronologically (oldest – newest).
  const range =
    dayCount > 0 ? `${days[dayCount - 1]} – ${days[0]}` : '';
  return `${item.consumo.length} records · ${dayCount} day(s) · ${range}`;
}

/** Build a single item card element with its name field, drop zones and actions. */
export function renderItemCard(
  item: TapoItem,
  callbacks: ItemCardCallbacks,
): HTMLElement {
  const card = document.createElement('article');
  card.className = 'item-card';
  card.dataset.itemId = item.id;
  card.style.setProperty('--item-color', item.color);

  // --- Header row: name input + delete button ---
  const header = document.createElement('div');
  header.className = 'item-card__header';

  const swatch = document.createElement('span');
  swatch.className = 'item-card__swatch';
  swatch.style.backgroundColor = item.color;
  swatch.setAttribute('aria-hidden', 'true');

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'item-card__name';
  nameInput.value = item.name;
  nameInput.setAttribute('aria-label', 'Item name');
  nameInput.addEventListener('change', () =>
    callbacks.onRename(item.id, nameInput.value.trim() || item.name),
  );
  nameInput.addEventListener('blur', () =>
    callbacks.onRename(item.id, nameInput.value.trim() || item.name),
  );

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'item-card__delete';
  deleteBtn.textContent = 'Delete';
  deleteBtn.setAttribute('aria-label', `Delete ${item.name}`);
  deleteBtn.addEventListener('click', () => callbacks.onDelete(item.id));

  header.append(swatch, nameInput, deleteBtn);

  // --- Drop zones ---
  const zones = document.createElement('div');
  zones.className = 'item-card__zones';

  // Active "Consumo de energía(kWh)" zone. Compact once data is loaded so that
  // many items stay readable; still fully drag/click-droppable to replace.
  const hasData = !!(item.consumo && item.consumo.length > 0);
  const consumoZone = document.createElement('div');
  consumoZone.className = hasData
    ? 'drop-zone drop-zone--active drop-zone--loaded'
    : 'drop-zone drop-zone--active';
  consumoZone.setAttribute('role', 'button');
  consumoZone.setAttribute('tabindex', '0');
  consumoZone.setAttribute(
    'aria-label',
    hasData
      ? 'Replace the "Consumo de energía(kWh)" file'
      : 'Drop the "Consumo de energía(kWh)" file here',
  );
  consumoZone.innerHTML = hasData
    ? '<span class="drop-zone__icon" aria-hidden="true">✓</span><strong>Consumption loaded</strong><span class="drop-zone__hint">Click to replace</span>'
    : '<span class="drop-zone__icon" aria-hidden="true">📈</span><strong>“Consumo de energía(kWh)”</strong><span class="drop-zone__hint">Drag the .xls or click</span>';

  const handleFiles = (files: FileList | null): void => {
    const file = files?.[0];
    if (file) callbacks.onConsumoDrop(item.id, file);
  };

  consumoZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    consumoZone.classList.add('drop-zone--over');
  });
  consumoZone.addEventListener('dragleave', () =>
    consumoZone.classList.remove('drop-zone--over'),
  );
  consumoZone.addEventListener('drop', (e) => {
    e.preventDefault();
    consumoZone.classList.remove('drop-zone--over');
    handleFiles(e.dataTransfer?.files ?? null);
  });

  // Re-upload via click -> hidden file input.
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.xls';
  fileInput.className = 'item-card__file-input';
  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
    fileInput.value = '';
  });
  consumoZone.addEventListener('click', () => fileInput.click());
  consumoZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  zones.append(consumoZone, fileInput);

  // --- Status line ---
  const status = document.createElement('p');
  status.className = 'item-card__status';
  status.textContent = statusSummary(item);

  card.append(header, zones, status);
  return card;
}
