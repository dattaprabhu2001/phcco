import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { useFetch } from '../../lib/hooks.js';
import { useAuth } from '../Auth.jsx';
import AdminIcon from './AdminIcon.jsx';

/** Fixed entries that are not content modules. */
const OVERVIEW = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/messages', label: 'Contact inbox', icon: 'inbox' },
  { to: '/admin/media', label: 'Media library', icon: 'image' },
  { to: '/admin/settings', label: 'Site settings', icon: 'settings' },
];

/**
 * Screens that sit inside a module group but are not CRUD modules. The home
 * banner is one page record, not a collection, so it gets its own editor rather
 * than a table with a New button that would make no sense.
 */
const EXTRA_IN_GROUP = {
  Homepage: [{ to: '/admin/home-banner', label: 'Home banner', icon: 'file' }],
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { data: modules } = useFetch('/admin/modules');
  //const { data: stats } = useFetch('/admin/stats');

  const { data: stats } = useFetch('/admin/dashboard-stats');
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // On mobile the sidebar is an overlay; a route change means the visitor has
  // chosen, so close it rather than leaving it covering the page.
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  // Preserve the order modules arrive in, but bucket them under their group.
  const groups = useMemo(() => {
    const out = [];
    for (const m of modules || []) {
      const name = m.group || 'Content';
      let g = out.find((x) => x.name === name);
      if (!g) { g = { name, items: [] }; out.push(g); }
      g.items.push(m);
    }
    return out;
  }, [modules]);

  const unread = stats?.unreadMessages || 0;

  return (
    <div className={`adm${navOpen ? ' is-nav-open' : ''}`}>
      <aside className="adm-side">
        <Link className="adm-brand" to="/admin">
          <img src="/assets/media/brand/phcco-mark.webp" alt="" />
          <span>
            <strong>PHCCO</strong>
            <small>Content manager</small>
          </span>
        </Link>

        <nav className="adm-nav" aria-label="Sections">
          <p className="adm-nav-head">Overview</p>
          {OVERVIEW.map((f) => (
            <NavLink key={f.to} to={f.to} end={f.end}>
              <AdminIcon name={f.icon} />
              <span>{f.label}</span>
              {f.to === '/admin/messages' && unread > 0 && (
                <em className="adm-count">{unread}</em>
              )}
            </NavLink>
          ))}

          {groups.map((g) => (
            <div key={g.name}>
              <p className="adm-nav-head">{g.name}</p>
              {(EXTRA_IN_GROUP[g.name] || []).map((x) => (
                <NavLink key={x.to} to={x.to}>
                  <AdminIcon name={x.icon} />
                  <span>{x.label}</span>
                </NavLink>
              ))}
              {g.items.map((m) => (
                <NavLink key={m.key} to={`/admin/c/${m.key}`}>
                  <AdminIcon name={m.icon} />
                  <span>{m.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="adm-side-foot">
          <a href="/" target="_blank" rel="noopener">
            <AdminIcon name="external" size={16} /><span>View website</span>
          </a>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-top">
          <button className="adm-burger" type="button" aria-expanded={navOpen}
                  aria-label="Toggle navigation" onClick={() => setNavOpen((v) => !v)}>
            <AdminIcon name={navOpen ? 'close' : 'menu'} size={20} />
          </button>

          <div className="adm-top-spacer" />

          <Link className="adm-user" to="/admin/account">
            <span className="adm-avatar" aria-hidden="true">
              {(user?.name || user?.email || 'A').slice(0, 1).toUpperCase()}
            </span>
            <span className="adm-user-txt">
              <strong>{user?.name || 'Administrator'}</strong>
              <small>{user?.email}</small>
            </span>
          </Link>

          <button className="adm-btn ghost icon-only" type="button"
                  onClick={logout} title="Sign out" aria-label="Sign out">
            <AdminIcon name="logout" />
          </button>
        </header>

        <main className="adm-content">
          <Outlet />
        </main>
      </div>

      {navOpen && <div className="adm-scrim" onClick={() => setNavOpen(false)} />}
    </div>
  );
}
