import { useEffect, useState, useCallback } from 'react';
import { fetchResume, saveResume } from '../api.js';

const emptyExp = () => ({ title: '', org: '', location: '', start: '', end: '', bullets: [''] });
const emptyEdu = () => ({ degree: '', school: '', location: '', graduated: '' });
const emptyRef = () => ({ name: '', role: '', contact: '', note: '' });

// Resume/record editor + live single-column preview. Embedded inside ProfilePage for BOTH
// paths, self-loading via /api/resume. The `variant` switches the labels: 'resume' (university,
// job-oriented) vs 'record' (high school - "Experience" instead of "Work experience", framed as
// a place to bank activities, awards and references for the future).
const LABELS = {
  resume: {
    head: 'Your resume, auto-built.',
    sub: 'ATS-friendly and single-column. Skills and certifications come from your ASCEND activity - edit anything, then export to PDF.',
    loading: 'Building your resume…',
    save: 'Save resume',
    headerLegend: 'Header',
    headlinePh: 'Headline (e.g. Aspiring Data Analyst | Python | SQL)',
    summaryLegend: 'Professional summary',
    summaryPh: "2-4 sentences about who you are and what you're aiming for.",
    summaryHead: 'Professional Summary',
    expLegend: 'Work experience',
    expTitlePh: 'Role / title',
    expOrgPh: 'Organisation',
    bulletPh: 'Achievement / responsibility',
    addExp: '+ Add role',
    delExp: 'Remove role',
    expHead: 'Work Experience',
    refLegend: 'References & recommendations',
    refHead: 'References',
    refNamePh: 'Referee name',
    refRolePh: 'Title / relationship (e.g. Lecturer, Manager)',
    refNotePh: 'Recommendation, or "Available on request"',
    addRef: '+ Add reference',
  },
  record: {
    head: 'Your experience & achievements.',
    sub: 'A place to keep your activities, awards and references for the future. Add anything useful about yourself and save it - skills and certificates fill in from your ASCEND activity.',
    loading: 'Loading your record…',
    save: 'Save record',
    headerLegend: 'About You',
    headlinePh: 'Headline (e.g. Aspiring Engineer | Robotics Club member)',
    summaryLegend: 'About you',
    summaryPh: '2-4 sentences about you, your interests and your goals.',
    summaryHead: 'About Me',
    expLegend: 'Experience',
    expTitlePh: 'Title / role (e.g. Club President, Volunteer)',
    expOrgPh: 'Organisation / club / school',
    bulletPh: 'What you did or achieved',
    addExp: '+ Add experience',
    delExp: 'Remove',
    expHead: 'Experience',
    refLegend: 'Testimonies from teachers',
    refHead: 'Testimonies',
    refNamePh: "Teacher's name",
    refRolePh: 'Role (e.g. Class teacher, Science teacher)',
    refNotePh: "What they'd say about you, or 'Available on request'",
    addRef: '+ Add testimony',
  },
};

export default function ResumeSection({ variant = 'resume' }) {
  const L = LABELS[variant] || LABELS.resume;
  const isRecord = variant === 'record'; // high school: form only, no document preview / PDF
  const [resume, setResume] = useState(null);
  const [suggestions, setSuggestions] = useState({ skills: [], certifications: [] });
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(''); // '', 'saving', 'saved'

  const load = useCallback(() => {
    setError(null);
    fetchResume().then((d) => { setResume(d.resume); setSuggestions(d.suggestions); }).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (patch) => setResume((r) => ({ ...r, ...patch }));

  async function save() {
    setStatus('saving');
    setError(null);
    try {
      const { resume: saved } = await saveResume(resume);
      setResume(saved);
      setStatus('saved');
      setTimeout(() => setStatus(''), 1800);
    } catch (e) {
      setError(e.message);
      setStatus('');
    }
  }

  if (error && !resume) return <p className="path-error">{error}</p>;
  if (!resume) return <div className="path-skeleton"><div className="spine" /><p>{L.loading}</p></div>;

  // --- experience helpers ---
  const updExp = (i, patch) => set({ experience: resume.experience.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  const updBullet = (i, bi, val) => updExp(i, { bullets: resume.experience[i].bullets.map((b, k) => (k === bi ? val : b)) });
  const addExp = () => set({ experience: [...resume.experience, emptyExp()] });
  const delExp = (i) => set({ experience: resume.experience.filter((_, j) => j !== i) });
  const addBullet = (i) => updExp(i, { bullets: [...resume.experience[i].bullets, ''] });
  const delBullet = (i, bi) => updExp(i, { bullets: resume.experience[i].bullets.filter((_, k) => k !== bi) });

  // --- education helpers ---
  const updEdu = (i, patch) => set({ education: resume.education.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  const addEdu = () => set({ education: [...resume.education, emptyEdu()] });
  const delEdu = (i) => set({ education: resume.education.filter((_, j) => j !== i) });

  // --- references / testimonies helpers ---
  const refs = resume.references || [];
  const updRef = (i, patch) => set({ references: refs.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const addRef = () => set({ references: [...refs, emptyRef()] });
  const delRef = (i) => set({ references: refs.filter((_, j) => j !== i) });

  const linesToArr = (v) => v.split('\n').map((s) => s.trim()).filter(Boolean);
  const contact = [resume.location, resume.email, resume.phone, resume.links].filter(Boolean).join('  |  ');

  return (
    <div className="resume">
      <div className="resume-section-head no-print">
        <h2 className="display">{L.head}</h2>
        <p>{L.sub}</p>
      </div>

      <div className="resume-toolbar no-print">
        <button className="primary-btn" onClick={save} disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : L.save}
        </button>
        {!isRecord && <button className="ghost-btn" onClick={() => window.print()}>Download PDF (print)</button>}
        {error && <span className="resume-err">{error}</span>}
      </div>

      <div className={`resume-grid ${isRecord ? 'single' : ''}`}>
        {/* ---------- EDITOR ---------- */}
        <div className="resume-editor no-print">
          <fieldset>
            <legend>{L.headerLegend}</legend>
            <input placeholder="Full name" value={resume.fullName} onChange={(e) => set({ fullName: e.target.value })} />
            <input placeholder={L.headlinePh} value={resume.headline} onChange={(e) => set({ headline: e.target.value })} />
            <div className="row2">
              <input placeholder="Location" value={resume.location} onChange={(e) => set({ location: e.target.value })} />
              <input placeholder="Phone" value={resume.phone} onChange={(e) => set({ phone: e.target.value })} />
            </div>
            <input placeholder="Email" value={resume.email} onChange={(e) => set({ email: e.target.value })} />
            <input placeholder="Links (e.g. linkedin.com/in/you)" value={resume.links} onChange={(e) => set({ links: e.target.value })} />
            {isRecord && (
              <textarea rows={4} placeholder={L.summaryPh}
                value={resume.summary} onChange={(e) => set({ summary: e.target.value })} />
            )}
          </fieldset>

          {!isRecord && (
          <fieldset>
            <legend>{L.summaryLegend}</legend>
            <textarea rows={4} placeholder={L.summaryPh}
              value={resume.summary} onChange={(e) => set({ summary: e.target.value })} />
          </fieldset>
          )}

          <div className="exp-edu-wrap">
          <fieldset style={{ order: isRecord ? 2 : 1 }}>
            <legend>{L.expLegend}</legend>
            {resume.experience.map((e, i) => (
              <div className="sub-entry" key={i}>
                <div className="row2">
                  <input placeholder={L.expTitlePh} value={e.title} onChange={(ev) => updExp(i, { title: ev.target.value })} />
                  <input placeholder={L.expOrgPh} value={e.org} onChange={(ev) => updExp(i, { org: ev.target.value })} />
                </div>
                <div className="row3">
                  <input placeholder="Location" value={e.location} onChange={(ev) => updExp(i, { location: ev.target.value })} />
                  <input placeholder="Start (e.g. Jan 2023)" value={e.start} onChange={(ev) => updExp(i, { start: ev.target.value })} />
                  <input placeholder="End (e.g. Present)" value={e.end} onChange={(ev) => updExp(i, { end: ev.target.value })} />
                </div>
                {e.bullets.map((b, bi) => (
                  <div className="bullet-row" key={bi}>
                    <input placeholder={L.bulletPh} value={b} onChange={(ev) => updBullet(i, bi, ev.target.value)} />
                    <button className="mini-del" onClick={() => delBullet(i, bi)} title="Remove bullet">✕</button>
                  </div>
                ))}
                <div className="entry-actions">
                  <button className="mini-add" onClick={() => addBullet(i)}>+ bullet</button>
                  <button className="mini-del-entry" onClick={() => delExp(i)}>{L.delExp}</button>
                </div>
              </div>
            ))}
            <button className="mini-add" onClick={addExp}>{L.addExp}</button>
          </fieldset>

          <fieldset style={{ order: isRecord ? 1 : 2 }}>
            <legend>Education</legend>
            {resume.education.map((e, i) => (
              <div className="sub-entry" key={i}>
                <div className="row2">
                  <input placeholder="Degree / qualification" value={e.degree} onChange={(ev) => updEdu(i, { degree: ev.target.value })} />
                  <input placeholder="School / university" value={e.school} onChange={(ev) => updEdu(i, { school: ev.target.value })} />
                </div>
                <div className="row2">
                  <input placeholder="Location" value={e.location} onChange={(ev) => updEdu(i, { location: ev.target.value })} />
                  <input placeholder="Graduated (e.g. 2026)" value={e.graduated} onChange={(ev) => updEdu(i, { graduated: ev.target.value })} />
                </div>
                <div className="entry-actions"><button className="mini-del-entry" onClick={() => delEdu(i)}>Remove</button></div>
              </div>
            ))}
            <button className="mini-add" onClick={addEdu}>+ Add education</button>
          </fieldset>
          </div>

          <fieldset>
            <legend>Skills <button className="pull-btn" onClick={() => set({ skills: suggestions.skills })}>Pull from ASCEND</button></legend>
            <textarea rows={4} placeholder="Type one skill per line - add your own, or pull from ASCEND" value={resume.skills.join('\n')}
              onChange={(e) => set({ skills: linesToArr(e.target.value) })} />
          </fieldset>

          <fieldset>
            <legend>Certifications <button className="pull-btn" onClick={() => set({ certifications: suggestions.certifications })}>Pull from ASCEND</button></legend>
            <textarea rows={4} placeholder="One certification per line" value={resume.certifications.join('\n')}
              onChange={(e) => set({ certifications: linesToArr(e.target.value) })} />
          </fieldset>

          <fieldset>
            <legend>{L.refLegend}</legend>
            {refs.map((r, i) => (
              <div className="sub-entry" key={i}>
                <div className="row2">
                  <input placeholder={L.refNamePh} value={r.name} onChange={(ev) => updRef(i, { name: ev.target.value })} />
                  <input placeholder={L.refRolePh} value={r.role} onChange={(ev) => updRef(i, { role: ev.target.value })} />
                </div>
                <input placeholder="Email or phone (optional)" value={r.contact} onChange={(ev) => updRef(i, { contact: ev.target.value })} />
                <textarea rows={2} placeholder={L.refNotePh} value={r.note} onChange={(ev) => updRef(i, { note: ev.target.value })} />
                <div className="entry-actions"><button className="mini-del-entry" onClick={() => delRef(i)}>Remove</button></div>
              </div>
            ))}
            <button className="mini-add" onClick={addRef}>{L.addRef}</button>
          </fieldset>
        </div>

        {/* ---------- LIVE PREVIEW (resume variant only; the record is a plain form) ---------- */}
        {!isRecord && (
        <div className="resume-preview">
          <div className="resume-doc">
            <h1 className="rd-name">{resume.fullName || 'Your Name'}</h1>
            {resume.headline && <p className="rd-headline">{resume.headline}</p>}
            {contact && <p className="rd-contact">{contact}</p>}

            {resume.summary && (
              <section>
                <h2 className="rd-h">{L.summaryHead}</h2>
                <p className="rd-summary">{resume.summary}</p>
              </section>
            )}

            {resume.experience.some((e) => e.title || e.org) && (
              <section>
                <h2 className="rd-h">{L.expHead}</h2>
                {resume.experience.filter((e) => e.title || e.org).map((e, i) => (
                  <div className="rd-entry" key={i}>
                    <div className="rd-entry-top">
                      <b>{e.title}</b>
                      <span>{[e.start, e.end].filter(Boolean).join(' – ')}</span>
                    </div>
                    <div className="rd-entry-sub">{[e.org, e.location].filter(Boolean).join(', ')}</div>
                    {e.bullets.filter(Boolean).length > 0 && (
                      <ul>{e.bullets.filter(Boolean).map((b, bi) => <li key={bi}>{b}</li>)}</ul>
                    )}
                  </div>
                ))}
              </section>
            )}

            {resume.education.some((e) => e.degree || e.school) && (
              <section>
                <h2 className="rd-h">Education</h2>
                {resume.education.filter((e) => e.degree || e.school).map((e, i) => (
                  <div className="rd-entry" key={i}>
                    <div className="rd-entry-top">
                      <b>{e.degree}</b>
                      <span>{e.graduated ? `Graduated: ${e.graduated}` : ''}</span>
                    </div>
                    <div className="rd-entry-sub">{[e.school, e.location].filter(Boolean).join(', ')}</div>
                  </div>
                ))}
              </section>
            )}

            {resume.skills.length > 0 && (
              <section>
                <h2 className="rd-h">Skills</h2>
                <ul className="rd-cols">{resume.skills.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </section>
            )}

            {resume.certifications.length > 0 && (
              <section>
                <h2 className="rd-h">Certifications</h2>
                <ul>{resume.certifications.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </section>
            )}

            {(resume.references || []).some((r) => r.name || r.note) && (
              <section>
                <h2 className="rd-h">{L.refHead}</h2>
                {(resume.references || []).filter((r) => r.name || r.note).map((r, i) => (
                  <div className="rd-entry" key={i}>
                    <div className="rd-entry-top"><b>{r.name}</b><span>{r.contact}</span></div>
                    <div className="rd-entry-sub">{r.role}</div>
                    {r.note && <p className="rd-summary">{r.note}</p>}
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
