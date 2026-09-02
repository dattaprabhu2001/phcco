import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

/**
 * Markup here mirrors the original design's HTML class-for-class. styles.css is
 * the untouched design stylesheet, so a wrapper renamed or dropped here is a
 * visual regression — the structure *is* the design.
 */

/**
 * Renders CMS HTML. Authored only by signed-in admins.
 *
 * `tagName` matters because the design's CSS selects on element type in places
 * (`.split > aside`, for one), so a div would not pick up the same rules.
 */
function Html({ html, tagName: Tag = 'div', ...rest }) {
  if (!html) return null;
  return <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** The banner that opens every inner page. */
export function PageBanner({ page, crumb }) {
  if (!page) return null;
  return (
    <section className="page-banner">
      {page.hero_image && (
        <img className="page-banner-img" src={page.hero_image} alt=""
             loading="eager" fetchpriority="high" decoding="async" />
      )}
      <div className="page-banner-scrim" aria-hidden="true" />
      <div className="layer dotgrid page-banner-grid" aria-hidden="true" />
      <div className="shell">
        <nav className="crumbs" aria-label="Breadcrumb">
          <ol>
            <li><Link to="/">Home</Link></li>
            <li aria-current="page">{crumb || page.title}</li>
          </ol>
        </nav>
        {page.hero_eyebrow && <span className="eyebrow on-banner">{page.hero_eyebrow}</span>}
        <h1 className="t-hero balance" dangerouslySetInnerHTML={{ __html: page.hero_title || page.title }} />
        {page.hero_lead && <p className="lead t-lead pretty">{page.hero_lead}</p>}
        {/* Brand lockup on About, jump chips on Research and Outreach. */}
        <Html html={page.hero_extra_html} />
      </div>
    </section>
  );
}

/** Eyebrow + heading + rule + lead. `center` and `onDark` are design variants. */
export function SectionHead({ section, eyebrow, heading, lead, center, onDark, children }) {
  const eb = eyebrow ?? section?.eyebrow;
  const hd = heading ?? section?.heading;
  const ld = lead ?? section?.lead;
  if (!eb && !hd && !ld) return null;

  return (
    <div className={`section-head reveal${center ? ' center' : ''}${onDark ? ' on-dark' : ''}`}>
      {eb && <span className={`eyebrow${onDark ? ' on-dark' : ''}`}>{eb}</span>}
      {hd && <h2 className="t-h2 balance">{hd}</h2>}
      <div className={`accent-rule${center ? ' center' : ''}`} />
      {ld && <p className="lead t-lead pretty">{ld}</p>}
      {children}
    </div>
  );
}

/**
 * Wraps a CMS section in its own <section>, reusing the class list captured
 * from the design (`motif rule-y`, `bg-dark`, `bg-white rule-top`, …). Those
 * classes carry the background, rules and vertical rhythm.
 */
export function Section({ section, className, inner, children }) {
  if (!section && !className) return null;
  const cls = className || section?.layout || 'section';
  // Sections that set their own background put the padding on the inner shell.
  const innerCls = inner || (/^section/.test(cls) ? 'shell' : 'shell section');
  return (
    <section className={cls}>
      <div className={innerCls}>{children}</div>
    </section>
  );
}

export function Prose({ html, className = 'prose reveal' }) {
  return <Html html={html} className={className} />;
}

export { Html };

export function Loading() {
  return (
    <section className="section">
      <div className="shell"><p className="kicker">Loading…</p></div>
    </section>
  );
}

export function ErrorState({ error }) {
  return (
    <section className="section">
      <div className="shell">
        <h1 className="t-h2">Something went wrong</h1>
        <p className="lead t-lead">{error?.message || 'Please try again.'}</p>
        <Link className="btn btn-accent" to="/">Back to home<Icon name="arrowRight" /></Link>
      </div>
    </section>
  );
}

/**
 * Fallback renderer for a CMS section a page has no bespoke layout for — a
 * section an editor adds later. Known sections are rendered by their page.
 */
export function GenericSection({ section }) {
  const items = section.items || [];
  return (
    <Section section={section}>
      <SectionHead section={section} />
      <Prose html={section.body_html} />
      {items.length > 0 && (
        <div className="grid sm-g-2 lg-g-3" style={{ marginTop: '1.75rem' }}>
          {items.map((item, i) => (
            <div className="card card-pad reveal" key={item.id} data-reveal-delay={i * 70}>
              {item.title && <h3>{item.title}</h3>}
              {item.body && <p>{item.body}</p>}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
