import { useFetch, useReveal, useTitle } from '../../lib/hooks.js';
import {
  PageBanner, Loading, ErrorState, SectionHead, Section, Prose, Html, GenericSection,
} from '../components/Bits.jsx';

const KNOWN = ['how-we-work', 'the-field-end-to-end'];
const byKey = (s, k) => (s || []).find((x) => x.section_key === k);

export default function Research() {
  const { data, loading, error } = useFetch('/research');
  useReveal([data]);
  useTitle(data?.page?.title);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const sections = data.sections || [];
  const methods = byKey(sections, 'how-we-work');
  const closing = byKey(sections, 'the-field-end-to-end');

  return (
    <>
      <PageBanner page={data.page} crumb="Research" />

      <section className="section">
        <div className="shell">
          <div className="stack-lg">
            {(data.themes || []).map((t, i) => (
              <article className="theme-block" id={slugify(t.title)} key={t.id}>
                <div>
                  <div className="theme-rail reveal">
                    <div className="head">
                      <span className="n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <h2 className="t-h3 balance">{t.title}</h2>
                    <div className="accent-rule" />
                    {t.summary && <p className="short">{t.summary}</p>}
                  </div>
                </div>
                <div>
                  <div className="card theme-body reveal">
                    <Prose html={t.body} className="" />
                    {t.tags && (
                      <div className="kw">
                        <h3 className="kicker">Focus areas</h3>
                        <ul>
                          {t.tags.split(',').map((tag) => (
                            <li className="tag" key={tag}>{tag.trim()}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {methods && (
        <Section section={methods}>
          <SectionHead section={methods} />
          <div className="grid sm-g-2 lg-g-3" style={{ marginTop: '1.75rem' }}>
            {(data.methods || []).map((m, i) => (
              <div className="card card-pad reveal" key={m.id} data-reveal-delay={i * 70}>
                <h3 style={{ fontSize: '1rem', color: 'var(--plum-900)' }}>{m.title}</h3>
                {m.body && (
                  <p style={{
                    marginTop: '0.5rem', fontSize: '0.875rem',
                    color: 'var(--ink-500)', lineHeight: 1.6,
                  }}>
                    {m.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {closing && (
        <Section section={closing}>
          <SectionHead section={closing} center />
          {closing.image && (
            <figure className="reveal">
              <div className="card figure-frame">
                {/* The diagram is wide; on small screens it scrolls inside the
                    frame rather than shrinking to illegibility. */}
                <div className="figure-scroll">
                  <img src={closing.image} alt="From data to the clinic"
                       loading="lazy" decoding="async" />
                </div>
              </div>
              <span className="hint">Swipe to explore on small screens.</span>
            </figure>
          )}
          <Prose html={closing.body_html} />
          <Html html={closing.aside_html} />
        </Section>
      )}

      {sections.filter((x) => !KNOWN.includes(x.section_key))
        .map((x) => <GenericSection section={x} key={x.id} />)}
    </>
  );
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
