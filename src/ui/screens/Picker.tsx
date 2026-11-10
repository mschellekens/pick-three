import { useEffect, useState } from 'react';
import { actions, useStore } from '../../state/store';
import { SLOT_LABEL, SLOTS, type Region, type Slot } from '../../domain/types';
import { mustExercise, REGION_LABEL } from '../../domain/catalog';
import { allChosen } from '../../domain/draft';
import { seriesSessions } from '../../domain/history';
import { representativeSet } from '../../domain/progression';
import { setText } from '../../domain/strength';
import { Avatar } from '../components/Avatar';
import { ExerciseSheet } from '../components/ExerciseSheet';
import { IconBack } from '../components/icons';
import { back, go } from '../router';

export function Picker() {
  const st = useStore();
  const [open, setOpen] = useState<Slot | null>(null);
  const d = st.draft;

  useEffect(() => {
    if (st.status === 'ready' && !d) void actions.beginPicking();
    if (d?.status === 'active') go('workout', { replace: true });
  }, [st.status, d]);

  if (!d) return null;
  const chosen = SLOTS.filter((s) => d.slots[s]).map((s) => mustExercise(d.slots[s]!.exerciseId));
  const paint = Object.fromEntries(chosen.flatMap((e) => e.primary.map((r) => [r, { color: '#FF7A1A', pattern: 'solid' as const }]))) as Partial<Record<Region, { color: string; pattern: 'solid' }>>;
  const frontRegions = chosen.flatMap((e) => e.primary).filter((r) => ['quads', 'chest', 'shoulders', 'biceps'].includes(r));

  return (
    <main className="fade-in">
      <header className="topbar">
        <button className="icon-btn" onClick={() => back('today')} aria-label="Back to Today">
          <IconBack />
        </button>
        <h1>Pick your three</h1>
        <span style={{ width: 44 }} />
      </header>
      <p className="muted small" style={{ marginTop: 0 }}>
        One of each. Your picks are saved as you go.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px', gap: 12, alignItems: 'start' }}>
        <div className="slots">
          {SLOTS.map((s, i) => {
            const ds = d.slots[s];
            const ex = ds ? mustExercise(ds.exerciseId) : null;
            const ss = ds ? seriesSessions(st.workouts, ds.seriesId) : [];
            const last = ex && ss.length ? setText(ex, representativeSet(ex, ss[ss.length - 1].sets), st.settings.unit) : null;
            return (
              <button key={s} className={`slot${ex ? ' filled' : ''}`} onClick={() => setOpen(s)} data-testid={`slot-${s}`} aria-label={`${SLOT_LABEL[s]}: ${ex ? ex.name : 'empty'}. ${ex ? 'Change' : 'Choose'}`}>
                <span className="num-badge">{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="slot-label">{SLOT_LABEL[s]}</span>
                  <span className="slot-name" style={{ display: 'block' }}>
                    {ex ? ex.name : 'Choose a lift'}
                  </span>
                  {ex ? (
                    <span className="slot-meta tnum" style={{ display: 'block' }}>
                      {last ? `Last: ${last}` : 'New lift'}
                      {ds!.suggestion ? ` · ${ds!.suggestion.message}` : ''}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        <div aria-hidden={chosen.length === 0}>
          <Avatar view={frontRegions.length >= chosen.flatMap((e) => e.primary).length / 2 ? 'front' : 'back'} look={st.settings.look} paint={paint} label={chosen.length ? `Preview: ${[...new Set(chosen.flatMap((e) => e.primary))].map((r) => REGION_LABEL[r]).join(', ')}` : 'Preview: nothing chosen yet'} />
        </div>
      </div>
      <div className="sticky-cta" style={{ bottom: 'calc(var(--safe-b) + var(--nav-h) + 12px)' }}>
        <button
          className="btn primary big"
          disabled={!allChosen(d)}
          onClick={async () => {
            if (await actions.start()) go('workout', { replace: true });
          }}
        >
          Start workout
        </button>
        {!allChosen(d) ? (
          <p className="small muted" style={{ textAlign: 'center', margin: '8px 0 0' }}>
            Choose one lift in each slot to start.
          </p>
        ) : null}
      </div>
      {open ? (
        <ExerciseSheet
          slot={open}
          current={d.slots[open]?.exerciseId}
          workouts={st.workouts}
          meta={st.meta}
          settings={st.settings}
          unit={st.settings.unit}
          onToggleFavorite={(id) => void actions.toggleFavorite(id)}
          onClose={() => setOpen(null)}
          onPick={async (id) => {
            if (await actions.chooseLift(open, id)) setOpen(null);
          }}
        />
      ) : null}
    </main>
  );
}
