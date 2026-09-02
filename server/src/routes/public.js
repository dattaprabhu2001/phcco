/**
 * Read-only endpoints for the public site.
 *
 * Each route returns everything one page needs in a single response, so a page
 * renders from one fetch rather than a waterfall of them. Only `visible` rows
 * are ever exposed here.
 */
import { Router } from 'express';
import { q, one, insert } from '../db.js';

const router = Router();

/** Settings as a flat { key: value } map, plus the nav tree. */
async function shell() {
  const rows = await q('SELECT setting_key, setting_value FROM site_settings');
  const settings = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));

  const nav = await q(
    'SELECT id, label, path, parent_id FROM nav_items WHERE visible = 1 ORDER BY sort ASC, id ASC'
  );
  const tree = nav
    .filter((n) => !n.parent_id)
    .map((n) => ({ ...n, children: nav.filter((c) => c.parent_id === n.id) }));

  return { settings, nav: tree };
}

router.get('/shell', async (req, res, next) => {
  try { res.json(await shell()); } catch (e) { next(e); }
});

/** Sections + their items for one page, nested. */
async function sectionsFor(slug) {
  const sections = await q(
    'SELECT * FROM page_sections WHERE page_slug = ? AND visible = 1 ORDER BY sort ASC, id ASC',
    [slug]
  );
  if (!sections.length) return [];

  const ids = sections.map((s) => s.id);
  const items = await q(
    `SELECT * FROM page_section_items
     WHERE section_id IN (${ids.map(() => '?').join(',')})
     ORDER BY sort ASC, id ASC`,
    ids
  );
  return sections.map((s) => ({ ...s, items: items.filter((i) => i.section_id === s.id) }));
}

router.get('/page/:slug', async (req, res, next) => {
  try {
    const page = await one('SELECT * FROM pages WHERE slug = ? AND visible = 1', [req.params.slug]);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json({ ...page, sections: await sectionsFor(req.params.slug) });
  } catch (e) { next(e); }
});

router.get('/home', async (req, res, next) => {
  try {
    const [slides, stats, posts, podcast, sections] = await Promise.all([
      q('SELECT * FROM hero_slides WHERE visible = 1 ORDER BY sort ASC'),
      q('SELECT * FROM stats WHERE visible = 1 ORDER BY sort ASC'),
      q('SELECT * FROM posts WHERE visible = 1 ORDER BY published_at DESC, sort ASC LIMIT 3'),
      q('SELECT * FROM videos WHERE visible = 1 AND is_podcast = 1 ORDER BY sort ASC'),
      sectionsFor('home'),
    ]);
    const page = await one('SELECT * FROM pages WHERE slug = "home"');
    res.json({ page, slides, stats, posts, podcast, sections });
  } catch (e) { next(e); }
});

router.get('/research', async (req, res, next) => {
  try {
    const [themes, methods, sections] = await Promise.all([
      q('SELECT * FROM research_themes WHERE visible = 1 ORDER BY sort ASC'),
      q('SELECT * FROM research_methods WHERE visible = 1 ORDER BY sort ASC'),
      sectionsFor('research'),
    ]);
    const page = await one('SELECT * FROM pages WHERE slug = "research"');
    res.json({ page, themes, methods, sections });
  } catch (e) { next(e); }
});

router.get('/publications', async (req, res, next) => {
  try {
    const rows = await q(
      'SELECT * FROM publications WHERE visible = 1 ORDER BY year DESC, sort ASC'
    );
    const page = await one('SELECT * FROM pages WHERE slug = "publications"');
    res.json({
      page,
      publications: rows,
      themes: [...new Set(rows.map((r) => r.theme).filter(Boolean))].sort(),
      years: [...new Set(rows.map((r) => r.year).filter(Boolean))].sort((a, b) => b - a),
    });
  } catch (e) { next(e); }
});

router.get('/cohort', async (req, res, next) => {
  try {
    const groups = await q('SELECT * FROM people_groups WHERE visible = 1 ORDER BY sort ASC');
    const people = await q('SELECT * FROM people WHERE visible = 1 ORDER BY sort ASC, id ASC');
    const page = await one('SELECT * FROM pages WHERE slug = "cohort"');
    res.json({
      page,
      sections: await sectionsFor('cohort'),
      groups: groups.map((g) => ({ ...g, people: people.filter((p) => p.group_id === g.id) })),
    });
  } catch (e) { next(e); }
});

router.get('/posts', async (req, res, next) => {
  try {
    const posts = await q(
      `SELECT id, slug, title, excerpt, cover_image, author_name, author_role, author_title, is_invited,
              author_city, author_map_x, author_map_y, read_minutes, is_featured, published_at
       FROM posts WHERE visible = 1 ORDER BY published_at DESC, sort ASC`
    );
    const page = await one('SELECT * FROM pages WHERE slug = "blog"');
    res.json({ page, posts, sections: await sectionsFor('blog') });
  } catch (e) { next(e); }
});

router.get('/posts/:slug', async (req, res, next) => {
  try {
    const post = await one('SELECT * FROM posts WHERE slug = ? AND visible = 1', [req.params.slug]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const more = await q(
      'SELECT slug, title, cover_image, excerpt FROM posts WHERE visible = 1 AND id <> ? ORDER BY published_at DESC LIMIT 3',
      [post.id]
    );
    res.json({ post, more });
  } catch (e) { next(e); }
});

router.get('/albums', async (req, res, next) => {
  try {
    const albums = await q('SELECT * FROM albums WHERE visible = 1 ORDER BY sort ASC');
    const counts = await q('SELECT album_id, COUNT(*) n FROM photos GROUP BY album_id');
    const page = await one('SELECT * FROM pages WHERE slug = "media"');
    res.json({
      page,
      sections: await sectionsFor('media'),
      albums: albums.map((a) => ({
        ...a,
        photo_count: counts.find((c) => c.album_id === a.id)?.n || 0,
      })),
    });
  } catch (e) { next(e); }
});

router.get('/albums/:slug', async (req, res, next) => {
  try {
    const album = await one('SELECT * FROM albums WHERE slug = ? AND visible = 1', [req.params.slug]);
    if (!album) return res.status(404).json({ error: 'Album not found' });
    const photos = await q('SELECT * FROM photos WHERE album_id = ? ORDER BY sort ASC', [album.id]);
    res.json({ album, photos });
  } catch (e) { next(e); }
});

router.get('/videos', async (req, res, next) => {
  try {
    const page = await one('SELECT * FROM pages WHERE slug = "media-videos"');
    res.json({
      page,
      sections: await sectionsFor('media-videos'),
      videos: await q('SELECT * FROM videos WHERE visible = 1 ORDER BY sort ASC'),
    });
  } catch (e) { next(e); }
});

router.get('/events', async (req, res, next) => {
  try {
    const page = await one('SELECT * FROM pages WHERE slug = "get-involved"');
    res.json({
      page,
      sections: await sectionsFor('get-involved'),
      events: await q('SELECT * FROM events WHERE visible = 1 ORDER BY sort ASC'),
    });
  } catch (e) { next(e); }
});

router.get('/events/:slug', async (req, res, next) => {
  try {
    const event = await one('SELECT * FROM events WHERE slug = ? AND visible = 1', [req.params.slug]);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ event });
  } catch (e) { next(e); }
});

router.get('/outreach', async (req, res, next) => {
  try {
    const page = await one('SELECT * FROM pages WHERE slug = "outreach"');
    res.json({
      page,
      sections: await sectionsFor('outreach'),
      locations: await q('SELECT * FROM outreach_locations WHERE visible = 1 ORDER BY sort ASC'),
    });
  } catch (e) { next(e); }
});

router.get('/about', async (req, res, next) => {
  try {
    const page = await one('SELECT * FROM pages WHERE slug = "about"');
    res.json({
      page,
      sections: await sectionsFor('about'),
      collaborators: await q('SELECT * FROM collaborators WHERE visible = 1 ORDER BY sort ASC'),
      locations: await q('SELECT * FROM outreach_locations WHERE visible = 1 ORDER BY sort ASC'),
    });
  } catch (e) { next(e); }
});

/** Contact form target. Public write — the one place the site accepts input. */
router.post('/contact', async (req, res, next) => {
  try {
    const { name, email, topic, message } = req.body || {};
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Name, email and message are all required.' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'That email address does not look right.' });
    }
    await insert('contact_messages', {
      name: name.trim().slice(0, 200),
      email: email.trim().slice(0, 255),
      topic: topic?.trim().slice(0, 160) || null,
      message: message.trim().slice(0, 5000),
    });
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
