import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch, useReveal, useTitle, useCarousel } from '../../lib/hooks.js';
import { Loading, ErrorState, SectionHead, Section, Prose, Html } from '../components/Bits.jsx';
import Icon, { PlayIcon } from '../components/Icon.jsx';

/** Sections are looked up by key so an editor can reorder them freely. */
const byKey = (sections, key) => (sections || []).find((s) => s.section_key === key);

export default function Home() {
  const { data, loading, error } = useFetch('/home');
  useReveal([data]);
  useTitle(data?.page?.title);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const { page, slides = [], stats = [], posts = [], podcast = [], sections = [] } = data;

  return (
    <>
      <Hero page={page} slides={slides} />
      <Stats stats={stats} />
      <Introduction section={byKey(sections, 'introduction')} />
      <Mission section={byKey(sections, 'why-we-exist')} />
      <RecentPosts posts={posts} />
      <Podcast episodes={podcast} />
      <Cta section={byKey(sections, 'join-us')} />
    </>
  );
}

/**
 * Full-bleed carousel with one fixed copy overlay on top — the copy does not
 * change with the slide, so it lives on the page record, not per slide.
 */
function Hero({ page, slides }) {
  const { index, go, next, prev, playing, setPlaying } = useCarousel(slides.length);
  if (!page) return null;

  return (
    <section className="hero" data-hero>
      <div className="carousel" role="region" aria-roledescription="carousel"
           aria-label="PHCCO in pictures" tabIndex={0}>
        <div className="carousel-track"
             style={{ transform: `translate3d(${-index * 100}%, 0, 0)` }}>
          {slides.map((s, i) => (
            <div className="carousel-slide" role="group" aria-roledescription="slide"
                 aria-label={`${i + 1} of ${slides.length}`}
                 aria-hidden={i !== index} key={s.id}>
              <div className="hero-figure">
                <picture>
                  {s.image_tall && <source media="(max-width: 639px)" srcSet={s.image_tall} />}
                  {s.image_mid && <source media="(max-width: 1023px)" srcSet={s.image_mid} />}
                  <img src={s.image_wide} alt={s.alt} width="2200" height="1000"
                       loading={i === 0 ? 'eager' : 'lazy'}
                       fetchpriority={i === 0 ? 'high' : undefined}
                       decoding="async" />
                </picture>
                <div className="hero-scrim-v" aria-hidden="true" />
                <div className="hero-scrim-h" aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>

        {slides.length > 1 && (
          <div className="carousel-controls">
            <div className="shell">
              <div className="dots" role="tablist" aria-label="Slides">
                {slides.map((s, i) => (
                  <button key={s.id} type="button" aria-label={`Go to slide ${i + 1}`}
                          aria-selected={i === index} onClick={() => go(i)} />
                ))}
              </div>
              <div className="c-btns">
                <button className="c-btn" type="button" data-playing={playing}
                        aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
                        onClick={() => setPlaying((v) => !v)}>
                  <svg className="icon-pause" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M8 5v14M16 5v14" />
                  </svg>
                  <span className="icon-play"><PlayIcon /></span>
                </button>
                <button className="c-btn" type="button" aria-label="Previous slide" onClick={prev}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
                <button className="c-btn" type="button" aria-label="Next slide" onClick={next}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="hero-overlay">
        <div className="shell">
          <div className="hero-copy">
            {page.hero_eyebrow && <span className="eyebrow">{page.hero_eyebrow}</span>}
            <h1 className="t-hero balance"
                dangerouslySetInnerHTML={{ __html: page.hero_title || '' }} />
            {page.hero_lead && <p className="lead t-lead pretty">{page.hero_lead}</p>}

            {(page.hero_cta_label || page.hero_cta2_label) && (
              <div className="hero-actions">
                {page.hero_cta_label && (
                  <Link className="btn btn-accent" to={page.hero_cta_url || '/research'}>
                    {page.hero_cta_label}<Icon name="arrowRight" />
                  </Link>
                )}
                {page.hero_cta2_label && (
                  <Link className="btn btn-on-dark" to={page.hero_cta2_url || '/outreach'}>
                    {page.hero_cta2_label}
                  </Link>
                )}
              </div>
            )}

            <div className="hero-brands">
              <img className="iisc" src="/assets/media/brand/iisc-emblem.webp"
                   alt="Indian Institute of Science" />
              <span>Indian Institute<br />of Science</span>
              <span className="divider" aria-hidden="true" />
              <img className="ph" src="/assets/media/brand/paramhansa-white.webp"
                   alt="Param Hansa Philanthropies" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats({ stats }) {
  if (!stats.length) return null;
  return (
    <section className="bg-white" style={{ borderBottom: '1px solid var(--plum-100)' }}>
      <div className="shell">
        <dl className="stats">
          {stats.map((s, i) => (
            <div className="reveal" key={s.id} data-reveal-delay={i * 70}>
              <dd className="v t-stat">{s.value}</dd>
              <dt className="l">{s.label}</dt>
              {s.detail && <p className="d">{s.detail}</p>}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** Two columns: heading + prose on one side, the three pillars on the other. */
function Introduction({ section }) {
  if (!section) return null;
  return (
    <Section section={section}>
      <div className="split split-rev">
        <div>
          <SectionHead section={section} />
          <Prose html={section.body_html} />
        </div>
        <div>
          {(section.items || []).map((item, i) => (
            <div className="prose reveal" key={item.id} data-reveal-delay={i * 70}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/** Prose beside a pull-quote card. */
function Mission({ section }) {
  if (!section) return null;
  return (
    <Section section={section}>
      <div className="split">
        <div>
          <SectionHead section={section} />
          <Prose html={section.body_html} />
        </div>
        {section.aside_html && (
          <aside>
            <Html className="card pullquote reveal" html={section.aside_html} />
          </aside>
        )}
      </div>
    </Section>
  );
}

function RecentPosts({ posts }) {
  if (!posts.length) return null;
  return (
    <section className="bg-white rule-top">
      <div className="shell section">
        <div className="between">
          <SectionHead eyebrow="Visitor blog" heading="Recent writing"
                       lead="Essays from visiting researchers and the PHCCO team on what computational oncology is actually like to do." />
          <p className="reveal">
            <Link className="btn btn-ghost" to="/blog">All posts<Icon name="arrowRight" /></Link>
          </p>
        </div>

        <div className="grid md-g-3">
          {posts.map((p, i) => (
            <Link className="card card-hover bcard reveal" to={`/blog/${p.slug}`}
                  key={p.id} data-reveal-delay={i * 80}>
              <span className="bcard-media">
                {p.cover_image && <img src={p.cover_image} alt="" loading="lazy" decoding="async" />}
                {Number(p.is_invited) === 1 && (
                  <span className="pill-invited bcard-pill">Invited</span>
                )}
              </span>
              <span className="bcard-body">
                <span className="bcard-meta">
                  {formatDate(p.published_at)}
                  {p.read_minutes && <> <i aria-hidden="true">·</i> {p.read_minutes}</>}
                </span>
                <h3>{p.title}</h3>
                <span className="bcard-x">{p.excerpt}</span>
                <span className="bcard-by">
                  <span className="avatar-fb" aria-hidden="true">{initials(p.author_name)}</span>
                  <span className="who">
                    <span className="nm">{p.author_name}</span>
                    <span className="af">{p.author_role}</span>
                  </span>
                </span>
                <span className="bcard-read">Read the post <Icon name="arrowRight" /></span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Podcast({ episodes }) {
  const [playing, setPlaying] = useState(null);
  if (!episodes.length) return null;

  return (
    <section className="podcast" data-podcast>
      <div className="glow" aria-hidden="true" />
      <div className="shell section">
        <div className="section-head reveal on-dark">
          <span className="eyebrow on-dark">Podcast</span>
          <h2 className="t-h2 balance">
            Conversations from the <span style={{ color: 'var(--amber-400)' }}>frontier</span>
          </h2>
          <div className="accent-rule" />
          <p className="lead t-lead pretty">
            Long-form interviews with the researchers shaping computational oncology.
          </p>
        </div>

        <div className="pod-grid">
          {episodes.map((ep, i) => (
            <article className="pod-card reveal" key={ep.id} data-reveal-delay={i * 80}>
              <div className="pod-media">
                {playing === ep.id && ep.youtube_id ? (
                  <iframe src={`https://www.youtube-nocookie.com/embed/${ep.youtube_id}?autoplay=1`}
                          title={ep.title} allowFullScreen loading="lazy"
                          allow="accelerometer; autoplay; encrypted-media; picture-in-picture" />
                ) : (
                  // Click-to-load: a thumbnail until asked, so the homepage does
                  // not pull three YouTube players on first paint.
                  <button className="pod-thumb" type="button" onClick={() => setPlaying(ep.id)}
                          aria-label={`Play: ${ep.title}`}>
                    {ep.thumb && <img src={ep.thumb} alt="" loading="lazy" decoding="async" />}
                    <span className="scrim" aria-hidden="true" />
                    <span className="play" aria-hidden="true"><i><PlayIcon /></i></span>
                    {ep.duration && <span className="dur">{ep.duration}</span>}
                  </button>
                )}
              </div>
              <div className="pod-body">
                {ep.guest && <p className="guest"><Icon name="mic" /><span>{ep.guest}</span></p>}
                <h3>{ep.title}</h3>
                {ep.description && <p className="blurb">{ep.description}</p>}
                <p className="meta">
                  {ep.affiliation}
                  {ep.affiliation && ep.date_text && <span aria-hidden="true"> · </span>}
                  {ep.date_text}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The closing call-to-action panel. Its buttons come from the section's own
 * captured markup, so the labels and targets stay editable rather than being
 * hardcoded to something the design never said.
 */
export function Cta({ section }) {
  if (!section) return null;
  return (
    <Section section={section}>
      <div className="card cta motif reveal">
        <div className="layer dotgrid" aria-hidden="true" />
        <div>
          {section.eyebrow && <span className="eyebrow">{section.eyebrow}</span>}
          {section.heading && <h2 className="t-h2 balance">{section.heading}</h2>}
          <Html className="t-lead pretty" html={section.body_html} />
          <Html html={section.aside_html} />
        </div>
      </div>
    </Section>
  );
}

export function formatDate(value) {
  if (!value) return '';
  // The API sends plain 'yyyy-mm-dd'. Building the Date from its parts keeps it
  // in the local calendar; `new Date('2026-02-18')` would parse as UTC midnight
  // and render as the 17th anywhere west of Greenwich.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function initials(name) {
  return (name || '').split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]?.toUpperCase()).join('');
}
