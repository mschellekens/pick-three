import { useState } from 'react';
import { actions, useStore } from '../../state/store';
import { mustExercise } from '../../domain/catalog';
import { SLOT_LABEL, SLOTS, type SetInput, type Slot } from '../../domain/types';
import { fmtDate } from '../../domain/dates';
import { sortWorkouts } from '../../domain/history';
import { stepFor } from '../../domain/progression';
import { setText } from '../../domain/strength';
import { setToInput } from '../../domain/draft';
import { IconBack, IconEdit } from '../components/icons';
import { SetEditor } from '../components/SetEditor';
import { Sheet } from '../components/Sheet';
import { back, go } from '../router';
import { toast } from '../toast';

export function History({ day }: { day?: string }) {
  const st = useStore();
  const list = sortWorkouts(st.workouts)
    .reverse()
    .filter((w) => !day || w.localDate === day);
  return (
    <main className="fade-in">
      <header className="topbar">
        <button className="icon-btn" onClick={() => back('today')} aria-label="Back">
          <IconBack />
        </button>
        <h1>{day ? fmtDate(day) : 'History'}</h1>
        <span style={{ width: 44 }} />
      </header>
      {list.length === 0 ? <p className="muted">{day ? 'No workouts on this day.' : 'No workouts yet. Your saved workouts will show here.'}</p> : null}
      <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {list.map((w) => (
          <li key={w.id}>
            <button className="hist-row" onClick={() => go(`history/${w.id}`)}>
              <span style={{ flex: 1 }}>
                <span className="d" style={{ display: 'block' }}>
                  {fmtDate(w.localDate)} {w.partial ? <span className="badge partial">Partial</span> : <span className="badge">Full</span>}
                </span>
                <span className="l">{w.entries.map((e) => `${mustExercise(e.exerciseId).name} (${e.sets.length})`).join(' · ')}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

export function WorkoutDetail({ id }: { id: string }) {
  const st = useStore();
  const w = st.workouts.find((x) => x.id === id);
  const [edit, setEdit] = useState<{ slot: Slot; setId: string; input: SetInput } | null>(null);
  const [del, setDel] = useState(false);
  if (!w) {
    return (
      <main className="stack" style={{ paddingTop: 30 }}>
        <p className="muted">This workout was deleted.</p>
        <button className="btn" onClick={() => go('history', { replace: true })}>
          Back to history
        </button>
      </main>
    );
  }
  const unit = st.settings.unit;
  const total = w.entries.reduce((n, e) => n + e.sets.length, 0);
  const editEx = edit ? mustExercise(w.entries.find((e) => e.slot === edit.slot)!.exerciseId) : null;

  return (
    <main className="fade-in">
      <header className="topbar">
        <button className="icon-btn" onClick={() => back('history')} aria-label="Back">
          <IconBack />
        </button>
        <h1 style={{ fontSize: '1.15rem' }}>{fmtDate(w.localDate)}</h1>
        <span style={{ width: 44 }} />
      </header>
      <p className="small muted" style={{ marginTop: 0 }}>
        {w.partial ? <span className="badge partial">Partial</span> : <span className="badge">Full</span>} {total} sets. Tap a set to edit it.
      </p>
      <div className="stack-sm">
        {SLOTS.map((s) => {
          const e = w.entries.find((x) => x.slot === s);
          if (!e) return null;
          const ex = mustExercise(e.exerciseId);
          return (
            <section key={s} className="card" style={{ padding: 12 }} aria-label={ex.name}>
              <div className="tiny muted" style={{ fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {SLOT_LABEL[s]}
              </div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{ex.name}</div>
              {e.sets.length === 0 ? <div className="small faint">Not logged</div> : null}
              <ol className="logged" style={{ marginTop: 0 }}>
                {e.sets.map((x, i) => (
                  <li key={x.id}>
                    <span className="idx">{i + 1}</span>
                    <span className="what">{setText(ex, x, unit)}</span>
                    <button className="icon-btn" aria-label={`Edit ${ex.name} set ${i + 1}`} onClick={() => setEdit({ slot: s, setId: x.id, input: setToInput(x) })}>
                      <IconEdit />
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
      <button className="btn danger block" style={{ marginTop: 20 }} onClick={() => setDel(true)}>
        Delete workout
      </button>

      {edit && editEx ? (
        <Sheet title={`Edit ${editEx.name}`} onClose={() => setEdit(null)} testId="edit-set-sheet">
          <div className="stack">
            <SetEditor exercise={editEx} title="Set" input={edit.input} step={stepFor(editEx, edit.input.unit, st.settings.increments)} onChange={(p) => setEdit((e) => (e ? { ...e, input: { ...e.input, ...(typeof p === 'function' ? p(e.input) : p) } } : e))} />
            <button
              className="btn primary big"
              onClick={async () => {
                if (await actions.editWorkoutSet(w.id, edit.slot, edit.setId, edit.input)) {
                  setEdit(null);
                  toast({ text: 'Set updated' });
                }
              }}
            >
              Save set
            </button>
            {total > 1 ? (
              <button
                className="btn danger block"
                onClick={async () => {
                  if (await actions.editWorkoutSet(w.id, edit.slot, edit.setId, null)) {
                    setEdit(null);
                    toast({ text: 'Set removed' });
                  }
                }}
              >
                Remove set
              </button>
            ) : (
              <p className="small muted">This is the only set. Delete the workout instead if you want to remove it.</p>
            )}
          </div>
        </Sheet>
      ) : null}
      {del ? (
        <Sheet title="Delete this workout?" onClose={() => setDel(false)}>
          <p className="muted">
            {fmtDate(w.localDate)} with {total} sets will be removed. Your progress, calendar and personal bests will be recalculated. This can’t be undone, so export a backup first if
            you might want it back.
          </p>
          <div className="stack-sm">
            <button
              className="btn danger block"
              onClick={async () => {
                if (await actions.deleteWorkout(w.id)) {
                  setDel(false);
                  toast({ text: 'Workout deleted' });
                  go('history', { replace: true });
                }
              }}
            >
              Delete workout
            </button>
            <button className="btn block" onClick={() => setDel(false)}>
              Keep it
            </button>
          </div>
        </Sheet>
      ) : null}
    </main>
  );
}
