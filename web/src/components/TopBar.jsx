import { useState } from 'react';
import AccountMenu from './AccountMenu.jsx';

// Top bar. On desktop the nav is an inline pill row; on mobile it collapses to a hamburger that
// opens a slide-in drawer (the nav-toggle / nav-scrim / .top-nav.open are driven from here and
// styled in the mobile media query).
export default function TopBar({ journey, user, view, onNavigate, onOpenVault, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathType = user?.pathType ?? journey?.user?.pathType;
  const pathLabel = pathType === 'university' ? '🎓 University path' : '🎒 High School path';
  const go = (v) => { onNavigate(v); setMenuOpen(false); };
  const cls = (v) => (view === v ? 'nav-on' : '');

  return (
    <header>
      <button className="nav-toggle" aria-label="Open menu" onClick={() => setMenuOpen(true)}>☰</button>

      <div className="brand">
        <div className="dot" />
        <div>
          <h1 className="display">ASCEND</h1>
          <span>Advancing Skills &amp; Career Evolution</span>
        </div>
      </div>

      <div className={`nav-scrim ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
      <nav className={`top-nav ${menuOpen ? 'open' : ''}`}>
        <button className="nav-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>✕</button>
        <button className={cls('profile')} onClick={() => go('profile')}>Profile</button>
        <button className={cls('path')} onClick={() => go('path')}>Path</button>
        <button className={cls('modules')} onClick={() => go('modules')}>Modules</button>
        <button className={cls('workshops')} onClick={() => go('workshops')}>Workshops</button>
        {pathType !== 'university' && (
          <button className={cls('scholarships')} onClick={() => go('scholarships')}>Scholarships</button>
        )}
        {pathType === 'university' && (
          <button className={cls('internships')} onClick={() => go('internships')}>Internships</button>
        )}
        <button className={cls('vault')} onClick={() => go('vault')}>Vault</button>
        <button className={cls('targets')} onClick={() => go('targets')}>Targets</button>
      </nav>

      <div className="path-pill">{pathLabel}</div>
      <button className="score-badge" onClick={onOpenVault} title="Open Vault">
        <div>
          <b>{journey ? journey.score : '-'}</b>
          <small>PATHWAY SCORE</small>
        </div>
        <div className="miniorb" />
      </button>
      <AccountMenu user={user} onLogout={onLogout} />
    </header>
  );
}
