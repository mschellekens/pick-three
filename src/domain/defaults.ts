import type { Meta, Series, Settings } from './types';
import { defaultUnitForLocale } from './units';

export function defaultSettings(locale?: string): Settings {
  return {
    unit: defaultUnitForLocale(locale),
    frequency: 3,
    equipment: [],
    look: 'ember',
    increments: {},
    favorites: [],
    cueDismissed: false,
    peerComparison: 'off',
  };
}

export function defaultMeta(): Meta {
  return { currentSeries: {}, series: [], milestones: [] };
}

export function firstSeriesId(exerciseId: string): string {
  return `${exerciseId}:1`;
}

/** Current series for an exercise, creating the first one if needed. Returns a new meta when it changed. */
export function ensureSeries(meta: Meta, exerciseId: string, now: string): { meta: Meta; seriesId: string } {
  const cur = meta.currentSeries[exerciseId];
  if (cur) return { meta, seriesId: cur };
  const s: Series = { id: firstSeriesId(exerciseId), exerciseId, createdAt: now, index: 1 };
  const exists = meta.series.some((x) => x.id === s.id);
  return {
    meta: { ...meta, currentSeries: { ...meta.currentSeries, [exerciseId]: s.id }, series: exists ? meta.series : [...meta.series, s] },
    seriesId: s.id,
  };
}

/** Start a new comparison series for an exercise. The old one is preserved. */
export function newSeries(meta: Meta, exerciseId: string, now: string): { meta: Meta; seriesId: string } {
  const index = Math.max(0, ...meta.series.filter((s) => s.exerciseId === exerciseId).map((s) => s.index)) + 1;
  const s: Series = { id: `${exerciseId}:${index}`, exerciseId, createdAt: now, index };
  return { meta: { ...meta, currentSeries: { ...meta.currentSeries, [exerciseId]: s.id }, series: [...meta.series, s] }, seriesId: s.id };
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
