import { useEffect, useState, useCallback } from 'react';
import { fetchCertificates, uploadCertificate, deleteCertificate, certificateFileUrl } from '../api.js';

// Certificate Vault — a continuous column of "lanterns", each an earned credential.
// Uploading confirms server-side before the credential appears. Each certificate is
// worth +10 to the Pathway Score. Image files can be shown/hidden inline per card.
export default function VaultPage({ onScoreChanged }) {
  const [certs, setCerts] = useState(null);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [date, setDate] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(() => new Set()); // ids with image preview expanded

  const load = useCallback(() => {
    setError(null);
    fetchCertificates().then((d) => setCerts(d.certificates)).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  function toggleImage(id) {
    setShown((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('issuer', issuer);
      if (date) fd.append('issuedAt', String(new Date(date).getTime()));
      if (file) fd.append('file', file);
      const { certificates } = await uploadCertificate(fd);
      setCerts(certificates);
      setTitle(''); setIssuer(''); setDate(''); setFile(null);
      e.target.reset();
      onScoreChanged?.(); // +10 reflected in the score badge
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    setError(null);
    try {
      const { certificates } = await deleteCertificate(id);
      setCerts(certificates);
      onScoreChanged?.();
    } catch (err) {
      setError(err.message);
    }
  }

  const fmt = (ms) => (ms ? new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '');

  return (
    <div className="vault">
      <div className="lead">
        <h2 className="display">Your Certificate Vault.</h2>
        <p>Every credential you earn, kept safe and ready for your CV — each one adds <b>+10</b> to your Pathway Score.</p>
      </div>

      {error && <p className="path-error">{error}</p>}

      <div className="vault-grid">
        <form className="vault-upload" onSubmit={submit}>
          <h3>Add a credential</h3>
          <label>Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Data Literacy" required />
          </label>
          <label>Issuer
            <input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="e.g. ASCEND Academy" required />
          </label>
          <label>Date earned
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>File (PDF, PNG or JPG · optional)
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files[0] || null)} />
          </label>
          <button className="primary-btn" disabled={busy} type="submit">
            {busy ? 'Saving…' : 'Add to vault · +10 pts'}
          </button>
        </form>

        <div className="vault-list">
          {!certs ? (
            <p className="vault-empty">Loading vault…</p>
          ) : certs.length === 0 ? (
            <p className="vault-empty">No credentials yet — add your first on the left.</p>
          ) : (
            certs.map((c) => {
              const open = shown.has(c.id);
              return (
                <div className="vault-item-wrap" key={c.id}>
                  <div className="vault-item">
                    <div className="vault-flame" />
                    <div className="vault-info">
                      <b>{c.title}</b>
                      <small>{c.issuer}{c.issuedAt ? ` · ${fmt(c.issuedAt)}` : ''}</small>
                    </div>
                    <div className="vault-actions">
                      {c.isImage && (
                        <button className="vault-link" onClick={() => toggleImage(c.id)}>
                          {open ? 'Hide image' : 'Show image'}
                        </button>
                      )}
                      {c.hasFile && (
                        <a className="vault-link" href={certificateFileUrl(c.id)} target="_blank" rel="noreferrer">
                          {c.isImage ? 'Open' : 'View'}
                        </a>
                      )}
                      <button className="vault-del" onClick={() => remove(c.id)} title="Remove">✕</button>
                    </div>
                  </div>
                  {c.isImage && open && (
                    <div className="vault-preview">
                      <img src={certificateFileUrl(c.id)} alt={c.title} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
