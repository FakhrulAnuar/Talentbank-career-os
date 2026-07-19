import { useEffect, useState, useCallback } from 'react';
import { fetchResume, saveResume } from '../api.js';

const emptyExp = () => ({ title: '', org: '', location: '', start: '', end: '', bullets: [''] });
const emptyEdu = () => ({ degree: '', school: '', location: '', graduated: '' });

export default function ResumePage() {
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
  if (!resume) return <div className="path-skeleton"><div className="spine" /><p>Building your resume…</p></div>;

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

  const linesToArr = (v) => v.split('\n').map((s) => s.trim()).filter(Boolean);
  const contact = [resume.location, resume.email, resume.phone, resume.links].filter(Boolean).join('  |  ');

  return (
    <div className="resume">
      <div className="lead no-print">
        <h2 className="display">Your resume, auto-built.</h2>
        <p>ATS-friendly and single-column. Skills and certifications come from your ASCEND activity — edit anything, then export to PDF.</p>
      </div>

      <div className="resume-toolbar no-print">
        <button className="primary-btn" onClick={save} disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : 'Save resume'}
        </button>
        <button className="ghost-btn" onClick={() => window.print()}>Download PDF (print)</button>
        {error && <span className="resume-err">{error}</span>}
      </div>

      <div className="resume-grid">
        {/* ---------- EDITOR ---------- */}
        <div className="resume-editor no-print">
          <fieldset>
            <legend>Header</legend>
            <input placeholder="Full name" value={resume.fullName} onChange={(e) => set({ fullName: e.target.value })} />
            <input placeholder="Headline (e.g. Aspiring Data Analyst | Python | SQL)" value={resume.headline} onChange={(e) => set({ headline: e.target.value })} />
            <div className="row2">
              <input placeholder="Location" value={resume.location} onChange={(e) => set({ location: e.target.value })} />
              <input placeholder="Phone" value={resume.phone} onChange={(e) => set({ phone: e.target.value })} />
            </div>
            <input placeholder="Email" value={resume.email} onChange={(e) => set({ email: e.target.value })} />
            <input placeholder="Links (e.g. linkedin.com/in/you)" value={resume.links} onChange={(e) => set({ links: e.target.value })} />
          </fieldset>

          <fieldset>
            <legend>Professional summary</legend>
            <textarea rows={4} placeholder="2–4 sentences about who you are and what you're aiming for."
              value={resume.summary} onChange={(e) => set({ summary: e.target.value })} />
          </fieldset>

          <fieldset>
            <legend>Work experience</legend>
            {resume.experience.map((e, i) => (
              <div className="sub-entry" key={i}>
                <div className="row2">
                  <input placeholder="Role / title" value={e.title} onChange={(ev) => updExp(i, { title: ev.target.value })} />
                  <input placeholder="Organisation" value={e.org} onChange={(ev) => updExp(i, { org: ev.target.value })} />
                </div>
                <div className="row3">
                  <input placeholder="Location" value={e.location} onChange={(ev) => updExp(i, { location: ev.target.value })} />
                  <input placeholder="Start (e.g. Jan 2023)" value={e.start} onChange={(ev) => updExp(i, { start: ev.target.value })} />
                  <input placeholder="End (e.g. Present)" value={e.end} onChange={(ev) => updExp(i, { end: ev.target.value })} />
                </div>
                {e.bullets.map((b, bi) => (
                  <div className="bullet-row" key={bi}>
                    <input placeholder="Achievement / responsibility" value={b} onChange={(ev) => updBullet(i, bi, ev.target.value)} />
                    <button className="mini-del" onClick={() => delBullet(i, bi)} title="Remove bullet">✕</button>
                  </div>
                ))}
                <div className="entry-actions">
                  <button className="mini-add" onClick={() => addBullet(i)}>+ bullet</button>
                  <button className="mini-del-entry" onClick={() => delExp(i)}>Remove role</button>
                </div>
              </div>
            ))}
            <button className="mini-add" onClick={addExp}>+ Add role</button>
          </fieldset>

          <fieldset>
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

          <fieldset>
            <legend>Skills <button className="pull-btn" onClick={() => set({ skills: suggestions.skills })}>Pull from ASCEND</button></legend>
            <textarea rows={4} placeholder="One skill per line" value={resume.skills.join('\n')}
              onChange={(e) => set({ skills: linesToArr(e.target.value) })} />
          </fieldset>

          <fieldset>
            <legend>Certifications <button className="pull-btn" onClick={() => set({ certifications: suggestions.certifications })}>Pull from ASCEND</button></legend>
            <textarea rows={4} placeholder="One certification per line" value={resume.certifications.join('\n')}
              onChange={(e) => set({ certifications: linesToArr(e.target.value) })} />
          </fieldset>
        </div>

        {/* ---------- ATS PREVIEW ---------- */}
        <div className="resume-preview">
          <div className="resume-doc">
            <h1 className="rd-name">{resume.fullName || 'Your Name'}</h1>
            {resume.headline && <p className="rd-headline">{resume.headline}</p>}
            {contact && <p className="rd-contact">{contact}</p>}

            {resume.summary && (
              <section>
                <h2 className="rd-h">Professional Summary</h2>
                <p className="rd-summary">{resume.summary}</p>
              </section>
            )}

            {resume.experience.some((e) => e.title || e.org) && (
              <section>
                <h2 className="rd-h">Work Experience</h2>
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
          </div>
        </div>
      </div>
    </div>
  );
}
