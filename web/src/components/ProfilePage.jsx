import { useEffect, useState, useCallback } from 'react';
import { fetchProfile, saveProfile } from '../api.js';
import ResumeSection from './ResumeSection.jsx';

const SUGGESTED = ['Data', 'Coding', 'Engineering', 'Semiconductor', 'Electronics', 'Business',
  'Communication', 'Networking', 'Research', 'Design', 'Analytics', 'Software'];

// Year/stage drives seniority-aware course recommendations. Options differ by path.
const UNI_YEARS = [
  ['year1', 'Year 1'], ['year2', 'Year 2'], ['year3', 'Year 3'],
  ['final', 'Final year'], ['postgrad', 'Postgraduate'],
];
const HS_STAGES = [
  ['form4', 'Form 4 (or lower)'], ['form5', 'Form 5 (SPM year)'],
  ['preu', 'Pre-U (Form 6 / matriculation / foundation)'],
];

export default function ProfilePage({ user, onSaved }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [draft, setDraft] = useState('');

  const load = useCallback(() => {
    setError(null);
    fetchProfile().then((d) => setProfile(d.profile)).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error && !profile) return <p className="path-error">{error}</p>;
  if (!profile) return <div className="path-skeleton"><div className="spine" /><p>Loading profile…</p></div>;

  const set = (patch) => setProfile((p) => ({ ...p, ...patch }));
  const addInterest = (val) => {
    const v = val.trim();
    if (v && !profile.interests.includes(v)) set({ interests: [...profile.interests, v] });
    setDraft('');
  };
  const removeInterest = (v) => set({ interests: profile.interests.filter((x) => x !== v) });

  async function save() {
    setStatus('saving');
    setError(null);
    try {
      const { milestoneCompleted } = await saveProfile(profile);
      setStatus('saved');
      if (milestoneCompleted) onSaved?.();
      setTimeout(() => setStatus(''), 1800);
    } catch (e) {
      setError(e.message);
      setStatus('');
    }
  }

  const isUniversity = user?.pathType === 'university';

  return (
    <div className="profile">
      <div className="lead">
        <h2 className="display">Your profile &amp; interests.</h2>
        <p>Tell us where you're headed. This sharpens your Target matches and {isUniversity ? 'builds your resume' : 'fills your experience record'} below.</p>
      </div>

      {error && <p className="path-error">{error}</p>}

      <div className="profile-card">
        <label>Target field
          <input list="field-suggestions" placeholder="e.g. Computer Science, Semiconductors, Business"
            value={profile.targetField} onChange={(e) => set({ targetField: e.target.value })} />
          <datalist id="field-suggestions">
            <option value="Computer Science" /><option value="Data Science" />
            <option value="Electrical & Electronic Engineering" /><option value="Semiconductors" />
            <option value="Software Engineering" /><option value="Business & Management" />
          </datalist>
        </label>

        <label>{isUniversity ? 'Year of study' : 'School stage'}
          <select value={profile.yearLevel || ''} onChange={(e) => set({ yearLevel: e.target.value })}>
            <option value="">Select your {isUniversity ? 'year' : 'stage'}…</option>
            {(isUniversity ? UNI_YEARS : HS_STAGES).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <span className="pf-hint">
            {isUniversity
              ? 'We use this to match course difficulty - seniors skip the fundamentals.'
              : 'We use this to tune your mix - explore broadly early, focus as you approach university.'}
          </span>
        </label>

        <div className="profile-field">
          <span className="pf-label">Interests</span>
          <div className="chips">
            {profile.interests.map((i) => (
              <span className="chip" key={i}>{i}<button onClick={() => removeInterest(i)}>✕</button></span>
            ))}
          </div>
          <input placeholder="Type an interest and press Enter" value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(draft); } }} />
          <div className="suggest-row">
            {SUGGESTED.filter((s) => !profile.interests.includes(s)).map((s) => (
              <button className="suggest-chip" key={s} onClick={() => addInterest(s)}>+ {s}</button>
            ))}
          </div>
        </div>

        <label>Short bio
          <textarea rows={3} placeholder="A sentence or two about you and your goals."
            value={profile.bio} onChange={(e) => set({ bio: e.target.value })} />
        </label>

        <label>Location
          <input placeholder="e.g. Penang, Malaysia" value={profile.location}
            onChange={(e) => set({ location: e.target.value })} />
        </label>

        <button className="primary-btn" onClick={save} disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : 'Save profile'}
        </button>
      </div>

      <div className="profile-divider no-print" />
      <ResumeSection variant={isUniversity ? 'resume' : 'record'} />
    </div>
  );
}
