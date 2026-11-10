import { useId, type ReactNode } from 'react';
import type { Region } from '../../domain/types';

/**
 * Original athletic character system. Two looks share identical body geometry and region
 * semantics, so changes in highlighting always read as changes in training data.
 */
export type Look = 'ember' | 'tide';
export type Pattern = 'solid' | 'hatch' | 'dots' | 'none';
export interface RegionPaint {
  color: string | null; // null = uncolored
  pattern?: Pattern;
}

interface LookDef {
  name: string;
  skin: string;
  skinShade: string;
  hair: string;
  hairHi: string;
  outfit: string;
  outfitHi: string;
  accent: string;
  eye: string;
}

export const LOOKS: Record<Look, LookDef> = {
  ember: { name: 'Ember', skin: '#E7B392', skinShade: '#C88C6C', hair: '#1A1D27', hairHi: '#C2343C', outfit: '#273041', outfitHi: '#3A465D', accent: '#FF7A1A', eye: '#1A1D27' },
  tide: { name: 'Tide', skin: '#90603F', skinShade: '#6E4630', hair: '#DCE2EC', hairHi: '#8FA3C4', outfit: '#2E2740', outfitHi: '#463C5E', accent: '#36C2D6', eye: '#14161D' },
};

const INK = '#0A0C11';
const SW = 2.4;

/** Left half shapes (viewer's left). Mirrored for the right half. */
const FRONT = {
  shoulders: 'M80,100 C65,99 54,110 53,126 C53,138 57,147 62,151 C66,137 74,125 87,117 C89,110 87,103 80,100 Z',
  chest: 'M119,104 L93,106 C83,112 77,124 77,138 C85,152 101,157 119,151 Z',
  biceps: 'M62,153 C55,165 53,182 55,198 L71,199 C73,184 74,167 70,151 C67,149 64,150 62,153 Z',
  quads: 'M80,286 C72,314 72,347 80,375 L111,379 C117,351 119,318 115,294 L99,290 Z',
};
const BACK = {
  rearShoulders: FRONT.shoulders,
  back: 'M119,95 L104,95 C93,97 84,100 80,104 C84,112 88,122 87,134 C89,160 95,186 101,207 L119,213 Z',
  triceps: FRONT.biceps,
  glutes: 'M119,227 L88,223 C80,237 78,257 82,273 C94,285 110,285 119,277 Z',
  hamstrings: FRONT.quads,
};

const SKIN = {
  neck: 'M110,78 L130,78 L135,97 L105,97 Z',
  torso: 'M120,96 L104,96 C92,98 81,100 74,106 C67,114 67,126 71,136 C73,162 77,192 85,224 L120,228 Z',
  abs: 'M119,153 C103,159 89,157 80,149 C80,178 84,201 90,223 L119,227 Z',
  forearm: 'M55,200 C51,224 49,246 51,262 L65,262 C67,246 70,224 71,201 Z',
  fist: 'M49,262 C44,271 46,286 55,289 C64,291 69,282 67,264 Z',
  shin: 'M83,379 C77,404 79,428 85,450 L105,450 C111,428 113,404 109,381 Z',
};
const SHOE = 'M81,450 L106,450 L110,469 L69,469 C69,461 74,454 81,450 Z';
const SHORTS = 'M85,220 L155,220 L163,283 L127,291 L120,263 L113,291 L77,283 Z';

function Half({ children, mirror }: { children: ReactNode; mirror?: boolean }) {
  return mirror ? <g transform="translate(240 0) scale(-1 1)">{children}</g> : <g>{children}</g>;
}

interface Props {
  view: 'front' | 'back';
  look: Look;
  paint: Partial<Record<Region, RegionPaint>>;
  onRegion?: (r: Region) => void;
  selected?: Region | null;
  label: string;
  className?: string;
  pulse?: boolean;
}

export function Avatar({ view, look, paint, onRegion, selected, label, className, pulse }: Props) {
  const L = LOOKS[look];
  const uid = useId().replace(/:/g, '');
  const hatch = `h${uid}`;
  const dots = `d${uid}`;
  const light = `l${uid}`;

  const region = (r: Region, d: string, base: string) => {
    const p = paint[r];
    const overlay =
      p?.color && p.pattern !== 'none' ? (
        <path d={d} fill={p.pattern === 'hatch' ? `url(#${hatch})` : p.pattern === 'dots' ? `url(#${dots})` : p.color} opacity={p.pattern === 'hatch' || p.pattern === 'dots' ? 1 : 0.92} pointerEvents="none" style={p.pattern === 'hatch' || p.pattern === 'dots' ? { color: p.color } : undefined} />
      ) : null;
    return (
      <g
        key={r}
        data-region={r}
        className={`av-region${onRegion ? ' av-tap' : ''}${selected === r ? ' av-selected' : ''}`}
        onClick={onRegion ? () => onRegion(r) : undefined}
      >
        <path d={d} fill={base} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        {overlay}
        {p?.color && p.pattern !== 'solid' && p.pattern !== 'none' ? <path d={d} fill={p.color} opacity={0.35} pointerEvents="none" /> : null}
        <path d={d} fill="none" stroke={INK} strokeWidth={SW} strokeLinejoin="round" pointerEvents="none" />
      </g>
    );
  };

  const skin = (d: string, k: string) => <path key={k} d={d} fill={L.skin} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />;
  const line = (d: string, k: string, o = 0.55) => <path key={k} d={d} fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" opacity={o} pointerEvents="none" />;

  const half = (mirror: boolean) => (
    <Half mirror={mirror}>
      {skin(SKIN.torso, 'torso')}
      {view === 'front' ? (
        <>
          {skin(SKIN.abs, 'abs')}
          {line('M119,170 C110,172 100,171 90,168', 'ab1', 0.4)}
          {line('M119,190 C110,192 101,191 93,189', 'ab2', 0.4)}
          {line('M119,208 C111,210 104,209 97,207', 'ab3', 0.35)}
          {line('M84,150 C88,180 92,200 96,220', 'obl', 0.3)}
          {region('chest', FRONT.chest, L.skin)}
          {line('M93,140 C102,146 112,147 118,145', 'pecline', 0.35)}
          {region('shoulders', FRONT.shoulders, L.skin)}
          {line('M66,118 C70,128 72,136 70,146', 'delt', 0.35)}
          {region('biceps', FRONT.biceps, L.skin)}
        </>
      ) : (
        <>
          {region('back', BACK.back, L.skin)}
          {line('M119,110 C108,116 98,122 90,126', 'trap', 0.35)}
          {line('M119,140 C112,150 106,170 104,196', 'spine', 0.3)}
          {line('M88,140 C94,150 100,160 104,172', 'lat', 0.35)}
          {region('rearShoulders', BACK.rearShoulders, L.skin)}
          {region('triceps', BACK.triceps, L.skin)}
        </>
      )}
      {skin(SKIN.forearm, 'fa')}
      <path d="M51,252 L66,252 L65,262 L51,262 Z" fill={look === 'tide' ? '#EEF1F6' : L.accent} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      {skin(SKIN.fist, 'fist')}
      {line('M50,272 C55,274 61,274 66,272', 'knuck', 0.4)}
      {skin(SKIN.shin, 'shin')}
      {line(view === 'front' ? 'M96,388 C94,410 94,428 96,446' : 'M86,392 C90,404 98,408 106,396', 'calf', 0.35)}
      <path d={SHOE} fill={L.outfit} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M74,462 L108,462" stroke={L.accent} strokeWidth={3} strokeLinecap="round" />
    </Half>
  );

  const legs = (mirror: boolean) => (
    <Half mirror={mirror}>
      {view === 'front' ? region('quads', FRONT.quads, L.skin) : region('hamstrings', BACK.hamstrings, L.skin)}
      {view === 'front' ? line('M100,300 C104,326 104,350 98,372', 'quadline', 0.4) : line('M98,300 C98,330 97,352 96,374', 'hamline', 0.4)}
      {view === 'front' ? line('M86,362 C92,372 102,374 110,370', 'knee', 0.35) : null}
    </Half>
  );

  return (
    <svg viewBox="0 0 240 480" role="img" aria-label={label} className={`avatar${pulse ? ' avatar-pulse' : ''}${className ? ` ${className}` : ''}`}>
      <defs>
        <pattern id={hatch} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="currentColor" opacity="0.5" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="currentColor" strokeWidth="3.5" />
        </pattern>
        <pattern id={dots} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.6" fill="currentColor" />
        </pattern>
        <linearGradient id={light} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      {/* Speed lines, decorative */}
      <g opacity="0.18" stroke={L.accent} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <line x1="14" y1="120" x2="40" y2="120" />
        <line x1="8" y1="160" x2="34" y2="160" />
        <line x1="200" y1="140" x2="230" y2="140" />
        <line x1="206" y1="190" x2="228" y2="190" />
        <line x1="18" y1="330" x2="44" y2="330" />
        <line x1="198" y1="350" x2="224" y2="350" />
      </g>

      {/* Back hair layer and ponytail sit behind the head */}
      {look === 'tide' && view === 'front' ? (
        <path d="M140,26 C164,18 178,36 170,62 C166,48 158,40 146,40 Z" fill={L.hair} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      ) : null}
      {look === 'ember' ? (
        <path d={view === 'front' ? 'M141,44 C156,46 166,54 172,66 C160,60 152,58 142,58 Z' : 'M126,44 C140,56 146,70 146,86 C138,74 130,66 120,60 Z'} fill={L.accent} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      ) : null}

      <path d={SKIN.neck} fill={L.skin} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      {line('M114,90 L118,96', 'neck1', 0.4)}
      {line('M126,90 L122,96', 'neck2', 0.4)}

      {half(false)}
      {half(true)}

      {/* Shorts. On the back view the glutes region carries the fabric. */}
      {view === 'front' ? (
        <>
          <path d={SHORTS} fill={L.outfit} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M120,236 L120,262" stroke={INK} strokeWidth={1.6} opacity={0.5} />
        </>
      ) : (
        <>
          <Half>{region('glutes', BACK.glutes, L.outfit)}</Half>
          <Half mirror>{region('glutes', BACK.glutes, L.outfit)}</Half>
          <path d="M85,220 L155,220 L156,228 L84,228 Z" fill={L.outfitHi} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M80,276 L84,288 L114,292 L119,280 M160,276 L156,288 L126,292 L121,280" fill="none" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        </>
      )}
      {view === 'front' ? <path d="M85,220 L155,220 L156,229 L84,229 Z" fill={L.outfitHi} stroke={INK} strokeWidth={SW} strokeLinejoin="round" /> : null}
      <path d="M84,224 L156,224" stroke={L.accent} strokeWidth={2} opacity={0.9} />

      {legs(false)}
      {legs(true)}

      {/* Head */}
      <path d="M98,40 C98,22 108,14 120,14 C132,14 142,22 142,40 L142,56 C142,70 132,81 120,84 C108,81 98,70 98,56 Z" fill={L.skin} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M97,48 C92,48 92,60 98,62 Z M143,48 C148,48 148,60 142,62 Z" fill={L.skinShade} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      {view === 'front' ? (
        <g aria-hidden="true">
          <path d="M102,48 L116,51" stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
          <path d="M138,48 L124,51" stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
          <path d="M104,55 L116,54 L115,60 C111,62 106,60 104,55 Z" fill={L.eye} />
          <path d="M136,55 L124,54 L125,60 C129,62 134,60 136,55 Z" fill={L.eye} />
          <circle cx="112.5" cy="56.5" r="1.4" fill="#fff" />
          <circle cx="127.5" cy="56.5" r="1.4" fill="#fff" />
          <path d="M120,60 L118,67 L121,67" fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
          <path d="M114,73 C118,75 122,75 126,73" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        </g>
      ) : null}

      {/* Hair */}
      {look === 'ember' ? (
        view === 'front' ? (
          <>
            <path d="M95,50 L88,30 L99,34 L96,14 L109,23 L115,4 L124,19 L135,7 L137,23 L150,17 L145,34 L153,33 L145,50 C142,38 134,31 120,31 C106,31 99,38 95,50 Z" fill={L.hair} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M99,38 L107,50 L111,35 L120,47 L124,33 L133,46 L139,36 C131,28 109,28 99,38 Z" fill={L.hair} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M109,23 L115,10 M124,19 L133,12" stroke={L.hairHi} strokeWidth={2.4} strokeLinecap="round" />
            <path d="M98,40 L142,40 L142,46 L98,46 Z" fill={L.accent} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          </>
        ) : (
          <>
            <path d="M94,58 L86,36 L98,38 L94,16 L108,24 L115,4 L124,19 L135,7 L137,23 L151,16 L146,36 L155,38 L146,58 C146,74 134,82 120,82 C106,82 94,74 94,58 Z" fill={L.hair} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M108,24 L115,10 M124,19 L133,12" stroke={L.hairHi} strokeWidth={2.4} strokeLinecap="round" />
            <path d="M97,40 L143,40 L143,46 L97,46 Z" fill={L.accent} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          </>
        )
      ) : view === 'front' ? (
        <>
          <path d="M95,52 C90,24 106,10 124,11 C143,12 152,30 145,54 C141,40 132,31 117,33 C105,35 99,43 95,52 Z" fill={L.hair} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M101,38 C110,30 126,28 138,36 L129,40 L131,48 L121,40 L113,50 L112,40 Z" fill={L.hair} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M112,18 C120,14 132,16 138,24" stroke={L.hairHi} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <path d="M95,56 C90,24 106,10 124,11 C143,12 152,30 145,58 C142,74 132,80 120,80 C108,80 98,74 95,56 Z" fill={L.hair} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M113,30 C102,60 106,98 120,124 C134,98 138,60 127,30 Z" fill={L.hair} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M117,60 C116,80 117,98 120,114" stroke={L.hairHi} strokeWidth={2} strokeLinecap="round" fill="none" />
          <path d="M112,28 L128,28 L127,38 L113,38 Z" fill={L.accent} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <path d="M108,22 C116,18 128,18 134,24" stroke={L.hairHi} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        </>
      )}
    </svg>
  );
}
