import { useEffect, useState, useCallback } from 'react';
import { fetchModules, completeModule } from '../api.js';

// Online Modules — a continuous shelf of connected rows (not a grid of cards). Each module
// links to a REAL external course on its provider; "Mark as done" is honor-system (self-
// reported) until provider verification exists.
export default function ModulesPage({ onScoreChanged }) {
  const [modules, setModules] = useState(null);
  const [error, setError] = useState(null);
  const [completingKey, setCompletingKey] = useState(null);

  const load = useCallback(() => {
    setError(null);
    fetchModules().then((d) => setModules(d.modules)).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function complete(key) {
    setCompletingKey(key);
    setError(null);
    try {
      const { modules: updated } = await completeModule(key);
      setModules(updated);
      onScoreChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setCompletingKey(null);
    }
  }

  if (error) return <p className="path-error">{error}</p>;
  if (!modules) return <div className="path-skeleton"><div className="spine" /><p>Loading modules…</p></div>;

  const doneCount = modules.filter((m) => m.status === 'completed').length;

  const phases = [];
  for (const m of modules) {
    let g = phases.find((p) => p.phase === m.phase);
    if (!g) { g = { phase: m.phase, items: [] }; phases.push(g); }
    g.items.push(m);
  }

  return (
    <div className="modules">
      <div className="lead">
        <h2 className="display">Modules that move you up.</h2>
        <p>Real courses on their providers. Each earns points toward your Pathway Score and a CV boost. {doneCount} of {modules.length} completed.</p>
      </div>

      <p className="honesty-note">
        ⓘ Courses are hosted by their providers (Coursera, Khan Academy, LinkedIn Learning…).
        “Mark as done” is self-reported — a <b>Verified</b> badge appears only when a provider confirms completion.
      </p>

      <div className="shelf">
        {phases.map((g) => (
          <div className="shelf-phase" key={g.phase}>
            <div className="phase-label">{g.phase}</div>
            {g.items.map((m) => {
              const done = m.status === 'completed';
              return (
                <div className={`mod-row ${done ? 'done' : ''}`} key={m.key}>
                  <div className="mod-rail"><span className="mod-dot" /></div>
                  <div className="mod-body">
                    <div className="mod-head">
                      <h3>
                        {m.title}
                        {m.verified && <span className="verified-badge">✓ Verified</span>}
                      </h3>
                      <span className="mod-meta">+{m.points} pts</span>
                    </div>
                    {m.provider && <div className="mod-provider">{m.provider}{m.lastVerified ? ` · link checked ${m.lastVerified}` : ''}</div>}
                    <p className="mod-desc">{m.description}</p>
                    {m.cvTip && (
                      <p className="mod-cv"><span className="cv-badge">CV boost</span> {m.cvTip}</p>
                    )}
                    <div className="mod-links">
                      {m.url && (
                        <a className="go-course" href={m.url} target="_blank" rel="noreferrer">Go to course ↗</a>
                      )}
                      {done ? (
                        <span className="mod-done">✓ Marked as done</span>
                      ) : (
                        <button className="mark-done" disabled={completingKey === m.key} onClick={() => complete(m.key)}>
                          {completingKey === m.key ? 'Saving…' : 'Mark as done'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
