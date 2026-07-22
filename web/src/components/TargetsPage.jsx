import { useEffect, useState, useCallback } from 'react';
import { fetchRecommendations, explainMatch } from '../api.js';

// Target Recommendations - the Summit. A continuous ranked list of universities (high school)
// or companies (university), scored against the user's ASCEND activity, each with a real
// source link + last-verified date. This is guidance, not official advice.
//
// Optional AI layer: when the server has a Gemini key (data.aiExplain), each row offers an
// "Explain this match" button that turns the rule-derived reasons into a plain-language note.
// The rules still decide the ranking; the AI only phrases it. Without a key the button is hidden
// and the reason chips stand on their own.
function TargetRow({ t, rank, isCompany, aiExplain }) {
  const [expl, setExpl] = useState(null);   // { text, source } once fetched
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function explain() {
    setLoading(true); setErr(null);
    try {
      const out = await explainMatch(t.key);
      setExpl(out);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  const showButton = aiExplain && !expl;

  return (
    <div className={`target-row ${rank === 0 ? 'top' : ''}`}>
      <div className="target-rank">#{rank + 1}</div>
      <div className="target-main">
        <div className="target-head">
          <h3>
            {t.name}
            {t.scope === 'international'
              ? <span className="scope-chip intl">International</span>
              : (t.state && <span className="scope-chip">{t.state}</span>)}
          </h3>
          <div className="target-score"><span>{t.score}%</span> match</div>
        </div>
        <div className="target-meta">{t.field} · {t.location}</div>
        <p className="target-blurb">{t.blurb}</p>
        <div className="match-bar"><span style={{ width: `${t.score}%` }} /></div>
        <div className="target-reasons">
          {t.reasons.map((r, ri) => <span className="reason-chip" key={ri}>{r}</span>)}
        </div>

        {expl?.text && (
          <div className="ai-explain">
            <div className="ai-explain-label">✨ AI explanation · ranking is decided by the rules above</div>
            <p>{expl.text}</p>
          </div>
        )}
        {err && <p className="ai-explain-err">Couldn't generate an explanation right now.</p>}

        <div className="target-foot">
          {showButton && (
            <button className="explain-btn" onClick={explain} disabled={loading}>
              {loading ? 'Thinking…' : '✨ Explain this match'}
            </button>
          )}
          {t.sourceUrl && (
            <a className="target-link" href={t.sourceUrl} target="_blank" rel="noreferrer">
              {isCompany ? 'Careers / apply ↗' : 'Programmes / apply ↗'}
            </a>
          )}
          {t.lastVerified && <span className="target-source">Official site · checked {t.lastVerified}</span>}
        </div>
      </div>
    </div>
  );
}

export default function TargetsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    fetchRecommendations().then(setData).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <p className="path-error">{error}</p>;
  if (!data) return <div className="path-skeleton"><div className="spine" /><p>Matching your targets…</p></div>;

  const isCompany = data.type === 'company';

  // Keep the global rank (already sorted by score), then split into proximity groups.
  const ranked = data.items.map((t, i) => ({ ...t, rank: i }));
  const groups = [
    { key: 'near', label: 'Near you', items: ranked.filter((t) => t.group === 'near') },
    { key: 'local', label: isCompany ? 'In Malaysia' : 'Elsewhere in Malaysia', items: ranked.filter((t) => t.group === 'local') },
    { key: 'international', label: 'Explore abroad', items: ranked.filter((t) => t.group === 'international') },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="targets">
      <div className="lead">
        <h2 className="display">{isCompany ? 'Companies matched to you.' : 'Universities matched to you.'}</h2>
        <p>{isCompany
          ? 'Ranked by how well each fits your ASCEND activity, Malaysian employers first, with international options to explore.'
          : 'Ranked by fit and location, universities near you first, then elsewhere in Malaysia, then options abroad. Set your state on the Profile page to sharpen this.'}
        </p>
      </div>

      <p className="honesty-note">
        ⓘ This is <b>guidance, not official advice</b>. Match % reflects your activity, not admission or hiring odds -
        always verify entry requirements, deadlines and fees on the official site.
      </p>

      {groups.map((g) => (
        <div className="target-group" key={g.key}>
          <div className="phase-label">{g.label}</div>
          <div className="target-list">
            {g.items.map((t) => (
              <TargetRow key={t.id} t={t} rank={t.rank} isCompany={isCompany} aiExplain={data.aiExplain} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
