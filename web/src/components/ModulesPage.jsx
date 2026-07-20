import { useEffect, useState, useCallback } from 'react';
import { fetchModules, completeModule, runIngestion } from '../api.js';

// Online Modules - personalised. Courses matching the user's profile (target field/interests)
// appear under "Recommended for you"; soft-skill/general courses are pinned under "Essential
// skills" for everyone; the rest sit under "More courses". Real external links, honor-system.
function ModuleRow({ m, completingKey, onComplete, badge }) {
  const done = m.status === 'completed';
  return (
    <div className={`mod-row ${done ? 'done' : ''}`}>
      <div className="mod-rail"><span className="mod-dot" /></div>
      <div className="mod-body">
        <div className="mod-head">
          <h3>
            {m.title}
            {m.verified && <span className="verified-badge">✓ Verified</span>}
            {badge && <span className="field-chip">{badge}</span>}
          </h3>
          <span className="mod-meta">+{m.points} pts</span>
        </div>
        {m.provider && <div className="mod-provider">{m.provider}{m.lastVerified ? ` · link checked ${m.lastVerified}` : ''}</div>}
        <p className="mod-desc">{m.description}</p>
        {m.cvTip && <p className="mod-cv"><span className="cv-badge">CV boost</span> {m.cvTip}</p>}
        <div className="mod-links">
          {m.url && <a className="go-course" href={m.url} target="_blank" rel="noreferrer">Go to course ↗</a>}
          {done ? (
            <span className="mod-done">✓ Marked as done</span>
          ) : (
            <button className="mark-done" disabled={completingKey === m.key} onClick={() => onComplete(m.key)}>
              {completingKey === m.key ? 'Saving…' : 'Mark as done'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ModulesPage({ onScoreChanged }) {
  const [modules, setModules] = useState(null);
  const [error, setError] = useState(null);
  const [completingKey, setCompletingKey] = useState(null);
  const [ingesting, setIngesting] = useState(false);

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
    } catch (e) { setError(e.message); } finally { setCompletingKey(null); }
  }

  async function refreshCatalog() {
    setIngesting(true);
    setError(null);
    try {
      await runIngestion();
      load();
    } catch (e) { setError(e.message); } finally { setIngesting(false); }
  }

  if (error) return <p className="path-error">{error}</p>;
  if (!modules) return <div className="path-skeleton"><div className="spine" /><p>Loading modules…</p></div>;

  const doneCount = modules.filter((m) => m.status === 'completed').length;
  const recommended = modules.filter((m) => m.recommended && !m.essential).sort((a, b) => b.matchScore - a.matchScore);
  const essentials = modules.filter((m) => m.essential);
  const more = modules.filter((m) => !m.essential && !m.recommended);

  return (
    <div className="modules">
      <div className="lead">
        <h2 className="display">Modules that move you up.</h2>
        <p>Real courses on their providers. Each earns points toward your Pathway Score and a CV boost. {doneCount} of {modules.length} completed.</p>
        <button className="ghost-btn" onClick={refreshCatalog} disabled={ingesting} style={{ marginTop: 10 }}>
          {ingesting ? 'Refreshing…' : '↻ Refresh catalog (pull latest courses)'}
        </button>
      </div>

      <p className="honesty-note">
        ⓘ Courses are hosted by their providers (Coursera, Khan Academy, LinkedIn Learning, YouTube…).
        “Mark as done” is self-reported - a <b>Verified</b> badge appears only when a provider confirms completion.
      </p>

      {recommended.length > 0 && (
        <div className="shelf-phase">
          <div className="phase-label">Recommended for you · based on your profile</div>
          {recommended.map((m) => (
            <ModuleRow key={m.key} m={m} completingKey={completingKey} onComplete={complete} badge="For your field" />
          ))}
        </div>
      )}

      {essentials.length > 0 && (
        <div className="shelf-phase">
          <div className="phase-label">Essential skills · everyone should have these</div>
          {essentials.map((m) => (
            <ModuleRow key={m.key} m={m} completingKey={completingKey} onComplete={complete} />
          ))}
        </div>
      )}

      {more.length > 0 && (
        <div className="shelf-phase">
          <div className="phase-label">More courses</div>
          {more.map((m) => (
            <ModuleRow key={m.key} m={m} completingKey={completingKey} onComplete={complete} />
          ))}
        </div>
      )}

      {recommended.length === 0 && (
        <p className="modules-hint">💡 Set your <b>target field</b> and <b>interests</b> on the Profile page to get course recommendations tailored to you (e.g. culinary, hospitality, engineering).</p>
      )}
    </div>
  );
}
