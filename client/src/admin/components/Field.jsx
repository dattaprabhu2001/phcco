import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/hooks.js';

/**
 * Field types are inferred from the column name rather than declared per
 * module. The database naming is consistent enough (`*_url`, `*_html`, `is_*`,
 * `*_id`) that inference stays correct while keeping module definitions to a
 * bare column list.
 */
const LONG_TEXT = new Set([
  'bio', 'summary', 'lead', 'excerpt', 'description', 'note', 'meta_description',
  'body', 'detail', 'subtitle', 'message', 'setting_value', 'tags', 'event',
]);
const IMAGE = new Set([
  'image', 'avatar', 'logo', 'thumb', 'full', 'cover_image', 'hero_image',
  'author_avatar', 'setting_image',
]);
const NUMBER = new Set(['sort', 'year', 'author_map_x', 'author_map_y', 'lat', 'lon']);

/** Foreign keys -> the module whose rows populate the dropdown. */
const RELATIONS = {
  group_id: { module: 'people-groups', label: 'title' },
  album_id: { module: 'albums', label: 'title' },
  section_id: { module: 'page-sections', label: 'heading', hint: 'page_slug' },
  parent_id: { module: 'nav-items', label: 'label' },
};

const ENUMS = {
  kind: ['wocon', 'conference', 'other'],
  layout: ['default', 'light'],
  input_type: ['text', 'textarea', 'image', 'url', 'email'],
};

export function fieldType(name) {
  if (RELATIONS[name]) return 'relation';
  if (name.startsWith('is_') || name === 'visible') return 'boolean';
  if (IMAGE.has(name)) return 'image';
  if (name.endsWith('_html')) return 'html';
  if (ENUMS[name]) return 'enum';
  if (name.endsWith('_at') || name === 'published_at') return 'date';
  if (name.endsWith('_url') || name === 'path') return 'url';
  if (name === 'email' || name.endsWith('_email')) return 'email';
  if (NUMBER.has(name)) return 'number';
  if (LONG_TEXT.has(name)) return 'textarea';
  return 'text';
}

export function labelFor(name) {
  return name
    .replace(/_html$/, '')
    .replace(/_id$/, '')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

export default function Field({ name, value, onChange }) {
  const type = fieldType(name);
  const id = `f-${name}`;
  const set = (v) => onChange(name, v);

  if (type === 'boolean') {
    return (
      <label className="admin-check" htmlFor={id}>
        <input id={id} type="checkbox" checked={!!Number(value)}
               onChange={(e) => set(e.target.checked ? 1 : 0)} />
        <span>{labelFor(name)}</span>
      </label>
    );
  }

  return (
    <div className={`admin-field${type === 'html' || type === 'textarea' ? ' wide' : ''}`}>
      <label htmlFor={id}>{labelFor(name)}</label>
      <Control id={id} name={name} type={type} value={value} set={set} />
    </div>
  );
}

function Control({ id, name, type, value, set }) {
  const v = value ?? '';

  switch (type) {
    case 'relation':
      return <RelationSelect id={id} name={name} value={v} set={set} />;

    case 'image':
      return <ImageField id={id} value={v} set={set} />;

    case 'enum':
      return (
        <select id={id} value={v} onChange={(e) => set(e.target.value)}>
          <option value="">—</option>
          {ENUMS[name].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );

    case 'html':
      return (
        <textarea id={id} rows={14} value={v} onChange={(e) => set(e.target.value)}
                  spellCheck placeholder="HTML is allowed here." />
      );

    case 'textarea':
      return <textarea id={id} rows={4} value={v} onChange={(e) => set(e.target.value)} />;

    case 'date':
      // MySQL DATE comes back as an ISO timestamp; <input type=date> needs the
      // bare yyyy-mm-dd half of it.
      return (
        <input id={id} type="date" value={String(v).slice(0, 10)}
               onChange={(e) => set(e.target.value)} />
      );

    case 'number':
      return (
        <input id={id} type="number" step="any" value={v}
               onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))} />
      );

    case 'url':
      return <input id={id} type="text" inputMode="url" value={v} onChange={(e) => set(e.target.value)} />;

    case 'email':
      return <input id={id} type="email" value={v} onChange={(e) => set(e.target.value)} />;

    default:
      return <input id={id} type="text" value={v} onChange={(e) => set(e.target.value)} />;
  }
}

function RelationSelect({ id, name, value, set }) {
  const rel = RELATIONS[name];
  const { data } = useFetch(`/admin/${rel.module}`);

  return (
    <select id={id} value={value ?? ''}
            onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))}>
      <option value="">— none —</option>
      {(data || []).map((row) => (
        <option key={row.id} value={row.id}>
          {row[rel.label] || `#${row.id}`}
          {rel.hint && row[rel.hint] ? ` (${row[rel.hint]})` : ''}
        </option>
      ))}
    </select>
  );
}

/** Text path plus an upload button — uploads go to the server media library. */
function ImageField({ id, value, set }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await api.post('/admin/media', body);
      set(res.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-imagefield">
      <div className="admin-imagefield-row">
        <input id={id} type="text" value={value} placeholder="/assets/media/…"
               onChange={(e) => set(e.target.value)} />
        <label className="admin-btn ghost admin-upload">
          {busy ? 'Uploading…' : 'Upload'}
          <input type="file" accept="image/*" hidden disabled={busy}
                 onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      </div>
      {error && <p className="admin-error">{error}</p>}
      {value && <img className="admin-thumb" src={value} alt="" />}
    </div>
  );
}
