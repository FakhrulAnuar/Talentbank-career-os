import { useEffect, useState, useCallback } from 'react';
import { fetchInternships, internshipApplyGuide } from '../api.js';

// Internships - university facing. Real Malaysian internship programmes, matched to the student's
// field and surfaced by state ("near you"). Actionable-now: deadline, duration and paid-or-unpaid
// lead. Grouped: "Recommended for you" (field match), "Near you" (same state), "Open to all"
// (government schemes), "More internships". Optional AI "How to apply" note (Gemini key set).
function InternshipRow({ it, aiGuide }) {
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function howToApply() {
    setLoading(true); setErr(null);
    try {
      const out = await internshipApplyGuide(it.key);
      setGuide(out);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  const showButton = aiGuide && !guide?.text;
  const payLabel = it.paid === 'paid' ? 'Paid' : it.paid === 'allowance' ? 'Allowance' : it.paid === 'unpaid' ? 'Unpaid' : null;

  return (
    <div className="ev-row">
      <div className="mod-rail"><span className="mod-dot" /></div>
      <div className="mod-body">
        <div className="mod-head">
          <h3>
            <span className="ev-ico">💼</span>{it.role || 'Internship'} · {it.company}
            {it.nearYou && <span className="scope-chip">Near you</span>}
            {payLabel && <span className={`sch-award ${it.paid === 'paid' ? 'pay-paid' : ''}`}>{payLabel}</span>}
          </h3>
        </div>
        {it.blurb && <p className="mod-desc">{it.blurb}</p>}

        {it.requirements?.length > 0 && (
          <div className="sch-reqs">
            <div className="sch-reqs-label">Who it's for (summary)</div>
            <ul>{it.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
        )}

        <div className="ev-meta">
          {it.field && <span className="ev-chip">🎯 {it.field}</span>}
          {it.location && <span className="ev-chip">📍 {it.location}</span>}
          {it.mode && <span className="ev-chip">{it.mode}</span>}
          {it.duration && <span className="ev-chip">⏱ {it.duration}</span>}
          {it.deadline && <span className="ev-chip">⏳ {it.deadline}</span>}
        </div>

        {guide?.text && (
          <div className="ai-explain">
            <div className="ai-explain-label">✨ How to apply · guidance, confirm steps on the official site</div>
            <p>{guide.text}</p>
          </div>
        )}
        {err && <p className="ai-explain-err">Couldn't build a guide right now.</p>}

        <div className="mod-links">
          {showButton && (
            <button className="explain-btn" onClick={howToApply} disabled={loading}>
              {loading ? 'Thinking…' : '✨ How to apply'}
            </button>
          )}
          {it.url && <a className="go-course" href={it.url} target="_blank" rel="noreferrer">Apply / details ↗</a>}
          {it.lastVerified && <span className="ev-checked">link checked {it.lastVerified}</span>}
        </div>
      </div>
    </div>
  );
}

export default function InternshipsPage({ onNavigate }) {
  const [items, setItems] = useState(null);
  const [aiGuide, setAiGuide] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    fetchInternships().then((d) => { setItems(d.internships); setAiGuide(Boolean(d.aiGuide)); }).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <p className="path-error">{error}</p>;
  if (!items) return <div className="path-skeleton"><div className="spine" /><p>Finding internships…</p></div>;

  // Field match wins; then local (near you); then open schemes; then the rest.
  const groupOf = (it) => (it.recommended ? 'recommended' : it.nearYou ? 'near' : it.openToAll ? 'open' : 'more');
  const bucket = { recommended: [], near: [], open: [], more: [] };
  items.forEach((it) => bucket[groupOf(it)].push(it));
  const byMatch = (a, b) => (b.nearYou - a.nearYou) || (b.matchScore - a.matchScore);

  const groups = [
    { key: 'recommended', label: 'Recommended for you · based on your field', items: bucket.recommended.sort(byMatch) },
    { key: 'near', label: 'Near you', items: bucket.near },
    { key: 'open', label: 'Open to all', items: bucket.open },
    { key: 'more', label: 'More internships', items: bucket.more },
  ].filter((g) => g.items.length > 0);

  const anyMatched = bucket.recommended.length + bucket.near.length > 0;

  return (
    <div className="modules">
      <div className="lead">
        <h2 className="display">Internships to build real experience.</h2>
        <p>Real Malaysian internship programmes you can apply for now, matched to your field and your state. These are stepping stones toward your target companies. Set your field and state on Profile to sharpen the matches.</p>
      </div>

      <p className="honesty-note">
        ⓘ These are run by their companies, not by ASCEND. The "who it's for" list is a <b>summary</b>, not the full
        criteria, and we do <b>not</b> decide whether you qualify. Intakes, stipends and deadlines change, so always
        confirm on the official site. This is guidance, not official advice.
      </p>

      {groups.map((g) => (
        <div className="shelf-phase" key={g.key}>
          <div className="phase-label">{g.label}</div>
          {g.items.map((it) => <InternshipRow key={it.key} it={it} aiGuide={aiGuide} />)}
        </div>
      ))}

      {!anyMatched && (
        <p className="modules-hint">
          💡 Set your <b>target field</b>, <b>interests</b> and <b>state</b> on the{' '}
          <button className="linklike" onClick={() => onNavigate?.('profile')}>Profile page</button>{' '}
          to get internships matched to you (including ones near you).
        </p>
      )}
    </div>
  );
}
