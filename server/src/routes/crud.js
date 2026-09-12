/**
 * Generic CRUD router factory.
 *
 * Every CMS module is the same five operations over a whitelisted column set,
 * so they share one implementation. The whitelist matters twice over: it keeps
 * table/column names out of user control (they are interpolated into SQL, which
 * placeholders cannot do for identifiers), and it stops a client from writing
 * columns the module is not meant to own.
 */
import { Router } from 'express';
import { q, one, insert, update, remove } from '../db.js';

export function crudRouter({ table, columns, orderBy = 'sort ASC, id ASC', searchable = [] }) {
  const router = Router();
  const allowed = new Set(columns);

  /** Keep only whitelisted keys, and coerce '' to null so empty inputs clear. */
  function clean(body) {
    const out = {};
    for (const [k, v] of Object.entries(body || {})) {
      if (!allowed.has(k)) continue;
      out[k] = v === '' ? null : v;
    }
    return out;
  }

  router.get('/', async (req, res, next) => {
    try {
      const where = [];
      const params = [];

      if (req.query.search && searchable.length) {
        where.push(`(${searchable.map((c) => `\`${c}\` LIKE ?`).join(' OR ')})`);
        searchable.forEach(() => params.push(`%${req.query.search}%`));
      }
      for (const [k, v] of Object.entries(req.query)) {
        if (k === 'search' || !allowed.has(k)) continue;
        where.push(`\`${k}\` = ?`);
        params.push(v);
      }

      const sql = `SELECT * FROM \`${table}\`
                   ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                   ORDER BY ${orderBy}`;
      res.json(await q(sql, params));
    } catch (e) { next(e); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (e) { next(e); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const data = clean(req.body);
      if (!Object.keys(data).length) {
        return res.status(400).json({ error: 'No valid fields supplied' });
      }
      const id = await insert(table, data);
      res.status(201).json(await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
    } catch (e) { next(e); }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const data = clean(req.body);
      await update(table, req.params.id, data);
      const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (e) { next(e); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const n = await remove(table, req.params.id);
      if (!n) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  /** Bulk reorder: [{id, sort}, ...] */
  router.post('/reorder', async (req, res, next) => {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      for (const it of items) {
        await q(`UPDATE \`${table}\` SET sort = ? WHERE id = ?`, [Number(it.sort) || 0, it.id]);
      }
      res.json({ ok: true, updated: items.length });
    } catch (e) { next(e); }
  });

  return router;
}

/**
 * The CMS modules. Order here is the order of the admin sidebar.
 *
 * `columns` doubles as the write whitelist and the form field list, so a new
 * column appears in the CMS as soon as it is added here and to the schema.
 * `group` buckets modules in the sidebar — nineteen flat entries is a wall, and
 * the grouping is what keeps the panel navigable.
 */
// Pages are not a CMS module: each one is a React route, so a page record
// created here could never render, and deleting one would blank a live page's
// banner. The `pages` table is still read at runtime for every banner — only
// the homepage's is editable, through its own screen (/api/admin/home-banner).
export const MODULES = [
  {
    key: 'page-sections', label: 'Page sections', icon: 'layers', table: 'page_sections',
    group: "Site structure",
    description: "The headed blocks of prose that make up each page.",
    columns: ['page_slug', 'section_key', 'eyebrow', 'heading', 'lead', 'body_html', 'aside_html', 'image', 'layout', 'visible', 'sort'],
    orderBy: 'page_slug ASC, sort ASC',
    searchable: ['heading', 'page_slug', 'section_key'],
    listFields: ['page_slug', 'heading'],
  },
  {
    key: 'section-items', label: 'Section items', icon: 'list', table: 'page_section_items',
    group: "Site structure",
    description: "The repeated cards, tiles and bullets inside a page section.",
    columns: ['section_id', 'title', 'subtitle', 'body', 'image', 'kind', 'link_url', 'link_label', 'tags', 'sort'],
    orderBy: 'section_id ASC, sort ASC',
    searchable: ['title'],
    listFields: ['title', 'section_id'],
  },
  {
    key: 'hero-slides', label: 'Hero slides', icon: 'image', table: 'hero_slides',
    group: "Homepage",
    description: "Images for the rotating banner. The headline lives on the Home page record.",
    columns: ['image_wide', 'image_mid', 'image_tall', 'alt', 'visible', 'sort'],
    searchable: ['alt'],
    listFields: ['alt'],
  },
  {
    key: 'stats', label: 'Stats', icon: 'chart', table: 'stats',
    group: "Homepage",
    description: "The figures strip under the homepage banner.",
    columns: ['value', 'label', 'detail', 'visible', 'sort'],
    searchable: ['label'],
    listFields: ['value', 'label'],
  },
  {
    key: 'research-themes', label: 'Research themes', icon: 'beaker', table: 'research_themes',
    group: "Research",
    description: "The three long-form research themes.",
    columns: ['title', 'summary', 'body', 'tags', 'image', 'visible', 'sort'],
    searchable: ['title', 'summary'],
    listFields: ['title'],
  },
  {
    key: 'research-methods', label: 'Research methods', icon: 'beaker', table: 'research_methods',
    group: "Research",
    description: "The cross-cutting method tiles on the Research page.",
    columns: ['title', 'body', 'visible', 'sort'],
    searchable: ['title'],
    listFields: ['title'],
  },
  {
    key: 'publications', label: 'Publications', icon: 'book', table: 'publications',
    group: "Research",
    description: "Papers, with the theme and year that drive the filters.",
    columns: ['title', 'journal', 'year', 'theme', 'authors', 'doi_url', 'visible', 'sort'],
    orderBy: 'year DESC, sort ASC',
    searchable: ['title', 'journal', 'theme'],
    listFields: ['title', 'journal', 'year', 'theme'],
  },
  {
    key: 'people-groups', label: 'Cohort groups', icon: 'users', table: 'people_groups',
    group: "People",
    description: "Founding team and each alumni or internship year.",
    columns: ['group_key', 'title', 'subtitle', 'visible', 'sort'],
    searchable: ['title', 'group_key'],
    listFields: ['title', 'group_key'],
  },
  {
    key: 'people', label: 'People', icon: 'user', table: 'people',
    group: "People",
    description: "Every profile on the Cohort page.",
    columns: ['group_id', 'name', 'slug', 'role', 'domain', 'now_text', 'bio', 'tags', 'avatar', 'linkedin_url', 'visible', 'sort'],
    orderBy: 'group_id ASC, sort ASC',
    searchable: ['name', 'role', 'domain'],
    listFields: ['name', 'role', 'domain'],
  },
  {
    key: 'posts', label: 'Blog posts', icon: 'pen', table: 'posts',
    group: "Stories",
    description: "Blog posts, their authors and world-map pins.",
    columns: ['slug', 'title', 'excerpt', 'body_html', 'cover_image', 'author_name', 'author_role', 'author_title', 'author_avatar', 'is_invited', 'author_city', 'author_country', 'author_map_x', 'author_map_y', 'read_minutes', 'is_featured', 'published_at', 'visible', 'sort'],
    orderBy: 'published_at DESC, sort ASC',
    searchable: ['title', 'author_name'],
    listFields: ['title', 'author_name', 'published_at'],
  },
  {
    key: 'albums', label: 'Albums', icon: 'album', table: 'albums',
    group: "Media",
    description: "Photo albums shown on the Media page.",
    columns: ['slug', 'title', 'description', 'cover_image', 'date_text', 'location', 'visible', 'sort'],
    searchable: ['title'],
    listFields: ['title', 'date_text', 'location'],
  },
  {
    key: 'photos', label: 'Photos', icon: 'image', table: 'photos',
    group: "Media",
    description: "Individual photographs inside an album.",
    columns: ['album_id', 'thumb', 'full', 'caption', 'width', 'height', 'sort'],
    orderBy: 'album_id ASC, sort ASC',
    searchable: ['caption'],
    listFields: ['caption', 'album_id'],
  },
  {
    key: 'videos', label: 'Videos & podcast', icon: 'video', table: 'videos',
    group: "Media",
    description: "Talks and podcast episodes, shared by the Videos page and the homepage.",
    columns: ['title', 'description', 'youtube_id', 'thumb', 'date_text', 'guest', 'affiliation', 'duration', 'kind', 'is_podcast', 'visible', 'sort'],
    searchable: ['title', 'guest'],
    listFields: ['title', 'guest', 'date_text'],
  },
  {
    key: 'events', label: 'Events', icon: 'calendar', table: 'events',
    group: "Stories",
    description: "Programmes and workshops listed on Get Involved.",
    columns: ['slug', 'title', 'summary', 'body_html', 'date_text', 'location', 'kind', 'image', 'cta_label', 'cta_url', 'visible', 'sort'],
    searchable: ['title'],
    listFields: ['title', 'date_text', 'location'],
  },
  {
    key: 'programme-editions', label: 'Programme editions', icon: 'calendar', table: 'programme_editions',
    group: "Stories",
    description: "One year of a recurring programme, shown behind the year tabs.",
    columns: ['programme', 'year', 'title', 'kicker', 'venue', 'summary', 'image', 'highlights', 'tags', 'stats', 'visible', 'sort'],
    searchable: ['title', 'year'],
    listFields: ['title', 'year'],
  },
  {
    key: 'outreach-locations', label: 'Outreach map', icon: 'map', table: 'outreach_locations',
    group: "Network",
    description: "Workshops and conferences pinned on the India map.",
    columns: ['city', 'venue', 'event', 'kind', 'lat', 'lon', 'visible', 'sort'],
    searchable: ['city', 'venue', 'event'],
    listFields: ['city', 'venue', 'kind'],
  },
  {
    key: 'collaborators', label: 'Collaborators', icon: 'handshake', table: 'collaborators',
    group: "Network",
    description: "Partner institutions, in India and abroad.",
    columns: ['name', 'city', 'region', 'lat', 'lon', 'note', 'logo', 'url', 'visible', 'sort'],
    searchable: ['name'],
    listFields: ['name', 'city', 'region'],
  },
  {
    key: 'nav-items', label: 'Navigation', icon: 'menu', table: 'nav_items',
    group: "Site structure",
    description: "The header and footer menus, including dropdown children.",
    columns: ['label', 'path', 'parent_id', 'sort', 'visible'],
    searchable: ['label', 'path'],
    listFields: ['label', 'path'],
  },
];
