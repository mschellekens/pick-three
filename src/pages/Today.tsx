import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Picker } from '../components/Picker';
import { WorkoutLogger } from '../components/WorkoutLogger';
import { saveWorkout } from '../lib/db';
import type { Slot } from '../data/exercises';

export function Today() {
  const [view, setView] = useState<'dash'|'pick'|'log'|'done'>('dash');
  const [sel, setSel] = useState<Record<Slot, string>|null>(null);

  if (view === 'pick') return <Picker onStart={s => { setSel(s); setView('log'); }} onCancel={() => setView('dash')} />;
  if (view === 'log' && sel) return <WorkoutLogger selections={sel} onFinish={async (data) => {
    await saveWorkout({ id: crypto.randomUUID(), localDay: new Date().toISOString().slice(0,10), slots: Object.fromEntries(Object.entries(data.selections).map(([k,id]) => [k, { exerciseId: id, sets: data.sets[id]||[] }])), partial: data.partial });
    setView('done');
  }} onBack={() => setView('pick')} />;
  if (view === 'done') return <div style={{ padding: 24, textAlign: 'center' }}><h2>Workout saved</h2><button onClick={() => setView('dash')} style={{ padding: 12, background: '#4a9eff', color: '#fff', border: 'none', borderRadius: 8 }}>Done</button></div>;

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <h1>Today</h1>
      <p style={{ color: '#999' }}>Your first workout starts your training map.</p>
      <button onClick={() => setView('pick')} style={{ width: '100%', padding: 16, background: '#4a9eff', color: '#fff', border: 'none', borderRadius: 10, fontSize: 17 }}>Pick your three</button>
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', background: '#111', borderTop: '1px solid #333', maxWidth: 480, margin: '0 auto' }}>
        <Link to="/" style={{ flex: 1, padding: 16, textAlign: 'center', color: '#4a9eff' }}>Today</Link>
        <Link to="/progress" style={{ flex: 1, padding: 16, textAlign: 'center', color: '#888' }}>Progress</Link>
      </nav>
    </div>
  );
}
