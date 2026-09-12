import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/hooks.js';
import AdminIcon from '../components/AdminIcon.jsx';
import Field, { fieldType, fieldGroup, labelFor, GROUP_ORDER } from '../components/Field.jsx';

/**
 * One screen serves every content module: a table of rows, and an editor that
 * opens over it. Built from the module's column list, so a new column shows up
 * with the right input as soon as it is added server-side.
 */
export default function Collection() {
  const { key } = useParams();
  const { data: modules } = useFetch('/admin/modules');
  const mod = useMemo(() => (modules || []).find((m) => m.key === key), [modules, key]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);   // row id, 'new', or null
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  // Reload on module change, and drop any open draft — editing a publication
  // then landing on People with that form still open would submit the wrong shape.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEditing(null);
    setDraft(null);
    setSearch('');
    setStatus({ state: 'idle', message: '' });
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

  if (!mod) return <p className="adm-muted">Loading…</p>;

  const singular = mod.label.replace(/s$/, '').toLowerCase();

  function startNew() {
    const blank = Object.fromEntries(mod.columns.map((c) => [c, '']));
    if ('visible' in blank) blank.visible = 1;
    if ('sort' in blank) blank.sort = (rows.at(-1)?.sort ?? 0) + 10;
    setEditing('new');
    setDraft(blank);
    setStatus({ state: 'idle', message: '' });
  }

  function startEdit(row) {
    setEditing(row.id);
    setDraft(Object.fromEntries(mod.columns.map((c) => [c, row[c] ?? ''])));
    setStatus({ state: 'idle', message: '' });
  }

  function closeEditor() {
    setEditing(null);
    setDraft(null);
  }

  async function save(e) {
    e.preventDefault();
    setStatus({ state: 'saving', message: '' });
    try {
      const saved = editing === 'new'
        ? await api.post(`/admin/${key}`, draft)
        : await api.put(`/admin/${key}/${editing}`, draft);
      setRows((rs) => (editing === 'new' ? [...rs, saved] : rs.map((r) => (r.id === saved.id ? saved : r))));
      setEditing(saved.id);
      setStatus({ state: 'saved', message: 'Saved.' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  async function remove(row) {
    const name = row[mod.listFields[0]] || `#${row.id}`;
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.del(`/admin/${key}/${row.id}`);
      setRows((rs) => rs.filter((r) => r.id !== row.id));
      if (editing === row.id) closeEditor();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  const onChange = (name, value) => setDraft((d) => ({ ...d, [name]: value }));

  // Group the form's fields so a nineteen-column record is still readable.
  const grouped = draft
    ? GROUP_ORDER
      .map((g) => ({ name: g, fields: mod.columns.filter((c) => fieldGroup(c) === g) }))
      .filter((g) => g.fields.length)
    : [];

  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>{mod.label}</h1>
          {mod.description && <p className="adm-muted">{mod.description}</p>}
        </div>
        <button className="adm-btn primary" type="button" onClick={startNew}>
          <AdminIcon name="plus" size={16} />New {singular}
        </button>
      </header>

      <div className="adm-toolbar">
        <div className="adm-searchbox">
          <AdminIcon name="search" size={16} />
          <input type="search" placeholder={`Search ${mod.label.toLowerCase()}…`}
                 value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="adm-muted">
          {shown.length === rows.length
            ? `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`
            : `${shown.length} of ${rows.length}`}
        </span>
      </div>

      {status.state === 'error' && !draft && <p className="adm-error">{status.message}</p>}

      <section className="adm-panel adm-tablewrap">
        {loading ? (
          <p className="adm-muted adm-pad">Loading…</p>
        ) : shown.length === 0 ? (
          <div className="adm-empty">
            <AdminIcon name={mod.icon} size={26} />
            <p>{rows.length ? 'Nothing matches that search.' : `No ${mod.label.toLowerCase()} yet.`}</p>
            {!rows.length && (
              <button className="adm-btn primary" type="button" onClick={startNew}>
                <AdminIcon name="plus" size={16} />New {singular}
              </button>
            )}
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                {mod.listFields.map((f) => <th key={f}>{labelFor(f)}</th>)}
                {'visible' in (rows[0] || {}) && <th className="adm-col-narrow">Status</th>}
                <th className="adm-col-actions"><span className="adm-sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.id} className={editing === row.id ? 'is-active' : ''}>
                  {mod.listFields.map((f, i) => (
                    <td key={f}>
                      {i === 0 ? (
                        <button className="adm-linkbtn" type="button" onClick={() => startEdit(row)}>
                          {cell(row, f) || `#${row.id}`}
                        </button>
                      ) : cell(row, f)}
                    </td>
                  ))}
                  {'visible' in row && (
                    <td>
                      <span className={`adm-tag ${Number(row.visible) ? 'ok' : 'muted'}`}>
                        {Number(row.visible) ? 'Live' : 'Hidden'}
                      </span>
                    </td>
                  )}
                  <td className="adm-col-actions">
                    <button className="adm-btn ghost small" type="button" onClick={() => startEdit(row)}>
                      Edit
                    </button>
                    <button className="adm-btn danger-ghost icon-only" type="button"
                            onClick={() => remove(row)} title="Delete" aria-label={`Delete ${cell(row, mod.listFields[0])}`}>
                      <AdminIcon name="trash" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {draft && (
        <>
          <div className="adm-scrim" onClick={closeEditor} />
          <form className="adm-drawer" onSubmit={save} aria-label={`Edit ${singular}`}>
            <header className="adm-drawer-head">
              <div>
                <h2>{editing === 'new' ? `New ${singular}` : `Edit ${singular}`}</h2>
                {editing !== 'new' && <p className="adm-muted">Record #{editing}</p>}
              </div>
              <button className="adm-btn ghost icon-only" type="button"
                      onClick={closeEditor} aria-label="Close">
                <AdminIcon name="close" />
              </button>
            </header>

            <div className="adm-drawer-body">
              {grouped.map((g) => (
                <fieldset className="adm-fieldset" key={g.name}>
                  <legend>{g.name}</legend>
                  <div className="adm-fields">
                    {g.fields.map((c) => (
                      <Field key={c} name={c} value={draft[c]} onChange={onChange} />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <footer className="adm-drawer-foot">
              {status.message && (
                <p className={status.state === 'error' ? 'adm-error' : 'adm-ok'} role="status">
                  {status.state === 'saved' && <AdminIcon name="check" size={15} />}
                  {status.message}
                </p>
              )}
              <div className="adm-drawer-actions">
                <button className="adm-btn ghost" type="button" onClick={closeEditor}>Cancel</button>
                <button className="adm-btn primary" type="submit" disabled={status.state === 'saving'}>
                  {status.state === 'saving' ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </footer>
          </form>
        </>
      )}
    </>
  );
}

/** Table cells stay one line: trim long prose and render flags readably. */
function cell(row, field) {
  const v = row[field];
  if (v == null || v === '') return '—';
  if (fieldType(field) === 'date') return String(v).slice(0, 10);
  const s = String(v);
  return s.length > 70 ? `${s.slice(0, 70)}…` : s;
}
