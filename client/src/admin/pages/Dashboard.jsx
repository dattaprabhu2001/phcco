import { Link } from 'react-router-dom';
import { useFetch } from '../../lib/hooks.js';

/** Maps a stats table name onto the CMS module that edits it. */
const MODULE_FOR = {
  pages: 'pages', posts: 'posts', publications: 'publications', people: 'people',
  albums: 'albums', photos: 'photos', videos: 'videos', events: 'events',
  outreach_locations: 'outreach-locations', collaborators: 'collaborators',
};

export default function Dashboard() {
  const { data, loading, error } = useFetch('/admin/stats');

  if (loading) return <p className="admin-muted">Loading…</p>;
  if (error) return <p className="admin-error">{error.message}</p>;

  return (
    <>
      <div className="admin-page-head">
        <h1>Dashboard</h1>
        <p className="admin-muted">Everything on the public site, at a glance.</p>
      </div>

      <div className="admin-cards">
        {data.counts.map((c) => (
          <Link className="admin-card" key={c.key} to={`/admin/c/${MODULE_FOR[c.key] || c.key}`}>
            <span className="admin-card-n">{c.count}</span>
            <span className="admin-card-l">{c.label}</span>
          </Link>
        ))}
      </div>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2>Recent messages</h2>
          <Link className="admin-btn ghost" to="/admin/messages">
            Open inbox{data.unreadMessages > 0 && ` (${data.unreadMessages} unread)`}
          </Link>
        </div>

        {data.recentMessages.length === 0 ? (
          <p className="admin-muted">No messages yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>From</th><th>Topic</th><th>Received</th><th /></tr>
            </thead>
            <tbody>
              {data.recentMessages.map((m) => (
                <tr key={m.id} className={m.is_read ? '' : 'is-unread'}>
                  <td>
                    <strong>{m.name}</strong>
                    <br />
                    <span className="admin-muted">{m.email}</span>
                  </td>
                  <td>{m.topic || '—'}</td>
                  <td>{new Date(m.created_at).toLocaleString('en-GB')}</td>
                  <td>{!m.is_read && <span className="admin-pill">New</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
