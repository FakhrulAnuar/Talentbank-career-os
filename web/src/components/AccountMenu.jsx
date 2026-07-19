import { useState, useRef, useEffect } from 'react';

// Account menu: a chip that opens a small dropdown with the user's details and Sign out.
export default function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase();
  const pathLabel = user?.pathType === 'university' ? 'University path' : 'High School path';

  return (
    <div className="account" ref={ref}>
      <button className="account-chip" onClick={() => setOpen((o) => !o)} title="Account">
        <span className="account-avatar">{initial}</span>
        <span className="account-name">{user?.displayName || 'Account'}</span>
        <span className="account-caret">▾</span>
      </button>

      {open && (
        <div className="account-menu">
          <div className="account-head">
            <span className="account-avatar lg">{initial}</span>
            <div className="account-id">
              <b>{user?.displayName}</b>
              <small>{user?.email}</small>
              <small className="account-path">{pathLabel}</small>
            </div>
          </div>
          <button className="account-signout" onClick={() => { setOpen(false); onLogout(); }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
