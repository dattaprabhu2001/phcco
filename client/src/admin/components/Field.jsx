import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/hooks.js';
import AdminIcon from './AdminIcon.jsx';

/**
 * Field behaviour is inferred from the column name rather than declared per
 * module. The database naming is consistent enough (`*_url`, `*_html`, `is_*`,
 * `*_id`, `image`/`avatar`/`thumb`) that inference stays correct while a module
 * definition remains a bare column list.
 */
const LONG_TEXT = new Set([
  'bio', 'summary', 'lead', 'excerpt', 'description', 'note', 'meta_description',
  'body', 'detail', 'message', 'setting_value', 'event', 'highlights', 'stats',
]);
const IMAGE = new Set([
  'image', 'avatar', 'logo', 'thumb', 'full', 'cover_image', 'hero_image',
  'author_avatar', 'image_wide', 'image_mid', 'image_tall',
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
  region: ['india', 'international'],
  layout: ['section', 'section motif rule-y', 'motif rule-y', 'motif rule-top', 'bg-white rule-top', 'bg-dark'],
  input_type: ['text', 'textarea', 'image', 'url', 'email'],
};

/** Short guidance shown under the input. Only where it earns its place. */
const HELP = {
  slug: 'Used in the page address. Lowercase words separated by hyphens.',
  sort: 'Lower numbers appear first.',
  visible: 'Uncheck to hide from the website without deleting.',
  tags: 'Separate with commas.',
  highlights: 'One bullet per line.',
  stats: 'One per line, as value|label — for example 6|Weeks.',
  hero_title: 'HTML is allowed, so a word can be accented.',
  layout: "The section's background and rules. Leave as-is unless redesigning.",
  section_key: 'How the page finds this section. Changing it can unstyle the block.',
  author_map_x: 'Pin position on the blog world map, 0–960 left to right.',
  author_map_y: 'Pin position on the blog world map, 0–480 top to bottom.',
  lat: 'Decimal degrees, north positive.',
  lon: 'Decimal degrees, east positive.',
  youtube_id: 'Just the ID from the video address, not the whole link.',
};

/** Columns that must be filled for the row to be usable. */
const REQUIRED = new Set(['slug', 'title', 'name', 'label', 'value', 'city', 'year', 'page_slug', 'section_key']);

export function fieldType(name) {
  if (RELATIONS[name]) return 'relation';
  if (name.startsWith('is_') || name === 'visible') return 'boolean';
  if (IMAGE.has(name)) return 'image';
  if (name.endsWith('_html')) return 'html';
  if (ENUMS[name]) return 'enum';
  if (name === 'published_at' || name.endsWith('_at')) return 'date';
  if (name.endsWith('_url') || name === 'path') return 'url';
  if (name === 'email' || name.endsWith('_email')) return 'email';
  if (NUMBER.has(name)) return 'number';
  if (LONG_TEXT.has(name)) return 'textarea';
  return 'text';
}

/** Which panel a field belongs in — keeps long forms readable. */
export function fieldGroup(name) {
  const t = fieldType(name);
  if (name === 'visible' || name === 'sort' || name.startsWith('is_') || t === 'date') return 'Publishing';
  if (t === 'image') return 'Media';
  if (t === 'url' || name.startsWith('link_') || name.startsWith('cta') || name.includes('_cta')) return 'Links';
  if (name === 'slug' || name === 'section_key' || name === 'layout' || name === 'kind'
      || name === 'meta_description' || name === 'group_key' || name === 'programme') return 'Settings';
  return 'Content';
}

export const GROUP_ORDER = ['Content', 'Media', 'Links', 'Settings', 'Publishing'];

export function labelFor(name) {
  const custom = {
    body_html: 'Body', aside_html: 'Side panel', hero_extra_html: 'Extra banner block',
    now_text: 'Doing now', author_title: 'Author full title', author_role: 'Author institution',
    image_wide: 'Image — desktop', image_mid: 'Image — tablet', image_tall: 'Image — phone',
    doi_url: 'DOI link', lat: 'Latitude', lon: 'Longitude', alt: 'Alt text',
    author_map_x: 'Map position X', author_map_y: 'Map position Y',
    read_minutes: 'Reading time', date_text: 'Date (as shown)', full: 'Full-size image',
    is_invited: 'Invited guest post', is_featured: 'Feature at the top of the blog',
    is_podcast: 'Show in the homepage podcast strip', published_at: 'Published',
    visible: 'Visible on the website', now_text: 'Doing now', group_key: 'Reference key',
    page_slug: 'Page', section_key: 'Section key', cta_label: 'Button label',
    cta_url: 'Button link', hero_cta_label: 'Primary button', hero_cta_url: 'Primary button link',
    hero_cta2_label: 'Secondary button', hero_cta2_url: 'Secondary button link',
  };
  if (custom[name]) return custom[name];
  return name
    .replace(/_html$/, '').replace(/_id$/, '').replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

export default function Field({ name, value, onChange }) {
  const type = fieldType(name);
  const id = `f-${name}`;
  const set = (v) => onChange(name, v);
  const wide = type === 'html' || type === 'textarea';

  if (type === 'boolean') {
    return (
      <div className="adm-field adm-field-check">
        <label className="adm-switch" htmlFor={id}>
          <input id={id} type="checkbox" checked={!!Number(value)}
                 onChange={(e) => set(e.target.checked ? 1 : 0)} />
          <span className="adm-switch-track" aria-hidden="true"><span /></span>
          <span className="adm-switch-label">{labelFor(name)}</span>
        </label>
        {HELP[name] && <p className="adm-help">{HELP[name]}</p>}
      </div>
    );
  }

  return (
    <div className={`adm-field${wide ? ' wide' : ''}`}>
      <label htmlFor={id}>
        {labelFor(name)}
        {REQUIRED.has(name) && <span className="adm-req" title="Required">*</span>}
      </label>
      <Control id={id} name={name} type={type} value={value} set={set} />
      {HELP[name] && <p className="adm-help">{HELP[name]}</p>}
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
                  className="adm-code" spellCheck placeholder="HTML is allowed here." />
      );

    case 'textarea':
      return <textarea id={id} rows={4} value={v} onChange={(e) => set(e.target.value)} />;

    case 'date':
      // MySQL DATE arrives as an ISO timestamp; <input type=date> needs the
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
      return <input id={id} type="text" inputMode="url" placeholder="/page or https://…"
                    value={v} onChange={(e) => set(e.target.value)} />;

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

/** A path with a preview, plus an upload that writes into the media library. */
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
    <div className="adm-imagefield">
      <div className="adm-imagefield-row">
        {value
          ? <img className="adm-thumb" src={value} alt="" />
          : <span className="adm-thumb is-empty" aria-hidden="true"><AdminIcon name="image" /></span>}
        <div className="adm-imagefield-controls">
          <input id={id} type="text" value={value} placeholder="/assets/media/…"
                 onChange={(e) => set(e.target.value)} />
          <div className="adm-imagefield-actions">
            <label className="adm-btn ghost small">
              <AdminIcon name="upload" size={15} />
              {busy ? 'Uploading…' : 'Upload'}
              <input type="file" accept="image/*" hidden disabled={busy}
                     onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {value && (
              <button className="adm-btn ghost small" type="button" onClick={() => set('')}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <p className="adm-error">{error}</p>}
    </div>
  );
}
