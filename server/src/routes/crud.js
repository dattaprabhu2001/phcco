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
 * `columns` doubles as the write whitelist and the form field list.
 */
export const MODULES = [
  {
    key: 'pages', label: 'Pages', icon: 'file', table: 'pages',
    columns: ['slug', 'title', 'meta_description', 'hero_eyebrow', 'hero_title', 'hero_lead', 'hero_image', 'hero_cta_label', 'hero_cta_url', 'hero_cta2_label', 'hero_cta2_url', 'hero_extra_html', 'visible', 'sort'],
    searchable: ['title', 'slug'],
    listFields: ['title', 'slug'],
  },
  {
    key: 'page-sections', label: 'Page sections', icon: 'layers', table: 'page_sections',
    columns: ['page_slug', 'section_key', 'eyebrow', 'heading', 'lead', 'body_html', 'aside_html', 'image', 'layout', 'visible', 'sort'],
    orderBy: 'page_slug ASC, sort ASC',
    searchable: ['heading', 'page_slug', 'section_key'],
    listFields: ['page_slug', 'heading'],
  },
  {
    key: 'section-items', label: 'Section items', icon: 'list', table: 'page_section_items',
    columns: ['section_id', 'title', 'subtitle', 'body', 'image', 'icon', 'link_url', 'link_label', 'tags', 'sort'],
    orderBy: 'section_id ASC, sort ASC',
    searchable: ['title'],
    listFields: ['title', 'section_id'],
  },
  {
    key: 'hero-slides', label: 'Hero slides', icon: 'image', table: 'hero_slides',
    columns: ['image_wide', 'image_mid', 'image_tall', 'alt', 'visible', 'sort'],
    searchable: ['alt'],
    listFields: ['alt'],
  },
  {
    key: 'stats', label: 'Stats', icon: 'chart', table: 'stats',
    columns: ['value', 'label', 'detail', 'visible', 'sort'],
    searchable: ['label'],
    listFields: ['value', 'label'],
  },
  {
    key: 'research-themes', label: 'Research themes', icon: 'beaker', table: 'research_themes',
    columns: ['title', 'summary', 'body', 'tags', 'image', 'visible', 'sort'],
    searchable: ['title', 'summary'],
    listFields: ['title'],
  },
  {
    key: 'research-methods', label: 'Research methods', icon: 'beaker', table: 'research_methods',
    columns: ['title', 'body', 'visible', 'sort'],
    searchable: ['title'],
    listFields: ['title'],
  },
  {
    key: 'publications', label: 'Publications', icon: 'book', table: 'publications',
    columns: ['title', 'journal', 'year', 'theme', 'authors', 'doi_url', 'visible', 'sort'],
    orderBy: 'year DESC, sort ASC',
    searchable: ['title', 'journal', 'theme'],
    listFields: ['title', 'journal', 'year', 'theme'],
  },
  {
    key: 'people-groups', label: 'Cohort groups', icon: 'users', table: 'people_groups',
    columns: ['group_key', 'title', 'subtitle', 'visible', 'sort'],
    searchable: ['title', 'group_key'],
    listFields: ['title', 'group_key'],
  },
  {
    key: 'people', label: 'People', icon: 'users', table: 'people',
    columns: ['group_id', 'name', 'slug', 'role', 'domain', 'now_text', 'bio', 'tags', 'avatar', 'linkedin_url', 'visible', 'sort'],
    orderBy: 'group_id ASC, sort ASC',
    searchable: ['name', 'role', 'domain'],
    listFields: ['name', 'role', 'domain'],
  },
  {
    key: 'posts', label: 'Blog posts', icon: 'pen', table: 'posts',
    columns: ['slug', 'title', 'excerpt', 'body_html', 'cover_image', 'author_name', 'author_role', 'author_title', 'author_avatar', 'is_invited', 'author_city', 'author_map_x', 'author_map_y', 'read_minutes', 'is_featured', 'published_at', 'visible', 'sort'],
    orderBy: 'published_at DESC, sort ASC',
    searchable: ['title', 'author_name'],
    listFields: ['title', 'author_name', 'published_at'],
  },
  {
    key: 'albums', label: 'Albums', icon: 'image', table: 'albums',
    columns: ['slug', 'title', 'description', 'cover_image', 'date_text', 'location', 'visible', 'sort'],
    searchable: ['title'],
    listFields: ['title', 'date_text', 'location'],
  },
  {
    key: 'photos', label: 'Photos', icon: 'image', table: 'photos',
    columns: ['album_id', 'thumb', 'full', 'caption', 'sort'],
    orderBy: 'album_id ASC, sort ASC',
    searchable: ['caption'],
    listFields: ['caption', 'album_id'],
  },
  {
    key: 'videos', label: 'Videos & podcast', icon: 'video', table: 'videos',
    columns: ['title', 'description', 'youtube_id', 'thumb', 'date_text', 'guest', 'affiliation', 'duration', 'kind', 'is_podcast', 'visible', 'sort'],
    searchable: ['title', 'guest'],
    listFields: ['title', 'guest', 'date_text'],
  },
  {
    key: 'events', label: 'Events', icon: 'calendar', table: 'events',
    columns: ['slug', 'title', 'summary', 'body_html', 'date_text', 'location', 'image', 'cta_label', 'cta_url', 'visible', 'sort'],
    searchable: ['title'],
    listFields: ['title', 'date_text', 'location'],
  },
  {
    key: 'outreach-locations', label: 'Outreach map', icon: 'map', table: 'outreach_locations',
    columns: ['city', 'venue', 'event', 'kind', 'lat', 'lon', 'visible', 'sort'],
    searchable: ['city', 'venue', 'event'],
    listFields: ['city', 'venue', 'kind'],
  },
  {
    key: 'collaborators', label: 'Collaborators', icon: 'handshake', table: 'collaborators',
    columns: ['name', 'city', 'region', 'lat', 'lon', 'note', 'logo', 'url', 'visible', 'sort'],
    searchable: ['name'],
    listFields: ['name', 'city', 'region'],
  },
  {
    key: 'nav-items', label: 'Navigation', icon: 'menu', table: 'nav_items',
    columns: ['label', 'path', 'parent_id', 'sort', 'visible'],
    searchable: ['label', 'path'],
    listFields: ['label', 'path'],
  },
];
