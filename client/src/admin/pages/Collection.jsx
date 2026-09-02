import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/hooks.js';
import Field, { labelFor, fieldType } from '../components/Field.jsx';

/**
 * One screen serves every content module: a searchable list on the left, an
 * edit form on the right, both built from the module's column list.
 */
export default function Collection() {
  const { key } = useParams();
  const { data: modules } = useFetch('/admin/modules');
  const mod = useMemo(() => (modules || []).find((m) => m.key === key), [modules, key]);

  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [loading, setLoading] = useState(true);

  // Reload whenever the module changes, and drop any open draft — editing a
  // publication then landing on People with that form still open would submit
  // the wrong shape.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelected(null);
    setDraft(null);
    setSearch('');
    api.get(`/admin/${key}`)
      .then((r) => { if (!cancelled) setRows(r); })
      .catch((e) => { if (!cancelled) setStatus({ state: 'error', message: e.message }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [key]);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle || !mod) return rows;
    return rows.filter((r) =>
      mod.columns.some((c) => String(r[c] ?? '').toLowerCase().includes(needle))
    );
  }, [rows, search, mod]);

  if (!mod) return <p className="admin-muted">Loading…</p>;

  function startNew() {
    const blank = Object.fromEntries(mod.columns.map((c) => [c, '']));
    if ('visible' in blank) blank.visible = 1;
    if ('sort' in blank) blank.sort = (rows.at(-1)?.sort ?? 0) + 10;
    setSelected('new');
    setDraft(blank);
    setStatus({ state: 'idle', message: '' });
  }

  function startEdit(row) {
    setSelected(row.id);
    setDraft(Object.fromEntries(mod.columns.map((c) => [c, row[c] ?? ''])));
    setStatus({ state: 'idle', message: '' });
  }

  async function save(e) {
    e.preventDefault();
    setStatus({ state: 'saving', message: '' });
    try {
      const saved = selected === 'new'
        ? await api.post(`/admin/${key}`, draft)
        : await api.put(`/admin/${key}/${selected}`, draft);

      setRows((rs) =>
        selected === 'new' ? [...rs, saved] : rs.map((r) => (r.id === saved.id ? saved : r))
      );
      setSelected(saved.id);
      setStatus({ state: 'saved', message: 'Saved.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  async function remove(row) {
    if (!window.confirm(`Delete "${row[mod.listFields[0]] || `#${row.id}`}"? This cannot be undone.`)) return;
    try {
      await api.del(`/admin/${key}/${row.id}`);
      setRows((rs) => rs.filter((r) => r.id !== row.id));
      if (selected === row.id) { setSelected(null); setDraft(null); }
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  const onChange = (name, value) => setDraft((d) => ({ ...d, [name]: value }));

  // Checkboxes read better grouped at the end of the form than inline.
  const flags = mod.columns.filter((c) => fieldType(c) === 'boolean');
  const fields = mod.columns.filter((c) => fieldType(c) !== 'boolean');

  return (
    <>
      <div className="admin-page-head">
        <h1>{mod.label}</h1>
        <p className="admin-muted">
          {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
        </p>
      </div>

      <div className="admin-split">
        <section className="admin-panel admin-list">
          <div className="admin-panel-head">
            <input type="search" placeholder="Search…" value={search}
                   onChange={(e) => setSearch(e.target.value)} />
            <button className="admin-btn primary" type="button" onClick={startNew}>+ New</button>
          </div>

          {loading ? (
            <p className="admin-muted">Loading…</p>
          ) : shown.length === 0 ? (
            <p className="admin-muted">Nothing here yet.</p>
          ) : (
            <ul className="admin-rows">
              {shown.map((row) => (
                <li key={row.id} className={selected === row.id ? 'is-active' : ''}>
                  <button type="button" onClick={() => startEdit(row)}>
                    <strong>{row[mod.listFields[0]] || `#${row.id}`}</strong>
                    <span className="admin-muted">
                      {mod.listFields.slice(1).map((f) => row[f]).filter(Boolean).join(' · ')}
                    </span>
                  </button>
                  {'visible' in row && !Number(row.visible) && (
                    <span className="admin-pill muted">Hidden</span>
                  )}
                  <button className="admin-btn danger tiny" type="button"
                          onClick={() => remove(row)} aria-label="Delete">×</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-panel admin-form-panel">
          {!draft ? (
            <p className="admin-muted">Select an entry on the left, or create a new one.</p>
          ) : (
            <form onSubmit={save}>
              <div className="admin-panel-head">
                <h2>{selected === 'new' ? `New ${mod.label.replace(/s$/, '').toLowerCase()}` : 'Edit entry'}</h2>
                <div>
                  <button className="admin-btn ghost" type="button"
                          onClick={() => { setDraft(null); setSelected(null); }}>
                    Cancel
                  </button>
                  <button className="admin-btn primary" type="submit"
                          disabled={status.state === 'saving'}>
                    {status.state === 'saving' ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              {status.message && (
                <p className={status.state === 'error' ? 'admin-error' : 'admin-ok'} role="status">
                  {status.message}
                </p>
              )}

              <div className="admin-fields">
                {fields.map((c) => (
                  <Field key={c} name={c} value={draft[c]} onChange={onChange} />
                ))}
              </div>

              {flags.length > 0 && (
                <div className="admin-flags">
                  {flags.map((c) => (
                    <Field key={c} name={c} value={draft[c]} onChange={onChange} />
                  ))}
                </div>
              )}
            </form>
          )}
        </section>
      </div>
    </>
  );
}
