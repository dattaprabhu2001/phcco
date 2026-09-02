import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/hooks.js';
import { useAuth } from '../Auth.jsx';

/** Site settings, grouped by their `section` column. */
export function Settings() {
  const { data, loading, error, reload } = useFetch('/admin/settings');
  const [draft, setDraft] = useState({});
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    if (data) setDraft(Object.fromEntries(data.map((s) => [s.setting_key, s.setting_value ?? ''])));
  }, [data]);

  if (loading) return <p className="admin-muted">Loading…</p>;
  if (error) return <p className="admin-error">{error.message}</p>;

  const groups = data.reduce((acc, s) => {
    (acc[s.section] ||= []).push(s);
    return acc;
  }, {});

  async function save(e) {
    e.preventDefault();
    setStatus({ state: 'saving', message: '' });
    try {
      await api.put('/admin/settings', draft);
      setStatus({ state: 'saved', message: 'Settings saved.' });
      reload();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  return (
    <form onSubmit={save}>
      <div className="admin-page-head">
        <h1>Site settings</h1>
        <p className="admin-muted">Branding, contact details and the text that wraps every page.</p>
      </div>

      {status.message && (
        <p className={status.state === 'error' ? 'admin-error' : 'admin-ok'} role="status">
          {status.message}
        </p>
      )}

      {Object.entries(groups).map(([section, items]) => (
        <section className="admin-panel" key={section}>
          <div className="admin-panel-head"><h2>{section}</h2></div>
          <div className="admin-fields">
            {items.map((s) => (
              <div className={`admin-field${s.input_type === 'textarea' ? ' wide' : ''}`} key={s.setting_key}>
                <label htmlFor={`s-${s.setting_key}`}>{s.label || s.setting_key}</label>
                {s.input_type === 'textarea' ? (
                  <textarea id={`s-${s.setting_key}`} rows={4} value={draft[s.setting_key] ?? ''}
                            onChange={(e) => setDraft({ ...draft, [s.setting_key]: e.target.value })} />
                ) : (
                  <>
                    <input id={`s-${s.setting_key}`}
                           type={s.input_type === 'email' ? 'email' : 'text'}
                           value={draft[s.setting_key] ?? ''}
                           onChange={(e) => setDraft({ ...draft, [s.setting_key]: e.target.value })} />
                    {s.input_type === 'image' && draft[s.setting_key] && (
                      <img className="admin-thumb" src={draft[s.setting_key]} alt="" />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <button className="admin-btn primary" type="submit" disabled={status.state === 'saving'}>
        {status.state === 'saving' ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}

/** Contact form submissions. */
export function Messages() {
  const { data, loading, error, reload } = useFetch('/admin/messages');
  const [open, setOpen] = useState(null);

  if (loading) return <p className="admin-muted">Loading…</p>;
  if (error) return <p className="admin-error">{error.message}</p>;

  async function toggleRead(m) {
    await api.put(`/admin/messages/${m.id}/read`, { is_read: !m.is_read });
    reload();
  }

  async function remove(m) {
    if (!window.confirm(`Delete the message from ${m.name}? This cannot be undone.`)) return;
    await api.del(`/admin/messages/${m.id}`);
    if (open === m.id) setOpen(null);
    reload();
  }

  return (
    <>
      <div className="admin-page-head">
        <h1>Contact inbox</h1>
        <p className="admin-muted">
          {data.length} {data.length === 1 ? 'message' : 'messages'} ·{' '}
          {data.filter((m) => !m.is_read).length} unread
        </p>
      </div>

      <section className="admin-panel">
        {data.length === 0 ? (
          <p className="admin-muted">No messages yet.</p>
        ) : (
          <ul className="admin-messages">
            {data.map((m) => (
              <li key={m.id} className={m.is_read ? '' : 'is-unread'}>
                <button className="admin-message-head" type="button"
                        onClick={() => setOpen(open === m.id ? null : m.id)}>
                  <span>
                    <strong>{m.name}</strong> <span className="admin-muted">{m.email}</span>
                  </span>
                  <span className="admin-muted">
                    {m.topic || '—'} · {new Date(m.created_at).toLocaleString('en-GB')}
                  </span>
                </button>

                {open === m.id && (
                  <div className="admin-message-body">
                    <p>{m.message}</p>
                    <div className="admin-message-acts">
                      <a className="admin-btn ghost" href={`mailto:${m.email}`}>Reply by email</a>
                      <button className="admin-btn ghost" type="button" onClick={() => toggleRead(m)}>
                        Mark as {m.is_read ? 'unread' : 'read'}
                      </button>
                      <button className="admin-btn danger" type="button" onClick={() => remove(m)}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/** Uploaded images. */
export function MediaLibrary() {
  const { data, loading, error, reload } = useFetch('/admin/media');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (loading) return <p className="admin-muted">Loading…</p>;
  if (error) return <p className="admin-error">{error.message}</p>;

  async function upload(files) {
    if (!files?.length) return;
    setBusy(true);
    setMessage('');
    try {
      for (const file of files) {
        const body = new FormData();
        body.append('file', file);
        await api.post('/admin/media', body);
      }
      reload();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(f) {
    if (!window.confirm(`Delete ${f.original_name}? Any page still pointing at it will show a broken image.`)) return;
    await api.del(`/admin/media/${f.id}`);
    reload();
  }

  return (
    <>
      <div className="admin-page-head">
        <h1>Media library</h1>
        <p className="admin-muted">
          Images uploaded through the CMS. The original site artwork lives under
          <code> /assets/media/</code> and is referenced by path.
        </p>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2>{data.length} uploaded {data.length === 1 ? 'file' : 'files'}</h2>
          <label className="admin-btn primary admin-upload">
            {busy ? 'Uploading…' : 'Upload images'}
            <input type="file" accept="image/*" multiple hidden disabled={busy}
                   onChange={(e) => upload([...(e.target.files || [])])} />
          </label>
        </div>

        {message && <p className="admin-error">{message}</p>}

        {data.length === 0 ? (
          <p className="admin-muted">Nothing uploaded yet.</p>
        ) : (
          <div className="admin-media-grid">
            {data.map((f) => (
              <figure className="admin-media-item" key={f.id}>
                <img src={f.url} alt={f.original_name} loading="lazy" />
                <figcaption>
                  <span title={f.original_name}>{f.original_name}</span>
                  <div>
                    <button className="admin-btn ghost tiny" type="button"
                            onClick={() => navigator.clipboard?.writeText(f.url)}>
                      Copy path
                    </button>
                    <button className="admin-btn danger tiny" type="button" onClick={() => remove(f)}>
                      Delete
                    </button>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/** Change the admin password. */
export function Account() {
  const { user } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  async function submit(e) {
    e.preventDefault();
    if (form.next !== form.confirm) {
      setStatus({ state: 'error', message: 'The two new passwords do not match.' });
      return;
    }
    setStatus({ state: 'saving', message: '' });
    try {
      await api.post('/admin/password', { current: form.current, next: form.next });
      setForm({ current: '', next: '', confirm: '' });
      setStatus({ state: 'saved', message: 'Password changed.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  return (
    <>
      <div className="admin-page-head">
        <h1>Account</h1>
        <p className="admin-muted">Signed in as {user?.email}</p>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-head"><h2>Change password</h2></div>
        <form onSubmit={submit} className="admin-fields">
          <div className="admin-field">
            <label htmlFor="pw-current">Current password</label>
            <input id="pw-current" type="password" autoComplete="current-password" required
                   value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
          </div>
          <div className="admin-field">
            <label htmlFor="pw-next">New password</label>
            <input id="pw-next" type="password" autoComplete="new-password" required minLength={8}
                   value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
          </div>
          <div className="admin-field">
            <label htmlFor="pw-confirm">Confirm new password</label>
            <input id="pw-confirm" type="password" autoComplete="new-password" required minLength={8}
                   value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </div>
          <div className="admin-field wide">
            {status.message && (
              <p className={status.state === 'error' ? 'admin-error' : 'admin-ok'} role="status">
                {status.message}
              </p>
            )}
            <button className="admin-btn primary" type="submit" disabled={status.state === 'saving'}>
              {status.state === 'saving' ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
