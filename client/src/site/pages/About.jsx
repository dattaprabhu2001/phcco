import { Link } from 'react-router-dom';
import { useFetch, useReveal, useTitle } from '../../lib/hooks.js';
import {
  PageBanner, Loading, ErrorState, SectionHead, Section, Prose, Html, GenericSection,
} from '../components/Bits.jsx';
import { CollabMap } from '../components/IndiaMap.jsx';
import Icon from '../components/Icon.jsx';

const KNOWN = ['section-2', 'our-vision', 'strategic-domains', 'our-work', 'impact', 'collaborators'];
const byKey = (s, k) => (s || []).find((x) => x.section_key === k);

export default function About() {
  const { data, loading, error } = useFetch('/about');
  useReveal([data]);
  useTitle(data?.page?.title);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const s = data.sections || [];
  const intro = byKey(s, 'section-2');
  const vision = byKey(s, 'our-vision');
  const domains = byKey(s, 'strategic-domains');
  const work = byKey(s, 'our-work');
  const impact = byKey(s, 'impact');
  const collab = byKey(s, 'collaborators');

  return (
    <>
      <PageBanner page={data.page} crumb="About" />

      {intro && (
        <Section section={intro}>
          <div className="split">
            <Prose html={intro.body_html} className="prose reveal t-lead" />
            {intro.aside_html && <Html html={intro.aside_html} tagName="aside" />}
          </div>
        </Section>
      )}

      {vision && (
        <Section section={vision}>
          <SectionHead section={vision} center />
          <div className="grid md-g-3">
            {vision.items.map((item, i) => (
              <div className="card card-pad numbered reveal" key={item.id} data-reveal-delay={i * 90}>
                <span className="n" aria-hidden="true">{item.subtitle || pad(i)}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
          <Prose html={vision.body_html} />
        </Section>
      )}

      {domains && (
        <Section section={domains}>
          <SectionHead section={domains} />
          <div className="domain-grid">
            {domains.items.map((item, i) => (
              <article className="card card-hover domain-card reveal" key={item.id}
                       data-reveal-delay={i * 60}>
                <span className="n" aria-hidden="true">{item.subtitle || pad(i)}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </Section>
      )}

      {/* "What we do" is four linked pillar cards in a two-up grid — a
          different card from the numbered domain tiles above. */}
      {work && (
        <Section section={work}>
          <SectionHead section={work} />
          <div className="grid md-g-2" style={{ marginTop: '1.75rem' }}>
            {work.items.map((item, i) => {
              const Tag = item.link_url ? Link : 'div';
              return (
                <Tag className="card card-hover card-pad pillar reveal" key={item.id}
                     data-reveal-delay={i * 70} style={{ display: 'block' }}
                     {...(item.link_url ? { to: item.link_url } : {})}>
                  <h3 style={{ fontSize: '1.25rem' }}>{item.title}</h3>
                  <p>{item.body}</p>
                </Tag>
              );
            })}
          </div>
        </Section>
      )}

      {impact && (
        <Section section={impact}>
          <SectionHead section={impact} center onDark />
          <div className="grid md-g-3 lg-g-5">
            {impact.items.map((item, i) => (
              <div className="impact-card reveal" key={item.id} data-reveal-delay={i * 70}>
                <p className="v">{item.title}</p>
                <p className="l">{item.subtitle}</p>
                <p className="b">{item.body}</p>
              </div>
            ))}
          </div>
          <Prose html={impact.body_html} />
        </Section>
      )}

      {collab && (
        <Section section={collab}>
          <SectionHead section={collab} />
          <Collaborators section={collab} rows={data.collaborators || []} />
        </Section>
      )}

      {/* Anything an editor adds later that this page has no bespoke layout for. */}
      {s.filter((x) => !KNOWN.includes(x.section_key))
        .map((x) => <GenericSection section={x} key={x.id} />)}
    </>
  );
}

/**
 * Map of Indian partner institutions beside two lists: the Indian ones (which
 * are also the map's pins) and the international ones, which have no pin.
 */
function Collaborators({ section, rows }) {
  const india = rows.filter((r) => r.region === 'india');
  const abroad = rows.filter((r) => r.region === 'international');

  return (
    <div className="collab-map-wrap" style={{ marginTop: '1.75rem' }}>
      <CollabMap rows={india} />

      <div className="reveal">
        <h3 className="kicker" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="pin" />In India
        </h3>
        <ul className="loc-list" style={{ marginTop: '1rem' }}>
          {india.map((c) => (
            <li key={c.id}>
              <button className="loc-item wocon" type="button">
                <Icon name="pin" />
                <span>
                  <span className="e">{c.name}</span>
                  <span className="v">{c.city}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {abroad.length > 0 && (
          <>
            <h3 className="kicker reveal"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.75rem' }}>
              <Icon name="globe" />International
            </h3>
            <ul className="collab-grid reveal" style={{ marginTop: '1rem' }}>
              {abroad.map((c) => (
                <li className="collab-item" key={c.id}>
                  <span className="n">{c.name}</span>
                  <span className="c">{c.city}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <Prose html={section.body_html} className="reveal" />
      </div>
    </div>
  );
}

const pad = (i) => String(i + 1).padStart(2, '0');
