import { useMemo, useState } from 'react';
import type { Meta, Settings, Workout } from '../../domain/types';
import { liftingDays } from '../../domain/history';
import { localDateOf, monthKey, monthLabel } from '../../domain/dates';
import { fmtPair, fmtPct, liftProgress, overallChange, PERIOD_LABEL, regionStrength, setText, strongestChange, type Period } from '../../domain/strength';
import { AvatarPanel } from '../components/AvatarPanel';
import { Calendar } from '../components/Calendar';
import { HowItWorks } from '../components/HowItWorks';
import { IconHistory, IconInfo, IconSettings } from '../components/icons';
import { go } from '../router';

interface Props {
  workouts: Workout[];
  meta: Meta;
  settings: Settings;
  demo?: boolean;
}

export function Progress({ workouts, meta, settings, demo }: Props) {
  const [period, setPeriod] = useState<Period>('12w');
  const [how, setHow] = useState(false);
  const today = localDateOf(new Date());
  const unit = settings.unit;
  const lifts = useMemo(() => liftProgress(workouts, meta, period, today, unit), [workouts, meta, period, today, unit]);
  const regions = useMemo(() => regionStrength(lifts), [lifts]);
  const head = strongestChange(lifts, unit, period);
  const overall = overallChange(lifts);
  const month = monthKey(today);
  const monthDays = liftingDays(workouts).filter((d) => monthKey(d) === month).length;

  return (
    <main className="fade-in">
      <header className="topbar">
        <h1>{demo ? 'Demo progress' : 'Progress'}</h1>
        <div className="row">
          <button className="icon-btn" aria-label="How it works" onClick={() => setHow(true)}>
            <IconInfo />
          </button>
          {!demo ? (
            <>
              <button className="icon-btn" aria-label="History" onClick={() => go('history')}>
                <IconHistory />
              </button>
              <button className="icon-btn" aria-label="Settings" onClick={() => go('settings')}>
                <IconSettings />
              </button>
            </>
          ) : null}
        </div>
      </header>
      {demo ? (
        <div className="banner demo" role="note">
          <span>Demo data. Nothing here is saved or mixed with your history.</span>
          <button className="btn small" onClick={() => go('settings', { replace: true })}>
            Exit demo
          </button>
        </div>
      ) : null}

      <div className="seg" role="group" aria-label="Period" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 10 }}>
        {(['4w', '12w', 'all'] as Period[]).map((p) => (
          <button key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="kpis">
        <section className="card kpi" aria-label="Strongest change">
          <div className="l">Strongest change</div>
          {head ? (
            <>
              <div className={`v ${head.value.length > 12 ? 'md' : ''} up`} data-testid="headline">
                {head.value}
              </div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{head.title}</div>
              <div className="d">{head.detail}</div>
            </>
          ) : (
            <>
              <div className="v md">Building baseline</div>
              <div className="d">Log the same lift in two sessions to see a matched comparison.</div>
            </>
          )}
        </section>
        <section className="card kpi" aria-label="Lifting days this month">
          <div className="l">Lifting days</div>
          <div className="v" data-testid="month-days">
            {monthDays}
          </div>
          <div className="d">{monthLabel(month)}</div>
        </section>
      </div>
      {overall ? (
        <p className="small muted" style={{ margin: '10px 2px 0' }} data-testid="overall">
          Estimated strength {fmtPct(overall.pct)} · Across {overall.lifts} tracked lifts · {PERIOD_LABEL[period]}
        </p>
      ) : null}

      <h2 className="section-title">Where you’re getting stronger</h2>
      <AvatarPanel mode="strength" data={regions} look={settings.look} today={today} unit={unit} />

      <h2 className="section-title">Lifting calendar</h2>
      <Calendar workouts={workouts} today={today} onDay={(d) => (demo ? undefined : go(`history/day/${d}`))} />

      <h2 className="section-title">Your lifts · {PERIOD_LABEL[period]}</h2>
      {lifts.length ? (
        <ul className="lift-list">
          {lifts.map((l) => {
            const last = l.inPeriod[l.inPeriod.length - 1];
            return (
              <li key={l.seriesId}>
                <div className="spread">
                  <strong>{l.exercise.name}</strong>
                  <span className={`tnum small ${l.status === 'improving' ? 'up' : 'muted'}`}>
                    {l.trend.pct !== null ? fmtPct(l.trend.pct) : l.status === 'baseline' ? 'Baseline' : l.matched ? 'Improved' : 'No change yet'}
                  </span>
                </div>
                <div className="set-chips">
                  {last.sets.map((s) => (
                    <span key={s.id}>{setText(l.exercise, s, unit)}</span>
                  ))}
                </div>
                {l.matched ? <div className="small up" style={{ marginTop: 6 }}>{fmtPair(l.exercise, l.matched, unit)}</div> : null}
                <div className="tiny faint" style={{ marginTop: 4 }}>
                  {l.inPeriod.length} {l.inPeriod.length === 1 ? 'session' : 'sessions'} in period
                  {l.exercise.setupSensitive && Number(l.seriesId.split(':').pop()) > 1 ? ` · setup ${l.seriesId.split(':').pop()}` : ''}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">No lifts in this period yet.</p>
      )}

      <h2 className="section-title">Compare</h2>
      <section className="card" aria-label="Compare">
        <p className="small muted" style={{ margin: 0 }}>
          Your comparisons are personal: you against your own earlier sets. Peer comparisons stay off because no validated reference data for these exact lifts and load
          conventions is bundled with the app.
        </p>
      </section>
      {how ? <HowItWorks onClose={() => setHow(false)} /> : null}
    </main>
  );
}
