import { useState } from 'react';
import type { Workout } from '../../domain/types';
import { daysInMonth, fmtDate, monthKey, monthLabel, shiftMonth, weekdayOf } from '../../domain/dates';
import { IconBack } from './icons';

const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function Calendar({ workouts, today, onDay }: { workouts: Workout[]; today: string; onDay: (date: string) => void }) {
  const [month, setMonth] = useState(monthKey(today));
  const [asList, setAsList] = useState(false);
  const byDay = new Map<string, Workout[]>();
  for (const w of workouts) if (w.entries.some((e) => e.sets.length)) byDay.set(w.localDate, [...(byDay.get(w.localDate) ?? []), w]);
  const n = daysInMonth(month);
  const first = weekdayOf(`${month}-01`);
  const days = Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
  const liftDays = days.filter((d) => byDay.has(d));

  return (
    <section aria-label="Lifting calendar" className="card">
      <div className="spread" style={{ marginBottom: 8 }}>
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
          <IconBack />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 750 }}>{monthLabel(month)}</div>
          <div className="tiny muted tnum">
            {liftDays.length} lifting {liftDays.length === 1 ? 'day' : 'days'} · 1–{n} {monthLabel(month).split(' ')[0].slice(0, 3)}
          </div>
        </div>
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month" disabled={month >= monthKey(today)} style={{ transform: 'scaleX(-1)' }}>
          <IconBack />
        </button>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 6 }}>
        <div className="seg" role="group" aria-label="Calendar display">
          <button aria-pressed={!asList} onClick={() => setAsList(false)}>
            Calendar
          </button>
          <button aria-pressed={asList} onClick={() => setAsList(true)}>
            List
          </button>
        </div>
      </div>
      {asList ? (
        liftDays.length ? (
          <ul className="lift-list">
            {liftDays.map((d) => (
              <li key={d}>
                <button className="link-btn" style={{ padding: 0, color: 'var(--text)' }} onClick={() => onDay(d)}>
                  {fmtDate(d)}
                </button>{' '}
                {byDay.get(d)!.some((w) => w.partial) ? <span className="badge partial">Partial</span> : null}
                {byDay.get(d)!.length > 1 ? <span className="small muted"> · {byDay.get(d)!.length} sessions</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">No lifting days this month.</p>
        )
      ) : (
        <div className="cal" role="grid" aria-label={monthLabel(month)}>
          {WD.map((d, i) => (
            <div key={i} className="wd" aria-hidden="true">
              {d}
            </div>
          ))}
          {Array.from({ length: first }, (_, i) => (
            <div key={`b${i}`} className="blank" aria-hidden="true" />
          ))}
          {days.map((d) => {
            const ws = byDay.get(d);
            const partial = ws?.every((w) => w.partial);
            return (
              <button
                key={d}
                className={`${ws ? 'lift' : ''}${partial ? ' partial' : ''}${d === today ? ' today' : ''}`}
                onClick={() => ws && onDay(d)}
                aria-disabled={!ws}
                tabIndex={ws ? 0 : -1}
                aria-label={`${fmtDate(d)}${ws ? `, lifting day${partial ? ', partial' : ''}` : ', no lifting'}`}
              >
                {Number(d.slice(8))}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
