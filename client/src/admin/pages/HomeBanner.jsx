import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/hooks.js';
import AdminIcon from '../components/AdminIcon.jsx';

/**
 * The homepage banner copy — the one page record the CMS edits.
 *
 * Every other page is authored by hand, so there is nothing to create or
 * delete here: just the words that sit over the rotating hero images, which are
 * managed separately under Hero slides.
 */
const FIELDS = [
  {
    name: 'hero_eyebrow', label: 'Eyebrow', type: 'text',
    help: 'The small pill above the headline.',
  },
  {
    name: 'hero_title', label: 'Headline', type: 'textarea', rows: 3, wide: true, code: true,
    help: 'HTML is allowed, so a word can be accented — wrap it in <span class="accent">…</span>.',
  },
  {
    name: 'hero_lead', label: 'Lead paragraph', type: 'textarea', rows: 3, wide: true,
  },
  { name: 'hero_cta_label', label: 'Primary button', type: 'text' },
  { name: 'hero_cta_url', label: 'Primary button link', type: 'text', help: 'A site path such as /research.' },
  { name: 'hero_cta2_label', label: 'Secondary button', type: 'text' },
  { name: 'hero_cta2_url', label: 'Secondary button link', type: 'text', help: 'A site path such as /outreach.' },
];

export default function HomeBanner() {
  const { data, loading, error, reload } = useFetch('/admin/home-banner');
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => { if (data) setDraft({ ...data }); }, [data]);

  if (loading || !draft) return <p className="adm-muted">Loading…</p>;
  if (error) return <p className="adm-error">{error.message}</p>;

  const dirty = FIELDS.some((f) => (data[f.name] ?? '') !== (draft[f.name] ?? ''));

  async function save(e) {
    e.preventDefault();
    setStatus({ state: 'saving', message: '' });
    try {
      await api.put('/admin/home-banner', draft);
      setStatus({ state: 'saved', message: 'Banner updated.' });
      reload();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  return (
    <form onSubmit={save}>
      <header className="adm-page-head">
        <div>
          <h1>Home banner</h1>
          <p className="adm-muted">
            The copy over the homepage hero. The images behind it are managed under
            Hero slides; every other page&rsquo;s banner is set in the code.
          </p>
        </div>
        <button className="adm-btn primary" type="submit" disabled={!dirty || status.state === 'saving'}>
          {status.state === 'saving' ? 'Saving…' : 'Save banner'}
        </button>
      </header>

      {status.message && (
        <p className={status.state === 'error' ? 'adm-error' : 'adm-ok'} role="status">
          {status.state === 'saved' && <AdminIcon name="check" size={15} />}{status.message}
        </p>
      )}

      <section className="adm-panel">
        <header className="adm-panel-head"><h2>Banner copy</h2></header>
        <div className="adm-fields adm-pad">
          {FIELDS.map((f) => (
            <div className={`adm-field${f.wide ? ' wide' : ''}`} key={f.name}>
              <label htmlFor={`hb-${f.name}`}>{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea id={`hb-${f.name}`} rows={f.rows || 3}
                          className={f.code ? 'adm-code' : undefined}
                          value={draft[f.name] ?? ''}
                          onChange={(e) => setDraft({ ...draft, [f.name]: e.target.value })} />
              ) : (
                <input id={`hb-${f.name}`} type="text" value={draft[f.name] ?? ''}
                       onChange={(e) => setDraft({ ...draft, [f.name]: e.target.value })} />
              )}
              {f.help && <p className="adm-help">{f.help}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="adm-panel">
        <header className="adm-panel-head"><h2>Preview</h2></header>
        <div className="adm-pad">
          <div className="adm-hero-preview">
            {draft.hero_eyebrow && <span className="adm-hero-eyebrow">{draft.hero_eyebrow}</span>}
            {/* Same HTML the homepage renders, so an accent span shows here too. */}
            <h3 dangerouslySetInnerHTML={{ __html: draft.hero_title || '' }} />
            {draft.hero_lead && <p>{draft.hero_lead}</p>}
            <div className="adm-hero-btns">
              {draft.hero_cta_label && <span className="adm-hero-btn primary">{draft.hero_cta_label}</span>}
              {draft.hero_cta2_label && <span className="adm-hero-btn">{draft.hero_cta2_label}</span>}
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}
