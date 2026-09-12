import { useState, useEffect } from 'react';
import { useFetch, useReveal, useTitle } from '../../lib/hooks.js';
import {
  PageBanner, Loading, ErrorState, SectionHead, Section, Prose, GenericSection,
} from '../components/Bits.jsx';
import IndiaMap from '../components/IndiaMap.jsx';
import Icon from '../components/Icon.jsx';

const KNOWN = ['summer-internship', 'workshops', 'curriculum', 'outreach'];
const byKey = (s, k) => (s || []).find((x) => x.section_key === k);
const ofKind = (sec, kind) => (sec?.items || []).filter((i) => (i.kind || 'card') === kind);

export default function Outreach() {
  const { data, loading, error } = useFetch('/outreach');
  useReveal([data]);
  useTitle(data?.page?.title);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const sections = data.sections || [];
  const internship = byKey(sections, 'summer-internship');
  const workshops = byKey(sections, 'workshops');
  const curriculum = byKey(sections, 'curriculum');
  const map = byKey(sections, 'outreach');

  return (
    <>
      <PageBanner page={data.page} crumb="Outreach" />

      {internship && (
        <Section section={internship}>
          <div className="split">
            <div>
              <SectionHead section={internship} />
              <Prose html={internship.body_html} />
            </div>
            <div className="stack reveal">
              {ofKind(internship, 'shape').map((item) => (
                <div className="card shape-card" key={item.id}>
                  <span className="ico"><Icon name="pin" /></span>
                  {item.subtitle && <p className="kicker amber">{item.subtitle}</p>}
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          {(data.editions || []).length > 0 && (
            <Editions editions={data.editions} />
          )}
        </Section>
      )}

      {workshops && (
        <Section section={workshops}>
          <div className="split split-top">
            <div>
              <SectionHead section={workshops} />
              <Prose html={workshops.body_html} />
            </div>
            <div>
              {ofKind(workshops, 'format').length > 0 && (
                <div className="card card-pad reveal">
                  <h3 className="kicker" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon name="file" />Format
                  </h3>
                  <ul className="format-list" style={{ marginTop: '1rem' }}>
                    {ofKind(workshops, 'format').map((i) => <li key={i.id}>{i.title}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {ofKind(workshops, 'gallery').length > 0 && (
            <div>
              <h3 className="kicker reveal">Posters &amp; photographs</h3>
              <div className="grid sm-g-2 lg-g-4" style={{ marginTop: '1rem' }}>
                {ofKind(workshops, 'gallery').map((item, i) => (
                  <figure className="card card-hover gallery-card reveal" key={item.id}
                          data-reveal-delay={i * 70}>
                    <img src={item.image}
                         alt={[item.title, item.subtitle].filter(Boolean).join(' — ')}
                         loading="lazy" decoding="async" />
                    <figcaption>
                      {item.title && <p className="t">{item.title}</p>}
                      {item.subtitle && <p className="v">{item.subtitle}</p>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {curriculum && (
        <Section section={curriculum}>
          <SectionHead section={curriculum} />
          <ul className="grid sm-g-2 lg-g-4" style={{ marginTop: '1.75rem' }}>
            {curriculum.items.map((item, i) => (
              <li className="card topic-card reveal" key={item.id} data-reveal-delay={i * 60}>
                <span className="n" aria-hidden="true">{item.subtitle || String(i + 1).padStart(2, '0')}</span>
                <span>{item.title}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {map && (
        <Section section={map} inner="shell section">
          <SectionHead section={map} />
          <IndiaMap locations={data.locations || []} />
        </Section>
      )}

      {sections.filter((x) => !KNOWN.includes(x.section_key))
        .map((x) => <GenericSection section={x} key={x.id} />)}
    </>
  );
}

/** Year chips over one edition card at a time. */
function Editions({ editions }) {
  const [year, setYear] = useState(null);
  useEffect(() => {
    if (!year && editions.length) setYear(editions[0].year);
  }, [editions, year]);

  const current = editions.find((e) => e.year === year) || editions[0];

  // A hidden panel can never intersect the viewport, so its contents are still
  // waiting to be revealed when the year changes. Re-run the pass on switch.
  useReveal([current?.id]);

  const lines = (s) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean);

  return (
    <div>
      <h3 className="kicker reveal" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon name="file" />Editions by year
      </h3>

      <div className="year-tabs reveal" role="tablist" aria-label="Summer internship years">
        {editions.map((e) => (
          <button key={e.id} className="chip" type="button" role="tab"
                  aria-selected={current?.year === e.year}
                  onClick={() => setYear(e.year)}>
            {e.year}
          </button>
        ))}
      </div>

      {/* All editions stay mounted, inactive ones `hidden`, as in the original —
          so the years an editor is not looking at are still findable on the page. */}
      <div style={{ marginTop: '1rem' }}>
        {editions.map((e) => (
          <article className="card edition reveal" role="tabpanel" aria-label={e.title}
                   hidden={current?.id !== e.id} key={e.id}>
            {e.image && <img src={e.image} alt={e.title} loading="lazy" decoding="async" />}
            <div className="body">
              {e.kicker && <p className="kicker amber">{e.kicker}</p>}
              <h4 className="t-h3">{e.title}</h4>
              {e.venue && <p className="venue"><Icon name="pin" />{e.venue}</p>}
              {e.summary && <p className="summary">{e.summary}</p>}

              {lines(e.highlights).length > 0 && (
                <ul className="hl">
                  {lines(e.highlights).map((h) => <li key={h}>{h}</li>)}
                </ul>
              )}

              {e.tags && (
                <div className="tags">
                  {e.tags.split(',').map((t) => <span className="tag" key={t}>{t.trim()}</span>)}
                </div>
              )}

              {lines(e.stats).length > 0 && (
                <dl>
                  {lines(e.stats).map((s) => {
                    const [value, label] = s.split('|');
                    return <div key={s}><dd>{value}</dd><dt>{label}</dt></div>;
                  })}
                </dl>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
