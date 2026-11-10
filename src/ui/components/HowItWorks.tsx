import { Sheet } from './Sheet';
import { PROGRESSION_DEFAULTS } from '../../domain/progression';
import { STRENGTH_DEFAULTS } from '../../domain/strength';

export function HowItWorks({ onClose }: { onClose: () => void }) {
  const P = PROGRESSION_DEFAULTS;
  return (
    <Sheet title="How it works" onClose={onClose} testId="how-it-works">
      <div className="prose">
        <h3>Training attention</h3>
        <p>
          Each lift counts once per day for its main areas. Direct work in the last 2 days reads as Recently trained. Worth attention starts at the larger of 4 days or twice the
          days between your usual sessions (set your frequency in Settings). It shows what your logged training covered, not recovery, readiness or anything outside the app.
        </p>
        <h3>Comparable sets</h3>
        <p>
          Progress is only claimed from matched sets on the same lift and setup in different sessions: more reps at the same weight, or more weight at the same reps. For
          assisted lifts, less assistance is harder. A personal best must beat every earlier comparable set. Changing units never changes a stored load or creates a PR.
        </p>
        <h3>Estimated strength</h3>
        <p>
          For barbell, dumbbell and machine lifts only, each session’s best clean set of {STRENGTH_DEFAULTS.e1rmMinReps}–{STRENGTH_DEFAULTS.e1rmMaxReps} reps gives an estimated
          one-rep max (Epley: weight × (1 + reps ÷ 30)). The change compares the median of your first two sessions with your latest two in the period, after{' '}
          {STRENGTH_DEFAULTS.minSessionsForPercent} sessions. Under {STRENGTH_DEFAULTS.sameThresholdPct}% reads as About the same. Bodyweight, added-load and assisted lifts are
          shown through exact reps and loads instead.
        </p>
        <h3>Targets</h3>
        <p>
          App defaults, not prescriptions: {P.loadedRange[0]}–{P.loadedRange[1]} clean reps for loaded lifts, {P.bodyweightRange[0]}–{P.bodyweightRange[1]} for bodyweight and
          assisted. Add the smallest step after {P.minSetsToAdvance}+ sets hit the top of the range at one weight. Under {P.recentHours} hours since last time, repeat. Over{' '}
          {P.staleDays} days, restart a little lighter. Two sessions in a row clearly below the one before suggests repeating or going one step easier. Targets are optional.
        </p>
        <h3>Published principles vs app defaults</h3>
        <p>
          Training regularly, using progressive overload and tracking performance are general resistance training principles described in the American College of Sports
          Medicine position stand (
          <a href="https://pubmed.ncbi.nlm.nih.gov/41843416/" target="_blank" rel="noreferrer">
            ACSM position stand on PubMed
          </a>
          ). The specific numbers above are conservative choices made for this app, not claims about what is optimal for everyone.
        </p>
      </div>
    </Sheet>
  );
}
