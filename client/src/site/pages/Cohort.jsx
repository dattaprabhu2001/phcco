import { useState, useEffect } from 'react';
import { useFetch, useReveal, useTitle } from '../../lib/hooks.js';
import {
  PageBanner, Loading, ErrorState, SectionHead, Section, Prose, GenericSection,
} from '../components/Bits.jsx';
import Icon from '../components/Icon.jsx';

const KNOWN = ['founding-team', 'by-year', 'alumni-network'];
const byKey = (s, k) => (s || []).find((x) => x.section_key === k);

export default function Cohort() {
  const { data, loading, error } = useFetch('/cohort');
  const [active, setActive] = useState(null);

  useReveal([data, active]);
  useTitle(data?.page?.title);

  const groups = data?.groups || [];
  const founding = groups.find((g) => g.group_key === 'founding-team');
  const tabbed = groups.filter((g) => g !== founding && g.people.length > 0);

  useEffect(() => {
    if (!active && tabbed.length) setActive(tabbed[0].id);
  }, [tabbed, active]);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const sections = data.sections || [];
  const foundingSection = byKey(sections, 'founding-team');
  const byYear = byKey(sections, 'by-year');
  const network = byKey(sections, 'alumni-network');
  const current = tabbed.find((g) => g.id === active) || tabbed[0];

  return (
    <>
      <PageBanner page={data.page} crumb="Cohort" />

      {founding && founding.people.length > 0 && (
        <section className={foundingSection?.layout || 'section'}>
          <div className="shell">
            <SectionHead section={foundingSection}
                         eyebrow={foundingSection?.eyebrow || 'Founding team'}
                         heading={foundingSection?.heading || founding.title} />
            <div className="grid sm-g-2 lg-g-3">
              {founding.people.map((p, i) => (
                <div className="reveal" key={p.id} data-reveal-delay={i * 70}>
                  <PersonCard person={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tabbed.length > 0 && (
        <Section section={byYear} className={byYear?.layout || 'motif rule-y'}>
          <SectionHead section={byYear} eyebrow={byYear?.eyebrow || 'By year'}
                       heading={byYear?.heading || 'Alumni & interns'} />

          <div className="cohort-picker reveal">
            <label className="year-select">
              <span className="lbl">Show</span>
              <select className="input" value={current?.id || ''}
                      onChange={(e) => setActive(Number(e.target.value))}>
                {tabbed.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </label>
            <div className="year-chips" role="tablist" aria-label="Cohort groups">
              {tabbed.map((g) => (
                <button key={g.id} className="chip" type="button" role="tab"
                        aria-selected={current?.id === g.id}
                        onClick={() => setActive(g.id)}>
                  {g.title}
                </button>
              ))}
            </div>
          </div>

          {current && (
            <div className="cohort-panel" role="tabpanel" aria-label={current.title}>
              <div className="cohort-panel-head">
                <h3>{current.title}</h3>
                <span className="n">
                  {current.people.length} {current.people.length === 1 ? 'person' : 'people'}
                </span>
              </div>
              <div className="grid sm-g-2 lg-g-3">
                {current.people.map((p, i) => (
                  <div className="reveal" key={p.id} data-reveal-delay={i * 50}>
                    <PersonCard person={p} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {network && (
        <Section section={network}>
          <SectionHead section={network} />
          <Prose html={network.body_html} />
        </Section>
      )}

      {sections.filter((x) => !KNOWN.includes(x.section_key))
        .map((x) => <GenericSection section={x} key={x.id} />)}
    </>
  );
}

function PersonCard({ person }) {
  const tags = (person.tags || '').split(',').map((t) => t.trim()).filter(Boolean);

  return (
    <article className="card card-hover person">
      <div className="top">
        {person.avatar
          ? <img className="pic" src={person.avatar} alt={person.name}
                 width="256" height="256" loading="lazy" decoding="async" />
          : <span className="pic avatar-fb" aria-hidden="true">{initials(person.name)}</span>}
        <div>
          <h3>{person.name}</h3>
          {person.role && <p className="role">{person.role}</p>}
        </div>
      </div>

      {(person.domain || person.now_text) && (
        <dl>
          {person.domain && <div><dt>Domain</dt><dd>{person.domain}</dd></div>}
          {person.now_text && <div><dt>Now</dt><dd>{person.now_text}</dd></div>}
        </dl>
      )}

      {person.bio && <p className="bio">{person.bio}</p>}

      {tags.length > 0 && (
        <div className="exp">{tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
      )}

      {person.linkedin_url && (
        <div className="foot">
          <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer">
            LinkedIn<Icon name="external" />
          </a>
        </div>
      )}
    </article>
  );
}

function initials(name) {
  return (name || '').split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]?.toUpperCase()).join('');
}
