import { useEffect, useState, useCallback } from 'react';
import { fetchRecommendations } from '../api.js';

// Target Recommendations — the Summit. A continuous ranked list of universities (high school)
// or companies (university), scored against the user's ASCEND activity, each with a real
// source link + last-verified date. This is guidance, not official advice.
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

  return (
    <div className="targets">
      <div className="lead">
        <h2 className="display">{isCompany ? 'Companies matched to you.' : 'Universities matched to you.'}</h2>
        <p>Ranked by how well each fits your ASCEND activity. Complete more modules and add certificates to climb the matches.</p>
      </div>

      <p className="honesty-note">
        ⓘ This is <b>guidance, not official advice</b>. Match % reflects your activity, not admission or hiring odds —
        always verify entry requirements, deadlines and fees on the official site.
      </p>

      <div className="target-list">
        {data.items.map((t, i) => (
          <div className={`target-row ${i === 0 ? 'top' : ''}`} key={t.id}>
            <div className="target-rank">#{i + 1}</div>
            <div className="target-main">
              <div className="target-head">
                <h3>{t.name}</h3>
                <div className="target-score"><span>{t.score}%</span> match</div>
              </div>
              <div className="target-meta">{t.field} · {t.location}</div>
              <p className="target-blurb">{t.blurb}</p>
              <div className="match-bar"><span style={{ width: `${t.score}%` }} /></div>
              <div className="target-reasons">
                {t.reasons.map((r, ri) => <span className="reason-chip" key={ri}>{r}</span>)}
              </div>
              <div className="target-foot">
                {t.sourceUrl && (
                  <a className="target-link" href={t.sourceUrl} target="_blank" rel="noreferrer">
                    {isCompany ? 'Careers / apply ↗' : 'Programmes / apply ↗'}
                  </a>
                )}
                {t.lastVerified && <span className="target-source">Official site · checked {t.lastVerified}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
