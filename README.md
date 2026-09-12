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

Pages are **not** a CMS module. Each page is a React route, so a page record
created in an admin screen could never render, and deleting one would blank a
live page's banner. The `pages` table is still read at runtime for every
banner — only the homepage's copy is editable, through its own **Home banner**
screen. To change another page's banner, edit its row in the database or adjust
`server/scripts/migrate.js` and re-import.

| Module | Covers |
| --- | --- |
| Home banner | The homepage headline, eyebrow, lead and its two buttons |
| Page sections / Section items | The prose blocks on About, Research, Outreach, Home |
| Hero slides, Stats | Homepage carousel images and the figures strip |
| Research themes / methods | The Research page |
| Publications | Title, journal, year, theme, DOI — drives the filters |
| Cohort groups / People | The 53 profiles and their year tabs |
| Blog posts | Body HTML, author, and the world-map pin position |
| Albums / Photos | The four galleries and 88 photos |
| Videos & podcast | Shared by the Videos page and the homepage podcast strip |
| Events | Get Involved cards, their type badge, and their detail pages |
| Programme editions | The year-tabbed Summer Internship editions on Outreach |
| Outreach map | City, venue, kind, and lat/lon for the India map |
| Collaborators, Navigation, Site settings | Partners, menu, branding and contact details |

Plus **Contact inbox** (form submissions) and **Media library** (uploads, stored
in `server/uploads/`).

Modules are bucketed in the sidebar by their `group` — nineteen flat entries is
a wall. Each carries an `icon` and a one-line `description` shown on its screen.

### Form fields

Each module's `columns` list drives its form, and the input is inferred from the
column name (`client/src/admin/components/Field.jsx`):

| Name pattern | Input |
| --- | --- |
| `is_*`, `visible` | toggle |
| `*_html` | monospace HTML area |
| `image`, `avatar`, `thumb`, `cover_*` | path + preview + upload |
| `*_id` | dropdown of the related module |
| `*_url`, `path` | link field |
| `published_at`, `*_at` | date picker |
| `lat`, `lon`, `year`, `sort`, `author_map_*` | number |

Fields are then grouped into **Content / Media / Links / Settings /
Publishing** panels, so a nineteen-column record stays readable. Add a custom
label or help text in the `labelFor` and `HELP` maps in that same file.

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

### Verifying a page against the design

The React render was checked against the original page-for-page on three axes:
the `<section>` class sequence, the inventory of layout-bearing classes, and
every leaf text node. All 11 public pages match on all three (1058 of 1059 text
blocks — see the note below for the one intentional difference).

To re-run that after a change, stage the design pages so they are same-origin:

```bash
cp design/*.html client/public/__design/
```

Then in the browser console, fetch `/__design/<page>.html`, parse it with
`DOMParser`, and diff its `<main>` against the live one. Delete
`client/public/__design` afterwards so the old site is not built into `dist`.

## Notes

- **The scroll-reveal animation fails safe.** The design hides every `.reveal`
  element via `html.reveal-ready` and un-hides it with JS. If that JS cannot run
  — some embedded webviews never composite, so neither `IntersectionObserver`
  callbacks nor scroll events ever fire — the page renders blank. So
  `useReveal` (`client/src/lib/hooks.js`) probes the observer once at startup
  and only adds `reveal-ready` when it is proven to deliver callbacks.
  Everywhere else the content simply renders, unanimated but readable. Reveal
  itself is then driven by rect checks on scroll rather than by observer
  callbacks, so a missed callback cannot strand content mid-page.

- **One line differs from the design on purpose.** The static site's contact
  form opened the visitor's mail client, and its note said so: "nothing is
  submitted to a server, and no details are stored". This form posts to the API
  and stores the message for the CMS inbox, so that note is replaced with an
  accurate one. Repeating the original wording would be a false privacy claim.

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
