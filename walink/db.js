'use strict';
// Persistent SQLite database (Node's built-in node:sqlite — no native build step).
// The file lives in DATA_DIR, which must be a persistent disk/volume in production.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'walink.db');

const db = new DatabaseSync(DB_FILE);
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  whatsapp TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'KWD',
  pass_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'trial',       -- trial | monthly
  status TEXT NOT NULL DEFAULT 'active',    -- active | suspended
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',           -- resized JPEG data URL
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,                  -- per-shop order number
  token TEXT NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  unit_price REAL NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  total REAL NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  lang TEXT NOT NULL DEFAULT 'ar',
  status TEXT NOT NULL DEFAULT 'new',       -- new | done | cancelled
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (shop_id, number)
);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id, sort, id);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  kind TEXT NOT NULL,                       -- admin | seller
  shop_id INTEGER,
  expires_at INTEGER NOT NULL
);
`);

// ---- passwords (scrypt) ----
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return `${salt}:${h}`;
}
function verifyPassword(pw, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, h] = stored.split(':');
  const a = Buffer.from(h, 'hex');
  const b = crypto.scryptSync(String(pw), salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---- sessions ----
const SESSION_DAYS = 30;
function createSession(kind, shopId = null) {
  const token = crypto.randomBytes(32).toString('hex');
  const exp = Date.now() + SESSION_DAYS * 864e5;
  db.prepare('INSERT INTO sessions (token, kind, shop_id, expires_at) VALUES (?,?,?,?)').run(token, kind, shopId, exp);
  return token;
}
function getSession(token) {
  if (!token) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!s) return null;
  if (s.expires_at < Date.now()) { destroySession(token); return null; }
  return s;
}
function destroySession(token) { db.prepare('DELETE FROM sessions WHERE token = ?').run(token); }
function purgeSessions() { db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now()); }

// ---- shops ----
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/;
const RESERVED = new Set(['admin', 'api', 'login', 'logout', 'signup', 'static', 'lang', 'www', 'help']);

function shopBySlug(slug) { return db.prepare('SELECT * FROM shops WHERE slug = ?').get(String(slug || '').toLowerCase()); }
function shopById(id) { return db.prepare('SELECT * FROM shops WHERE id = ?').get(id); }
function shopByEmail(email) { return db.prepare('SELECT * FROM shops WHERE email = ?').get(String(email || '').trim().toLowerCase()); }

function createShop({ slug, name, email, whatsapp, password, plan = 'trial', currency = 'KWD' }) {
  slug = String(slug || '').trim().toLowerCase();
  email = String(email || '').trim().toLowerCase();
  if (!SLUG_RE.test(slug) || RESERVED.has(slug)) throw new Error('bad_slug');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('bad_email');
  if (!String(name || '').trim()) throw new Error('bad_name');
  if (String(password || '').length < 6) throw new Error('bad_password');
  if (shopBySlug(slug)) throw new Error('slug_taken');
  if (shopByEmail(email)) throw new Error('email_taken');
  if (!['trial', 'monthly'].includes(plan)) plan = 'trial';
  const r = db.prepare('INSERT INTO shops (slug, name, email, whatsapp, currency, pass_hash, plan) VALUES (?,?,?,?,?,?,?)')
    .run(slug, String(name).trim().slice(0, 80), email, digits(whatsapp), currency, hashPassword(password), plan);
  return shopById(Number(r.lastInsertRowid));
}

function digits(s) { return String(s || '').replace(/\D/g, '').slice(0, 15); }

// ---- orders ----
function createOrder(shop, data) {
  // per-shop sequential number, inside a transaction
  db.exec('BEGIN IMMEDIATE');
  try {
    const n = db.prepare('SELECT COALESCE(MAX(number), 0) + 1 AS n FROM orders WHERE shop_id = ?').get(shop.id).n;
    const token = crypto.randomBytes(12).toString('hex');
    const r = db.prepare(`INSERT INTO orders (shop_id, number, token, product_id, product_name, unit_price, qty, total,
      customer_name, customer_phone, region, note, lang) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(shop.id, n, token, data.product_id, data.product_name, data.unit_price, data.qty, data.total,
        data.customer_name, data.customer_phone, data.region, data.note, data.lang);
    db.exec('COMMIT');
    return db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(r.lastInsertRowid));
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

module.exports = {
  db, DATA_DIR, DB_FILE, hashPassword, verifyPassword,
  createSession, getSession, destroySession, purgeSessions,
  shopBySlug, shopById, shopByEmail, createShop, createOrder, digits, SLUG_RE, RESERVED,
};
