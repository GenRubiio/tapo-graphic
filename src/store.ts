import type { TapoItem, HourlyRecord } from './types';
import { DEFAULT_PRICES, type TariffPrices } from './data/cost';

export type SaveResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'QUOTA_EXCEEDED' | 'WRITE_FAILED';
      message: string;
    };

export const KEYS = {
  registry: 'tapo_items',
  data: (id: string) => `tapo_data_${id}`,
  prices: 'tapo_prices',
} as const;

const QUOTA_MESSAGE =
  'Storage is full. Delete an item to free up space.';
const WRITE_MESSAGE = 'Could not save to local storage.';

/** Detect a QuotaExceededError across browsers. */
function isQuotaError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

function writeKey(key: string, value: string): SaveResult {
  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (err) {
    if (isQuotaError(err)) {
      return { ok: false, reason: 'QUOTA_EXCEEDED', message: QUOTA_MESSAGE };
    }
    return { ok: false, reason: 'WRITE_FAILED', message: WRITE_MESSAGE };
  }
}

/** Serialized shape of a record in localStorage (timestamp as ISO string). */
interface StoredRecord {
  timestamp: string;
  dateISO: string;
  hour: number;
  kWh: number;
}

/** Registry entry without the heavy consumo array (records live under a separate key). */
type StoredItem = Omit<TapoItem, 'consumo'>;

function rehydrateRecords(raw: string | null): HourlyRecord[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredRecord[];
    if (!Array.isArray(parsed)) return null;
    return parsed.map((r) => ({
      timestamp: new Date(r.timestamp),
      dateISO: r.dateISO,
      hour: r.hour,
      kWh: r.kWh,
    }));
  } catch {
    return null;
  }
}

/** Load registry + parsed records; re-hydrate HourlyRecord.timestamp Dates. */
export function loadState(): TapoItem[] {
  let registry: StoredItem[];
  try {
    const raw = localStorage.getItem(KEYS.registry);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    registry = parsed as StoredItem[];
  } catch {
    return [];
  }

  return registry.map((stored) => ({
    id: stored.id,
    name: stored.name,
    color: stored.color,
    consumo: rehydrateRecords(localStorage.getItem(KEYS.data(stored.id))),
  }));
}

/** Persist registry (names, ids, colors — NOT the records array). Quota-guarded. */
export function saveRegistry(items: TapoItem[]): SaveResult {
  const stripped: StoredItem[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    color: item.color,
  }));
  return writeKey(KEYS.registry, JSON.stringify(stripped));
}

/** Persist one item's parsed records as JSON. Quota-guarded, atomic per key. */
export function saveRecords(
  itemId: string,
  records: HourlyRecord[],
): SaveResult {
  const stored: StoredRecord[] = records.map((r) => ({
    timestamp: r.timestamp.toISOString(),
    dateISO: r.dateISO,
    hour: r.hour,
    kWh: r.kWh,
  }));
  return writeKey(KEYS.data(itemId), JSON.stringify(stored));
}

/** Load tariff prices, falling back to the editable defaults. */
export function loadPrices(): TariffPrices {
  try {
    const raw = localStorage.getItem(KEYS.prices);
    if (!raw) return { ...DEFAULT_PRICES };
    const parsed = JSON.parse(raw) as Partial<TariffPrices>;
    // Reject non-finite OR negative values (matches the input path in main.ts).
    const clean = (v: unknown, fallback: number): number =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
    return {
      valley: clean(parsed.valley, DEFAULT_PRICES.valley),
      flat: clean(parsed.flat, DEFAULT_PRICES.flat),
      peak: clean(parsed.peak, DEFAULT_PRICES.peak),
    };
  } catch {
    return { ...DEFAULT_PRICES };
  }
}

/** Persist tariff prices (quota-guarded). */
export function savePrices(prices: TariffPrices): SaveResult {
  return writeKey(KEYS.prices, JSON.stringify(prices));
}

/** Remove the item's data key and drop it from the registry. */
export function deleteItem(itemId: string, items: TapoItem[]): SaveResult {
  try {
    localStorage.removeItem(KEYS.data(itemId));
  } catch {
    // Removal failure is non-fatal; continue to update the registry.
  }
  const remaining = items.filter((item) => item.id !== itemId);
  return saveRegistry(remaining);
}
