import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { q, one, pool } from './db.js';
import { signToken, requireAuth } from './middleware/auth.js';
import publicRoutes from './routes/public.js';
import { crudRouter, MODULES } from './routes/crud.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(__dirname, '..', 'uploads');
const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOADS));

// --- public ------------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    await q('SELECT 1');
    res.json({ ok: true, db: 'up' });
  } catch (e) {
    res.status(503).json({ ok: false, db: 'down', error: e.message });
  }
});

app.use('/api', publicRoutes);

// --- auth --------------------------------------------------------------------
app.post('/api/admin/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await one('SELECT * FROM admin_users WHERE email = ?', [email]);
    // Same message either way: a distinct "no such user" reply would let anyone
    // enumerate valid admin addresses.
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) return res.status(401).json({ error: 'Incorrect email or password.' });

    await q('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?', [user.id]);
    res.json({
      token: signToken(user),
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (e) { next(e); }
});

app.get('/api/admin/me', requireAuth, async (req, res) => {
  res.json({ user: { id: req.user.sub, email: req.user.email, name: req.user.name } });
});

app.post('/api/admin/password', requireAuth, async (req, res, next) => {
  try {
    const { current, next: nextPassword } = req.body || {};
    if (!nextPassword || nextPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    const user = await one('SELECT * FROM admin_users WHERE id = ?', [req.user.sub]);
    if (!user || !(await bcrypt.compare(current || '', user.password_hash))) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    await q('UPDATE admin_users SET password_hash = ? WHERE id = ?', [
      await bcrypt.hash(nextPassword, 10),
      user.id,
    ]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// --- admin: dashboard --------------------------------------------------------
app.get('/api/admin/stats', requireAuth, async (req, res, next) => {
  try {
    const tables = [
      ['pages', 'Pages'], ['posts', 'Blog posts'], ['publications', 'Publications'],
      ['people', 'People'], ['albums', 'Albums'], ['photos', 'Photos'],
      ['videos', 'Videos'], ['events', 'Events'], ['outreach_locations', 'Outreach locations'],
      ['collaborators', 'Collaborators'],
    ];
    const counts = [];
    for (const [table, label] of tables) {
      const row = await one(`SELECT COUNT(*) n FROM \`${table}\``);
      counts.push({ key: table, label, count: row.n });
    }
    const unread = await one('SELECT COUNT(*) n FROM contact_messages WHERE is_read = 0');
    const recent = await q(
      'SELECT id, name, email, topic, created_at, is_read FROM contact_messages ORDER BY created_at DESC LIMIT 5'
    );
    res.json({ counts, unreadMessages: unread.n, recentMessages: recent });
  } catch (e) { next(e); }
});

app.get('/api/admin/modules', requireAuth, (req, res) => {
  res.json(MODULES.map(({ key, label, icon, columns, listFields }) =>
    ({ key, label, icon, columns, listFields })));
});

// --- admin: settings ---------------------------------------------------------
app.get('/api/admin/settings', requireAuth, async (req, res, next) => {
  try {
    res.json(await q('SELECT * FROM site_settings ORDER BY section ASC, sort ASC'));
  } catch (e) { next(e); }
});

app.put('/api/admin/settings', requireAuth, async (req, res, next) => {
  try {
    for (const [key, value] of Object.entries(req.body || {})) {
      await q('UPDATE site_settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// --- admin: contact inbox ----------------------------------------------------
app.get('/api/admin/messages', requireAuth, async (req, res, next) => {
  try {
    res.json(await q('SELECT * FROM contact_messages ORDER BY created_at DESC'));
  } catch (e) { next(e); }
});

app.put('/api/admin/messages/:id/read', requireAuth, async (req, res, next) => {
  try {
    await q('UPDATE contact_messages SET is_read = ? WHERE id = ?', [
      req.body?.is_read ? 1 : 0, req.params.id,
    ]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.delete('/api/admin/messages/:id', requireAuth, async (req, res, next) => {
  try {
    await q('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// --- admin: media library ----------------------------------------------------
fs.mkdirSync(UPLOADS, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (req, file, cb) => {
      const safe = file.originalname.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype);
    cb(ok ? null : new Error('Only image files are allowed.'), ok);
  },
});

app.get('/api/admin/media', requireAuth, async (req, res, next) => {
  try {
    res.json(await q('SELECT * FROM media_files ORDER BY created_at DESC'));
  } catch (e) { next(e); }
});

app.post('/api/admin/media', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received.' });
    const url = `/uploads/${req.file.filename}`;
    const [result] = await pool.execute(
      'INSERT INTO media_files (filename, original_name, url, mime, size_bytes) VALUES (?, ?, ?, ?, ?)',
      [req.file.filename, req.file.originalname, url, req.file.mimetype, req.file.size]
    );
    res.status(201).json({ id: result.insertId, url, filename: req.file.filename });
  } catch (e) { next(e); }
});

app.delete('/api/admin/media/:id', requireAuth, async (req, res, next) => {
  try {
    const row = await one('SELECT * FROM media_files WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    fs.rmSync(path.join(UPLOADS, row.filename), { force: true });
    await q('DELETE FROM media_files WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// --- admin: one CRUD router per content module -------------------------------
for (const m of MODULES) {
  app.use(`/api/admin/${m.key}`, requireAuth, crudRouter(m));
}

// --- serve the built SPA (production) ----------------------------------------
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// --- errors ------------------------------------------------------------------
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || (err instanceof multer.MulterError ? 400 : 500);
  res.status(status).json({ error: err.message || 'Server error' });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`PHCCO API listening on http://localhost:${PORT}`);
  console.log(`  health:  http://localhost:${PORT}/api/health`);
});
