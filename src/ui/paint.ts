import type { Region } from '../domain/types';
import type { AttentionState, RegionAttention } from '../domain/attention';
import type { RegionStrength, StrengthState } from '../domain/strength';
import type { Pattern, RegionPaint } from './components/Avatar';

export interface LegendItem {
  label: string;
  color: string | null;
  pattern: Pattern;
}

export const ATTENTION_PAINT: Record<AttentionState, LegendItem> = {
  recent: { label: 'Recently trained', color: '#FF7A1A', pattern: 'solid' },
  rotation: { label: 'In rotation', color: '#A35E2C', pattern: 'solid' },
  attention: { label: 'Worth attention', color: '#F2C14E', pattern: 'hatch' },
  noDirect: { label: 'No direct work logged', color: '#8B93A3', pattern: 'dots' },
  noData: { label: 'No data yet', color: null, pattern: 'none' },
};

export const STRENGTH_PAINT: Record<StrengthState, LegendItem> = {
  improving: { label: 'Improving', color: '#3DDC97', pattern: 'solid' },
  steady: { label: 'Holding steady', color: '#5C7FA6', pattern: 'solid' },
  baseline: { label: 'Building baseline', color: '#8B93A3', pattern: 'dots' },
  none: { label: 'No logged lifts', color: null, pattern: 'none' },
};

export function attentionPaint(list: RegionAttention[]): Partial<Record<Region, RegionPaint>> {
  return Object.fromEntries(list.map((a) => [a.region, { color: ATTENTION_PAINT[a.state].color, pattern: ATTENTION_PAINT[a.state].pattern }]));
}
export function strengthPaint(list: RegionStrength[]): Partial<Record<Region, RegionPaint>> {
  return Object.fromEntries(list.map((a) => [a.region, { color: STRENGTH_PAINT[a.state].color, pattern: STRENGTH_PAINT[a.state].pattern }]));
}
