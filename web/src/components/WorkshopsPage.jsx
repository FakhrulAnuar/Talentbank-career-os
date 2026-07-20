import { useEffect, useState, useCallback } from 'react';
import { fetchEvents } from '../api.js';

// Workshops & Tournaments - personalised. Events matching the user's profile (target field /
// interests) surface under "Recommended for you"; broadly-useful events are pinned under
// "Featured for everyone"; the rest sit under "More opportunities". We never host an event -
// each links to its official registration page, with a "verify on the official site" note
// because dates and deadlines drift year to year.
const TYPE_LABEL = { workshop: 'Workshop', hackathon: 'Hackathon', competition: 'Competition', fair: 'Career fair' };
const TYPE_ICON = { workshop: '🛠️', hackathon: '💻', competition: '🏆', fair: '🤝' };

function EventRow({ e, badge }) {
  return (
    <div className="ev-row">
      <div className="mod-rail"><span className="mod-dot" /></div>
      <div className="mod-body">
        <div className="mod-head">
          <h3>
            <span className="ev-ico">{TYPE_ICON[e.type] || '📌'}</span>
            {e.title}
            {badge && <span className="field-chip">{badge}</span>}
          </h3>
          <span className="ev-type">{TYPE_LABEL[e.type] || e.type}</span>
        </div>
        {e.organizer && <div className="mod-provider">{e.organizer}</div>}
        <p className="mod-desc">{e.blurb}</p>
        <div className="ev-meta">
          {e.date && <span className="ev-chip">🗓 {e.date}</span>}
          {e.deadline && <span className="ev-chip">⏳ {e.deadline}</span>}
          {e.location && <span className="ev-chip">📍 {e.location}</span>}
          {e.mode && <span className="ev-chip">{e.mode}</span>}
          {e.cost && <span className={`ev-chip ${e.cost === 'free' ? 'ev-free' : ''}`}>{e.cost === 'free' ? 'Free' : 'Paid'}</span>}
        </div>
        <div className="mod-links">
          {e.url && <a className="go-course" href={e.url} target="_blank" rel="noreferrer">Register / details ↗</a>}
          {e.lastVerified && <span className="ev-checked">link checked {e.lastVerified}</span>}
        </div>
      </div>
    </div>
  );
}

export default function WorkshopsPage({ onNavigate }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    fetchEvents().then((d) => setEvents(d.events)).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <p className="path-error">{error}</p>;
  if (!events) return <div className="path-skeleton"><div className="spine" /><p>Loading opportunities…</p></div>;

  const recommended = events.filter((e) => e.recommended && !e.featured).sort((a, b) => b.matchScore - a.matchScore);
  const featured = events.filter((e) => e.featured);
  const more = events.filter((e) => !e.featured && !e.recommended);

  return (
    <div className="modules">
      <div className="lead">
        <h2 className="display">Workshops & tournaments to level up.</h2>
        <p>Real hackathons, competitions, workshops and career fairs for Malaysian students. Enter one, add it to your CV, and climb.</p>
      </div>

      <p className="honesty-note">
        ⓘ These events are run by their organisers, not by ASCEND. Dates and deadlines change every year,
        so always confirm on the official page before you plan around them. This is guidance, not official advice.
      </p>

      {recommended.length > 0 && (
        <div className="shelf-phase">
          <div className="phase-label">Recommended for you · based on your profile</div>
          {recommended.map((e) => <EventRow key={e.key} e={e} badge="For your field" />)}
        </div>
      )}

      {featured.length > 0 && (
        <div className="shelf-phase">
          <div className="phase-label">Featured · great for everyone</div>
          {featured.map((e) => <EventRow key={e.key} e={e} />)}
        </div>
      )}

      {more.length > 0 && (
        <div className="shelf-phase">
          <div className="phase-label">More opportunities</div>
          {more.map((e) => <EventRow key={e.key} e={e} />)}
        </div>
      )}

      {recommended.length === 0 && (
        <p className="modules-hint">
          💡 Set your <b>target field</b> and <b>interests</b> on the{' '}
          <button className="linklike" onClick={() => onNavigate?.('profile')}>Profile page</button>{' '}
          to get events tailored to you (e.g. culinary, hospitality, engineering, business).
        </p>
      )}
    </div>
  );
}
