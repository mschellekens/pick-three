import type { LoadInput, LoggedSet, Unit } from './types';

export const KG_PER_LB = 0.45359237;

export function toKg(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}
export function fromKg(kg: number, unit: Unit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}

/** Load value of a set in the requested unit. Exact when the set was entered in that unit. */
export function setLoadIn(set: Pick<LoggedSet, 'input' | 'loadKg'>, unit: Unit): number {
  if (set.input.unit === unit) return set.input.value;
  return round(fromKg(set.loadKg, unit), 1);
}

export function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export function fmtNum(n: number): string {
  const r = round(n, 2);
  return Number.isInteger(r) ? String(r) : String(r).replace(/0+$/, '');
}

export function makeInput(value: number, unit: Unit): { input: LoadInput; loadKg: number } {
  const v = round(value, 3);
  return { input: { value: v, unit }, loadKg: toKg(v, unit) };
}

export function defaultUnitForLocale(locale: string | undefined): Unit {
  if (!locale) return 'kg';
  return /^en-US\b/i.test(locale) || locale.toLowerCase() === 'en-us' ? 'lb' : 'kg';
}

/** Tolerance in kg for "same load" comparisons, covers lb↔kg rounding of a single entry. */
export const LOAD_EPS_KG = 0.05;
export function sameLoad(a: number, b: number): boolean {
  return Math.abs(a - b) <= LOAD_EPS_KG;
}
