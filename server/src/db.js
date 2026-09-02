import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'phcco',
};

export const pool = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4_unicode_ci',
  // The site stores lat/lon as DECIMAL. mysql2 hands DECIMAL back as a string
  // to avoid float rounding, but the maps need real numbers in JSON — so cast
  // them here rather than sprinkling Number() through every route.
  decimalNumbers: true,
  // Keep DATE columns as 'yyyy-mm-dd' strings. As Date objects they serialise
  // to JSON through UTC, which shifts a stored midnight date onto the previous
  // day for anyone east of Greenwich.
  dateStrings: ['DATE'],
});

/** Run a query, return rows. */
export async function q(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/** Run a query, return the first row or null. */
export async function one(sql, params = []) {
  const rows = await q(sql, params);
  return rows[0] || null;
}

/** INSERT helper — returns the new id. */
export async function insert(table, data) {
  const keys = Object.keys(data);
  const sql = `INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(', ')})
               VALUES (${keys.map(() => '?').join(', ')})`;
  const [res] = await pool.execute(sql, keys.map((k) => data[k]));
  return res.insertId;
}

/** UPDATE ... WHERE id = ? helper — returns affected row count. */
export async function update(table, id, data) {
  const keys = Object.keys(data);
  if (!keys.length) return 0;
  const sql = `UPDATE \`${table}\` SET ${keys.map((k) => `\`${k}\` = ?`).join(', ')} WHERE id = ?`;
  const [res] = await pool.execute(sql, [...keys.map((k) => data[k]), id]);
  return res.affectedRows;
}

/** DELETE ... WHERE id = ? helper — returns affected row count. */
export async function remove(table, id) {
  const [res] = await pool.execute(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
  return res.affectedRows;
}
