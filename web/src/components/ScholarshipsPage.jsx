import { useEffect, useState, useCallback } from 'react';
import { fetchScholarships, scholarshipApplyGuide } from '../api.js';

// Scholarships - high-school facing. Real Malaysian scholarships matched to the student's field,
// stage and state. Grouped: "From your state" (state foundations), "Recommended for you" (field
// match), "Open to all" (broadly open), and "More scholarships". Each shows a requirements
// summary, type (merit/need/bonded) and an official apply link. Optional AI "How to apply" note
// (only when a Gemini key is set). We suggest relevance - we never claim a student qualifies.
const TYPE_LABEL = { merit: 'Merit', need: 'Need-based', bonded: 'Bonded' };

function ScholarshipRow({ s, aiGuide }) {
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function howToApply() {
    setLoading(true); setErr(null);
    try {
      const out = await scholarshipApplyGuide(s.key);
      setGuide(out);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  const showButton = aiGuide && !guide?.text;

  return (
    <div className="ev-row">
      <div className="mod-rail"><span className="mod-dot" /></div>
      <div className="mod-body">
        <div className="mod-head">
          <h3>
            <span className="ev-ico">🎓</span>{s.name}
            {s.type && <span className={`sch-type sch-${s.type}`}>{TYPE_LABEL[s.type] || s.type}</span>}
            {s.award && <span className="sch-award">{s.award === 'full' ? 'Full' : 'Partial'}</span>}
          </h3>
        </div>
        {s.provider && <div className="mod-provider">{s.provider}</div>}
        {s.benefit && <p className="mod-desc">{s.benefit}</p>}

        {s.requirements?.length > 0 && (
          <div className="sch-reqs">
            <div className="sch-reqs-label">Who it's for (summary)</div>
            <ul>{s.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
        )}

        <div className="ev-meta">
          {s.field && <span className="ev-chip">🎯 {s.field}</span>}
          {s.stage && <span className="ev-chip">📚 {s.stage}</span>}
          {s.deadline && <span className="ev-chip">⏳ {s.deadline}</span>}
          {s.scope === 'state' && s.state && <span className="ev-chip">📍 {s.state}</span>}
        </div>

        {guide?.text && (
          <div className="ai-explain">
            <div className="ai-explain-label">✨ How to apply · guidance, verify exact steps on the official site</div>
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
          {s.url && <a className="go-course" href={s.url} target="_blank" rel="noreferrer">Apply / details ↗</a>}
          {s.lastVerified && <span className="ev-checked">link checked {s.lastVerified}</span>}
        </div>
      </div>
    </div>
  );
}

export default function ScholarshipsPage({ onNavigate }) {
  const [items, setItems] = useState(null);
  const [aiGuide, setAiGuide] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    fetchScholarships().then((d) => { setItems(d.scholarships); setAiGuide(Boolean(d.aiGuide)); }).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <p className="path-error">{error}</p>;
  if (!items) return <div className="path-skeleton"><div className="spine" /><p>Finding scholarships…</p></div>;

  // Assign each scholarship to exactly one group, by priority.
  const groupOf = (s) => (s.fromYourState ? 'state' : s.recommended ? 'recommended' : s.openToAll ? 'open' : 'more');
  const bucket = { state: [], recommended: [], open: [], more: [] };
  items.forEach((s) => bucket[groupOf(s)].push(s));
  const sortByMatch = (a, b) => b.matchScore - a.matchScore;

  const groups = [
    { key: 'state', label: 'From your state', items: bucket.state.sort(sortByMatch) },
    { key: 'recommended', label: 'Recommended for you · based on your field', items: bucket.recommended.sort(sortByMatch) },
    { key: 'open', label: 'Open to all', items: bucket.open },
    { key: 'more', label: 'More scholarships', items: bucket.more },
  ].filter((g) => g.items.length > 0);

  const recommendedShown = bucket.state.length + bucket.recommended.length > 0;

  return (
    <div className="modules">
      <div className="lead">
        <h2 className="display">Scholarships to help you get there.</h2>
        <p>Real Malaysian scholarships for school leavers, matched to your field, stage and state. Set those on your Profile to sharpen the matches.</p>
      </div>

      <p className="honesty-note">
        ⓘ These are run by their providers, not by ASCEND. The "who it's for" list is a <b>summary</b>, not the full
        criteria, and we do <b>not</b> decide whether you qualify. Deadlines and terms change every year, so always
        confirm on the official site. This is guidance, not official advice.
      </p>

      {groups.map((g) => (
        <div className="shelf-phase" key={g.key}>
          <div className="phase-label">{g.label}</div>
          {g.items.map((s) => <ScholarshipRow key={s.key} s={s} aiGuide={aiGuide} />)}
        </div>
      ))}

      {!recommendedShown && (
        <p className="modules-hint">
          💡 Set your <b>target field</b>, <b>interests</b> and <b>state</b> on the{' '}
          <button className="linklike" onClick={() => onNavigate?.('profile')}>Profile page</button>{' '}
          to get scholarships matched to you (including ones from your own state).
        </p>
      )}
    </div>
  );
}
