import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FocusPicker } from '../components/FocusPicker';
import { Session } from '../components/Session';
import { Avatar } from '../components/Avatar';
import { saveWorkout, getAllWorkouts } from '../lib/db';
import { getExercise } from '../data/exercises';

export function Today() {
  const [view, setView] = useState<'home'|'session'|'done'>('home');
  const [ids, setIds] = useState<string[]>([]);
  const [vol, setVol] = useState<any>({});

  useEffect(() => {
    getAllWorkouts().then(ws => {
      const v: any = {};
      ws.forEach((w: any) => {
        Object.values(w.slots || {}).forEach((s: any) => {
          const e = getExercise(s.exerciseId);
          e?.regions.forEach(r => { v[r] = (v[r] || 0) + (s.sets?.length || 0); });
        });
      });
      setVol(v);
    });
  }, [view]);

  if (view === 'session') return (
    <div style={{ padding: 16 }}>
      <Session ids={ids} onBack={() => setView('home')} onFinish={async (sets) => {
        await saveWorkout({
          id: crypto.randomUUID(),
          localDay: new Date().toISOString().slice(0,10),
          slots: Object.fromEntries(ids.map(id => [id, { exerciseId: id, sets: sets[id] || [] }])),
        });
        setView('done');
      }} />
    </div>
  );

  if (view === 'done') return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>✓</div>
      <h2 style={{ margin: '0 0 8px' }}>Logged</h2>
      <p style={{ color: '#888' }}>Your focus lifts are saved.</p>
      <button onClick={() => setView('home')} style={{ marginTop: 20, padding: '14px 28px', background: '#4a9eff', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16 }}>Done</button>
    </div>
  );

  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>Today</div>
        <div style={{ fontSize: 12, color: '#555' }}>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
      </div>
      <Avatar volume={vol} />
      <div style={{ height: 18 }} />
      <FocusPicker onStart={selected => { setIds(selected); setView('session'); }} />
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', background: '#0a0a0a', borderTop: '1px solid #1a1a1a', maxWidth: 480, margin: '0 auto' }}>
        <Link to="/" style={{ flex: 1, padding: 16, textAlign: 'center', color: '#4a9eff', fontWeight: 600 }}>Today</Link>
        <Link to="/progress" style={{ flex: 1, padding: 16, textAlign: 'center', color: '#666' }}>Progress</Link>
      </nav>
    </div>
  );
}
