import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './ui/App';
import { reload } from './state/store';
import { requestPersistence } from './storage/db';
import './styles.css';

let applyUpdate: (() => void) | null = null;
const updateListeners = new Set<() => void>();
let updateReady = false;

if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.VITE_PREVIEW !== '1') {
  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateReady = true;
      updateListeners.forEach((l) => l());
    },
  });
  applyUpdate = () => void update(true);
}

function Root() {
  const [ready, setReady] = useState(updateReady);
  useEffect(() => {
    const l = () => setReady(true);
    updateListeners.add(l);
    return () => void updateListeners.delete(l);
  }, []);
  return <App update={{ ready, apply: () => applyUpdate?.() }} />;
}

void reload();
void requestPersistence();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
