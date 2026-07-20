import AccountMenu from './AccountMenu.jsx';
export default function TopBar({ journey, user, view, onNavigate, onOpenVault, onLogout }) {
  const pathLabel = (user?.pathType ?? journey?.user?.pathType) === 'university'
    ? '🎓 University path' : '🎒 High School path';
  return (
    <header>
      <div className="brand">
        <div className="dot" />
        <div>
          <h1 className="display">ASCEND</h1>
          <span>Advancing Skills &amp; Career Evolution</span>
        </div>
      </div>

      <nav className="top-nav">
        <button className={view === 'profile' ? 'nav-on' : ''} onClick={() => onNavigate('profile')}>Profile</button>
        <button className={view === 'path' ? 'nav-on' : ''} onClick={() => onNavigate('path')}>Path</button>
        <button className={view === 'modules' ? 'nav-on' : ''} onClick={() => onNavigate('modules')}>Modules</button>
        <button className={view === 'workshops' ? 'nav-on' : ''} onClick={() => onNavigate('workshops')}>Workshops</button>
        <button className={view === 'vault' ? 'nav-on' : ''} onClick={() => onNavigate('vault')}>Vault</button>
        <button className={view === 'targets' ? 'nav-on' : ''} onClick={() => onNavigate('targets')}>Targets</button>
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
