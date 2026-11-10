import { useState } from 'react';
import { exercisesForSlot, type Slot } from '../data/exercises';

const LABELS: Record<Slot, string> = { lower: 'Lower body', push: 'Push', pull: 'Pull' };

export function Picker({ onStart, onCancel }: { onStart: (s: Record<Slot,string>) => void; onCancel: () => void }) {
  const [sel, setSel] = useState<Record<Slot, string|null>>({ lower: null, push: null, pull: null });
  const [active, setActive] = useState<Slot|null>(null);
  const can = sel.lower && sel.push && sel.pull;
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2>Pick your three</h2><button onClick={onCancel}>Cancel</button></div>
      {(['lower','push','pull'] as Slot[]).map(s => (
        <button key={s} onClick={() => setActive(s)} style={{ display: 'block', width: '100%', padding: 14, margin: '8px 0', textAlign: 'left', background: sel[s] ? '#1e2a3a' : '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#eee' }}>
          <div style={{ fontSize: 12, color: '#888' }}>{LABELS[s]}</div>
          <div>{sel[s] ? exercisesForSlot(s).find(e=>e.id===sel[s])?.name : 'Tap to choose'}</div>
        </button>
      ))}
      <button disabled={!can} onClick={() => can && onStart(sel as any)} style={{ width: '100%', padding: 16, marginTop: 16, background: can ? '#4a9eff' : '#333', color: '#fff', border: 'none', borderRadius: 8 }}>Start workout</button>
      {active && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', padding: 16, overflow: 'auto', zIndex: 10 }}>
          <button onClick={() => setActive(null)}>Close</button>
          <h3>Choose {LABELS[active]}</h3>
          {exercisesForSlot(active).map(e => (
            <button key={e.id} onClick={() => { setSel(p => ({...p, [active]: e.id})); setActive(null); }} style={{ display: 'block', width: '100%', padding: 12, margin: 4, background: '#222', border: 'none', color: '#eee', textAlign: 'left', borderRadius: 6 }}>
              {e.name} <small style={{ color: '#888' }}>{e.primaryRegions.join(', ')}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
