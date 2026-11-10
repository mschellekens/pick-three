import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Onboarding } from './pages/Onboarding';
import { Today } from './pages/Today';
import { Progress } from './pages/Progress';
import './index.css';

export default function App() {
  const [done, setDone] = useState(() => localStorage.getItem('onboarding-complete') === 'true');
  useEffect(() => {
    const sync = () => setDone(localStorage.getItem('onboarding-complete') === 'true');
    window.addEventListener('storage', sync);
    window.addEventListener('onboarding-done', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('onboarding-done', sync); };
  }, []);
  return (
    <HashRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={done ? <Today /> : <Navigate to="/onboarding" replace />} />
        <Route path="/progress" element={done ? <Progress /> : <Navigate to="/onboarding" replace />} />
      </Routes>
    </HashRouter>
  );
}
