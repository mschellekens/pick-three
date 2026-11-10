import { useMemo, useState } from 'react';
import { actions, useStore } from '../../state/store';
import { attentionObservations, computeAttention } from '../../domain/attention';
import { liftingDays } from '../../domain/history';
import { localDateOf } from '../../domain/dates';
import { SLOTS } from '../../domain/types';
import { mustExercise } from '../../domain/catalog';
import { loggedCount } from '../../domain/draft';
import { AvatarPanel } from '../components/AvatarPanel';
import { Sheet } from '../components/Sheet';
import { IconHistory, IconSettings } from '../components/icons';
import { ATTENTION_PAINT } from '../paint';
import { go } from '../router';
import { toast } from '../toast';

export function Today() {
  const st = useStore();
  const today = localDateOf(new Date());
  const att = useMemo(() => computeAttention(st.workouts, today, st.settings.frequency), [st.workouts, today, st.settings.frequency]);
  const obs = attentionObservations(att);
  const days = liftingDays(st.workouts);
  const draft = st.draft;
  const [confirm, setConfirm] = useState(false);
  const empty = days.length === 0;

  const pick = async () => {
    if (await actions.beginPicking()) go('pick');
  };

  return (
    <main className="fade-in">
      <header className="topbar">
        <span className="brand">
          Pick <b>Three</b>
        </span>
        <div className="row">
          <button className="icon-btn" aria-label="History" onClick={() => go('history')}>
            <IconHistory />
          </button>
          <button className="icon-btn" aria-label="Settings" onClick={() => go('settings')}>
            <IconSettings />
          </button>
        </div>
      </header>
      <h1 className="sr-only">Today</h1>

      {draft ? (
        <section className="card resume" aria-label="Workout in progress" style={{ marginBottom: 12 }}>
          <div className="spread">
            <div>
              <div className="small muted" style={{ fontWeight: 700 }}>
                {draft.status === 'active' ? 'Workout in progress' : 'Picking your three'}
              </div>
              <div style={{ fontWeight: 700, marginTop: 2 }}>
                {SLOTS.map((s) => (draft.slots[s] ? mustExercise(draft.slots[s]!.exerciseId).name : '—')).join(' · ')}
              </div>
              {draft.status === 'active' ? <div className="small muted tnum">{loggedCount(draft)} sets logged</div> : null}
            </div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" style={{ flex: 1 }} onClick={() => go(draft.status === 'active' ? 'workout' : 'pick')}>
              {draft.status === 'active' ? 'Resume workout' : 'Continue picking'}
            </button>
            <button className="btn ghost small" onClick={() => setConfirm(true)}>
              Start over
            </button>
          </div>
        </section>
      ) : null}

      <section className="hero-avatar" aria-label="Your training map">
        <AvatarPanel mode="attention" data={att} look={st.settings.look} today={today} frequency={st.settings.frequency} size="hero" showList="collapsed" />
        {empty ? <p className="empty-note">Your first workout starts your training map.</p> : null}
      </section>

      {obs.length ? (
        <section aria-label="Observations">
          <h2 className="section-title">What you’ve logged</h2>
          <ul className="obs">
            {obs.map((o) => (
              <li key={o.region}>
                <span className="dot" style={{ background: ATTENTION_PAINT[o.state].color ?? '#555' }} aria-hidden="true" />
                <span className="tnum">{o.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!draft ? (
        <div className="sticky-cta">
          <button className="btn primary big" onClick={pick}>
            Pick your three
          </button>
        </div>
      ) : null}

      {confirm ? (
        <Sheet title="Discard this workout?" onClose={() => setConfirm(false)}>
          <p className="muted">
            {draft && loggedCount(draft) > 0 ? `This removes ${loggedCount(draft)} logged ${loggedCount(draft) === 1 ? 'set' : 'sets'} that haven’t been saved as a workout.` : 'Your current picks will be cleared.'} Saved workouts are not affected.
          </p>
          <div className="stack-sm">
            <button
              className="btn danger block"
              onClick={async () => {
                if (await actions.discardDraft()) {
                  setConfirm(false);
                  toast({ text: 'Draft discarded' });
                }
              }}
            >
              Discard draft
            </button>
            <button className="btn block" onClick={() => setConfirm(false)}>
              Keep it
            </button>
          </div>
        </Sheet>
      ) : null}
    </main>
  );
}
