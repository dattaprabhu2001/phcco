/**
 * Creates the `phcco` database and applies scripts/schema.sql, then seeds the
 * single admin account from .env.
 *
 * Safe to re-run: schema.sql drops and recreates every table, so this is the
 * "start clean" path. Run `npm run db:migrate` afterwards to load content.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DB = process.env.DB_NAME || 'phcco';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`database ready: ${DB}`);

  await conn.changeUser({ database: DB });

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await conn.query(sql);
  console.log('schema applied');

  const email = process.env.ADMIN_EMAIL || 'admin@phcco.local';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(password, 10);
  await conn.query(
    `INSERT INTO admin_users (email, password_hash, name)
     VALUES (?, ?, 'Administrator')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [email, hash]
  );
  console.log(`admin seeded: ${email} / ${password}`);

  await conn.end();
}

main().catch((err) => {
  console.error('setup failed:', err.message);
  process.exit(1);
});
