import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllWorkouts } from '../lib/db';
import { getExercise } from '../data/exercises';
import { Avatar } from '../components/Avatar';

export function Progress() {
  const [ws, setWs] = useState<any[]>([]);
  useEffect(() => { getAllWorkouts().then(setWs); }, []);

  const vol: any = {};
  ws.forEach(w => {
    Object.values(w.slots || {}).forEach((s: any) => {
      const e = getExercise(s.exerciseId);
      e?.regions.forEach(r => { vol[r] = (vol[r] || 0) + (s.sets?.length || 0); });
    });
  });

  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Progress</div>
      <Avatar volume={vol} />
      <div style={{ height: 16 }} />
      {ws.length === 0 && <p style={{ color: '#555', textAlign: 'center' }}>No sessions yet.</p>}
      {ws.slice().reverse().map(w => (
        <div key={w.id} style={{ background: '#111', borderRadius: 12, padding: 12, marginBottom: 8, border: '1px solid #1a1a1a' }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>{w.localDay}</div>
          {Object.values(w.slots || {}).map((s: any) => (
            <div key={s.exerciseId} style={{ fontSize: 14, padding: '3px 0' }}>
              <span style={{ color: '#ddd' }}>{getExercise(s.exerciseId)?.name}</span>
              <span style={{ color: '#666', marginLeft: 8 }}>{(s.sets||[]).map((x:any)=>`${x.weight}×${x.reps}`).join('  ') || '—'}</span>
            </div>
          ))}
        </div>
      ))}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', background: '#0a0a0a', borderTop: '1px solid #1a1a1a', maxWidth: 480, margin: '0 auto' }}>
        <Link to="/" style={{ flex: 1, padding: 16, textAlign: 'center', color: '#666' }}>Today</Link>
        <Link to="/progress" style={{ flex: 1, padding: 16, textAlign: 'center', color: '#4a9eff', fontWeight: 600 }}>Progress</Link>
      </nav>
    </div>
  );
}
