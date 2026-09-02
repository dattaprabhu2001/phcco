import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useFetch } from '../../lib/hooks.js';
import { useAuth } from '../Auth.jsx';

const FIXED = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/settings', label: 'Site settings' },
  { to: '/admin/messages', label: 'Contact inbox' },
  { to: '/admin/media', label: 'Media library' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { data: modules } = useFetch('/admin/modules');
  const [open, setOpen] = useState(false);

  return (
    <div className={`admin-shell${open ? ' nav-open' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src="/assets/media/brand/phcco-mark.webp" alt="" />
          <span>PHCCO CMS</span>
        </div>

        <nav className="admin-nav">
          <p className="admin-nav-head">Overview</p>
          {FIXED.map((f) => (
            <NavLink key={f.to} to={f.to} end={f.end} onClick={() => setOpen(false)}>
              {f.label}
            </NavLink>
          ))}

          <p className="admin-nav-head">Content</p>
          {(modules || []).map((m) => (
            <NavLink key={m.key} to={`/admin/c/${m.key}`} onClick={() => setOpen(false)}>
              {m.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <Link to="/" target="_blank" rel="noopener">View site ↗</Link>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-burger" type="button"
                  aria-label="Toggle navigation" aria-expanded={open}
                  onClick={() => setOpen((v) => !v)}>
            ☰
          </button>
          <div className="admin-spacer" />
          <span className="admin-muted">{user?.email}</span>
          <Link className="admin-btn ghost" to="/admin/account">Account</Link>
          <button className="admin-btn ghost" type="button" onClick={logout}>Sign out</button>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>

      {open && <div className="admin-scrim" onClick={() => setOpen(false)} />}
    </div>
  );
}
