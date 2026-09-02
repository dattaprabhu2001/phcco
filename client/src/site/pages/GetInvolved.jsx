import { Link, useParams } from 'react-router-dom';
import { useFetch, useReveal, useTitle } from '../../lib/hooks.js';
import {
  PageBanner, Loading, ErrorState, SectionHead, Section, Prose, GenericSection,
} from '../components/Bits.jsx';
import Icon from '../components/Icon.jsx';

const KNOWN = ['not-sure-where-you-fit'];

export function GetInvolved() {
  const { data, loading, error } = useFetch('/events');
  useReveal([data]);
  useTitle(data?.page?.title);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const sections = data.sections || [];
  const cta = sections.find((s) => s.section_key === 'not-sure-where-you-fit');

  return (
    <>
      <PageBanner page={data.page} crumb="Get Involved" />

      <section className="section">
        <div className="shell">
          <div className="blog-cards">
            {(data.events || []).map((e, i) => (
              <Link className="card card-hover bcard reveal" to={`/events/${e.slug}`}
                    key={e.id} data-reveal-delay={i * 80}>
                <span className="bcard-media">
                  {e.image && <img src={e.image} alt="" loading="lazy" decoding="async" />}
                </span>
                <span className="bcard-body">
                  <span className="bcard-meta">
                    {e.date_text}
                    {e.date_text && e.location && <i aria-hidden="true">·</i>}
                    {e.location}
                  </span>
                  <h3>{e.title}</h3>
                  <span className="bcard-x">{e.summary}</span>
                  <span className="bcard-read">
                    {e.cta_label || 'Know more'} <Icon name="arrowRight" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {cta && (
        <Section section={cta}>
          <div className="card cta motif reveal">
            <div className="layer dotgrid" aria-hidden="true" />
            <div>
              {cta.eyebrow && <span className="eyebrow">{cta.eyebrow}</span>}
              {cta.heading && <h2 className="t-h2 balance">{cta.heading}</h2>}
              <Prose html={cta.body_html} className="t-lead pretty" />
              <div className="btns">
                <Link className="btn btn-accent" to="/contact">
                  Contact us<Icon name="arrowRight" />
                </Link>
              </div>
            </div>
          </div>
        </Section>
      )}

      {sections.filter((x) => !KNOWN.includes(x.section_key))
        .map((x) => <GenericSection section={x} key={x.id} />)}
    </>
  );
}

export function EventDetail() {
  const { slug } = useParams();
  const { data, loading, error } = useFetch(`/events/${slug}`);
  useReveal([data]);
  useTitle(data?.event?.title);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const { event } = data;

  return (
    <>
      <section className="page-banner">
        {event.image && (
          <img className="page-banner-img" src={event.image} alt=""
               loading="eager" fetchpriority="high" decoding="async" />
        )}
        <div className="page-banner-scrim" aria-hidden="true" />
        <div className="layer dotgrid page-banner-grid" aria-hidden="true" />
        <div className="shell">
          <nav className="crumbs" aria-label="Breadcrumb">
            <ol>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/get-involved">Get Involved</Link></li>
              <li aria-current="page">{event.title}</li>
            </ol>
          </nav>
          <span className="eyebrow on-banner">
            {event.date_text}{event.location && ` · ${event.location}`}
          </span>
          <h1 className="t-hero balance">{event.title}</h1>
          {event.summary && <p className="lead t-lead pretty">{event.summary}</p>}
        </div>
      </section>

      <article className="section">
        <div className="shell">
          <Prose html={event.body_html} />
          {event.cta_url && (
            <p className="reveal" style={{ marginTop: '2rem' }}>
              <a className="btn btn-accent" href={event.cta_url}>
                {event.cta_label || 'Apply'}<Icon name="arrowRight" />
              </a>
            </p>
          )}
        </div>
      </article>
    </>
  );
}

export function NotFound() {
  useTitle('Page not found — PHCCO');
  return (
    <section className="section">
      <div className="shell">
        <span className="eyebrow">404</span>
        <h1 className="t-hero balance">We couldn't find that page</h1>
        <p className="lead t-lead pretty">
          The link may be out of date, or the page may have moved.
        </p>
        <Link className="btn btn-accent" to="/">Back to home<Icon name="arrowRight" /></Link>
      </div>
    </section>
  );
}
