/**
 * All money math happens in integer paise to avoid float drift.
 * Rupee amounts (as used in forms, DB `numeric` columns, and APIs) are strings or numbers
 * with up to 2 decimal places; paise are always integers.
 */

export function rupeesToPaise(rupees: number | string): number {
  const n = typeof rupees === "string" ? Number(rupees) : rupees;
  if (!Number.isFinite(n)) throw new Error(`Invalid rupee amount: ${rupees}`);
  return Math.round(n * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function paiseToRupeeString(paise: number): string {
  return (paise / 100).toFixed(2);
}

export function addPaise(...amounts: number[]): number {
  return amounts.reduce((sum, a) => sum + Math.round(a), 0);
}

export function subtractPaise(a: number, b: number): number {
  return Math.round(a) - Math.round(b);
}

export function sumRupees(amounts: (number | string)[]): number {
  const totalPaise = amounts.reduce<number>((sum, a) => sum + rupeesToPaise(a), 0);
  return paiseToRupees(totalPaise);
}

/** Splits must sum exactly to the parent amount; used by transaction_splits validation. */
export function splitsMatchTotal(total: number | string, splits: (number | string)[]): boolean {
  const totalPaise = rupeesToPaise(total);
  const splitPaise = splits.reduce<number>((sum, s) => sum + rupeesToPaise(s), 0);
  return totalPaise === splitPaise;
}

/** Distributes a total across N equal shares in paise, giving any remainder to the first shares. */
export function splitEvenly(total: number | string, parts: number): number[] {
  const totalPaise = rupeesToPaise(total);
  const base = Math.floor(totalPaise / parts);
  const remainder = totalPaise - base * parts;
  return Array.from({ length: parts }, (_, i) => paiseToRupees(base + (i < remainder ? 1 : 0)));
}
