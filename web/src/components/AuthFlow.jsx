import { useState } from 'react';
import { signup, login } from '../api.js';

// Continuous signup/login. Signup is two steps that stay in the same aurora world:
// 1) a split-panel path fork, 2) name + email + password. Login is a single panel.
export default function AuthFlow({ onAuthed }) {
  const [mode, setMode] = useState('signup'); // 'signup' | 'login'
  const [pathType, setPathType] = useState(null); // chosen fork (signup step 1)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const step = mode === 'signup' && !pathType ? 'fork' : 'credentials';

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = mode === 'signup'
        ? { displayName: fullName, email, password, pathType }
        : { email, password };
      const { user } = await (mode === 'signup' ? signup(payload) : login(payload));
      onAuthed(user, mode === 'signup');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-world">
      <div className="auth-brand">
        <div className="dot" />
        <h1 className="display">ASCEND</h1>
      </div>

      {step === 'fork' ? (
        <div className="fork">
          <h2 className="display">Where are you right now?</h2>
          <p className="fork-sub">Pick your starting point - we’ll light the first steps of your path.</p>
          <div className="fork-split">
            <button className="fork-panel hs" onClick={() => setPathType('highschool')}>
              <span className="fork-emoji">🎒</span>
              <b>I’m in High School</b>
              <small>Head toward your university goal</small>
            </button>
            <button className="fork-panel uni" onClick={() => setPathType('university')}>
              <span className="fork-emoji">🎓</span>
              <b>I’m at University</b>
              <small>Head toward your dream company</small>
            </button>
          </div>
          <button className="link-btn" onClick={() => setMode('login')}>
            Already have an account? <b>Log in</b>
          </button>
        </div>
      ) : (
        <form className="auth-card" onSubmit={submit}>
          <h2 className="display">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
          {mode === 'signup' && (
            <p className="chosen-path">
              Path: <b>{pathType === 'university' ? '🎓 University' : '🎒 High School'}</b>
              <button type="button" className="tiny-link" onClick={() => setPathType(null)}>change</button>
            </p>
          )}

          {mode === 'signup' && (
            <label>Full name
              <input type="text" value={fullName} autoComplete="name"
                onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Ahmad Fakhrul" required />
            </label>
          )}
          <label>Email
            <input type="email" value={email} autoComplete="email"
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </label>
          <label>Password
            <input type="password" value={password} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button className="primary-btn" disabled={busy} type="submit">
            {busy ? 'One moment…' : mode === 'signup' ? 'Start my path' : 'Log in'}
          </button>

          <button type="button" className="link-btn"
            onClick={() => { setError(null); setMode(mode === 'signup' ? 'login' : 'signup'); }}>
            {mode === 'signup'
              ? <>Already have an account? <b>Log in</b></>
              : <>New here? <b>Create an account</b></>}
          </button>
        </form>
      )}
    </div>
  );
}
