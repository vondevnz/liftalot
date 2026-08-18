export type Unit = "kg" | "lb";

export const LB_PER_KG = 2.2046226218;

/**
 * Kilograms are the only stored unit. Pounds is a render-time conversion, so
 * flipping the setting never rewrites a row and never loses precision beyond
 * the numeric(6,2) the column already has.
 */
export function fromKg(kg: number, unit: Unit): number {
  return unit === "lb" ? kg * LB_PER_KG : kg;
}

export function toKg(value: number, unit: Unit): number {
  return unit === "lb" ? value / LB_PER_KG : value;
}

/**
 * Display rounding. Half-kilo steps match the smallest plate pair most gyms
 * have; pounds go to one decimal and drop a trailing .0, which absorbs the
 * round-trip drift from storing 135 lb as 61.24 kg.
 */
export function roundForDisplay(value: number, unit: Unit): number {
  return unit === "lb" ? Math.round(value * 10) / 10 : Math.round(value * 100) / 100;
}

/** "60 kg" / "135 lb". Null weight is a bodyweight movement. */
export function formatWeight(kg: number | null, unit: Unit): string | null {
  if (kg === null) return null;
  return `${trim(roundForDisplay(fromKg(kg, unit), unit))} ${unit}`;
}

/** The number alone, for input fields and axis ticks. */
export function displayWeight(kg: number, unit: Unit): number {
  return trim(roundForDisplay(fromKg(kg, unit), unit));
}

/** Drops a trailing .0 so inputs read "60" rather than "60.0". */
function trim(n: number): number {
  return Number(n.toFixed(2).replace(/\.?0+$/, "")) || n;
}

export function isUnit(value: unknown): value is Unit {
  return value === "kg" || value === "lb";
}
