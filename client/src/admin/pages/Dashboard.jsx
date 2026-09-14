import { Link } from 'react-router-dom';
import { useFetch } from '../../lib/hooks.js';
import AdminIcon from '../components/AdminIcon.jsx';
import { useAuth } from '../Auth.jsx';

/** Maps a counted table onto the module that edits it, plus its icon. */
const CARD = {
  posts: ['posts', 'pen'],
  publications: ['publications', 'book'],
  people: ['people', 'user'],
  albums: ['albums', 'album'],
  photos: ['photos', 'image'],
  videos: ['videos', 'video'],
  events: ['events', 'calendar'],
  outreach_locations: ['outreach-locations', 'map'],
  collaborators: ['collaborators', 'handshake'],
};

const SHORTCUTS = [
  { to: '/admin/c/posts', label: 'Write a blog post', icon: 'pen' },
  { to: '/admin/c/publications', label: 'Add a publication', icon: 'book' },
  { to: '/admin/c/people', label: 'Add a person', icon: 'user' },
  { to: '/admin/c/events', label: 'Add an event', icon: 'calendar' },
];

export default function Dashboard() {
  const { user } = useAuth();
 // const { data, loading, error } = useFetch('/admin/stats');

 const { data, loading, error } = useFetch('/admin/dashboard-stats');

  if (loading) return <p className="adm-muted">Loading…</p>;
  if (error) return <p className="adm-error">{error.message}</p>;

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>{greeting()}, {(user?.name || 'there').split(' ')[0]}</h1>
          <p className="adm-muted">Everything on the public website, at a glance.</p>
        </div>
        <a className="adm-btn ghost" href="/" target="_blank" rel="noopener">
          <AdminIcon name="external" size={16} />View website
        </a>
      </header>

      <div className="adm-cards">
        {data.counts.map((c) => {
          const [modKey, icon] = CARD[c.key] || [c.key, 'list'];
          return (
            <Link className="adm-card" key={c.key} to={`/admin/c/${modKey}`}>
              <span className="adm-card-icon"><AdminIcon name={icon} size={17} /></span>
              <span className="adm-card-n">{c.count}</span>
              <span className="adm-card-l">{c.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="adm-split">
        <section className="adm-panel">
          <header className="adm-panel-head">
            <h2><AdminIcon name="inbox" size={17} />Recent messages</h2>
            <Link className="adm-btn ghost small" to="/admin/messages">
              Open inbox{data.unreadMessages > 0 && ` (${data.unreadMessages})`}
            </Link>
          </header>

          {data.recentMessages.length === 0 ? (
            <div className="adm-empty">
              <AdminIcon name="inbox" size={24} />
              <p>No messages yet. Enquiries from the contact form land here.</p>
            </div>
          ) : (
            <table className="adm-table">
              <thead>
                <tr><th>From</th><th>Topic</th><th>Received</th></tr>
              </thead>
              <tbody>
                {data.recentMessages.map((m) => (
                  <tr key={m.id} className={m.is_read ? '' : 'is-unread'}>
                    <td>
                      <strong>{m.name}</strong>
                      <br /><span className="adm-muted">{m.email}</span>
                    </td>
                    <td>{m.topic || '—'}</td>
                    <td className="adm-muted">
                      {new Date(m.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                      {!m.is_read && <span className="adm-tag ok" style={{ marginLeft: '.5rem' }}>New</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="adm-panel">
          <header className="adm-panel-head">
            <h2><AdminIcon name="plus" size={17} />Quick actions</h2>
          </header>
          <ul className="adm-shortcuts">
            {SHORTCUTS.map((s) => (
              <li key={s.to}>
                <Link to={s.to}>
                  <AdminIcon name={s.icon} size={17} />
                  <span>{s.label}</span>
                  <AdminIcon name="external" size={14} className="adm-shortcut-go" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
