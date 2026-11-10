import { useState } from 'react';
import type { Region, Unit } from '../../domain/types';
import { MAJOR_REGIONS, REGION_LABEL, REGION_VIEW, REGIONS } from '../../domain/catalog';
import { ATTENTION_LABEL, attentionReason, attentionThreshold, type RegionAttention } from '../../domain/attention';
import { fmtPair, fmtPct, setText, STRENGTH_LABEL, type RegionStrength } from '../../domain/strength';
import { agoLabel, daysBetween, fmtShortDate } from '../../domain/dates';
import { Avatar, type Look } from './Avatar';
import { Sheet } from './Sheet';
import { ATTENTION_PAINT, attentionPaint, STRENGTH_PAINT, strengthPaint, type LegendItem } from '../paint';

type Props =
  | { mode: 'attention'; data: RegionAttention[]; look: Look; today: string; frequency: number; size?: 'hero' | 'md' | 'sm'; example?: boolean; unit?: Unit; pulse?: boolean; showList?: boolean | 'collapsed' }
  | { mode: 'strength'; data: RegionStrength[]; look: Look; today: string; unit: Unit; size?: 'hero' | 'md' | 'sm'; example?: boolean; pulse?: boolean; frequency?: number; showList?: boolean | 'collapsed' };

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="legend" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label}>
          <span
            className={`swatch${i.pattern === 'hatch' ? ' hatch' : i.pattern === 'dots' ? ' dots' : ''}`}
            style={i.pattern === 'solid' ? { backgroundColor: i.color! } : i.pattern === 'none' ? { backgroundColor: '#d9b49a33' } : { color: i.color!, backgroundColor: `${i.color}55` }}
            aria-hidden="true"
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function AvatarPanel(props: Props) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [open, setOpen] = useState<Region | null>(null);
  const isAtt = props.mode === 'attention';
  const paint = isAtt ? attentionPaint(props.data) : strengthPaint(props.data);
  const legend = isAtt ? Object.values(ATTENTION_PAINT) : Object.values(STRENGTH_PAINT);
  const stateOf = (r: Region) => (isAtt ? ATTENTION_LABEL[(props.data as RegionAttention[]).find((a) => a.region === r)!.state] : STRENGTH_LABEL[(props.data as RegionStrength[]).find((a) => a.region === r)!.state]);
  const visible = REGIONS.filter((r) => REGION_VIEW[r] === view);
  const summary = `${props.example ? 'Example avatar. ' : ''}${isAtt ? 'Training attention' : 'Strength progress'}, ${view} view. ${visible.map((r) => `${REGION_LABEL[r]}: ${stateOf(r)}`).join('. ')}.`;
  const [listOpen, setListOpen] = useState(props.showList !== 'collapsed');
  const showList = props.showList !== false && listOpen;

  return (
    <div className="stack-sm">
      <div className="spread">
        <span className="small muted" style={{ fontWeight: 700 }}>
          {props.example ? <span className="badge example" style={{ marginRight: 8 }}>Example</span> : null}
          {isAtt ? 'Training attention' : 'Strength progress'}
        </span>
        <div className="seg" role="group" aria-label="Avatar view">
          <button aria-pressed={view === 'front'} onClick={() => setView('front')}>
            Front
          </button>
          <button aria-pressed={view === 'back'} onClick={() => setView('back')}>
            Back
          </button>
        </div>
      </div>
      <div className={`avatar-wrap ${props.size ?? 'md'}`}>
        <Avatar view={view} look={props.look} paint={paint} onRegion={props.example ? undefined : setOpen} selected={open} label={summary} pulse={props.pulse} />
      </div>
      <Legend items={legend} />
      {props.showList === 'collapsed' ? (
        <button className="link-btn small" style={{ justifySelf: 'center' }} aria-expanded={listOpen} onClick={() => setListOpen((v) => !v)}>
          {listOpen ? 'Hide areas list' : 'Show areas list'}
        </button>
      ) : null}
      {showList ? (
        <div className="region-list" role="list" aria-label={`${view === 'front' ? 'Front' : 'Back'} regions`}>
          {visible.map((r) => (
            <div role="listitem" key={r}>
              <button className="region-btn" style={{ width: '100%' }} onClick={() => (props.example ? undefined : setOpen(r))} disabled={props.example} aria-label={`${REGION_LABEL[r]}: ${stateOf(r)}. Show details`}>
                <span className="swatch" aria-hidden="true" style={{ background: paint[r]?.color ?? '#d9b49a33' }} />
                <span>
                  {REGION_LABEL[r]}
                  <span className="sub">{stateOf(r)}</span>
                </span>
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {open && !props.example ? (
        <Sheet title={REGION_LABEL[open]} onClose={() => setOpen(null)} testId="region-sheet">
          {props.mode === 'attention' ? (
            <AttentionDetail a={props.data.find((x) => x.region === open)!} today={props.today} frequency={props.frequency} />
          ) : (
            <StrengthDetail s={props.data.find((x) => x.region === open)!} unit={props.unit} />
          )}
        </Sheet>
      ) : null}
    </div>
  );
}

const MAPPING_NOTE =
  'Each lift counts for its main movers (primary areas). Supporting areas, like triceps in pressing, biceps and rear shoulders in pulling, or glutes in squats, are listed as context and never reset the primary clock.';

function AttentionDetail({ a, today, frequency }: { a: RegionAttention; today: string; frequency: number }) {
  const t = attentionThreshold(frequency);
  return (
    <div className="stack prose">
      <div className="row">
        <span className="swatch" style={{ background: ATTENTION_PAINT[a.state].color ?? '#d9b49a33' }} aria-hidden="true" />
        <strong>{ATTENTION_LABEL[a.state]}</strong>
      </div>
      <p style={{ color: 'var(--text)' }}>{attentionReason(a)}</p>
      {a.lastPrimary ? <p>Direct work from: {a.primaryLifts.join(', ')}.</p> : null}
      {a.lastSecondary ? (
        <p>
          Supporting work: {a.secondaryLifts.join(', ')}, last {agoLabel(daysBetween(a.lastSecondary, today))} ({fmtShortDate(a.lastSecondary)}).
        </p>
      ) : null}
      <p className="small">
        Recently trained means direct work in the last 2 days. Worth attention starts at {t} days, based on your usual {frequency} sessions per week.
        {MAJOR_REGIONS.includes(a.region) ? '' : ' This is a smaller area, so it stays neutral until you train it directly.'}
      </p>
      <p className="small">{MAPPING_NOTE}</p>
      <p className="small faint">This shows what your logged training covered. It isn't a recovery or readiness measure.</p>
    </div>
  );
}

function StrengthDetail({ s, unit }: { s: RegionStrength; unit: Unit }) {
  return (
    <div className="stack prose">
      <div className="row">
        <span className="swatch" style={{ background: STRENGTH_PAINT[s.state].color ?? '#d9b49a33' }} aria-hidden="true" />
        <strong>{STRENGTH_LABEL[s.state]}</strong>
        {s.pct !== null ? <span className="tnum">· {fmtPct(s.pct)}</span> : null}
      </div>
      {s.lifts.length === 0 ? <p>No logged lifts train this area directly in this period.</p> : null}
      {s.lifts.length > 1 && s.pct !== null ? <p className="small">Median across {s.lifts.filter((l) => l.trend.pct !== null).length} contributing lifts with enough data.</p> : null}
      {s.lifts.map((l) => {
        const last = l.inPeriod[l.inPeriod.length - 1];
        return (
          <div key={l.exercise.id} className="card" style={{ padding: 12 }}>
            <div className="spread">
              <strong>{l.exercise.name}</strong>
              <span className="tnum small">{l.trend.pct !== null ? fmtPct(l.trend.pct) : `${l.inPeriod.length} session${l.inPeriod.length === 1 ? '' : 's'}`}</span>
            </div>
            <div className="small muted">Latest, {fmtShortDate(last.localDate)}:</div>
            <div className="set-chips">
              {last.sets.map((x) => (
                <span key={x.id}>{setText(l.exercise, x, unit)}</span>
              ))}
            </div>
            {l.matched ? <div className="small up" style={{ marginTop: 6 }}>{fmtPair(l.exercise, l.matched, unit)}</div> : null}
            {l.trend.pct === null && l.inPeriod.length < 4 && l.exercise.loadMode !== 'bodyweight' ? <div className="small faint">Percentages appear after 4 comparable sessions.</div> : null}
          </div>
        );
      })}
      <p className="small">{MAPPING_NOTE}</p>
      <p className="small faint">Strength progress compares your own saved sets on the same lift and setup. It isn't a measure of muscle size.</p>
    </div>
  );
}
