// Renders the continuous Ascent Path from /api/journey data.
// The spine is one element; nodes alternate sides; the orb sits before the active step.

function Marker({ status }) {
  if (status === 'completed') return <div className="marker done" />;
  if (status === 'active') return <div className="marker now" />;
  return <div className="marker next" />;
}

function Node({ m, side, hasCert, onOpenVault, onComplete, onGoProfile, completing }) {
  const preview = m.status === 'preview';
  const gated = m.kind === 'onboarding'; // must be finished on its own page (Profile)
  return (
    <div className={`node ${side}`}>
      <Marker status={m.status} />
      <div className={`content ${preview ? '' : 'glass'}`}>
        <div className="tag" style={preview ? { color: 'var(--ink-soft)' } : undefined}>
          {m.status === 'completed' ? `${m.phase} · complete`
            : m.status === 'active' ? 'Your current step'
            : 'Preview'}
        </div>
        <h3 style={preview ? { color: 'var(--ink-soft)' } : undefined}>{m.title}</h3>
        <p>
          {m.status === 'completed' ? `+${m.pointsAwarded} points earned`
            : `+${m.points} points`}
        </p>
        {hasCert && (
          <span className="lantern" onClick={onOpenVault}>
            <span className="fl" /> Certificate earned
          </span>
        )}
        {m.status === 'active' && (
          gated ? (
            <button className="complete-btn" onClick={onGoProfile}>
              Set up your profile →
            </button>
          ) : (
            <button className="complete-btn" disabled={completing} onClick={() => onComplete(m.key)}>
              {completing ? 'Saving…' : `Complete this step · +${m.points} pts`}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default function AscentPath({ journey, onOpenVault, onComplete, onGoProfile, completingKey }) {
  const { path, recommendations, certificates } = journey;
  const certKeys = new Set(certificates.map((c) => c.milestoneKey).filter(Boolean));
  const activeIndex = path.findIndex((m) => m.status === 'active');

  return (
    <section className="path">
      <div className="spine" />
      <div className="spine future" />
      {path.map((m, i) => (
        <div key={m.key}>
          {i === activeIndex && (
            <div className="node right" style={{ minHeight: 150 }}>
              <div className="orb-wrap">
                <div className="orb" />
                <div className="coach">You’re here - finish this step to climb ✦</div>
              </div>
            </div>
          )}
          {m.kind === 'summit' ? (
            <div className="summit">
              <div className="cap">⛰️</div>
              <h3 className="display">Your Summit</h3>
              <p>{journey.user.pathType === 'university' ? 'Company' : 'University'} recommendations, matched to your path.</p>
              <div className="rec-row">
                {recommendations.map((r) => (
                  <div className="rec" key={r.id}>
                    <b>{r.label}</b>
                    <small>{r.score}% path match</small>
                  </div>
                ))}
                {recommendations.length === 0 && <p className="summit-empty">Keep climbing - matches unlock as you progress.</p>}
              </div>
            </div>
          ) : (
            <Node
              m={m}
              side={i % 2 === 0 ? 'right' : 'left'}
              hasCert={certKeys.has(m.key)}
              onOpenVault={onOpenVault}
              onComplete={onComplete}
              onGoProfile={onGoProfile}
              completing={completingKey === m.key}
            />
          )}
        </div>
      ))}
    </section>
  );
}
