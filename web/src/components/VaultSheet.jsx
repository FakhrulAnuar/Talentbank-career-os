export default function VaultSheet({ open, certificates, onClose }) {
  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sheet ${open ? 'open' : ''}`}>
        <button className="close" onClick={onClose}>✕</button>
        <h3 className="display">🏮 Certificate Vault</h3>
        <p className="sheet-sub">Every credential, anchored to where you earned it.</p>
        {certificates.length === 0 && <p className="sheet-sub">No certificates yet - earn your first on the path.</p>}
        {certificates.map((c) => (
          <div className="cert-item" key={c.id}>
            <div className="fl">🏮</div>
            <div>
              <b>{c.title}</b>
              <br />
              <small>{c.issuer}</small>
            </div>
          </div>
        ))}
      </aside>
    </>
  );
}
