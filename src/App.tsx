import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Onboarding } from './pages/Onboarding';
import { Today } from './pages/Today';
import { Progress } from './pages/Progress';
import './index.css';

export default function App() {
  const done = localStorage.getItem('onboarding-complete') === 'true';
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
