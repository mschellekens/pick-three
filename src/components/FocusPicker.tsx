import { useState } from 'react';
import { SHORTLIST, LIBRARY, type Exercise } from '../data/exercises';

export function FocusPicker({ onStart }: { onStart: (ids: string[]) => void }) {
  const [active, setActive] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState<Exercise | null>(null);
  const [showLib, setShowLib] = useState(false);

  const toggle = (id: string) => {
    setActive(p => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const list = extra ? [...SHORTLIST, extra] : SHORTLIST;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '8px 0 12px' }}>
        <div style={{ fontSize: 13, letterSpacing: 1, color: '#8a8a8a', textTransform: 'uppercase' }}>Focus today</div>
        <div style={{ fontSize: 12, color: '#666' }}>{active.size} active</div>
      </div>
      {list.map(e => {
        const on = active.has(e.id);
        return (
          <button key={e.id} onClick={() => toggle(e.id)} style={{
            display: 'flex', width: '100%', alignItems: 'center', gap: 12,
            padding: '14px 14px', marginBottom: 8, borderRadius: 12, textAlign: 'left',
            background: on ? 'linear-gradient(135deg,#1a2433,#121820)' : '#111',
            border: on ? '1px solid #4a9eff' : '1px solid #222', color: '#eee',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, border: on ? 'none' : '1.5px solid #444',
              background: on ? '#4a9eff' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>{on && <span style={{ color: '#fff', fontSize: 14 }}>✓</span>}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{e.name}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{e.regions.join(' · ')}{e.holyGrail ? ' · Holy grail' : ''}</div>
            </div>
          </button>
        );
      })}
      <button onClick={() => setShowLib(true)} style={{ width: '100%', padding: 12, marginTop: 4, background: 'transparent', border: '1px dashed #333', borderRadius: 10, color: '#888' }}>+ Add from library</button>
      {active.size > 0 && (
        <button onClick={() => onStart([...active])} style={{ width: '100%', padding: 16, marginTop: 14, background: '#4a9eff', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600 }}>
          Start · {active.size}
        </button>
      )}
      {showLib && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 20, padding: 16, overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Library</h3>
            <button onClick={() => setShowLib(false)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 16 }}>Close</button>
          </div>
          {LIBRARY.filter(e => !SHORTLIST.some(s => s.id === e.id)).map(e => (
            <button key={e.id} onClick={() => { setExtra(e); setActive(p => new Set(p).add(e.id)); setShowLib(false); }} style={{ display: 'block', width: '100%', padding: 14, marginTop: 8, background: '#161616', border: '1px solid #222', borderRadius: 10, color: '#eee', textAlign: 'left' }}>
              <div style={{ fontWeight: 600 }}>{e.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{e.regions.join(' · ')}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
