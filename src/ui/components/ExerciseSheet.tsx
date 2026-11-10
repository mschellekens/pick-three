import { useMemo, useState } from 'react';
import type { Equipment, Slot, Unit, Workout, Meta, Settings } from '../../domain/types';
import { SLOT_LABEL } from '../../domain/types';
import { eligibleFor, EQUIPMENT_LABEL, REGION_LABEL } from '../../domain/catalog';
import { exerciseSessions, seriesSessions } from '../../domain/history';
import { representativeSet } from '../../domain/progression';
import { setText } from '../../domain/strength';
import { Sheet } from './Sheet';

interface Props {
  slot: Slot;
  current?: string;
  workouts: Workout[];
  meta: Meta;
  settings: Settings;
  unit: Unit;
  onPick: (exerciseId: string) => void;
  onToggleFavorite: (id: string) => void;
  onClose: () => void;
}

export function ExerciseSheet({ slot, current, workouts, meta, settings, unit, onPick, onToggleFavorite, onClose }: Props) {
  const all = eligibleFor(slot);
  const [filter, setFilter] = useState<Equipment[]>(settings.equipment.filter((e) => all.some((x) => x.equipment.includes(e))));
  const equipment = [...new Set(all.flatMap((e) => e.equipment))];

  const recentOrder = useMemo(() => {
    const last = new Map<string, string>();
    for (const w of workouts) for (const e of w.entries) if (e.sets.length && (last.get(e.exerciseId) ?? '') < w.startedAt) last.set(e.exerciseId, w.startedAt);
    return last;
  }, [workouts]);

  const rows = all
    .filter((e) => filter.length === 0 || e.equipment.some((q) => filter.includes(q)))
    .map((e, i) => ({ e, i, fav: settings.favorites.includes(e.id), recent: recentOrder.get(e.id) ?? '' }))
    .sort((a, b) => Number(b.fav) - Number(a.fav) || (b.recent > a.recent ? 1 : b.recent < a.recent ? -1 : 0) || a.i - b.i);

  const latest = (id: string) => {
    const sid = meta.currentSeries[id];
    const ss = sid ? seriesSessions(workouts, sid) : [];
    if (!ss.length) return exerciseSessions(workouts, id).length ? 'New setup · no comparable sets yet' : null;
    const ex = all.find((x) => x.id === id)!;
    return `Last: ${setText(ex, representativeSet(ex, ss[ss.length - 1].sets), unit)}`;
  };

  return (
    <Sheet title={`Choose ${SLOT_LABEL[slot].toLowerCase()}`} onClose={onClose} testId="exercise-sheet">
      <div className="chips" role="group" aria-label="Filter by equipment">
        {equipment.map((q) => (
          <button key={q} className="chip" aria-pressed={filter.includes(q)} onClick={() => setFilter((f) => (f.includes(q) ? f.filter((x) => x !== q) : [...f, q]))}>
            {EQUIPMENT_LABEL[q]}
          </button>
        ))}
      </div>
      {filter.length ? (
        <p className="small muted" style={{ margin: '8px 0 0' }}>
          Showing {rows.length} of {all.length}.{' '}
          <button className="link-btn" onClick={() => setFilter([])}>
            Show all
          </button>
        </p>
      ) : null}
      <ul className="ex-list">
        {rows.map(({ e, fav, recent }) => {
          const last = latest(e.id);
          return (
            <li key={e.id} className="ex-row">
              <button className="ex-pick" aria-pressed={current === e.id} onClick={() => onPick(e.id)} data-testid={`pick-${e.id}`}>
                <span className="n">{e.name}</span>
                <span className="m">
                  {e.primary.map((r) => REGION_LABEL[r]).join(', ')}
                  {fav ? ' · Favorite' : recent ? ' · Recent' : ''}
                </span>
                {last ? <span className="m tnum">{last}</span> : null}
              </button>
              <button className="fav" aria-pressed={fav} aria-label={`${fav ? 'Remove' : 'Add'} ${e.name} ${fav ? 'from' : 'to'} favorites`} onClick={() => onToggleFavorite(e.id)}>
                {fav ? '★' : '☆'}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
