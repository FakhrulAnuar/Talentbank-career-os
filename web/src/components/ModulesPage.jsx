import { useEffect, useState, useCallback } from 'react';
import { fetchModules, completeModule, runIngestion, fetchCourseGuidance } from '../api.js';

// Online Modules - personalised AND seniority-aware. Courses matching the user's profile appear
// under "Recommended for you", but only at a level appropriate to their year/stage (a final-year
// never gets recommended a beginner fundamentals course - those drop to "More courses"). Soft
// skills are pinned under "Essential skills". When a Gemini key is set, an optional AI note
// explains the stage focus and reorders the recommended list; the rules still decide eligibility.
const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

function ModuleRow({ m, completingKey, onComplete, badge }) {
  const done = m.status === 'completed';
  return (
    <div className={`mod-row ${done ? 'done' : ''}`}>
      <div className="mod-rail"><span className="mod-dot" /></div>
      <div className="mod-body">
        <div className="mod-head">
          <h3>
            {m.title}
            {m.level && <span className={`level-chip lvl-${m.level}`}>{LEVEL_LABEL[m.level]}</span>}
            {m.careerPrep && <span className="field-chip">Career prep</span>}
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
  const [aiGuidance, setAiGuidance] = useState(false);
  const [guidance, setGuidance] = useState(null); // { order, note, source }
  const [error, setError] = useState(null);
  const [completingKey, setCompletingKey] = useState(null);
  const [ingesting, setIngesting] = useState(false);

  const load = useCallback(() => {
    setError(null);
    fetchModules().then((d) => {
      setModules(d.modules);
      setAiGuidance(Boolean(d.aiGuidance));
      if (d.aiGuidance) {
        fetchCourseGuidance().then(setGuidance).catch(() => {}); // optional - ignore failures
      }
    }).catch((e) => setError(e.message));
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

  // AI ordering (when available) takes priority within the recommended list; otherwise best match.
  const order = guidance?.order || null;
  const rank = (m) => {
    const i = order ? order.indexOf(m.key) : -1;
    return i === -1 ? Number.MAX_SAFE_INTEGER - m.matchScore : i;
  };
  const recommended = modules.filter((m) => m.recommended && !m.essential).sort((a, b) => rank(a) - rank(b));
  const essentials = modules.filter((m) => m.essential);
  const more = modules.filter((m) => !m.essential && !m.recommended);

  return (
    <div className="modules">
      <div className="lead">
        <h2 className="display">Modules that move you up.</h2>
        <p>Real courses on their providers, matched to your field and your year. Each earns points and a CV boost. {doneCount} of {modules.length} completed.</p>
        <button className="ghost-btn" onClick={refreshCatalog} disabled={ingesting} style={{ marginTop: 10 }}>
          {ingesting ? 'Refreshing…' : '↻ Refresh catalog (pull latest courses)'}
        </button>
      </div>

      <p className="honesty-note">
        ⓘ Courses are hosted by their providers (Coursera, Khan Academy, LinkedIn Learning, YouTube…).
        “Mark as done” is self-reported - a <b>Verified</b> badge appears only when a provider confirms completion.
      </p>

      {guidance?.note && (
        <div className="ai-explain">
          <div className="ai-explain-label">✨ Guidance for your stage · eligibility decided by the rules</div>
          <p>{guidance.note}</p>
        </div>
      )}

      {recommended.length > 0 && (
        <div className="shelf-phase">
          <div className="phase-label">Recommended for you · matched to your field &amp; year</div>
          {recommended.map((m) => (
            <ModuleRow key={m.key} m={m} completingKey={completingKey} onComplete={complete} badge={m.careerPrep ? null : 'For your field'} />
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
        <p className="modules-hint">💡 Set your <b>target field</b>, <b>interests</b> and <b>year / stage</b> on the Profile page to get courses tailored to where you are (e.g. culinary, hospitality, engineering).</p>
      )}
    </div>
  );
}
