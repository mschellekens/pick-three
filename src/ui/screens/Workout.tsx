import { useEffect, useState } from 'react';
import { actions, useStore } from '../../state/store';
import { SLOT_LABEL, SLOTS, type SetInput } from '../../domain/types';
import { mustExercise } from '../../domain/catalog';
import { finishKind, inputToSet, setToInput } from '../../domain/draft';
import { seriesSessions } from '../../domain/history';
import { stepFor } from '../../domain/progression';
import { setText } from '../../domain/strength';
import { fmtShortDate } from '../../domain/dates';
import { ExerciseSheet } from '../components/ExerciseSheet';
import { SetEditor } from '../components/SetEditor';
import { Sheet } from '../components/Sheet';
import { IconBack, IconEdit, IconSwap, IconTrash } from '../components/icons';
import { go } from '../router';
import { toast } from '../toast';

export function Workout() {
  const st = useStore();
  const d = st.draft;
  const [editing, setEditing] = useState<{ id: string; input: SetInput } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [showCue, setShowCue] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapConfirm, setSwapConfirm] = useState<string | null>(null);
  const [finishSheet, setFinishSheet] = useState<null | 'partial' | 'empty'>(null);

  useEffect(() => {
    if (st.status !== 'ready') return;
    if (!d) go(st.lastFinish ? `done/${st.lastFinish.workoutId}` : 'today', { replace: true });
    else if (d.status !== 'active') go('pick', { replace: true });
  }, [st.status, d, st.lastFinish]);

  useEffect(() => {
    setEditing(null);
    setConfirmRemove(null);
    setShowCue(false);
  }, [d?.active]);

  if (!d || d.status !== 'active') return null;
  const slot = d.active;
  const ds = d.slots[slot]!;
  const ex = mustExercise(ds.exerciseId);
  const unit = st.settings.unit;
  const step = stepFor(ex, unit, st.settings.increments);
  const sessions = seriesSessions(st.workouts, ds.seriesId);
  const last = sessions[sessions.length - 1];
  const sug = ds.suggestion;
  const unlogged = ds.sets.length === 0 && !ds.input.touched;

  const withUndo = (label: string) =>
    toast({ text: label, action: { label: 'Undo', run: () => void actions.undo().then((ok) => ok && toast({ text: 'Undone' })) } });

  const doLog = async () => {
    const text = setText(ex, inputToSet(ex, ds.input, new Date()), unit);
    const n = ds.sets.length + 1;
    if (await actions.logSet(slot)) withUndo(`Set ${n} logged · ${text}`);
  };

  const doFinish = async () => {
    const k = finishKind(d);
    if (k !== 'full') {
      setFinishSheet(k);
      return;
    }
    await save();
  };
  const save = async () => {
    const r = await actions.finish();
    if (r.ok) go(`done/${r.workoutId}`, { replace: true });
    else toast({ text: r.error, kind: 'error' });
  };

  return (
    <main>
      <header className="session-head">
        <div className="spread">
          <button className="icon-btn" onClick={() => go('today')} aria-label="Back to Today. Your workout stays saved as a draft">
            <IconBack />
          </button>
          <h1 style={{ fontSize: '1.05rem', margin: 0 }}>Workout</h1>
          <button className="btn small" onClick={doFinish} disabled={st.pending} data-testid="finish">
            Finish
          </button>
        </div>
        <div className="tabs" role="tablist" aria-label="Your three lifts">
          {SLOTS.map((s) => {
            const x = d.slots[s]!;
            const e = mustExercise(x.exerciseId);
            return (
              <button key={s} role="tab" className="tab" aria-selected={s === slot} onClick={() => void actions.setActive(s)} data-testid={`tab-${s}`} aria-label={`${SLOT_LABEL[s]}: ${e.name}, ${x.sets.length} sets logged`}>
                <span className="t1">
                  {SLOT_LABEL[s]}
                  <span className="count">{x.sets.length}</span>
                </span>
                <span className="t2">{e.name}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div role="tabpanel" aria-label={ex.name}>
        <div className="spread">
          <h2 className="lift-title">{ex.name}</h2>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="icon-btn" aria-label="Swap lift" onClick={() => setSwapOpen(true)}>
              <IconSwap />
            </button>
          </div>
        </div>
        <div className="row wrap" style={{ marginBottom: 10 }}>
          <button className="link-btn small" aria-expanded={showCue} onClick={() => setShowCue((v) => !v)}>
            {showCue ? 'Hide setup cue' : 'Setup cue'}
          </button>
          {ex.setupSensitive && ds.sets.length === 0 ? (
            <button
              className="link-btn small"
              onClick={async () => {
                if (await actions.newSetup(slot)) toast({ text: 'New setup started. Earlier sets are kept separately.' });
              }}
            >
              New setup
            </button>
          ) : null}
        </div>
        {showCue ? (
          <div className="cue" style={{ marginBottom: 10 }}>
            <span>
              {ex.cue}
              {ex.setupSensitive ? <span className="faint"> Machine readings compare only on the same setup.</span> : null}
            </span>
          </div>
        ) : null}
        {!st.settings.cueDismissed ? (
          <div className="cue" style={{ marginBottom: 10 }} role="note">
            <span>Use a consistent setup and range of motion. Count the reps you complete cleanly.</span>
            <button className="link-btn small" onClick={() => void actions.updateSettings({ cueDismissed: true })}>
              Got it
            </button>
          </div>
        ) : null}

        <div className="stack-sm">
          <section className="panel past" aria-label="Last time">
            <div className="label">Last time</div>
            {last ? (
              <>
                <div className="small muted">{fmtShortDate(last.localDate)}</div>
                <div className="set-chips">
                  {last.sets.map((s) => (
                    <span key={s.id}>{setText(ex, s, unit)}</span>
                  ))}
                </div>
              </>
            ) : (
              <div className="small muted">No comparable sets yet{ex.setupSensitive ? ' on this setup' : ''}.</div>
            )}
          </section>
          <section className="panel target" aria-label="Today's target">
            <div className="label">Today’s target</div>
            <div className="big">{sug ? sug.message : 'Set your baseline'}</div>
            {sug ? <div className="small muted">{sug.detail}</div> : null}
            <div className="tiny faint" style={{ marginTop: 4 }}>
              Optional. Log what actually happened.
            </div>
          </section>

          {editing ? (
            <SetEditor
              exercise={ex}
              title={`Edit set ${ds.sets.findIndex((s) => s.id === editing.id) + 1}`}
              input={editing.input}
              step={step}
              onChange={(p) => setEditing((e) => (e ? { ...e, input: { ...e.input, ...(typeof p === 'function' ? p(e.input) : p) } } : e))}
            />
          ) : (
            <SetEditor
              exercise={ex}
              title={`Your set ${ds.sets.length + 1}`}
              input={ds.input}
              step={step}
              unlogged={unlogged}
              onChange={(p) => void actions.updateInput(slot, p)}
              onStepChange={(v) => void actions.updateSettings({ increments: { ...st.settings.increments, [`${ex.id}:${unit}`]: v } })}
            />
          )}

          {ds.sets.length ? (
            <ol className="logged" aria-label="Logged sets">
              {ds.sets.map((s, i) => (
                <li key={s.id} className={editing?.id === s.id ? 'editing' : ''}>
                  <span className="idx">{i + 1}</span>
                  <span className="what">{setText(ex, s, unit)}</span>
                  {confirmRemove === s.id ? (
                    <>
                      <button
                        className="btn danger small"
                        onClick={async () => {
                          setConfirmRemove(null);
                          setEditing(null);
                          if (await actions.removeSet(slot, s.id)) withUndo(`Set ${i + 1} removed`);
                        }}
                      >
                        Remove
                      </button>
                      <button className="btn small ghost" onClick={() => setConfirmRemove(null)}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="icon-btn" aria-label={`Edit set ${i + 1}`} onClick={() => setEditing({ id: s.id, input: setToInput(s) })}>
                        <IconEdit />
                      </button>
                      <button className="icon-btn" aria-label={`Remove set ${i + 1}`} onClick={() => setConfirmRemove(s.id)}>
                        <IconTrash />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>

      <div className="action-bar">
        <div className="inner">
          {editing ? (
            <div className="row">
              <button className="btn" style={{ flex: 1 }} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                className="btn primary"
                style={{ flex: 2, minHeight: 58 }}
                onClick={async () => {
                  const idx = ds.sets.findIndex((s) => s.id === editing.id) + 1;
                  if (await actions.editSet(slot, editing.id, editing.input)) {
                    setEditing(null);
                    withUndo(`Set ${idx} updated`);
                  }
                }}
              >
                Save set
              </button>
            </div>
          ) : (
            <button className="btn primary big" onClick={doLog} disabled={st.pending} data-testid="log-set">
              Log set
            </button>
          )}
        </div>
      </div>

      {swapOpen ? (
        <ExerciseSheet
          slot={slot}
          current={ds.exerciseId}
          workouts={st.workouts}
          meta={st.meta}
          settings={st.settings}
          unit={unit}
          onToggleFavorite={(id) => void actions.toggleFavorite(id)}
          onClose={() => setSwapOpen(false)}
          onPick={async (id) => {
            if (id === ds.exerciseId) return setSwapOpen(false);
            if (ds.sets.length) {
              setSwapOpen(false);
              setSwapConfirm(id);
              return;
            }
            if (await actions.chooseLift(slot, id)) setSwapOpen(false);
          }}
        />
      ) : null}
      {swapConfirm ? (
        <Sheet title={`Swap ${ex.name}?`} onClose={() => setSwapConfirm(null)}>
          <p className="muted">
            Swapping to {mustExercise(swapConfirm).name} removes the {ds.sets.length} {ds.sets.length === 1 ? 'set' : 'sets'} you logged for {ex.name} in this workout.
          </p>
          <div className="stack-sm">
            <button
              className="btn danger block"
              onClick={async () => {
                const n = ds.sets.length;
                if (await actions.chooseLift(slot, swapConfirm)) {
                  setSwapConfirm(null);
                  toast({ text: `Swapped. ${n} ${n === 1 ? 'set' : 'sets'} removed.` });
                }
              }}
            >
              Swap and remove sets
            </button>
            <button className="btn block" onClick={() => setSwapConfirm(null)}>
              Keep {ex.name}
            </button>
          </div>
        </Sheet>
      ) : null}
      {finishSheet ? (
        <Sheet title={finishSheet === 'empty' ? 'Nothing logged yet' : 'Save a partial workout?'} onClose={() => setFinishSheet(null)} testId="finish-sheet">
          {finishSheet === 'empty' ? (
            <>
              <p className="muted">A workout needs at least one logged set. Keep training, or discard this draft.</p>
              <div className="stack-sm">
                <button className="btn primary block" onClick={() => setFinishSheet(null)}>
                  Keep training
                </button>
                <button
                  className="btn danger block"
                  onClick={async () => {
                    if (await actions.discardDraft()) {
                      setFinishSheet(null);
                      go('today', { replace: true });
                    }
                  }}
                >
                  Discard draft
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="muted">
                {SLOTS.filter((s) => !d.slots[s]!.sets.length)
                  .map((s) => mustExercise(d.slots[s]!.exerciseId).name)
                  .join(' and ')}{' '}
                {SLOTS.filter((s) => !d.slots[s]!.sets.length).length === 1 ? 'has' : 'have'} no sets. Your logged sets are kept and the workout is marked Partial.
              </p>
              <div className="stack-sm">
                <button
                  className="btn primary block"
                  disabled={st.pending}
                  onClick={async () => {
                    setFinishSheet(null);
                    await save();
                  }}
                >
                  Save partial workout
                </button>
                <button className="btn block" onClick={() => setFinishSheet(null)}>
                  Keep training
                </button>
              </div>
            </>
          )}
        </Sheet>
      ) : null}
    </main>
  );
}
