-- =============================================================================
-- PHCCO CMS — MySQL / MariaDB schema
-- =============================================================================
-- Two kinds of table live here:
--
--   1. Strongly-typed collections (publications, people, photos, ...). Each one
--      gets its own CMS module because its fields are real, distinct fields
--      that the public site queries and filters on.
--
--   2. pages / page_sections / page_section_items. The prose on About,
--      Research, Outreach and friends is a sequence of headed blocks with
--      optional repeated sub-items. Modelling that generically keeps every
--      paragraph on the site editable without inventing a table per page.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --- auth --------------------------------------------------------------------
DROP TABLE IF EXISTS admin_users;
CREATE TABLE admin_users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(120) NOT NULL DEFAULT 'Administrator',
  last_login_at DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --- global settings ---------------------------------------------------------
DROP TABLE IF EXISTS site_settings;
CREATE TABLE site_settings (
  setting_key   VARCHAR(80) PRIMARY KEY,
  setting_value TEXT NULL,
  label         VARCHAR(160) NOT NULL DEFAULT '',
  input_type    ENUM('text','textarea','image','url','email') NOT NULL DEFAULT 'text',
  section       VARCHAR(60) NOT NULL DEFAULT 'general',
  sort          INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS nav_items;
CREATE TABLE nav_items (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  label     VARCHAR(80) NOT NULL,
  path      VARCHAR(190) NOT NULL,
  parent_id INT UNSIGNED NULL,
  sort      INT NOT NULL DEFAULT 0,
  visible   TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_nav_parent FOREIGN KEY (parent_id) REFERENCES nav_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --- generic page content ----------------------------------------------------
DROP TABLE IF EXISTS pages;
CREATE TABLE pages (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug             VARCHAR(120) NOT NULL UNIQUE,
  title            VARCHAR(200) NOT NULL,
  meta_description TEXT NULL,
  hero_eyebrow     VARCHAR(160) NULL,
  -- Rendered as HTML: the homepage headline carries a <span class="accent">
  -- around one word, which is part of the design, not decoration.
  hero_title       VARCHAR(500) NULL,
  hero_lead        TEXT NULL,
  hero_image       VARCHAR(255) NULL,
  hero_cta_label   VARCHAR(120) NULL,
  hero_cta_url     VARCHAR(255) NULL,
  hero_cta2_label  VARCHAR(120) NULL,
  hero_cta2_url    VARCHAR(255) NULL,
  -- The brand lockup (About) or jump-link chips (Research, Outreach) that sit
  -- under the banner lead. Kept verbatim so those pages keep their design.
  hero_extra_html  MEDIUMTEXT NULL,
  visible          TINYINT(1) NOT NULL DEFAULT 1,
  sort             INT NOT NULL DEFAULT 0,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS page_sections;
CREATE TABLE page_sections (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  page_slug   VARCHAR(120) NOT NULL,
  section_key VARCHAR(80)  NOT NULL,
  eyebrow     VARCHAR(160) NULL,
  heading     VARCHAR(255) NULL,
  lead        TEXT NULL,
  body_html   MEDIUMTEXT NULL,
  -- The pull-quote / sidebar that sits beside the prose in split layouts.
  aside_html  MEDIUMTEXT NULL,
  image       VARCHAR(255) NULL,
  layout      VARCHAR(40) NOT NULL DEFAULT 'default',
  visible     TINYINT(1) NOT NULL DEFAULT 1,
  sort        INT NOT NULL DEFAULT 0,
  INDEX idx_section_page (page_slug, sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS page_section_items;
CREATE TABLE page_section_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  section_id INT UNSIGNED NOT NULL,
  title      VARCHAR(255) NULL,
  subtitle   VARCHAR(255) NULL,
  body       MEDIUMTEXT NULL,
  image      VARCHAR(255) NULL,
  -- Which card shape the design draws this item as within its section:
  -- 'card' (default), 'shape' (icon + kicker tile), 'format' (bullet in a
  -- format list), 'gallery' (captioned figure).
  kind       VARCHAR(40) NOT NULL DEFAULT 'card',
  link_url   VARCHAR(500) NULL,
  link_label VARCHAR(120) NULL,
  tags       VARCHAR(500) NULL,
  sort       INT NOT NULL DEFAULT 0,
  INDEX idx_item_section (section_id, sort),
  CONSTRAINT fk_item_section FOREIGN KEY (section_id) REFERENCES page_sections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --- homepage ----------------------------------------------------------------
-- The hero is one fixed overlay of copy (which lives on pages.hero_*) over a
-- rotating set of images. Each image ships in three crops cut to shape at build
-- time — 4:5 phone, 3:2 tablet, 11:5 desktop — so the browser never crops.
DROP TABLE IF EXISTS hero_slides;
CREATE TABLE hero_slides (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  image_wide VARCHAR(255) NOT NULL,
  image_mid  VARCHAR(255) NULL,
  image_tall VARCHAR(255) NULL,
  alt        VARCHAR(255) NOT NULL DEFAULT '',
  visible    TINYINT(1) NOT NULL DEFAULT 1,
  sort       INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS stats;
CREATE TABLE stats (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  value   VARCHAR(40) NOT NULL,
  label   VARCHAR(160) NOT NULL,
  detail  VARCHAR(255) NULL,
  visible TINYINT(1) NOT NULL DEFAULT 1,
  sort    INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --- research ----------------------------------------------------------------
DROP TABLE IF EXISTS research_themes;
CREATE TABLE research_themes (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title   VARCHAR(200) NOT NULL,
  summary TEXT NULL,
  body    MEDIUMTEXT NULL,
  tags    VARCHAR(500) NULL,
  image   VARCHAR(255) NULL,
  visible TINYINT(1) NOT NULL DEFAULT 1,
  sort    INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS research_methods;
CREATE TABLE research_methods (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title   VARCHAR(200) NOT NULL,
  body    TEXT NULL,
  visible TINYINT(1) NOT NULL DEFAULT 1,
  sort    INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --- publications ------------------------------------------------------------
DROP TABLE IF EXISTS publications;
CREATE TABLE publications (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title   VARCHAR(500) NOT NULL,
  journal VARCHAR(255) NULL,
  year    SMALLINT NULL,
  theme   VARCHAR(120) NULL,
  authors VARCHAR(500) NULL,
  doi_url VARCHAR(700) NULL,
  visible TINYINT(1) NOT NULL DEFAULT 1,
  sort    INT NOT NULL DEFAULT 0,
  INDEX idx_pub_year (year),
  INDEX idx_pub_theme (theme)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --- cohort ------------------------------------------------------------------
DROP TABLE IF EXISTS people_groups;
CREATE TABLE people_groups (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_key VARCHAR(80) NOT NULL UNIQUE,
  title     VARCHAR(200) NOT NULL,
  subtitle  VARCHAR(500) NULL,
  visible   TINYINT(1) NOT NULL DEFAULT 1,
  sort      INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS people;
CREATE TABLE people (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_id     INT UNSIGNED NULL,
  name         VARCHAR(200) NOT NULL,
  slug         VARCHAR(200) NOT NULL,
  role         VARCHAR(200) NULL,
  domain       VARCHAR(200) NULL,
  now_text     VARCHAR(255) NULL,
  bio          TEXT NULL,
  tags         VARCHAR(500) NULL,
  avatar       VARCHAR(255) NULL,
  linkedin_url VARCHAR(500) NULL,
  visible      TINYINT(1) NOT NULL DEFAULT 1,
  sort         INT NOT NULL DEFAULT 0,
  INDEX idx_people_group (group_id, sort),
  CONSTRAINT fk_people_group FOREIGN KEY (group_id) REFERENCES people_groups(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --- blog / podcast ----------------------------------------------------------
DROP TABLE IF EXISTS posts;
CREATE TABLE posts (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug          VARCHAR(200) NOT NULL UNIQUE,
  title         VARCHAR(400) NOT NULL,
  excerpt       TEXT NULL,
  body_html     MEDIUMTEXT NULL,
  cover_image   VARCHAR(255) NULL,
  author_name   VARCHAR(200) NULL,
  -- Short institution, shown on every card ("Clemson University").
  author_role   VARCHAR(255) NULL,
  -- Full title, shown only on the wide feature card, which has room for it.
  author_title  VARCHAR(400) NULL,
  author_avatar VARCHAR(255) NULL,
  -- Invited guest post: the design badges these on the card.
  is_invited    TINYINT(1) NOT NULL DEFAULT 0,
  author_city   VARCHAR(200) NULL,
  author_country VARCHAR(120) NULL,
  -- Pin position on the blog page's world map, in the basemap's own 960x480
  -- viewBox. Baked coordinates rather than lat/lon: the map is a Natural Earth I
  -- projection, so there is no cheap lat/lon -> pixel formula, and an editor
  -- moving a pin wants to nudge pixels anyway.
  author_map_x  DECIMAL(7,2) NULL,
  author_map_y  DECIMAL(7,2) NULL,
  read_minutes  VARCHAR(40) NULL,
  is_featured   TINYINT(1) NOT NULL DEFAULT 0,
  published_at  DATE NULL,
  visible       TINYINT(1) NOT NULL DEFAULT 1,
  sort          INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --- media -------------------------------------------------------------------
DROP TABLE IF EXISTS albums;
CREATE TABLE albums (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(200) NOT NULL UNIQUE,
  title       VARCHAR(300) NOT NULL,
  description TEXT NULL,
  cover_image VARCHAR(255) NULL,
  date_text   VARCHAR(120) NULL,
  location    VARCHAR(200) NULL,
  visible     TINYINT(1) NOT NULL DEFAULT 1,
  sort        INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS photos;
CREATE TABLE photos (
  id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  album_id INT UNSIGNED NOT NULL,
  thumb    VARCHAR(255) NOT NULL,
  full     VARCHAR(255) NOT NULL,
  caption  VARCHAR(500) NULL,
  -- The album grid is a CSS multi-column masonry of uncropped photos, so the
  -- browser needs each one's intrinsic size to reserve its slot. Without these
  -- every tile collapses to its caption until the image loads, and the columns
  -- re-balance on every load.
  width    SMALLINT UNSIGNED NULL,
  height   SMALLINT UNSIGNED NULL,
  sort     INT NOT NULL DEFAULT 0,
  INDEX idx_photo_album (album_id, sort),
  CONSTRAINT fk_photo_album FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS videos;
CREATE TABLE videos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(400) NOT NULL,
  description TEXT NULL,
  youtube_id  VARCHAR(60) NULL,
  thumb       VARCHAR(255) NULL,
  date_text   VARCHAR(120) NULL,
  guest       VARCHAR(200) NULL,
  affiliation VARCHAR(255) NULL,
  duration    VARCHAR(40) NULL,
  kind        VARCHAR(40) NULL,
  -- The homepage "Podcast" strip and the Videos page draw from this one table;
  -- is_podcast picks which surface a row appears on.
  is_podcast  TINYINT(1) NOT NULL DEFAULT 0,
  visible     TINYINT(1) NOT NULL DEFAULT 1,
  sort        INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One year's run of a recurring programme (the Summer Internship editions the
-- Outreach page shows behind year tabs).
DROP TABLE IF EXISTS programme_editions;
CREATE TABLE programme_editions (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  programme  VARCHAR(60) NOT NULL DEFAULT 'summer-internship',
  year       VARCHAR(20) NOT NULL,
  title      VARCHAR(300) NOT NULL,
  kicker     VARCHAR(160) NULL,
  venue      VARCHAR(255) NULL,
  summary    TEXT NULL,
  image      VARCHAR(255) NULL,
  -- One highlight per line.
  highlights TEXT NULL,
  tags       VARCHAR(500) NULL,
  -- One "value|label" pair per line, e.g. "6|Weeks".
  stats      TEXT NULL,
  visible    TINYINT(1) NOT NULL DEFAULT 1,
  sort       INT NOT NULL DEFAULT 0,
  INDEX idx_edition_programme (programme, sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --- events & outreach -------------------------------------------------------
DROP TABLE IF EXISTS events;
CREATE TABLE events (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug      VARCHAR(200) NOT NULL UNIQUE,
  title     VARCHAR(400) NOT NULL,
  summary   TEXT NULL,
  body_html MEDIUMTEXT NULL,
  date_text VARCHAR(160) NULL,
  location  VARCHAR(255) NULL,
  -- Badge on the card: Internship / Workshop / Webinar.
  kind      VARCHAR(60) NULL,
  image     VARCHAR(255) NULL,
  cta_label VARCHAR(120) NULL,
  cta_url   VARCHAR(500) NULL,
  visible   TINYINT(1) NOT NULL DEFAULT 1,
  sort      INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS outreach_locations;
CREATE TABLE outreach_locations (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  city    VARCHAR(160) NOT NULL,
  venue   VARCHAR(255) NULL,
  event   VARCHAR(500) NULL,
  kind    ENUM('wocon','conference','other') NOT NULL DEFAULT 'other',
  lat     DECIMAL(9,5) NOT NULL,
  lon     DECIMAL(9,5) NOT NULL,
  visible TINYINT(1) NOT NULL DEFAULT 1,
  sort    INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indian collaborators are pinned on the About map, so they carry coordinates;
-- international ones are a plain list and do not.
DROP TABLE IF EXISTS collaborators;
CREATE TABLE collaborators (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name    VARCHAR(255) NOT NULL,
  city    VARCHAR(160) NULL,
  region  ENUM('india','international') NOT NULL DEFAULT 'india',
  lat     DECIMAL(9,5) NULL,
  lon     DECIMAL(9,5) NULL,
  note    VARCHAR(500) NULL,
  logo    VARCHAR(255) NULL,
  url     VARCHAR(500) NULL,
  visible TINYINT(1) NOT NULL DEFAULT 1,
  sort    INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --- inbox & uploads ---------------------------------------------------------
DROP TABLE IF EXISTS contact_messages;
CREATE TABLE contact_messages (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  organisation VARCHAR(255) NULL,
  topic      VARCHAR(160) NULL,
  message    TEXT NOT NULL,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_msg_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS media_files;
CREATE TABLE media_files (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  filename      VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  url           VARCHAR(500) NOT NULL,
  mime          VARCHAR(120) NULL,
  size_bytes    INT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
