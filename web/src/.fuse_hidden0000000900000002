import { useEffect, useState, useCallback } from 'react';
import { fetchJourney, getMe, logout, completeMilestone } from './api.js';
import TopBar from './components/TopBar.jsx';
import AscentPath from './components/AscentPath.jsx';
import AuthFlow from './components/AuthFlow.jsx';
import ModulesPage from './components/ModulesPage.jsx';
import VaultPage from './components/VaultPage.jsx';
import ResumePage from './components/ResumePage.jsx';
import TargetsPage from './components/TargetsPage.jsx';
import ProfilePage from './components/ProfilePage.jsx';

export default function App() {
  const [authUser, setAuthUser] = useState(undefined); // undefined=loading, null=logged out
  const [journey, setJourney] = useState(null);
  const [error, setError] = useState(null);
  const [completingKey, setCompletingKey] = useState(null);
  const [view, setView] = useState('path'); // 'profile' | 'path' | 'modules' | 'vault' | 'resume' | 'targets'

  const loadJourney = useCallback(() => {
    setError(null);
    return fetchJourney().then(setJourney).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    getMe()
      .then(({ user }) => { setAuthUser(user); loadJourney(); })
      .catch(() => setAuthUser(null));
  }, [loadJourney]);

  function handleAuthed(user, isNew) {
    setAuthUser(user);
    loadJourney();
    setView(isNew ? 'profile' : 'path'); // new sign-ups start on Profile
  }

  async function handleLogout() {
    await logout().catch(() => {});
    setJourney(null);
    setAuthUser(null);
    setView('path');
  }

  async function handleComplete(key) {
    setError(null);
    setCompletingKey(key);
    try {
      const updated = await completeMilestone(key);
      setJourney(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setCompletingKey(null);
    }
  }

  if (authUser === undefined) {
    return <div className="boot-msg"><h2 className="display">ASCEND</h2><p>Resuming your climb…</p></div>;
  }

  if (authUser === null) {
    return <AuthFlow onAuthed={handleAuthed} />;
  }

  return (
    <>
      <TopBar
        journey={journey}
        user={authUser}
        view={view}
        onNavigate={setView}
        onOpenVault={() => setView('vault')}
        onLogout={handleLogout}
      />
      <main className="stage">
        {view === 'path' && (
          <>
            <div className="lead">
              <h2 className="display">Your climb, one continuous path.</h2>
              <p>Not a dashboard of boxes — a single journey from where you are up to your goal.</p>
            </div>
            {error && <p className="path-error">{error}</p>}
            {journey ? (
              <AscentPath
                journey={journey}
                onOpenVault={() => setView('vault')}
                onComplete={handleComplete}
                onGoProfile={() => setView('profile')}
                completingKey={completingKey}
              />
            ) : (
              <div className="path-skeleton"><div className="spine" /><p>Charting your path…</p></div>
            )}
          </>
        )}
        {view === 'modules' && <ModulesPage user={authUser} onScoreChanged={loadJourney} />}
        {view === 'vault' && <VaultPage onScoreChanged={loadJourney} />}
        {view === 'resume' && <ResumePage />}
        {view === 'targets' && <TargetsPage onNavigate={setView} />}
        {view === 'profile' && <ProfilePage user={authUser} onSaved={loadJourney} />}
      </main>
    </>
  );
}
