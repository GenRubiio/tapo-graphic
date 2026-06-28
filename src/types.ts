/** Shared domain types for the Tapo consumption dashboard (pure, no side effects). */

/** One hour-bucket of consumption for a single item. */
export interface HourlyRecord {
  /** Original timestamp re-hydrated as a Date (display/sort only). */
  timestamp: Date;
  /** Canonical date key, verbatim "YYYY/MM/DD" portion. Source of truth for grouping. */
  dateISO: string;
  /** Integer hour 0-23 (top-of-hour). */
  hour: number;
  /** Consumption in kWh. */
  kWh: number;
}

/** A registered Tapo item (one smart plug). */
export interface TapoItem {
  id: string;
  name: string;
  /** Deterministic HSL color assigned by index. */
  color: string;
  /** Parsed Consumo records, or null if none uploaded yet. */
  consumo: HourlyRecord[] | null;
}

export interface AppState {
  items: TapoItem[];
  /** Currently selected calendar day ("YYYY/MM/DD") or null when no days. */
  selectedDay: string | null;
}

/** 24-slot kWh series, index === hour (0-23). */
export type DaySeries = number[]; // length 24
