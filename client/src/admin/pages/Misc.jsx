import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/hooks.js';
import { useAuth } from '../Auth.jsx';
import AdminIcon from '../components/AdminIcon.jsx';

const SECTION_LABEL = {
  general: 'General', branding: 'Branding', contact: 'Contact details', footer: 'Footer',
};

/** Site-wide settings, grouped by the `section` column. */
export function Settings() {
  const { data, loading, error, reload } = useFetch('/admin/settings');
  const [draft, setDraft] = useState({});
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    if (data) setDraft(Object.fromEntries(data.map((s) => [s.setting_key, s.setting_value ?? ''])));
  }, [data]);

  if (loading) return <p className="adm-muted">Loading…</p>;
  if (error) return <p className="adm-error">{error.message}</p>;

  const groups = data.reduce((acc, s) => {
    (acc[s.section] ||= []).push(s);
    return acc;
  }, {});

  const dirty = data.some((s) => (s.setting_value ?? '') !== (draft[s.setting_key] ?? ''));

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
      <header className="adm-page-head">
        <div>
          <h1>Site settings</h1>
          <p className="adm-muted">Branding, contact details and the text that wraps every page.</p>
        </div>
        <button className="adm-btn primary" type="submit" disabled={!dirty || status.state === 'saving'}>
          {status.state === 'saving' ? 'Saving…' : 'Save settings'}
        </button>
      </header>

      {status.message && (
        <p className={status.state === 'error' ? 'adm-error' : 'adm-ok'} role="status">
          {status.state === 'saved' && <AdminIcon name="check" size={15} />}{status.message}
        </p>
      )}

      {Object.entries(groups).map(([section, items]) => (
        <section className="adm-panel" key={section}>
          <header className="adm-panel-head">
            <h2>{SECTION_LABEL[section] || section}</h2>
          </header>
          <div className="adm-fields adm-pad">
            {items.map((s) => (
              <div className={`adm-field${s.input_type === 'textarea' ? ' wide' : ''}`} key={s.setting_key}>
                <label htmlFor={`s-${s.setting_key}`}>{s.label || s.setting_key}</label>
                {s.input_type === 'textarea' ? (
                  <textarea id={`s-${s.setting_key}`} rows={4} value={draft[s.setting_key] ?? ''}
                            onChange={(e) => setDraft({ ...draft, [s.setting_key]: e.target.value })} />
                ) : s.input_type === 'image' ? (
                  <div className="adm-imagefield-row">
                    {draft[s.setting_key]
                      ? <img className="adm-thumb" src={draft[s.setting_key]} alt="" />
                      : <span className="adm-thumb is-empty"><AdminIcon name="image" /></span>}
                    <input id={`s-${s.setting_key}`} type="text" value={draft[s.setting_key] ?? ''}
                           onChange={(e) => setDraft({ ...draft, [s.setting_key]: e.target.value })} />
                  </div>
                ) : (
                  <input id={`s-${s.setting_key}`}
                         type={s.input_type === 'email' ? 'email' : 'text'}
                         value={draft[s.setting_key] ?? ''}
                         onChange={(e) => setDraft({ ...draft, [s.setting_key]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </form>
  );
}

/** Contact-form submissions. */
export function Messages() {
  const { data, loading, error, reload } = useFetch('/admin/messages');
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState('all');

  if (loading) return <p className="adm-muted">Loading…</p>;
  if (error) return <p className="adm-error">{error.message}</p>;

  const unread = data.filter((m) => !m.is_read).length;
  const shown = filter === 'unread' ? data.filter((m) => !m.is_read) : data;

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
      <header className="adm-page-head">
        <div>
          <h1>Contact inbox</h1>
          <p className="adm-muted">
            {data.length} {data.length === 1 ? 'message' : 'messages'} · {unread} unread
          </p>
        </div>
      </header>

      <div className="adm-toolbar">
        <div className="adm-segment" role="tablist" aria-label="Filter messages">
          {[['all', `All (${data.length})`], ['unread', `Unread (${unread})`]].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k}
                    onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>

      <section className="adm-panel">
        {shown.length === 0 ? (
          <div className="adm-empty">
            <AdminIcon name="inbox" size={26} />
            <p>{data.length ? 'Nothing unread.' : 'No messages yet. Enquiries from the contact form land here.'}</p>
          </div>
        ) : (
          <ul className="adm-messages">
            {shown.map((m) => (
              <li key={m.id} className={m.is_read ? '' : 'is-unread'}>
                <button className="adm-message-head" type="button"
                        aria-expanded={open === m.id}
                        onClick={() => setOpen(open === m.id ? null : m.id)}>
                  <span className="adm-avatar" aria-hidden="true">
                    {(m.name || '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="adm-message-who">
                    <strong>{m.name}</strong>
                    <small>{m.email}{m.organisation ? ` · ${m.organisation}` : ''}</small>
                  </span>
                  <span className="adm-message-meta">
                    {m.topic && <span className="adm-tag">{m.topic}</span>}
                    <small>{new Date(m.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}</small>
                  </span>
                </button>

                {open === m.id && (
                  <div className="adm-message-body">
                    <p>{m.message}</p>
                    <div className="adm-message-acts">
                      <a className="adm-btn primary small" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.topic || 'Your enquiry'))}`}>
                        Reply by email
                      </a>
                      <button className="adm-btn ghost small" type="button" onClick={() => toggleRead(m)}>
                        Mark as {m.is_read ? 'unread' : 'read'}
                      </button>
                      <button className="adm-btn danger-ghost small" type="button" onClick={() => remove(m)}>
                        <AdminIcon name="trash" size={15} />Delete
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

/** Images uploaded through the CMS. */
export function MediaLibrary() {
  const { data, loading, error, reload } = useFetch('/admin/media');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(null);

  if (loading) return <p className="adm-muted">Loading…</p>;
  if (error) return <p className="adm-error">{error.message}</p>;

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

  async function copy(url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1500);
    } catch { setMessage('Could not copy — select the path and copy it manually.'); }
  }

  async function remove(f) {
    if (!window.confirm(`Delete ${f.original_name}? Any page still pointing at it will show a broken image.`)) return;
    await api.del(`/admin/media/${f.id}`);
    reload();
  }

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>Media library</h1>
          <p className="adm-muted">
            Images uploaded through the CMS. The original site artwork lives under
            <code> /assets/media/</code> and is referenced by path.
          </p>
        </div>
        <label className="adm-btn primary">
          <AdminIcon name="upload" size={16} />
          {busy ? 'Uploading…' : 'Upload images'}
          <input type="file" accept="image/*" multiple hidden disabled={busy}
                 onChange={(e) => upload([...(e.target.files || [])])} />
        </label>
      </header>

      {message && <p className="adm-error">{message}</p>}

      <section className="adm-panel">
        {data.length === 0 ? (
          <div className="adm-empty">
            <AdminIcon name="image" size={26} />
            <p>Nothing uploaded yet. Files you add here can be picked in any image field.</p>
          </div>
        ) : (
          <div className="adm-media-grid adm-pad">
            {data.map((f) => (
              <figure className="adm-media-item" key={f.id}>
                <img src={f.url} alt={f.original_name} loading="lazy" />
                <figcaption>
                  <span title={f.original_name}>{f.original_name}</span>
                  <small>{Math.max(1, Math.round((f.size_bytes || 0) / 1024))} KB</small>
                  <div>
                    <button className="adm-btn ghost small" type="button" onClick={() => copy(f.url)}>
                      <AdminIcon name={copied === f.url ? 'check' : 'copy'} size={14} />
                      {copied === f.url ? 'Copied' : 'Copy path'}
                    </button>
                    <button className="adm-btn danger-ghost icon-only" type="button"
                            onClick={() => remove(f)} aria-label={`Delete ${f.original_name}`}>
                      <AdminIcon name="trash" size={15} />
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

/** Signed-in account and password change. */
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
      <header className="adm-page-head">
        <div>
          <h1>Account</h1>
          <p className="adm-muted">Signed in as {user?.email}</p>
        </div>
      </header>

      <section className="adm-panel adm-narrow">
        <header className="adm-panel-head"><h2>Change password</h2></header>
        <form onSubmit={submit} className="adm-fields adm-pad">
          <div className="adm-field wide">
            <label htmlFor="pw-current">Current password</label>
            <input id="pw-current" type="password" autoComplete="current-password" required
                   value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
          </div>
          <div className="adm-field wide">
            <label htmlFor="pw-next">New password</label>
            <input id="pw-next" type="password" autoComplete="new-password" required minLength={8}
                   value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
            <p className="adm-help">At least 8 characters.</p>
          </div>
          <div className="adm-field wide">
            <label htmlFor="pw-confirm">Confirm new password</label>
            <input id="pw-confirm" type="password" autoComplete="new-password" required minLength={8}
                   value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </div>
          <div className="adm-field wide">
            {status.message && (
              <p className={status.state === 'error' ? 'adm-error' : 'adm-ok'} role="status">
                {status.state === 'saved' && <AdminIcon name="check" size={15} />}{status.message}
              </p>
            )}
            <button className="adm-btn primary" type="submit" disabled={status.state === 'saving'}>
              {status.state === 'saving' ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
