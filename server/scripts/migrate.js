/**
 * Content migration: reads the original static site in ../../design and loads
 * every piece of it into MySQL.
 *
 * The static site is the source of truth for the *initial* import only — after
 * this runs, the CMS owns the content. Re-running wipes and reloads the content
 * tables (admin_users is left alone), so it is safe to iterate on.
 *
 * Structure below mirrors the schema: one function per group of tables, each
 * parsing the page(s) that hold that content.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';
import { pool, q, insert } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DESIGN = path.join(__dirname, '..', '..', 'design');

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const docCache = new Map();
function doc(file) {
  if (!docCache.has(file)) {
    const html = fs.readFileSync(path.join(DESIGN, file), 'utf8');
    docCache.set(file, parse(html, { blockTextElements: { script: false, style: false } }));
  }
  return docCache.get(file);
}

/** Visible text of an element, whitespace-collapsed. */
function txt(el) {
  if (!el) return null;
  const s = el.structuredText ?? el.text ?? '';
  const out = s.replace(/\s+/g, ' ').trim();
  return out || null;
}

/** "research.html" -> "/research", "index.html" -> "/". External URLs pass through. */
function localHref(href) {
  if (!href) return null;
  if (/^(https?:|mailto:|tel:|#|\/)/.test(href)) return href;

  // Keep any query string and fragment: "contact.html?subject=x#y" must become
  // "/contact?subject=x#y", not stay a dead .html path.
  const cut = href.search(/[?#]/);
  const file = cut === -1 ? href : href.slice(0, cut);
  const suffix = cut === -1 ? '' : href.slice(cut);
  if (!file.endsWith('.html')) return href;

  const slug = file.replace(/\.html$/, '');
  const routed =
    slug === 'index' ? '/'
      : slug.startsWith('blog-') ? `/blog/${slug.slice(5)}`
        : slug.startsWith('album-') ? `/media/${slug.slice(6)}`
          : slug.startsWith('event-') ? `/events/${slug.slice(6)}`
            : `/${slug}`;
  return routed + suffix;
}

/** Asset paths made site-absolute; page links rewritten to SPA routes. */
function rewrite(markup) {
  return markup
    .replace(/(src|srcset)="assets\//g, '$1="/assets/')
    .replace(/href="([^"]+)"/g, (m, href) => `href="${localHref(href) ?? href}"`)
    .trim();
}

/** Inner HTML — for blocks whose wrapper the React component supplies. */
function html(el) {
  return el ? rewrite(el.innerHTML) || null : null;
}

/**
 * Outer HTML — for blocks where the wrapper's own class carries the styling
 * (`.row-wrap`, `nav.jump`, `dl.stat-inline`), so keeping only the children
 * would drop the layout.
 */
function outerHtml(el) {
  return el ? rewrite(el.outerHTML) || null : null;
}

/**
 * Article HTML for a post or event, minus its lead figure.
 *
 * That figure holds the same image as the record's cover_image column, and the
 * detail pages render the cover themselves — leaving it in the body would show
 * the photo twice.
 */
function articleHtml(el) {
  if (!el) return null;
  const lead = el.querySelector('.post-figure');
  if (lead) lead.remove();
  return html(el);
}

/** Rewrite one asset path: "assets/media/x.webp" -> "/assets/media/x.webp". */
function asset(p) {
  if (!p) return null;
  if (/^(https?:)?\/\//.test(p)) return p;
  return '/' + p.replace(/^\.?\//, '');
}

function attr(el, name) {
  const v = el?.getAttribute(name);
  return v == null || v === '' ? null : v;
}

/**
 * Direct <section> children of <main>.
 *
 * node-html-parser scopes a selector to the element's descendants, so a
 * "main > section" query run against <main> itself matches nothing — the
 * combinator has no <main> left to anchor on. Walking childNodes is both
 * correct and cheaper.
 */
function topSections(d) {
  const main = d.querySelector('main');
  if (!main) return [];
  return main.childNodes.filter(
    (n) => n.nodeType === 1 && (n.tagName === 'SECTION' || n.classList?.contains('section'))
  );
}

/** "Some Title!" -> "some-title" */
function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 190);
}

/** "blog-choosing-the-right-question.html" -> "choosing-the-right-question" */
function slugFromHref(href, prefix) {
  if (!href) return null;
  let s = href.replace(/\.html$/, '');
  if (prefix && s.startsWith(prefix)) s = s.slice(prefix.length);
  return s || null;
}

/** Local-calendar yyyy-mm-dd, with no timezone conversion. */
function ymd(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Splits "24 November 2025 · 8 min read" into its two halves. */
function splitMeta(s) {
  if (!s) return [null, null];
  const parts = s.split('·').map((x) => x.trim());
  return [parts[0] || null, parts.slice(1).join(' · ') || null];
}

function metaContent(d, selector) {
  const el = d.querySelector(selector);
  return attr(el, 'content');
}

// ---------------------------------------------------------------------------
// 1. site settings + navigation
// ---------------------------------------------------------------------------

async function migrateSettings() {
  const d = doc('index.html');
  const foot = d.querySelector('footer');
  const addr = foot?.querySelectorAll('address span, .f-contact span') || [];

  const rows = [
    ['site_title', 'PHCCO', 'Site title', 'text', 'general', 1],
    ['site_tagline', 'Param Hansa Centre for Computational Oncology', 'Tagline', 'text', 'general', 2],
    ['meta_description', metaContent(d, 'meta[name="description"]'), 'Default meta description', 'textarea', 'general', 3],
    ['logo', asset('assets/media/brand/phcco-logo.webp'), 'Header logo', 'image', 'branding', 1],
    ['logo_mark', asset('assets/media/brand/phcco-mark.webp'), 'Favicon / mark', 'image', 'branding', 2],
    ['partner_logo', asset('assets/media/brand/paramhansa-color.webp'), 'Partner logo (Param Hansa)', 'image', 'branding', 3],
    ['partner_url', 'https://paramhansa.life/', 'Partner link', 'url', 'branding', 4],
    ['iisc_logo', asset('assets/media/brand/iisc-emblem.webp'), 'IISc emblem', 'image', 'branding', 5],
    ['topbar_text', 'An IISc initiative · Supported by Param Hansa Philanthropies', 'Top bar text', 'text', 'general', 4],
    ['topbar_text_short', 'IISc × Param Hansa', 'Top bar text (mobile)', 'text', 'general', 5],
    ['contact_email', 'phcco@iisc.ac.in', 'Contact email', 'email', 'contact', 1],
    ['contact_phone', '+91-80-2293 2751', 'Contact phone', 'text', 'contact', 2],
    ['contact_address', [...addr].map((s) => txt(s)).filter(Boolean).join('\n') ||
      'Department of Bioengineering, 3rd Floor\nTCS Smart X Hub, Interdisciplinary Research Building\nIndian Institute of Science\nBengaluru 560012, Karnataka, India',
      'Postal address', 'textarea', 'contact', 3],
    ['footer_blurb', "India's first dedicated centre for computational oncology, established at Indian Institute of Science, Bengaluru in 2023 — in partnership with Param Hansa Philanthropies.", 'Footer blurb', 'textarea', 'footer', 1],
    ['footer_copyright', '© 2026 PHCCO, Indian Institute of Science, Bengaluru. All rights reserved.', 'Copyright line', 'text', 'footer', 2],
    ['cta_label', 'Get Involved', 'Header button label', 'text', 'general', 6],
    ['cta_url', '/get-involved', 'Header button link', 'url', 'general', 7],
  ];

  for (const [k, v, label, type, section, sort] of rows) {
    await q(
      `INSERT INTO site_settings (setting_key, setting_value, label, input_type, section, sort)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [k, v, label, type, section, sort]
    );
  }
  return rows.length;
}

async function migrateNav() {
  const d = doc('index.html');
  const nav = d.querySelector('.nav-desktop');
  if (!nav) return 0;

  let n = 0;
  let sort = 0;
  for (const child of nav.childNodes) {
    if (child.nodeType !== 1) continue;

    if (child.classList?.contains('nav-parent')) {
      const top = child.querySelector('a');
      const parentId = await insert('nav_items', {
        label: txt(top),
        path: '/' + (slugFromHref(attr(top, 'href')) || ''),
        parent_id: null,
        sort: (sort += 10),
        visible: 1,
      });
      n++;
      let sub = 0;
      for (const a of child.querySelectorAll('.nav-sub a')) {
        await insert('nav_items', {
          label: txt(a),
          path: '/' + (slugFromHref(attr(a, 'href')) || ''),
          parent_id: parentId,
          sort: (sub += 10),
          visible: 1,
        });
        n++;
      }
    } else if (child.tagName === 'A') {
      const href = attr(child, 'href');
      const slug = slugFromHref(href);
      await insert('nav_items', {
        label: txt(child),
        path: slug === 'index' ? '/' : '/' + slug,
        parent_id: null,
        sort: (sort += 10),
        visible: 1,
      });
      n++;
    }
  }
  return n;
}

// ---------------------------------------------------------------------------
// 2. pages, sections and their repeated items
// ---------------------------------------------------------------------------

const PAGES = [
  ['home', 'index.html', 'Home'],
  ['about', 'about.html', 'About'],
  ['research', 'research.html', 'Research'],
  ['publications', 'publications.html', 'Publications'],
  ['outreach', 'outreach.html', 'Outreach'],
  ['blog', 'blog.html', 'Blog'],
  ['cohort', 'cohort.html', 'Cohort'],
  ['media', 'media.html', 'Media'],
  ['media-videos', 'media-videos.html', 'Videos'],
  ['contact', 'contact.html', 'Contact'],
  ['get-involved', 'get-involved.html', 'Get Involved'],
  ['training', 'training.html', 'Training'],
];

async function migratePages() {
  let sort = 0;
  for (const [slug, file, title] of PAGES) {
    const d = doc(file);
    // Inner pages open with .page-banner. The homepage has no banner: its copy
    // sits in .hero-overlay above a rotating carousel.
    const hero = d.querySelector('.page-banner') || d.querySelector('.hero-overlay');
    const copy = hero?.querySelector('.hero-copy') || hero;

    // Everything under the lead that is part of the design but not a heading:
    // the brand lockup on About, the jump-link chips on Research and Outreach,
    // the inline stat strip on Cohort, Blog and Media.
    const extra = hero?.querySelector('.row-wrap, nav.jump, dl.stat-inline');

    const ctas = copy?.querySelectorAll('.hero-actions .btn') || [];

    await insert('pages', {
      slug,
      title: txt(d.querySelector('title')) || title,
      meta_description: metaContent(d, 'meta[name="description"]'),
      hero_eyebrow: txt(copy?.querySelector('.eyebrow')),
      // Kept as HTML — the homepage headline accents one word with a span.
      hero_title: html(copy?.querySelector('h1')) || txt(d.querySelector('main h1')),
      hero_lead: txt(copy?.querySelector('.lead')),
      hero_image: asset(attr(hero?.querySelector('.page-banner-img'), 'src')),
      hero_cta_label: txt(ctas[0]),
      hero_cta_url: localHref(attr(ctas[0], 'href')),
      hero_cta2_label: txt(ctas[1]),
      hero_cta2_url: localHref(attr(ctas[1], 'href')),
      hero_extra_html: outerHtml(extra),
      visible: 1,
      sort: (sort += 10),
    });
  }
  return PAGES.length;
}

/**
 * Generic section import.
 *
 * Every <section> under <main> becomes a page_sections row carrying its
 * eyebrow / heading / lead, plus the raw HTML of its prose column so nothing is
 * lost. Sections whose contents are already migrated into a typed table
 * (publications, people, photos, ...) are skipped by key — listed in SKIP.
 */
/**
 * A section holding content that already has its own table is skipped here —
 * otherwise every publication would exist twice, once typed and once as loose
 * section markup. Detected by the markers that content renders with.
 */
// The map sections are deliberately absent: their pins come from a typed table,
// but their eyebrow/heading/lead is ordinary section copy an editor should own,
// and the pin rows are <li data-loc> rather than cards so nothing duplicates.
const TYPED_MARKERS = [
  '.carousel', '.stats', '.bcard', '.blog-feature', '.pub-row', '.pub-controls',
  '.album-card', '.vid-card', '.pod-card', '.theme-block', '.ph-tile',
];

/**
 * Sections whose *items* live in a typed table but whose heading copy is still
 * ordinary section content. Import the head, drop the items — otherwise the six
 * research methods (or the cohort year panels) would exist twice.
 */
const HEAD_ONLY_KEYS = new Set([
  'research:how-we-work', 'cohort:by-year', 'cohort:founding-team',
]);

async function migrateSections() {
  let total = 0;

  for (const [slug, file] of PAGES.map((p) => [p[0], p[1]])) {
    const d = doc(file);

    let sort = 0;
    let i = 0;
    for (const sec of topSections(d)) {
      i++;

      // The opening banner becomes the page's hero fields, not a section.
      if (sec.classList.contains('page-banner')) continue;
      if (TYPED_MARKERS.some((m) => sec.querySelector(m))) continue;

      const heading = sec.querySelector('h2');
      const eyebrow = sec.querySelector('.eyebrow');
      const key = slugify(txt(eyebrow) || txt(heading) || `section-${i}`);
      const headOnly = HEAD_ONLY_KEYS.has(`${slug}:${key}`);

      const lead = sec.querySelector('.lead');

      // Repeated sub-items first, so their subtrees can be excluded from the
      // prose sweep below and nothing is stored twice.
      const consumed = new Set();
      const items = [];
      const seen = new Set();

      // Blocks that have their own table. They are not imported as section
      // items, and their prose must not be swept up either — otherwise every
      // programme edition and every cohort profile is stored a second time as
      // loose paragraphs and rendered twice on the page.
      for (const el of sec.querySelectorAll(
        'article.card.edition, .card.person, .cohort-panel, .theme-block, .vid-card, .pod-card'
      )) consumed.add(el);

      // A head-only section keeps its eyebrow and heading; every card in it
      // belongs to a typed table, so none of their text is section prose.
      if (headOnly) for (const el of sec.querySelectorAll('.card')) consumed.add(el);

      // Bullets inside a format list are items in their own right.
      for (const li of headOnly ? [] : sec.querySelectorAll('.format-list li')) {
        const t = txt(li);
        if (!t || seen.has(t)) continue;
        seen.add(t);
        consumed.add(li);
        items.push({ title: t, kind: 'format' });
      }

      // Captioned figures in an inline gallery.
      for (const fig of headOnly ? [] : sec.querySelectorAll('figure.gallery-card')) {
        const img = fig.querySelector('img');
        const src = asset(attr(img, 'src'));
        if (!src) continue;
        consumed.add(fig);
        // The caption is two lines: what the photo shows, and where.
        items.push({
          title: txt(fig.querySelector('figcaption .t')) || txt(fig.querySelector('figcaption')) || attr(img, 'alt'),
          subtitle: txt(fig.querySelector('figcaption .v')),
          image: src,
          kind: 'gallery',
        });
      }

      for (const it of headOnly ? [] : sec.querySelectorAll('.card, .feature, .impact-card, .split h3')) {
        const isHeading = it.tagName === 'H3';

        // A card wrapping a form is UI, not content.
        if (!isHeading && it.querySelector('form, input, textarea')) continue;
        // Programme editions have their own table.
        if (it.classList?.contains('edition')) continue;
        // A card that only wraps a format list contributes no item of its own —
        // its bullets were captured above and its heading is part of the layout.
        if (it.querySelector?.('.format-list')) continue;
        // A bare heading inside a card is that card's title, and the card is
        // handled on its own pass; and a `.kicker` is a small label above a
        // block ("Format", "Editions by year"), never an item in its own right.
        if (isHeading && (it.closest('.card') || it.classList.contains('kicker'))) continue;
        // Already captured above.
        if (consumed.has(it)) continue;

        // Impact cards carry no heading — a big value, a label and a blurb.
        if (it.classList?.contains('impact-card')) {
          const value = txt(it.querySelector('.v'));
          if (!value || seen.has(value)) continue;
          seen.add(value);
          consumed.add(it);
          items.push({
            title: value,
            subtitle: txt(it.querySelector('.l')),
            body: txt(it.querySelector('.b')),
            image: null, link_url: null, link_label: null, tags: null,
          });
          continue;
        }

        // Most cards lead with an h3. Chip-style cards (the outreach topic
        // grid) have none — just a decorative counter and a short label — so
        // fall back to the card's own text, counter stripped. The length guard
        // keeps that fallback off prose cards and pull-quotes, whose whole text
        // would otherwise become one enormous "title".
        let title = txt(isHeading ? it : it.querySelector('h3, h4'));
        if (!title && !isHeading) {
          const counter = txt(it.querySelector('.n'));
          const whole = txt(it) || '';
          const label = counter && whole.startsWith(counter)
            ? whole.slice(counter.length).trim()
            : whole;

          // A chip card is a counter plus a short label and nothing else. The
          // all-spans test is what keeps richer cards out — a map frame or a
          // stat panel is also short and heading-less, and would otherwise have
          // its entire text swept up as one bogus "title".
          const kids = it.childNodes.filter((n) => n.nodeType === 1);
          const chipLike = kids.length > 0
            && kids.every((k) => k.tagName === 'SPAN')
            && label.length < 80;
          if (chipLike && label) title = label;
        }
        if (!title || seen.has(title)) continue;

        // A shape card leads with a small kicker ("Weeks 1–3") before its real
        // description, so take the first paragraph that is not that kicker —
        // otherwise every one of these cards imports with the kicker as its body.
        const kicker = it.querySelector?.('.kicker');
        const bodyEl = isHeading
          ? it.nextElementSibling
          : it.querySelectorAll('p').find((p) => p !== kicker && !p.classList.contains('venue'));
        const body = txt(bodyEl);
        // A card may legitimately be title-only; a card whose "body" is just
        // its own title again is a parse artefact and gets no body.
        if (body && body === title) continue;

        seen.add(title);
        consumed.add(it);
        if (bodyEl) consumed.add(bodyEl);

        // A pillar card is itself the anchor, so look at the element before
        // looking inside it — otherwise these cards import with no link.
        const link = it.tagName === 'A' ? it : it.querySelector?.('a');
        items.push({
          title,
          // The numbered/domain cards carry an "01" counter that the design
          // renders; a shape card carries a kicker instead. Both live in
          // subtitle, keeping the sequence intact across a reorder in the CMS.
          subtitle: isHeading ? null : (txt(it.querySelector('.n')) || txt(kicker)),
          body,
          kind: it.classList?.contains('shape-card') ? 'shape' : 'card',
          image: asset(attr(it.querySelector?.('img'), 'src')),
          link_url: localHref(attr(link, 'href')),
          // When the card is the anchor its text is the whole card, which is
          // not a label — the design shows no label on those.
          link_label: link && link !== it ? txt(link) : null,
          tags: [...(it.querySelectorAll?.('.tag') || [])]
            .map((t) => txt(t)).filter(Boolean).join(', ') || null,
        });
      }

      // Remaining prose: paragraphs that are neither the lead nor already
      // captured as an item. A card that yielded no item (a pull-quote, a plain
      // prose panel) still holds real text, so only cards that *did* produce an
      // item are excluded here — otherwise that copy would be dropped outright.
      // True when the paragraph sits inside anything already captured as an
      // item. Checking `.closest('.card')` alone was not enough: impact cards
      // are `.impact-card`, so their <p> elements slipped through and every one
      // of them ended up rendered twice — once as a card, once as prose.
      const insideConsumed = (el) => {
        for (let n = el; n; n = n.parentNode) if (consumed.has(n)) return true;
        return false;
      };

      // A card wrapping a form is UI, and so is everything printed beside it —
      // the "fill this in" blurb and the success panel. Those are behaviour the
      // React page owns, not section copy, and importing them renders the whole
      // lot a second time as loose paragraphs below the real thing.
      const inFormCard = (el) => {
        const card = el.closest('.card');
        return !!card && !!card.querySelector('form, input, textarea');
      };

      const prose = sec.querySelectorAll('p')
        .filter((p) => p !== lead
          && !p.classList.contains('lead')
          && !p.closest('.section-head')
          && !p.closest('form')
          && !inFormCard(p)
          // Address/email/phone labels come from site settings, not prose.
          && !p.closest('.contact-list')
          && !p.closest('aside')
          && !p.closest('.pullquote')
          && !insideConsumed(p)
          && txt(p))
        .map((p) => `<p>${rewrite(p.innerHTML)}</p>`)
        .join('\n');

      // Split layouts carry a pull-quote or stat panel in an <aside>. Failing
      // that, a section may close with a row of buttons. Both are real content
      // that would otherwise be dropped. The `.btn` test keeps this off the
      // filter chip rows, which the map component renders itself.
      const buttonRow = sec.querySelectorAll('.row-wrap, .btns').find((r) => r.querySelector('.btn'));
      const aside = html(sec.querySelector('aside, .pullquote')) || outerHtml(buttonRow);

      const image = sec.querySelector('img');
      const isEmpty = !txt(eyebrow) && !txt(heading) && !txt(lead)
        && !prose && !aside && !items.length;
      if (isEmpty) continue;

      const sectionId = await insert('page_sections', {
        page_slug: slug,
        section_key: key,
        eyebrow: txt(eyebrow),
        heading: txt(heading),
        lead: txt(lead),
        body_html: prose || null,
        aside_html: aside,
        image: asset(attr(image, 'src')),
        // The section's own classes are the design's layout vocabulary
        // ("motif rule-y", "bg-dark", "bg-white rule-top"); keeping them verbatim
        // lets each page render its real background and rules.
        layout: (sec.getAttribute('class') || 'section').trim(),
        visible: 1,
        sort: (sort += 10),
      });
      total++;

      let isort = 0;
      for (const item of items) {
        await insert('page_section_items', {
          section_id: sectionId,
          title: null, subtitle: null, body: null, image: null,
          link_url: null, link_label: null, tags: null, kind: 'card',
          sort: (isort += 10),
          ...item,
        });
      }
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// 3. homepage: hero slides + stats
// ---------------------------------------------------------------------------

async function migrateHero() {
  const d = doc('index.html');
  let sort = 0;
  let n = 0;

  for (const slide of d.querySelectorAll('.carousel-slide')) {
    const img = slide.querySelector('img');
    if (!img) continue;

    // <source media="(max-width: 639px)"> is the phone crop, the 1023px one is
    // the tablet crop, and the <img> itself is the desktop crop.
    const sources = slide.querySelectorAll('source');
    const pick = (px) => {
      const s = sources.find((el) => (attr(el, 'media') || '').includes(`${px}px`));
      return asset(attr(s, 'srcset'));
    };

    await insert('hero_slides', {
      image_wide: asset(attr(img, 'src')),
      image_mid: pick(1023),
      image_tall: pick(639),
      alt: attr(img, 'alt') || '',
      visible: 1,
      sort: (sort += 10),
    });
    n++;
  }
  return n;
}

async function migrateStats() {
  const d = doc('index.html');
  let sort = 0;
  let n = 0;
  for (const row of d.querySelectorAll('.stats > div')) {
    const value = txt(row.querySelector('.v'));
    if (!value) continue;
    await insert('stats', {
      value,
      label: txt(row.querySelector('.l')) || '',
      detail: txt(row.querySelector('.d')),
      visible: 1,
      sort: (sort += 10),
    });
    n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// 4. research themes + methods
// ---------------------------------------------------------------------------

async function migrateResearch() {
  const d = doc('research.html');
  let themes = 0;
  let methods = 0;

  // A theme is an <article class="theme-block">: a rail carrying the numbered
  // heading and one-line summary, next to a body card with the long prose and
  // the "Focus areas" tag list.
  let tsort = 0;
  for (const block of d.querySelectorAll('article.theme-block')) {
    const rail = block.querySelector('.theme-rail');
    const bodyCard = block.querySelector('.theme-body');
    const title = txt(rail?.querySelector('h2, h3'));
    if (!title) continue;

    await insert('research_themes', {
      title,
      summary: txt(rail?.querySelector('.short')),
      body: [...(bodyCard?.querySelectorAll('p') || [])]
        .map((p) => `<p>${rewrite(p.innerHTML)}</p>`)
        .join('\n') || null,
      tags: [...(bodyCard?.querySelectorAll('.tag') || [])]
        .map((t) => txt(t)).filter(Boolean).join(', ') || null,
      image: asset(attr(block.querySelector('img'), 'src')),
      visible: 1,
      sort: (tsort += 10),
    });
    themes++;
  }

  // Methods are the six .card-pad tiles under the "How we work" section.
  const methodSection = topSections(d).find((s) =>
    /method/i.test(txt(s.querySelector('h2')) || '')
  );
  let msort = 0;
  for (const card of methodSection?.querySelectorAll('.card-pad') || []) {
    const title = txt(card.querySelector('h3'));
    if (!title) continue;
    await insert('research_methods', {
      title,
      body: txt(card.querySelector('p')),
      visible: 1,
      sort: (msort += 10),
    });
    methods++;
  }

  return { themes, methods };
}

// ---------------------------------------------------------------------------
// 5. publications
// ---------------------------------------------------------------------------

async function migratePublications() {
  const d = doc('publications.html');
  let sort = 0;
  let n = 0;
  for (const li of d.querySelectorAll('.pub-row[data-filter-item]')) {
    const title = txt(li.querySelector('h3'));
    if (!title) continue;
    await insert('publications', {
      title,
      journal: txt(li.querySelector('cite')),
      year: Number(attr(li, 'data-year')) || null,
      theme: attr(li, 'data-theme'),
      authors: null,
      doi_url: attr(li.querySelector('.pub-doi'), 'href'),
      visible: 1,
      sort: (sort += 10),
    });
    n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// 6. cohort: groups + people
// ---------------------------------------------------------------------------

function personFrom(card) {
  const img = card.querySelector('img.pic');
  const name = txt(card.querySelector('h3'));
  if (!name) return null;

  const dl = {};
  for (const row of card.querySelectorAll('dl > div')) {
    const k = txt(row.querySelector('dt'));
    const v = txt(row.querySelector('dd'));
    if (k) dl[k.toLowerCase()] = v;
  }

  return {
    name,
    slug: slugify(name),
    role: txt(card.querySelector('.role')),
    domain: dl.domain || null,
    now_text: dl.now || null,
    bio: txt(card.querySelector('.bio')),
    tags: [...card.querySelectorAll('.exp .tag')].map((t) => txt(t)).filter(Boolean).join(', ') || null,
    avatar: asset(attr(img, 'src')),
    linkedin_url: attr(card.querySelector('.foot a'), 'href'),
    visible: 1,
  };
}

async function migrateCohort() {
  const d = doc('cohort.html');
  let groups = 0;
  let people = 0;
  let gsort = 0;

  // Founding team lives outside the tabbed panels.
  const foundingSection = topSections(d).find((s) =>
    /founding/i.test(txt(s.querySelector('.eyebrow')) || txt(s.querySelector('h2')) || '')
  );

  if (foundingSection) {
    const gid = await insert('people_groups', {
      group_key: 'founding-team',
      title: txt(foundingSection.querySelector('h2')) || 'Founding team',
      subtitle: txt(foundingSection.querySelector('.lead')),
      visible: 1,
      sort: (gsort += 10),
    });
    groups++;
    let sort = 0;
    for (const card of foundingSection.querySelectorAll('.card.person')) {
      const p = personFrom(card);
      if (!p) continue;
      await insert('people', { ...p, group_id: gid, sort: (sort += 10) });
      people++;
    }
  }

  for (const panel of d.querySelectorAll('.cohort-panel')) {
    const head = panel.querySelector('.cohort-panel-head');
    const title = txt(head?.querySelector('h3')) || attr(panel, 'id');
    const gid = await insert('people_groups', {
      group_key: (attr(panel, 'id') || slugify(title)).replace(/^cohort-/, ''),
      title,
      subtitle: txt(head?.querySelector('.n')),
      visible: 1,
      sort: (gsort += 10),
    });
    groups++;

    let sort = 0;
    for (const card of panel.querySelectorAll('.card.person')) {
      const p = personFrom(card);
      if (!p) continue;
      await insert('people', { ...p, group_id: gid, sort: (sort += 10) });
      people++;
    }
  }
  return { groups, people };
}

// ---------------------------------------------------------------------------
// 7. blog posts (+ podcast audio from the homepage)
// ---------------------------------------------------------------------------

/**
 * Author -> { city, x, y } for the blog page's world map.
 *
 * The city comes from the page's own author list; the pin coordinates come from
 * assets/world-map.js, which the original build baked as x/y in the basemap's
 * viewBox rather than lat/lon.
 */
function authorPlaces() {
  const d = doc('blog.html');
  const map = {};

  // The by-country list groups authors under a country card, so read the
  // country from each author's ancestor card rather than from the row itself.
  for (const li of d.querySelectorAll('[data-author]')) {
    const name = attr(li, 'data-author');
    if (!name) continue;
    map[name] = {
      city: attr(li, 'data-city'),
      country: txt(li.closest('.country-card')?.querySelector('.nm')),
      x: null,
      y: null,
    };
  }

  const js = fs.readFileSync(path.join(DESIGN, 'assets', 'world-map.js'), 'utf8');
  const pins = js.match(/pins:\s*(\[[^\]]*\])/);
  if (pins) {
    for (const pin of JSON.parse(pins[1])) {
      map[pin.name] = { city: null, country: null, ...(map[pin.name] || {}), x: pin.x, y: pin.y };
    }
  }
  return map;
}

async function migratePosts() {
  const d = doc('blog.html');
  const places = authorPlaces();
  let sort = 0;
  let n = 0;

  // The newest post is rendered as a wide "feature" card with its own class
  // and an <h2>; the rest are ordinary .bcard tiles. Both are posts.
  const cards = [
    ...d.querySelectorAll('a.blog-feature'),
    ...d.querySelectorAll('a.bcard'),
  ];

  // The feature card has room for an author's full title; the narrow cards show
  // just the institution. The homepage only ever renders narrow cards, so take
  // the short form from there and keep the long one separately.
  const shortAffiliation = {};
  for (const card of doc('index.html').querySelectorAll('a.bcard')) {
    const name = txt(card.querySelector('.nm'));
    if (name) shortAffiliation[name] = txt(card.querySelector('.af'));
  }

  for (const card of cards) {
    const href = attr(card, 'href');
    const slug = slugFromHref(href, 'blog-');
    const featured = card.classList.contains('blog-feature');
    const title = txt(card.querySelector(featured ? 'h2, h3' : 'h3'));
    if (!slug || !title) continue;

    // "Latest · 18 February 2026 · 7 min read" — the feature card prefixes a
    // "Latest" pill, so take the date from whichever part parses as one.
    const metaParts = (txt(card.querySelector('.bcard-meta')) || '')
      .split('·')
      .map((s) => s.trim())
      .filter(Boolean);
    const dateText = metaParts.find((p) => !Number.isNaN(Date.parse(p))) || null;
    const readMinutes = metaParts.find((p) => /min/i.test(p)) || null;
    const parsed = dateText ? new Date(dateText) : null;
    const author = txt(card.querySelector('.nm'));
    const place = places[author] || {};

    // The full prose lives on the post's own page.
    let body = null;
    let cover = asset(attr(card.querySelector('img'), 'src'));
    const postFile = href;
    if (postFile && fs.existsSync(path.join(DESIGN, postFile))) {
      const pd = doc(postFile);
      const article = pd.querySelector('article, .post-body, main .prose');
      body = articleHtml(article) || articleHtml(pd.querySelector('main'));
      cover = asset(attr(pd.querySelector('main img'), 'src')) || cover;
    }

    await insert('posts', {
      slug,
      title,
      excerpt: txt(card.querySelector('.bcard-x, .bf-x')),
      body_html: body,
      cover_image: cover,
      author_name: author,
      author_role: shortAffiliation[author] || txt(card.querySelector('.af')),
      author_title: txt(card.querySelector('.af')),
      // Most cards fall back to initials; an author with a portrait gets one.
      author_avatar: asset(attr(card.querySelector('img.avatar'), 'src')),
      is_invited: card.querySelector('.pill-invited') ? 1 : 0,
      author_city: place.city || null,
      author_country: place.country || null,
      author_map_x: place.x ?? null,
      author_map_y: place.y ?? null,
      read_minutes: readMinutes,
      is_featured: featured ? 1 : 0,
      // Format from the local calendar fields. toISOString() would convert to
      // UTC first, which in IST (+5:30) turns every midnight date into the day
      // before — "18 February" imported as the 17th.
      published_at: parsed && !Number.isNaN(parsed.getTime()) ? ymd(parsed) : null,
      visible: 1,
      sort: (sort += 10),
    });
    n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// 8. media: albums, photos, videos
// ---------------------------------------------------------------------------

async function migrateAlbums() {
  const d = doc('media.html');
  let albums = 0;
  let photos = 0;
  let sort = 0;

  for (const card of d.querySelectorAll('a.album-card')) {
    const href = attr(card, 'href');
    const slug = slugFromHref(href, 'album-');
    const title = txt(card.querySelector('h3'));
    if (!slug || !title) continue;

    const [dateText, location] = splitMeta(txt(card.querySelector('.album-meta')));

    const albumId = await insert('albums', {
      slug,
      title,
      description: txt(card.querySelector('.album-blurb')),
      cover_image: asset(attr(card.querySelector('img'), 'src')),
      date_text: dateText,
      location,
      visible: 1,
      sort: (sort += 10),
    });
    albums++;

    if (href && fs.existsSync(path.join(DESIGN, href))) {
      const ad = doc(href);
      let psort = 0;
      for (const fig of ad.querySelectorAll('figure.ph-tile')) {
        const btn = fig.querySelector('.ph-open');
        const img = fig.querySelector('img');
        const thumb = asset(attr(img, 'src'));
        if (!thumb) continue;
        await insert('photos', {
          album_id: albumId,
          thumb,
          full: asset(attr(btn, 'data-full')) || thumb,
          caption: attr(btn, 'data-caption') || txt(fig.querySelector('figcaption')),
          width: Number(attr(img, 'width')) || null,
          height: Number(attr(img, 'height')) || null,
          sort: (psort += 10),
        });
        photos++;
      }
    }
  }
  return { albums, photos };
}

/**
 * Videos come from two places that share a shape: the Videos page (.vid-card)
 * and the homepage podcast strip (.pod-card). They overlap by YouTube id, so
 * dedupe on that and let the homepage pass only raise is_podcast.
 */
async function migrateVideos() {
  const sources = [
    { file: 'media-videos.html', sel: '.vid-card', podcast: 0 },
    { file: 'index.html', sel: '.pod-card', podcast: 1 },
  ];

  const byYt = new Map();
  let sort = 0;

  for (const { file, sel, podcast } of sources) {
    for (const card of doc(file).querySelectorAll(sel)) {
      const btn = card.querySelector('.vid-thumb, .pod-thumb');
      const title = txt(card.querySelector('h3')) || attr(btn, 'data-title');
      if (!title) continue;

      const yt = attr(btn, 'data-yt');
      const key = yt || slugify(title);

      if (byYt.has(key)) {
        if (podcast) {
          await q('UPDATE videos SET is_podcast = 1 WHERE id = ?', [byYt.get(key)]);
        }
        continue;
      }

      // Videos page: "May 2026 · Moffitt Cancer Center".
      // Podcast strip: affiliation and date are in .meta, guest in .guest.
      const [dateText, affil] = splitMeta(
        txt(card.querySelector('.bcard-meta')) || txt(card.querySelector('.meta'))
      );

      const id = await insert('videos', {
        title,
        description: txt(card.querySelector('.vid-blurb, .blurb')),
        youtube_id: yt,
        thumb: attr(card.querySelector('img'), 'src'),
        date_text: dateText,
        guest: txt(card.querySelector('.vid-by, .guest')),
        affiliation: affil,
        duration: txt(card.querySelector('.dur')),
        kind: txt(card.querySelector('.type-pill')) || (podcast ? 'Podcast' : null),
        is_podcast: podcast,
        visible: 1,
        sort: (sort += 10),
      });
      byYt.set(key, id);
    }
  }
  return byYt.size;
}

// ---------------------------------------------------------------------------
// 9. events
// ---------------------------------------------------------------------------

async function migrateEvents() {
  const d = doc('get-involved.html');
  let sort = 0;
  let n = 0;

  for (const card of d.querySelectorAll('a.bcard')) {
    const href = attr(card, 'href');
    const slug = slugFromHref(href, 'event-');
    const title = txt(card.querySelector('h3'));
    if (!slug || !title) continue;

    const [dateText, location] = splitMeta(txt(card.querySelector('.bcard-meta')));

    let body = null;
    if (href && fs.existsSync(path.join(DESIGN, href))) {
      const ed = doc(href);
      body = articleHtml(ed.querySelector('article, .post-body'))
        || articleHtml(ed.querySelector('main'));
    }

    await insert('events', {
      slug,
      title,
      summary: txt(card.querySelector('.bcard-x')),
      body_html: body,
      date_text: dateText,
      location,
      kind: txt(card.querySelector('.type-pill')),
      image: asset(attr(card.querySelector('img'), 'src')),
      cta_label: txt(card.querySelector('.bcard-read')) || 'Know more',
      cta_url: null,
      visible: 1,
      sort: (sort += 10),
    });
    n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// 10. outreach map + collaborators
// ---------------------------------------------------------------------------

/** The year-tabbed Summer Internship edition cards on the Outreach page. */
async function migrateEditions() {
  const d = doc('outreach.html');
  let sort = 0;
  let n = 0;

  for (const card of d.querySelectorAll('article.card.edition')) {
    const title = txt(card.querySelector('h3, h4'));
    if (!title) continue;

    // id="edition-2026" is the authoritative year; the heading may not carry it.
    const year = (attr(card, 'id') || '').replace(/^edition-/, '')
      || (title.match(/\b(20\d{2})\b/) || [])[1]
      || String(sort);

    const stats = card.querySelectorAll('dl > div')
      .map((row) => `${txt(row.querySelector('dd'))}|${txt(row.querySelector('dt'))}`)
      .filter((s) => !s.startsWith('null'));

    await insert('programme_editions', {
      programme: 'summer-internship',
      year,
      title,
      kicker: txt(card.querySelector('.kicker')),
      venue: txt(card.querySelector('.venue')),
      summary: txt(card.querySelector('.summary')),
      image: asset(attr(card.querySelector('img'), 'src')),
      highlights: card.querySelectorAll('.hl li').map((li) => txt(li)).filter(Boolean).join('\n') || null,
      tags: card.querySelectorAll('.tags .tag').map((t) => txt(t)).filter(Boolean).join(', ') || null,
      stats: stats.join('\n') || null,
      visible: 1,
      sort: (sort += 10),
    });
    n++;
  }
  return n;
}

async function migrateOutreach() {
  const d = doc('outreach.html');
  let sort = 0;
  let n = 0;
  for (const li of d.querySelectorAll('[data-loc]')) {
    const city = attr(li, 'data-city');
    const lat = attr(li, 'data-lat');
    const lon = attr(li, 'data-lon');
    if (!city || lat == null || lon == null) continue;
    const kind = attr(li, 'data-kind');
    await insert('outreach_locations', {
      city,
      venue: attr(li, 'data-venue'),
      event: attr(li, 'data-event'),
      kind: ['wocon', 'conference'].includes(kind) ? kind : 'other',
      lat: Number(lat),
      lon: Number(lon),
      visible: 1,
      sort: (sort += 10),
    });
    n++;
  }
  return n;
}

/**
 * The About page lists collaborators in two blocks: Indian institutions as
 * <li data-loc> rows (which also place the map pins) and international ones as
 * plain .collab-item tiles.
 */
async function migrateCollaborators() {
  const d = doc('about.html');
  let sort = 0;
  const seen = new Set();

  for (const li of d.querySelectorAll('[data-loc]')) {
    const name = attr(li, 'data-venue') || attr(li, 'data-city');
    if (!name || seen.has(name)) continue;
    seen.add(name);
    await insert('collaborators', {
      name,
      city: attr(li, 'data-city'),
      region: 'india',
      lat: Number(attr(li, 'data-lat')) || null,
      lon: Number(attr(li, 'data-lon')) || null,
      note: null,
      logo: null,
      url: attr(li.querySelector('a'), 'href'),
      visible: 1,
      sort: (sort += 10),
    });
  }

  for (const li of d.querySelectorAll('.collab-item')) {
    const name = txt(li.querySelector('.n'));
    if (!name || seen.has(name)) continue;
    seen.add(name);
    await insert('collaborators', {
      name,
      city: txt(li.querySelector('.c')),
      region: 'international',
      lat: null,
      lon: null,
      note: null,
      logo: asset(attr(li.querySelector('img'), 'src')),
      url: attr(li.querySelector('a'), 'href'),
      visible: 1,
      sort: (sort += 10),
    });
  }

  return seen.size;
}

// ---------------------------------------------------------------------------
// runner
// ---------------------------------------------------------------------------

const CONTENT_TABLES = [
  'page_section_items', 'page_sections', 'pages', 'nav_items', 'site_settings',
  'hero_slides', 'stats', 'research_themes', 'research_methods', 'publications',
  'people', 'people_groups', 'posts', 'photos', 'albums', 'videos', 'events', 'programme_editions',
  'outreach_locations', 'collaborators',
];

async function main() {
  console.log('clearing content tables (admin_users untouched)...');
  await q('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of CONTENT_TABLES) await q(`TRUNCATE TABLE \`${t}\``);
  await q('SET FOREIGN_KEY_CHECKS = 1');

  const out = {};
  out.settings = await migrateSettings();
  out.nav_items = await migrateNav();
  out.pages = await migratePages();
  out.page_sections = await migrateSections();
  out.hero_slides = await migrateHero();
  out.stats = await migrateStats();
  const research = await migrateResearch();
  out.research_themes = research.themes;
  out.research_methods = research.methods;
  out.publications = await migratePublications();
  const cohort = await migrateCohort();
  out.people_groups = cohort.groups;
  out.people = cohort.people;
  out.posts = await migratePosts();
  const media = await migrateAlbums();
  out.albums = media.albums;
  out.photos = media.photos;
  out.videos = await migrateVideos();
  out.events = await migrateEvents();
  out.programme_editions = await migrateEditions();
  out.outreach_locations = await migrateOutreach();
  out.collaborators = await migrateCollaborators();

  console.log('\nmigrated:');
  for (const [k, v] of Object.entries(out)) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error('migration failed:', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
