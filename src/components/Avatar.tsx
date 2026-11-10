import { useEffect, useState } from 'react';
import type { Region } from '../data/exercises';

const REGIONS: { id: Region; top: string; left: string; w: string; h: string }[] = [
  { id: 'Chest', top: '22%', left: '32%', w: '36%', h: '14%' },
  { id: 'Shoulders', top: '16%', left: '18%', w: '64%', h: '10%' },
  { id: 'Arms', top: '28%', left: '6%', w: '22%', h: '28%' },
  { id: 'Core', top: '38%', left: '34%', w: '32%', h: '18%' },
  { id: 'Back', top: '18%', left: '30%', w: '40%', h: '30%' },
];

export function Avatar({ volume }: { volume: Partial<Record<Region, number>> }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    fetch('./avatars/front.b64').then(r => r.text()).then(b => setSrc('data:image/jpeg;base64,' + b.trim())).catch(() => {});
  }, []);
  const total = Object.values(volume).reduce((a, b) => a + (b || 0), 0);
  const intensity = Math.min(1, total / 40);
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 280, margin: '0 auto', aspectRatio: '3/4', borderRadius: 16, overflow: 'hidden', background: '#0a0a0a' }}>
      {src ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `contrast(${1 + intensity * 0.15}) saturate(${1 + intensity * 0.3})` }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg,#1a1a1a,#0a0a0a)' }} />
      )}
      {REGIONS.filter(r => (volume[r.id] || 0) > 0).map(r => {
        const v = Math.min(1, (volume[r.id] || 0) / 12);
        return (
          <div key={r.id} style={{
            position: 'absolute', top: r.top, left: r.left, width: r.w, height: r.h,
            background: `radial-gradient(ellipse, rgba(74,158,255,${0.25 + v * 0.45}) 0%, transparent 70%)`,
            mixBlendMode: 'screen', pointerEvents: 'none', borderRadius: '50%',
            transform: `scale(${1 + v * 0.15})`,
          }} />
        );
      })}
      <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', fontSize: 11, letterSpacing: 1, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
        {total === 0 ? 'Start training' : `${Math.round(intensity * 100)}% developed`}
      </div>
    </div>
  );
}
