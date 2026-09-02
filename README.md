# PHCCO — React + Node + MySQL

The PHCCO site rebuilt from the original static design as a React front end on a
Node/Express API, with a MySQL-backed CMS behind an admin login.

```
phcco/
├── design/     the original static site — reference only, nothing reads it at runtime
├── server/     Express API, MySQL schema, and the one-time content migration
└── client/     React app: public site at /, CMS at /admin
```

## Requirements

- XAMPP with MySQL/MariaDB running (port 3306)
- Node 18+ (built and tested on Node 24)

## First run

```bash
npm run install:all
```

```bash
npm run setup
```

`setup` creates the `phcco` database, applies the schema, seeds the admin
account, and imports every piece of content from `design/` into MySQL.

Then start the two dev servers in separate terminals:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

- Public site — http://localhost:5173
- CMS — http://localhost:5173/admin
- API — http://localhost:4000/api

**Default login:** `admin@phcco.local` / `admin123` — change it under
*Account* in the CMS, and change `ADMIN_PASSWORD` in `server/.env` before this
goes anywhere public.

## Production

```bash
npm run build
```

```bash
npm start
```

Express then serves the built SPA and the API together on
http://localhost:4000, including deep links like `/cohort` and `/admin`.

## Configuration

`server/.env` (copy from `.env.example`):

| Key | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | API / production server port |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | XAMPP MySQL |
| `DB_USER` / `DB_PASSWORD` | `root` / *(empty)* | XAMPP defaults |
| `DB_NAME` | `phcco` | |
| `JWT_SECRET` | — | **Replace before deploying.** Signs admin sessions. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@phcco.local` / `admin123` | Seeded on `db:setup` |

## The CMS

Every part of the site is editable. Modules are defined once in
`server/src/routes/crud.js` — that list drives the API routes, the write
whitelist, and the admin sidebar together, so adding a module is a single edit.

| Module | Covers |
| --- | --- |
| Pages | Titles, meta, and the page banner: eyebrow, headline, lead, image, two CTAs |
| Page sections / Section items | The prose blocks on About, Research, Outreach, Home |
| Hero slides, Stats | Homepage carousel images and the figures strip |
| Research themes / methods | The Research page |
| Publications | Title, journal, year, theme, DOI — drives the filters |
| Cohort groups / People | The 53 profiles and their year tabs |
| Blog posts | Body HTML, author, and the world-map pin position |
| Albums / Photos | The four galleries and 88 photos |
| Videos & podcast | Shared by the Videos page and the homepage podcast strip |
| Events | Get Involved cards and their detail pages |
| Outreach map | City, venue, kind, and lat/lon for the India map |
| Collaborators, Navigation, Site settings | Partners, menu, branding and contact details |

Plus **Contact inbox** (form submissions) and **Media library** (uploads, stored
in `server/uploads/`).

### Adding content

Field types are inferred from column names — `*_url`, `*_html`, `is_*`, `*_id`,
`image`/`avatar`/`thumb` — so a new column appears in the CMS form with the right
input as soon as it is added to both the schema and the module's `columns` list.

## Re-running the migration

`npm run db:reset` drops the content tables and re-imports from `design/`.
**It discards everything entered through the CMS.** The admin account survives.
Once real editing starts, back up the database instead of re-running this.

### How the layout is preserved

Each public page reproduces the original design's markup class-for-class and
binds CMS content into it; `client/src/styles.css` is the untouched design
stylesheet. Two consequences worth knowing before editing:

- **Renaming or dropping a wrapper element is a visual regression.** The
  structure *is* the design — `.split`, `.domain-grid`, `.impact-card` and the
  rest all carry styling.
- **Sections are matched by `section_key`**, so they can be reordered or hidden
  in the CMS freely. A section whose key a page doesn't recognise still renders,
  through a generic fallback.
- `page_sections.layout` holds the section's original class list (`motif rule-y`,
  `bg-dark`, `bg-white rule-top`), which is what gives each band its background
  and rules.

`server/scripts/skeleton.js` prints any design page's element tree, which is the
quickest way to check a port against the original:

```bash
node server/scripts/skeleton.js about.html 4
```

## Notes

- The India outreach map places pins with a least-squares fit to the basemap
  image (`client/src/site/components/IndiaMap.jsx`). Replacing that image means
  refitting those constants, not nudging them.
- The blog world map stores pin positions per post (`author_map_x/y`) in the
  basemap's 960×480 viewBox, since it is a Natural Earth I projection with no
  cheap lat/lon formula.
- Blog and event bodies are stored as HTML and rendered with
  `dangerouslySetInnerHTML`. Only signed-in admins can write them; if untrusted
  authors ever get accounts, sanitise on the way in.
- The header overflows its viewport by ~26px at exactly 1280px wide. This is
  inherited from the original design, not introduced here — the live site shows
  the identical 1306px scroll width.
