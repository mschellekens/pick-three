import { useState } from 'react';
import { getExercise, type Slot } from '../data/exercises';

export function WorkoutLogger({ selections, onFinish, onBack }: { selections: Record<Slot,string>; onFinish: (d: any) => void; onBack: () => void }) {
  const [active, setActive] = useState(Object.values(selections)[0]);
  const [sets, setSets] = useState<Record<string, {weight:number;reps:number}[]>>({});
  const [w, setW] = useState(0); const [r, setR] = useState(8);
  const ex = getExercise(active);
  const step = ex?.defaultStepLb || 5;
  const log = () => setSets(p => ({...p, [active]: [...(p[active]||[]), { weight: w, reps: r }]}));
  const all = Object.values(selections).every(id => (sets[id]||[]).length > 0);
  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12 }}>
        {Object.entries(selections).map(([slot, id]) => (
          <button key={slot} onClick={() => setActive(id)} style={{ padding: '6px 10px', background: active===id?'#4a9eff':'#333', border: 'none', borderRadius: 16, color: '#fff', fontSize: 13 }}>{getExercise(id)?.name.split(' ')[0]} · {(sets[id]||[]).length}</button>
        ))}
      </div>
      {ex && <>
        <h2 style={{ margin: '0 0 4px' }}>{ex.name}</h2>
        <div style={{ display: 'flex', justifyContent: 'space-around', margin: '20px 0' }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 12, color: '#888' }}>Weight</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><button onClick={() => setW(Math.max(0,w-step))} style={stepBtn}>−</button><span style={{ fontSize: 28, minWidth: 60 }}>{w}</span><button onClick={() => setW(w+step)} style={stepBtn}>+</button></div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 12, color: '#888' }}>Reps</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><button onClick={() => setR(Math.max(1,r-1))} style={stepBtn}>−</button><span style={{ fontSize: 28, minWidth: 40 }}>{r}</span><button onClick={() => setR(r+1)} style={stepBtn}>+</button></div></div>
        </div>
        <button onClick={log} style={{ width: '100%', padding: 14, background: '#4a9eff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16 }}>Log set</button>
        {(sets[active]||[]).map((s,i) => <div key={i} style={{ padding: 8, background: '#1a1a1a', marginTop: 4, borderRadius: 4 }}>{s.weight} lb × {s.reps}</div>)}
      </>}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: 12, background: '#0d0d0d', display: 'flex', gap: 8, maxWidth: 480, margin: '0 auto' }}>
        <button onClick={onBack} style={{ flex: 1, padding: 12 }}>Back</button>
        <button onClick={() => onFinish({ selections, sets, partial: !all })} style={{ flex: 2, padding: 12, background: '#3a9a5a', color: '#fff', border: 'none', borderRadius: 8 }}>{all ? 'Finish' : 'Save partial'}</button>
      </div>
    </div>
  );
}
const stepBtn = { width: 44, height: 44, fontSize: 20, background: '#2a2a2a', border: '1px solid #444', borderRadius: 8, color: '#fff' };
