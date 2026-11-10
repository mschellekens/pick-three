import { useState } from 'react';
import type { Region } from '../../domain/types';
import { REGIONS } from '../../domain/catalog';
import type { AttentionState, RegionAttention } from '../../domain/attention';
import type { RegionStrength, StrengthState } from '../../domain/strength';
import { Avatar, type Look } from '../components/Avatar';
import { AvatarPanel } from '../components/AvatarPanel';
import { IconBack } from '../components/icons';

const COPY = [
  {
    h: 'Pick three. Get stronger.',
    p: ['Everyone has a list of things you should do in the gym. Start with three lifts you care about getting stronger at.', 'You choose the lifts. Do whatever else you feel like.'],
    cta: 'Continue',
  },
  {
    h: 'Train full body. Beat your last good set.',
    p: ['Choose one lower-body lift, one push, and one pull. Train those muscles regularly. When you’re ready, go for one more clean rep or a little more weight.', 'Tap to log what you did. We’ll remember it.'],
    cta: 'Continue',
  },
  {
    h: 'See what’s stronger. See what needs attention.',
    p: ['Your avatar shows where your lifts are improving and which areas you’ve trained lately. Use it to decide what to train next. The choice is yours.'],
    cta: 'Pick my three',
  },
];

/** Hardcoded example states. Never stored, never mixed with real history. */
const EX_ATT: Record<Region, AttentionState> = { quads: 'recent', glutes: 'rotation', hamstrings: 'attention', chest: 'recent', shoulders: 'rotation', back: 'attention', triceps: 'rotation', biceps: 'rotation', rearShoulders: 'noData' };
const EX_STR: Record<Region, StrengthState> = { quads: 'improving', glutes: 'steady', hamstrings: 'baseline', chest: 'improving', shoulders: 'steady', back: 'improving', triceps: 'none', biceps: 'none', rearShoulders: 'none' };
const exampleAttention = (): RegionAttention[] =>
  REGIONS.map((region) => ({ region, state: EX_ATT[region], lastPrimary: null, daysSince: null, daysInWeek: 0, lastSecondary: null, primaryLifts: [], secondaryLifts: [] }));
const exampleStrength = (): RegionStrength[] => REGIONS.map((region) => ({ region, state: EX_STR[region], pct: null, lifts: [] }));

function ArtOne({ look }: { look: Look }) {
  return (
    <div style={{ position: 'relative', width: 'min(260px, 70vw)' }}>
      <Avatar view="front" look={look} label="Original athlete character with three highlighted areas: legs, chest and back." paint={{ quads: { color: '#FF7A1A', pattern: 'solid' }, chest: { color: '#FF7A1A', pattern: 'solid' } }} />
      {[
        ['1', 'Lower body', '-4%', '74%'],
        ['2', 'Push', '62%', '22%'],
        ['3', 'Pull', '62%', '40%'],
      ].map(([n, l, x, y]) => (
        <div key={n} aria-hidden="true" style={{ position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 6, background: '#161a21', border: '1px solid #ff7a1a', borderRadius: 999, padding: '4px 10px 4px 4px', fontWeight: 800, fontSize: 13 }}>
          <span style={{ width: 22, height: 22, borderRadius: 11, background: '#ff7a1a', color: '#1a0d03', display: 'grid', placeItems: 'center' }}>{n}</span>
          {l}
        </div>
      ))}
    </div>
  );
}

function ArtTwo() {
  return (
    <svg viewBox="0 0 300 260" width="min(300px, 80vw)" role="img" aria-label="Illustration: last time 60 by 8, today 60 by 9, one more clean rep.">
      <g stroke="#0A0C11" strokeWidth="3" strokeLinejoin="round">
        <rect x="20" y="118" width="260" height="12" rx="6" fill="#a3abb9" />
        <rect x="34" y="78" width="22" height="92" rx="6" fill="#273041" />
        <rect x="58" y="90" width="16" height="68" rx="5" fill="#3A465D" />
        <rect x="244" y="78" width="22" height="92" rx="6" fill="#273041" />
        <rect x="226" y="90" width="16" height="68" rx="5" fill="#3A465D" />
      </g>
      <g opacity="0.35" stroke="#FF7A1A" strokeWidth="3" strokeLinecap="round">
        <line x1="96" y1="60" x2="96" y2="36" />
        <line x1="150" y1="54" x2="150" y2="22" />
        <line x1="204" y1="60" x2="204" y2="36" />
      </g>
      <rect x="40" y="186" width="100" height="56" rx="12" fill="#161a21" stroke="#2a303b" strokeDasharray="5 4" strokeWidth="2" />
      <text x="90" y="208" textAnchor="middle" fill="#a3abb9" fontSize="12" fontWeight="700">LAST TIME</text>
      <text x="90" y="230" textAnchor="middle" fill="#f2f4f7" fontSize="18" fontWeight="800">60 × 8</text>
      <rect x="160" y="186" width="100" height="56" rx="12" fill="#2a1a0e" stroke="#FF7A1A" strokeWidth="2" />
      <text x="210" y="208" textAnchor="middle" fill="#ffd2b1" fontSize="12" fontWeight="700">TODAY</text>
      <text x="210" y="230" textAnchor="middle" fill="#f2f4f7" fontSize="18" fontWeight="800">60 × 9</text>
      <path d="M144,214 L156,214 M151,209 L156,214 L151,219" stroke="#FF7A1A" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(150 96)">
        <path d="M0,-34 L9,-12 L32,-14 L14,2 L22,24 L0,12 L-22,24 L-14,2 L-32,-14 L-9,-12 Z" fill="#FF7A1A" stroke="#0A0C11" strokeWidth="3" strokeLinejoin="round" />
        <text y="6" textAnchor="middle" fill="#1a0d03" fontSize="15" fontWeight="900">+1</text>
      </g>
    </svg>
  );
}

export function Onboarding({ look, onDone }: { look: Look; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<'attention' | 'strength'>('attention');
  const c = COPY[i];
  return (
    <main className="onb fade-in" key={i}>
      <div className="onb-top">
        {i > 0 ? (
          <button className="icon-btn" onClick={() => setI(i - 1)} aria-label="Back">
            <IconBack />
          </button>
        ) : (
          <span className="brand" aria-hidden="true">
            Pick <b>Three</b>
          </span>
        )}
        <div className="dots" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={i + 1} aria-label={`Intro step ${i + 1} of 3`}>
          {[0, 1, 2].map((d) => (
            <span key={d} className={d === i ? 'on' : ''} />
          ))}
        </div>
      </div>
      <div className="onb-art">
        {i === 0 ? <ArtOne look={look} /> : null}
        {i === 1 ? <ArtTwo /> : null}
        {i === 2 ? (
          <div style={{ width: '100%' }}>
            <div className="seg" role="group" aria-label="Example avatar mode" style={{ display: 'flex', justifyContent: 'center', margin: '0 auto 8px', width: 'fit-content' }}>
              <button aria-pressed={mode === 'attention'} onClick={() => setMode('attention')}>
                Training attention
              </button>
              <button aria-pressed={mode === 'strength'} onClick={() => setMode('strength')}>
                Strength progress
              </button>
            </div>
            {mode === 'attention' ? (
              <AvatarPanel mode="attention" example data={exampleAttention()} look={look} today="2026-01-01" frequency={3} size="sm" showList={false} />
            ) : (
              <AvatarPanel mode="strength" example data={exampleStrength()} look={look} today="2026-01-01" unit="kg" size="sm" showList={false} />
            )}
          </div>
        ) : null}
      </div>
      <h1>{c.h}</h1>
      {c.p.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <div className="onb-cta">
        <button className="btn primary big" onClick={() => (i < 2 ? setI(i + 1) : onDone())}>
          {c.cta}
        </button>
      </div>
    </main>
  );
}
