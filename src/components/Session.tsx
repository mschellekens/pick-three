import { useState } from 'react';
import { getExercise } from '../data/exercises';

export function Session({ ids, onFinish, onBack }: { ids: string[]; onFinish: (sets: Record<string, {weight:number;reps:number}[]>) => void; onBack: () => void }) {
  const [sets, setSets] = useState<Record<string, {weight:number;reps:number}[]>>({});
  const [cur, setCur] = useState<Record<string, {w:number;r:number}>>({});

  const getCur = (id: string) => cur[id] || { w: 0, r: 8 };
  const setCurFor = (id: string, patch: Partial<{w:number;r:number}>) => setCur(p => ({ ...p, [id]: { ...getCur(id), ...patch } }));

  const log = (id: string) => {
    const c = getCur(id);
    setSets(p => ({ ...p, [id]: [...(p[id]||[]), { weight: c.w, reps: c.r }] }));
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#888', fontSize: 15 }}>← Back</button>
        <div style={{ fontSize: 13, color: '#666' }}>{ids.length} exercises</div>
      </div>
      {ids.map(id => {
        const e = getExercise(id);
        if (!e) return null;
        const c = getCur(id);
        const logged = sets[id] || [];
        const step = e.step || 5;
        return (
          <div key={id} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 14, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{e.name}</div>
            <div style={{ fontSize: 12, color: '#777', margin: '2px 0 10px' }}>{e.regions.join(' · ')}</div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', margin: '8px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>WEIGHT</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => setCurFor(id, { w: Math.max(0, c.w - step) })} style={btn}>−</button>
                  <span style={{ fontSize: 26, minWidth: 52, textAlign: 'center' }}>{c.w}</span>
                  <button onClick={() => setCurFor(id, { w: c.w + step })} style={btn}>+</button>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>REPS</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => setCurFor(id, { r: Math.max(1, c.r - 1) })} style={btn}>−</button>
                  <span style={{ fontSize: 26, minWidth: 36, textAlign: 'center' }}>{c.r}</span>
                  <button onClick={() => setCurFor(id, { r: c.r + 1 })} style={btn}>+</button>
                </div>
              </div>
            </div>
            <button onClick={() => log(id)} style={{ width: '100%', padding: 10, background: '#1e2a3a', border: '1px solid #2a4a6a', borderRadius: 8, color: '#4a9eff', fontWeight: 600 }}>Log set</button>
            {logged.map((s, i) => (
              <div key={i} style={{ fontSize: 13, color: '#aaa', marginTop: 6, padding: '4px 0', borderTop: i ? '1px solid #1a1a1a' : 'none' }}>{s.weight} lb × {s.reps}</div>
            ))}
          </div>
        );
      })}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: 12, background: '#0a0a0a', borderTop: '1px solid #1a1a1a', maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => onFinish(sets)} style={{ width: '100%', padding: 16, background: '#2d8a4e', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700 }}>Complete</button>
      </div>
    </div>
  );
}

const btn = { width: 40, height: 40, borderRadius: 8, background: '#1a1a1a', border: '1px solid #333', color: '#fff', fontSize: 18 };
