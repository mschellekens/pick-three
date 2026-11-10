import { useState } from 'react';
import type { Exercise, SetInput, Unit } from '../../domain/types';
import { LOAD_CONVENTION } from '../../domain/catalog';
import { fmtNum, round } from '../../domain/units';
import { Sheet } from './Sheet';

const PRESETS: Record<Unit, number[]> = { lb: [1, 2.5, 5, 10], kg: [0.5, 1, 1.25, 2.5, 5] };
const COARSE: Record<Unit, number[]> = { lb: [-25, -10, 10, 25], kg: [-10, -5, 5, 10] };

export function convention(ex: Exercise, unit: Unit): string {
  return `${unit} · ${LOAD_CONVENTION[ex.loadMode]}`;
}

interface StepperProps {
  label: string;
  value: number;
  display: string;
  unitText?: string;
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
  onTapValue?: () => void;
  testId: string;
}

export function Stepper({ label, value, display, unitText, onDec, onInc, decDisabled, onTapValue, testId }: StepperProps) {
  return (
    <div className="stepper" data-testid={testId} data-value={value}>
      <button className="step" onClick={onDec} disabled={decDisabled} aria-label={`Decrease ${label}`}>
        −
      </button>
      {onTapValue ? (
        <button className="value tappable" onClick={onTapValue} aria-label={`${label}: ${display} ${unitText ?? ''}. Tap for quick values`}>
          <span className="v" aria-hidden="true">
            {display}
          </span>
          <span className="u" aria-hidden="true">
            {unitText}
          </span>
        </button>
      ) : (
        <div className="value" role="status" aria-label={`${label}: ${display} ${unitText ?? ''}`}>
          <span className="v" aria-hidden="true">
            {display}
          </span>
          <span className="u" aria-hidden="true">
            {unitText}
          </span>
        </div>
      )}
      <button className="step" onClick={onInc} aria-label={`Increase ${label}`}>
        +
      </button>
    </div>
  );
}

interface Props {
  exercise: Exercise;
  input: SetInput;
  step: number;
  onChange: (patch: Partial<SetInput> | ((i: SetInput) => Partial<SetInput>)) => void;
  onStepChange?: (step: number) => void;
  title: string;
  unlogged?: boolean;
}

export function SetEditor({ exercise: ex, input, step, onChange, onStepChange, title, unlogged }: Props) {
  const [sheet, setSheet] = useState(false);
  const loaded = ex.loadMode !== 'bodyweight';
  const s = step > 0 ? step : PRESETS[input.unit][1];
  const unit = input.unit;
  const repsLabel = ex.perSide ? (input.sidesDiffer ? 'Left reps' : 'Reps each side') : 'Clean reps';

  return (
    <section className={`editor${unlogged ? ' unlogged' : ''}`} aria-label={title}>
      <div className="spread">
        <span className="label">{title}</span>
        {unlogged ? <span className="tiny faint">Not logged yet</span> : null}
      </div>
      {loaded ? (
        <>
          <Stepper
            testId="weight"
            label="Weight"
            value={input.value}
            display={fmtNum(input.value)}
            unitText={convention(ex, unit)}
            onDec={() => onChange((i) => ({ value: Math.max(0, round(i.value - s, 3)) }))}
            onInc={() => onChange((i) => ({ value: round(i.value + s, 3) }))}
            decDisabled={input.value <= 0}
            onTapValue={() => setSheet(true)}
          />
        </>
      ) : (
        <p className="small muted" style={{ margin: '6px 0' }}>
          Bodyweight lift. Log reps only.
        </p>
      )}
      <Stepper
        testId="reps"
        label={repsLabel}
        value={input.reps}
        display={String(input.reps)}
        unitText={repsLabel.toLowerCase()}
        onDec={() => onChange((i) => ({ reps: Math.max(1, i.reps - 1) }))}
        onInc={() => onChange((i) => ({ reps: Math.min(500, i.reps + 1) }))}
        decDisabled={input.reps <= 1}
      />
      {ex.perSide && input.sidesDiffer ? (
        <Stepper
          testId="reps-right"
          label="Right reps"
          value={input.repsRight}
          display={String(input.repsRight)}
          unitText="right reps"
          onDec={() => onChange((i) => ({ repsRight: Math.max(1, i.repsRight - 1) }))}
          onInc={() => onChange((i) => ({ repsRight: Math.min(500, i.repsRight + 1) }))}
          decDisabled={input.repsRight <= 1}
        />
      ) : null}
      {ex.perSide ? (
        <div className="row spread">
          <span className="tiny muted">{input.sidesDiffer ? 'Logged as the lower side.' : 'Same weight, same reps on each side.'}</span>
          <button className="chip" aria-pressed={input.sidesDiffer} onClick={() => onChange((i) => ({ sidesDiffer: !i.sidesDiffer, repsRight: i.reps }))}>
            Sides differ
          </button>
        </div>
      ) : null}
      {sheet ? (
        <Sheet title="Set weight" onClose={() => setSheet(false)} testId="weight-sheet">
          <div className="stack">
            <div style={{ textAlign: 'center' }}>
              <div className="tnum" style={{ fontSize: '2.4rem', fontWeight: 800 }} data-testid="sheet-weight">
                {fmtNum(input.value)}
              </div>
              <div className="small muted">{convention(ex, unit)}</div>
            </div>
            <div className="grid-btns" aria-label="Adjust by">
              {COARSE[unit].map((d) => (
                <button key={d} onClick={() => onChange((i) => ({ value: Math.max(0, round(i.value + d, 3)) }))} aria-label={`${d > 0 ? 'Add' : 'Subtract'} ${Math.abs(d)} ${unit}`}>
                  {d > 0 ? `+${d}` : `−${-d}`}
                </button>
              ))}
            </div>
            {ex.starts[unit].length ? (
              <>
                <div className="section-title" style={{ margin: '6px 0 0' }}>
                  Starting values
                </div>
                <div className="grid-btns">
                  {ex.starts[unit].map((v) => (
                    <button key={v} aria-pressed={input.value === v} onClick={() => onChange({ value: v })} data-testid={`start-${v}`}>
                      {fmtNum(v)}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {onStepChange ? (
              <>
                <div className="section-title" style={{ margin: '6px 0 0' }}>
                  − / + step for this lift
                </div>
                <div className="chips" role="radiogroup" aria-label="Step size">
                  {PRESETS[unit].map((p) => (
                    <button key={p} className="chip" role="radio" aria-checked={s === p} onClick={() => onStepChange(p)}>
                      {fmtNum(p)} {unit}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {ex.loadMode === 'added' || ex.loadMode === 'assist' ? (
              <button className="btn small" onClick={() => onChange({ value: 0 })}>
                Set to 0 {ex.loadMode === 'assist' ? 'assistance' : 'added'}
              </button>
            ) : null}
            <button className="btn primary big" onClick={() => setSheet(false)}>
              Done
            </button>
          </div>
        </Sheet>
      ) : null}
    </section>
  );
}
