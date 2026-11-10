import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllWorkouts } from '../lib/db';
import { getExercise } from '../data/exercises';

export function Progress() {
  const [ws, setWs] = useState<any[]>([]);
  useEffect(() => { getAllWorkouts().then(setWs); }, []);
  const days = new Set(ws.map(w => w.localDay)).size;
  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <h1>Progress</h1>
      <p>Lifting days: {days}</p>
      {ws.length === 0 && <p style={{ color: '#666' }}>No sessions yet.</p>}
      {ws.map(w => (
        <div key={w.id} style={{ padding: 10, background: '#161616', borderRadius: 8, marginBottom: 8 }}>
          <div>{w.localDay} {w.partial && <span style={{ fontSize: 11, color: '#db8' }}>Partial</span>}</div>
          {Object.values(w.slots).map((s: any) => <div key={s.exerciseId} style={{ fontSize: 13, color: '#bbb' }}>{getExercise(s.exerciseId)?.name}: {s.sets.map((x:any)=>`${x.weight}×${x.reps}`).join(', ')||'—'}</div>)}
        </div>
      ))}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', background: '#111', borderTop: '1px solid #333', maxWidth: 480, margin: '0 auto' }}>
        <Link to="/" style={{ flex: 1, padding: 16, textAlign: 'center', color: '#888' }}>Today</Link>
        <Link to="/progress" style={{ flex: 1, padding: 16, textAlign: 'center', color: '#4a9eff' }}>Progress</Link>
      </nav>
    </div>
  );
}
