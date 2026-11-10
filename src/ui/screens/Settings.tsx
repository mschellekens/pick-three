import { useRef, useState } from 'react';
import { actions, useStore } from '../../state/store';
import { CATALOG, EQUIPMENT_LABEL } from '../../domain/catalog';
import type { Equipment, Unit } from '../../domain/types';
import { parseBackup, type Backup } from '../../domain/backup';
import { attentionThreshold } from '../../domain/attention';
import { stepFor } from '../../domain/progression';
import { fmtNum } from '../../domain/units';
import { Avatar, LOOKS, type Look } from '../components/Avatar';
import { HowItWorks } from '../components/HowItWorks';
import { Sheet } from '../components/Sheet';
import { IconBack } from '../components/icons';
import { back, go } from '../router';
import { toast } from '../toast';

const STEPS: Record<Unit, number[]> = { lb: [1, 2.5, 5, 10], kg: [0.5, 1, 1.25, 2.5, 5] };

export function SettingsScreen() {
  const st = useStore();
  const s = st.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ backup: Backup; migratedFrom: number | null } | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [reset, setReset] = useState(false);
  const [how, setHow] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const exportNow = () => {
    const b = actions.exportBackup();
    const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pick-three-backup-${b.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast({ text: `Backup exported · ${b.workouts.length} workouts` });
  };

  const onFile = async (f: File | undefined) => {
    setImportErr(null);
    if (!f) return;
    const text = await f.text();
    const r = parseBackup(text, f.size);
    if (!r.ok) setImportErr(r.error);
    else setPreview({ backup: r.backup, migratedFrom: r.migratedFrom });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <main className="fade-in">
      <header className="topbar">
        <button className="icon-btn" onClick={() => back('today')} aria-label="Back">
          <IconBack />
        </button>
        <h1>Settings</h1>
        <span style={{ width: 44 }} />
      </header>

      <h2 className="section-title">Training</h2>
      <div className="settings-group">
        <div className="settings-row">
          <span>Units</span>
          <div className="seg" role="group" aria-label="Units">
            {(['lb', 'kg'] as Unit[]).map((u) => (
              <button key={u} aria-pressed={s.unit === u} onClick={() => void actions.updateSettings({ unit: u })}>
                {u}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <span>
            Usual sessions per week
            <span className="tiny muted" style={{ display: 'block' }}>
              Worth attention after {attentionThreshold(s.frequency)} days
            </span>
          </span>
          <div className="row">
            <button className="icon-btn" aria-label="Fewer sessions per week" disabled={s.frequency <= 1} onClick={() => void actions.updateSettings({ frequency: s.frequency - 1 })}>
              −
            </button>
            <span className="tnum" style={{ fontWeight: 800, minWidth: 20, textAlign: 'center' }} aria-live="polite">
              {s.frequency}
            </span>
            <button className="icon-btn" aria-label="More sessions per week" disabled={s.frequency >= 5} onClick={() => void actions.updateSettings({ frequency: s.frequency + 1 })}>
              +
            </button>
          </div>
        </div>
        <div className="settings-row" style={{ display: 'block' }}>
          <div style={{ marginBottom: 8 }}>
            Default equipment filter
            <span className="tiny muted" style={{ display: 'block' }}>
              Pre-selects filter chips in the lift list. You can always clear them.
            </span>
          </div>
          <div className="chips">
            {(Object.keys(EQUIPMENT_LABEL) as Equipment[]).map((q) => (
              <button key={q} className="chip" aria-pressed={s.equipment.includes(q)} onClick={() => void actions.updateSettings({ equipment: s.equipment.includes(q) ? s.equipment.filter((x) => x !== q) : [...s.equipment, q] })}>
                {EQUIPMENT_LABEL[q]}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row" style={{ display: 'block' }}>
          <button className="link-btn" style={{ padding: 0 }} aria-expanded={showSteps} onClick={() => setShowSteps((v) => !v)}>
            {showSteps ? 'Hide' : 'Show'} load increments per lift
          </button>
          {showSteps ? (
            <div className="stack-sm" style={{ marginTop: 8 }}>
              {CATALOG.filter((e) => e.loadMode !== 'bodyweight').map((e) => {
                const cur = stepFor(e, s.unit, s.increments);
                return (
                  <div key={e.id}>
                    <div className="small" style={{ fontWeight: 650 }}>
                      {e.name}
                    </div>
                    <div className="chips" role="radiogroup" aria-label={`${e.name} step`}>
                      {STEPS[s.unit].map((p) => (
                        <button key={p} className="chip" role="radio" aria-checked={cur === p} onClick={() => void actions.updateSettings({ increments: { ...s.increments, [`${e.id}:${s.unit}`]: p } })}>
                          {fmtNum(p)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <h2 className="section-title">Avatar</h2>
      <div className="row" role="radiogroup" aria-label="Avatar look">
        {(Object.keys(LOOKS) as Look[]).map((l) => (
          <button key={l} role="radio" aria-checked={s.look === l} className="card" style={{ flex: 1, padding: 10, borderColor: s.look === l ? 'var(--accent)' : undefined, background: 'var(--surface)' }} onClick={() => void actions.updateSettings({ look: l })}>
            <div style={{ maxWidth: 90, margin: '0 auto' }}>
              <Avatar view="front" look={l} paint={{}} label={`${LOOKS[l].name} look`} />
            </div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>{LOOKS[l].name}</div>
          </button>
        ))}
      </div>

      <h2 className="section-title">Reference data</h2>
      <div className="card small muted">Peer comparisons: off. No validated reference data for these exact lifts and load conventions is bundled, so nothing is estimated or invented.</div>

      <h2 className="section-title">Your data</h2>
      <div className="card stack-sm">
        <p className="small muted" style={{ margin: 0 }}>
          Your history stays on this device, in this browser’s storage. Nothing is uploaded. Browsers can clear storage (for example after long inactivity or in low storage), and a
          Home Screen app may keep separate storage from Safari. Export a backup regularly and import it to move or restore your data.
        </p>
        <button className="btn block" onClick={exportNow} data-testid="export">
          Export backup
        </button>
        <button className="btn block" onClick={() => fileRef.current?.click()}>
          Import backup
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose backup file" data-testid="import-file" onChange={(e) => void onFile(e.target.files?.[0])} tabIndex={-1} />
        {importErr ? (
          <p role="alert" className="small" style={{ color: 'var(--danger)', margin: 0 }} data-testid="import-error">
            {importErr} Your current data was not changed.
          </p>
        ) : null}
        <button className="btn danger block" onClick={() => setReset(true)}>
          Reset data
        </button>
      </div>

      <h2 className="section-title">More</h2>
      <div className="settings-group">
        <button className="settings-row" style={{ border: 'none', width: '100%', textAlign: 'left' }} onClick={() => go('demo')}>
          <span>Preview with demo data</span>
          <span className="muted">›</span>
        </button>
        <button className="settings-row" style={{ border: 'none', width: '100%', textAlign: 'left', borderTop: '1px solid var(--line)' }} onClick={() => setHow(true)}>
          <span>How it works</span>
          <span className="muted">›</span>
        </button>
      </div>
      <div className="card small muted" style={{ marginTop: 12 }}>
        <strong style={{ color: 'var(--text)' }}>Add to your iPhone Home Screen</strong>
        <br />
        Open this page in Safari, tap Share, then Add to Home Screen. After the first visit it also opens offline.
      </div>
      <p className="tiny faint" style={{ textAlign: 'center', marginTop: 16 }}>
        Pick Three v{__APP_VERSION__}
      </p>

      {preview ? (
        <Sheet title="Replace your data?" onClose={() => setPreview(null)} testId="import-preview">
          <p className="muted">
            This backup has <strong className="tnum" style={{ color: 'var(--text)' }}>{preview.backup.workouts.length}</strong> workouts
            {preview.migratedFrom ? ` (upgraded from version ${preview.migratedFrom})` : ''}. Importing replaces the {st.workouts.length} workouts on this device. Your current
            draft, if any, is kept.
          </p>
          <div className="stack-sm">
            <button
              className="btn primary block"
              onClick={async () => {
                if (await actions.importBackup(preview.backup)) {
                  toast({ text: `Imported ${preview.backup.workouts.length} workouts` });
                  setPreview(null);
                }
              }}
            >
              Replace with backup
            </button>
            <button className="btn block" onClick={() => setPreview(null)}>
              Cancel
            </button>
          </div>
        </Sheet>
      ) : null}
      {reset ? (
        <Sheet title="Reset all data?" onClose={() => setReset(false)}>
          <p className="muted">This deletes every workout, setting and draft on this device. Export a backup first if you might want it back.</p>
          <div className="stack-sm">
            <button
              className="btn danger block"
              onClick={async () => {
                if (await actions.resetData()) {
                  setReset(false);
                  go('', { replace: true });
                }
              }}
            >
              Delete everything
            </button>
            <button className="btn block" onClick={() => setReset(false)}>
              Cancel
            </button>
          </div>
        </Sheet>
      ) : null}
      {how ? <HowItWorks onClose={() => setHow(false)} /> : null}
    </main>
  );
}
