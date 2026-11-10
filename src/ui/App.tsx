import { useEffect, useMemo, type ReactNode } from 'react';
import { actions, reload, useStore, dismissSaveError } from '../state/store';
import { localDateOf } from '../domain/dates';
import { demoData } from '../domain/demo';
import { useRoute, go } from './router';
import { useToasts, dismissToast, clearToasts } from './toast';
import { IconProgress, IconToday } from './components/icons';
import { Onboarding } from './screens/Onboarding';
import { Today } from './screens/Today';
import { Picker } from './screens/Picker';
import { Workout } from './screens/Workout';
import { Done } from './screens/Done';
import { Progress } from './screens/Progress';
import { History, WorkoutDetail } from './screens/History';
import { SettingsScreen } from './screens/Settings';

export function App({ update }: { update: { ready: boolean; apply: () => void } }) {
  const st = useStore();
  const route = useRoute();
  const toasts = useToasts();
  const [r0, r1, r2] = route;
  const demo = useMemo(() => (r0 === 'demo' ? demoData(localDateOf(new Date()), st.settings.unit) : null), [r0, st.settings.unit]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [r0, r1, r2]);
  // Undo offers belong to the screen they were made on.
  useEffect(() => clearToasts(), [r0]);

  if (st.status === 'loading') return <div className="app" aria-busy="true" />;
  if (st.status === 'error') {
    return (
      <main className="app stack" style={{ paddingTop: 60 }}>
        <h1>Storage unavailable</h1>
        <p className="muted">{st.loadError}</p>
        <p className="small muted">Pick Three keeps your workouts in this browser’s storage. Private browsing and some settings block it. Try a regular Safari tab.</p>
        <button className="btn primary" onClick={() => void reload()}>
          Try again
        </button>
      </main>
    );
  }

  if (!st.onboarded && r0 !== 'demo') {
    return (
      <div className="app" style={{ paddingBottom: 0 }}>
        <Onboarding
          look={st.settings.look}
          onDone={async () => {
            await actions.completeOnboarding();
            await actions.beginPicking();
            go('pick', { replace: true });
          }}
        />
      </div>
    );
  }

  const focused = r0 === 'workout' || r0 === 'pick' || r0 === 'done';
  let screen: ReactNode;
  switch (r0) {
    case 'pick':
      screen = <Picker />;
      break;
    case 'workout':
      screen = <Workout />;
      break;
    case 'done':
      screen = <Done id={r1} />;
      break;
    case 'progress':
      screen = <Progress workouts={st.workouts} meta={st.meta} settings={st.settings} />;
      break;
    case 'demo':
      screen = <Progress workouts={demo!.workouts} meta={demo!.meta} settings={st.settings} demo />;
      break;
    case 'history':
      screen = r1 === 'day' ? <History day={r2} /> : r1 ? <WorkoutDetail id={r1} /> : <History />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
    default:
      screen = <Today />;
  }
  const tab = r0 === 'progress' || r0 === 'demo' ? 'progress' : 'today';
  const showUpdate = update.ready && !st.pending && (r0 === undefined || r0 === 'today' || r0 === 'progress' || r0 === 'settings');

  return (
    <>
      <div className={`app${focused ? ' focused' : ''}`}>
        {st.saveError ? (
          <div className="banner" role="alert">
            <span>{st.saveError}</span>
            {st.conflict ? (
              <button className="btn small" onClick={() => void actions.reloadLatest().then(dismissSaveError)}>
                Load latest
              </button>
            ) : (
              <button className="btn small" onClick={dismissSaveError}>
                OK
              </button>
            )}
          </div>
        ) : null}
        {showUpdate ? (
          <div className="banner info" role="status">
            <span>A new version of Pick Three is ready.</span>
            <button className="btn small" onClick={update.apply}>
              Reload
            </button>
          </div>
        ) : null}
        {screen}
      </div>
      {!focused ? (
        <nav className="bottom-nav" aria-label="Main">
          <ul>
            <li>
              <a href="#/today" aria-current={tab === 'today' ? 'page' : undefined}>
                <IconToday />
                Today
              </a>
            </li>
            <li>
              <a href="#/progress" aria-current={tab === 'progress' ? 'page' : undefined}>
                <IconProgress />
                Progress
              </a>
            </li>
          </ul>
        </nav>
      ) : null}
      <div className={`toasts${focused ? ' high' : ''}`} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.kind === 'error' ? ' error' : ''}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <span>{t.text}</span>
            {t.action ? (
              <button
                className="btn small"
                onClick={() => {
                  t.action!.run();
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            ) : (
              <button className="icon-btn" aria-label="Dismiss" onClick={() => dismissToast(t.id)} style={{ minWidth: 36 }}>
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
