import { useState } from 'react';
import { useStore } from '../../state/store';
import { mustExercise } from '../../domain/catalog';
import { SLOT_LABEL, SLOTS } from '../../domain/types';
import { fmtDate } from '../../domain/dates';
import { setText, workoutPRs } from '../../domain/strength';
import { Avatar } from '../components/Avatar';
import { ShareSheet } from '../components/ShareSheet';
import { go } from '../router';

export function Done({ id }: { id: string }) {
  const st = useStore();
  const [share, setShare] = useState(false);
  const w = st.workouts.find((x) => x.id === id);
  if (!w) {
    return (
      <main className="stack" style={{ paddingTop: 40 }}>
        <p className="muted">This workout isn’t in your history anymore.</p>
        <button className="btn primary" onClick={() => go('today', { replace: true })}>
          Back to Today
        </button>
      </main>
    );
  }
  const fresh = st.lastFinish?.workoutId === id ? st.lastFinish.milestones : [];
  const prs = workoutPRs(st.workouts, id, st.settings.unit);
  const best = fresh.find((m) => m.kind === 'pr') ?? fresh[0] ?? null;
  const improvement = prs[0]?.text ?? null;
  const regions = [...new Set(w.entries.filter((e) => e.sets.length).flatMap((e) => mustExercise(e.exerciseId).primary))];
  const paint = Object.fromEntries(regions.map((r) => [r, { color: '#FF7A1A', pattern: 'solid' as const }]));

  return (
    <main className="fade-in">
      <div className="finish-hero">
        <div className="avatar-wrap sm">
          <Avatar view="front" look={st.settings.look} paint={paint} pulse={!!best} label={`Workout saved. Trained: ${regions.join(', ')}`} />
        </div>
        <h1>{best ? 'New milestone' : 'Workout saved'}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {fmtDate(w.localDate)} {w.partial ? <span className="badge partial">Partial</span> : null}
        </p>
      </div>

      {best || improvement ? (
        <section className="card" style={{ marginTop: 16, borderColor: '#1f5a41' }} aria-label="Improvement">
          <div className="small up" style={{ fontWeight: 800 }}>
            {best?.kind === 'consistency' ? 'Consistency' : 'Personal best'}
          </div>
          <div style={{ fontWeight: 750, marginTop: 4 }}>{best?.text ?? improvement}</div>
          {best?.kind === 'consistency' && improvement ? <div className="small muted" style={{ marginTop: 4 }}>{improvement}</div> : null}
        </section>
      ) : (
        <p className="muted" style={{ textAlign: 'center' }}>
          Logged and saved. Showing up is the work.
        </p>
      )}

      <section className="stack-sm" style={{ marginTop: 16 }} aria-label="Logged sets">
        {SLOTS.map((s) => {
          const e = w.entries.find((x) => x.slot === s);
          if (!e) return null;
          const ex = mustExercise(e.exerciseId);
          return (
            <div key={s} className="card" style={{ padding: 12 }}>
              <div className="tiny muted" style={{ fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {SLOT_LABEL[s]}
              </div>
              <div style={{ fontWeight: 700 }}>{ex.name}</div>
              {e.sets.length ? (
                <div className="set-chips">
                  {e.sets.map((x) => (
                    <span key={x.id}>{setText(ex, x, st.settings.unit)}</span>
                  ))}
                </div>
              ) : (
                <div className="small faint">Not logged</div>
              )}
            </div>
          );
        })}
      </section>

      <div className="stack-sm" style={{ marginTop: 18 }}>
        {best ? (
          <button className="btn block" onClick={() => setShare(true)}>
            Share milestone
          </button>
        ) : null}
        <button className="btn primary big" onClick={() => go('today', { replace: true })}>
          Done
        </button>
      </div>
      {share && best ? <ShareSheet look={st.settings.look} achievement={best.text} regions={regions} onClose={() => setShare(false)} /> : null}
    </main>
  );
}
