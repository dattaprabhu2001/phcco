import { useFetch, useReveal, useTitle } from '../../lib/hooks.js';
import {
  PageBanner, Loading, ErrorState, SectionHead, Section, Prose, GenericSection,
} from '../components/Bits.jsx';
import IndiaMap from '../components/IndiaMap.jsx';

const KNOWN = ['summer-internship', 'workshops', 'curriculum', 'outreach'];
const byKey = (s, k) => (s || []).find((x) => x.section_key === k);

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

      {[internship, workshops].filter(Boolean).map((sec, idx) => (
        <Section section={sec} key={sec.id}>
          <div className={idx === 1 ? 'split split-top' : 'split'}>
            <div>
              <SectionHead section={sec} />
              <Prose html={sec.body_html} />
            </div>
            <div>
              {sec.items.length > 0 && (
                <div className="grid sm-g-2">
                  {sec.items.map((item, i) => (
                    <div className="card card-pad reveal" key={item.id} data-reveal-delay={i * 70}>
                      <h3>{item.title}</h3>
                      {item.body && <p>{item.body}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>
      ))}

      {curriculum && (
        <Section section={curriculum}>
          <SectionHead section={curriculum} />
          <ul className="grid sm-g-2 lg-g-4" style={{ marginTop: '1.75rem' }}>
            {curriculum.items.map((item, i) => (
              <li className="card topic-card reveal" key={item.id} data-reveal-delay={i * 60}>
                <span className="n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
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
