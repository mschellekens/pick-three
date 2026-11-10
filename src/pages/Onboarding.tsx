import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SCREENS = [
  { h: 'Pick three. Get stronger.', b: 'Start with three lifts you care about getting stronger at. You choose. Do whatever else you feel like.' },
  { h: 'Train full body. Beat your last good set.', b: 'One lower-body, one push, one pull. When you’re ready, go for one more clean rep or a little more weight.' },
  { h: 'See what’s stronger. See what needs attention.', b: 'Your avatar shows where lifts are improving and which areas you’ve trained lately.' },
];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const nav = useNavigate();
  const s = SCREENS[step];
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ height: 160, background: '#1a1a2e', borderRadius: 12, margin: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="100" height="140" viewBox="0 0 100 140"><ellipse cx="50" cy="28" rx="16" ry="18" fill="#e8e8e8"/><path d="M34 50 Q50 46 66 50 L70 120 Q50 130 30 120 Z" fill="#3a6ea5"/></svg>
      </div>
      <div>{SCREENS.map((_, i) => <span key={i} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: i===step?'#4a9eff':'#333', margin: 3 }} />)}</div>
      <h1 style={{ fontSize: 24 }}>{s.h}</h1>
      <p style={{ color: '#bbb' }}>{s.b}</p>
      <button onClick={() => step < 2 ? setStep(step+1) : (localStorage.setItem('onboarding-complete','true'), nav('/'))} style={{ padding: '14px 28px', background: '#4a9eff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16 }}>
        {step === 2 ? 'Pick my three' : 'Continue'}
      </button>
    </div>
  );
}
