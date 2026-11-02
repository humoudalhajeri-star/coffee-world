'use strict';
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const D = require('./db');
const { t, LANGS } = require('./i18n');
const V = require('./views');

const PORT = Number(process.env.PORT) || 3000;
let OWNER_PASS = process.env.OWNER_PASS;
if (!OWNER_PASS) {
  OWNER_PASS = crypto.randomBytes(9).toString('base64url');
  console.warn(`[walink] OWNER_PASS not set — generated a temporary admin password for this run: ${OWNER_PASS}`);
}
const PROD = process.env.NODE_ENV === 'production';

// ---------- seed a ready-to-use shop on first boot ----------
(function seed() {
  const slug = (process.env.SEED_SHOP || 'demo').toLowerCase();
  if (process.env.SEED_SHOP === 'none' || D.shopBySlug(slug)) return;
  const count = D.db.prepare('SELECT COUNT(*) c FROM shops').get().c;
  if (count > 0) return;
  try {
    const shop = D.createShop({
      slug,
      name: process.env.SEED_SHOP_NAME || 'متجر walink التجريبي',
      email: process.env.SEED_SHOP_EMAIL || `${slug}@walink.app`,
      whatsapp: process.env.SEED_SHOP_WHATSAPP || '96500000000',
      password: process.env.SEED_SHOP_PASS || OWNER_PASS,
      plan: 'monthly',
    });
    const ins = D.db.prepare('INSERT INTO products (shop_id, name, price, note, sort) VALUES (?,?,?,?,?)');
    ins.run(shop.id, 'قهوة مختصة 250غ', 4.5, 'تحميص متوسط — إثيوبيا', 1);
    ins.run(shop.id, 'كوب حراري', 6.75, 'يحافظ على الحرارة 6 ساعات', 2);
    console.log(`[walink] seeded shop "${slug}"`);
  } catch (e) { console.error('[walink] seed failed', e.message); }
})();
setInterval(D.purgeSessions, 36e5).unref();

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false, limit: '3mb' }));
app.use('/static', express.static(path.join(__dirname, 'public'), { maxAge: PROD ? '1d' : 0 }));

// ---------- helpers ----------
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function setCookie(req, res, name, value, maxAgeSec) {
  const secure = req.secure ? '; Secure' : '';
  res.append('Set-Cookie', `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; SameSite=Lax${secure}`);
}
function baseUrl(req) { return `${req.protocol}://${req.get('host')}`; }
function safeNext(n) { return typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : '/'; }
const str = (v, max) => String(v ?? '').trim().slice(0, max);
function genPassword() { return crypto.randomBytes(6).toString('base64url'); }

// rate limiter (per IP + bucket)
const hits = new Map();
function limited(req, bucket, max, windowMs) {
  const key = `${bucket}:${req.ip}`;
  const now = Date.now();
  let h = hits.get(key);
  if (!h || h.reset < now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
  h.n++;
  return h.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, h] of hits) if (h.reset < now) hits.delete(k); }, 6e4).unref();

// per-request context: language, session, translate fn
app.use((req, res, next) => {
  const c = parseCookies(req);
  req.cookies = c;
  req.lang = LANGS.includes(c.lang) ? c.lang : 'ar';
  req.t = t(req.lang);
  req.session = D.getSession(c.sid);
  res.locals.ctx = { req, lang: req.lang, t: req.t, path: req.originalUrl };
  next();
});

// CSRF defence: cookies are SameSite=Lax, plus reject cross-origin POSTs.
app.use((req, res, next) => {
  if (req.method !== 'POST') return next();
  const origin = req.get('origin');
  if (origin && origin !== 'null') {
    try { if (new URL(origin).host !== req.get('host')) return res.status(403).send('Bad origin'); } catch { return res.status(403).send('Bad origin'); }
  }
  next();
});

const render = (res, html, code = 200) => res.status(code).type('html').send(html);
const notFound = (req, res) => render(res, V.page(res.locals.ctx, req.t('notFound'), V.notFound(res.locals.ctx)), 404);

// ---------- public ----------
app.get('/healthz', (req, res) => { D.db.prepare('SELECT 1').get(); res.json({ ok: true }); });

app.get('/lang', (req, res) => {
  const l = LANGS.includes(req.query.l) ? req.query.l : 'ar';
  setCookie(req, res, 'lang', l, 365 * 864e2);
  res.redirect(303, safeNext(req.query.next));
});

app.get('/', (req, res) => {
  const demo = D.db.prepare("SELECT slug FROM shops WHERE status='active' ORDER BY id LIMIT 1").get();
  render(res, V.page(res.locals.ctx, 'walink', V.landing(res.locals.ctx, { demo: demo && demo.slug, base: baseUrl(req) })));
});

app.get('/signup', (req, res) => render(res, V.page(res.locals.ctx, req.t('signup'), V.signup(res.locals.ctx, {}))));
app.post('/signup', (req, res) => {
  if (limited(req, 'signup', 10, 36e5)) return render(res, V.page(res.locals.ctx, req.t('signup'), V.signup(res.locals.ctx, { error: req.t('err_rate'), v: req.body })), 429);
  try {
    const shop = D.createShop({
      slug: req.body.slug, name: req.body.name, email: req.body.email,
      whatsapp: req.body.whatsapp, password: req.body.password, plan: 'trial',
    });
    setCookie(req, res, 'sid', D.createSession('seller', shop.id), 30 * 864e2);
    res.redirect(303, `/s/${shop.slug}`);
  } catch (e) {
    render(res, V.page(res.locals.ctx, req.t('signup'), V.signup(res.locals.ctx, { error: req.t('err_' + e.message), v: req.body })), 400);
  }
});

app.get('/login', (req, res) => render(res, V.page(res.locals.ctx, req.t('login'), V.login(res.locals.ctx, {}))));
app.post('/login', (req, res) => {
  if (limited(req, 'login', 20, 9e5)) return render(res, V.page(res.locals.ctx, req.t('login'), V.login(res.locals.ctx, { error: req.t('err_rate') })), 429);
  const shop = D.shopByEmail(req.body.email);
  if (!shop || !D.verifyPassword(req.body.password || '', shop.pass_hash)) {
    return render(res, V.page(res.locals.ctx, req.t('login'), V.login(res.locals.ctx, { error: req.t('wrongLogin'), email: req.body.email })), 401);
  }
  setCookie(req, res, 'sid', D.createSession('seller', shop.id), 30 * 864e2);
  res.redirect(303, `/s/${shop.slug}`);
});
app.post('/logout', (req, res) => {
  if (req.cookies.sid) D.destroySession(req.cookies.sid);
  setCookie(req, res, 'sid', '', 0);
  res.redirect(303, safeNext(req.body.next || '/'));
});

// product image (stored as data URL in DB)
app.get('/img/:id', (req, res) => {
  const p = D.db.prepare('SELECT image FROM products WHERE id = ?').get(Number(req.params.id) || 0);
  const m = p && /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(p.image);
  if (!m) return res.status(404).end();
  const buf = Buffer.from(m[2], 'base64');
  const etag = '"' + crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16) + '"';
  if (req.get('if-none-match') === etag) return res.status(304).end();
  res.set({ 'Content-Type': m[1], ETag: etag, 'Cache-Control': 'public, max-age=300' }).send(buf);
});

// ---------- buyer catalog ----------
app.get('/b/:shop', (req, res) => {
  const shop = D.shopBySlug(req.params.shop);
  if (!shop) return notFound(req, res);
  const products = D.db.prepare('SELECT id, name, price, note, (image <> \'\') AS has_img FROM products WHERE shop_id = ? AND active = 1 ORDER BY sort, id').all(shop.id);
  render(res, V.page(res.locals.ctx, shop.name, V.catalog(res.locals.ctx, { shop, products, selected: Number(req.query.p) || null, error: req.query.e ? req.t('err_bad_order') : null })));
});

function buildOrderMessage(lang, shop, o) {
  const tt = t(lang);
  const L = [
    tt('msgHello', { shop: shop.name }),
    '',
    `🧾 ${tt('msgOrder')}: #${o.number}`,
    `📦 ${tt('msgProduct')}: ${o.product_name}`,
    `🔢 ${tt('msgQty')}: ${o.qty}`,
    `💵 ${tt('msgPrice')}: ${V.money(o.unit_price, shop.currency, lang)}`,
    `💰 ${tt('msgTotal')}: ${V.money(o.total, shop.currency, lang)}`,
    '',
    `👤 ${tt('msgName')}: ${o.customer_name}`,
    `📱 ${tt('msgPhone')}: +${o.customer_phone}`,
  ];
  if (o.region) L.push(`📍 ${tt('msgRegion')}: ${o.region}`);
  if (o.note) L.push(`📝 ${tt('msgNote')}: ${o.note}`);
  L.push('', tt('msgPay'));
  return L.join('\n');
}
function waLink(phone, text) { return `https://wa.me/${D.digits(phone)}?text=${encodeURIComponent(text)}`; }

app.post('/b/:shop/order', (req, res) => {
  const shop = D.shopBySlug(req.params.shop);
  if (!shop || shop.status !== 'active') return notFound(req, res);
  if (limited(req, 'order', 30, 36e5)) return res.status(429).send(req.t('err_rate'));
  const product = D.db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ? AND active = 1').get(Number(req.body.product_id) || 0, shop.id);
  const cc = D.digits(req.body.cc).slice(0, 4);
  let local = D.digits(req.body.phone);
  if (local.startsWith('00')) local = local.slice(2);
  else if (local.startsWith('0')) local = local.replace(/^0+/, '');
  const phone = local.startsWith(cc) && local.length > 8 + cc.length - 1 ? local : cc + local;
  const name = str(req.body.name, 80);
  const qty = Math.min(99, Math.max(1, parseInt(req.body.qty, 10) || 1));
  if (!product || !name || !cc || phone.length < 7 || phone.length > 15) {
    return res.redirect(303, `/b/${shop.slug}?e=1${product ? '&p=' + product.id : ''}#order`);
  }
  const order = D.createOrder(shop, {
    product_id: product.id, product_name: product.name, unit_price: product.price, qty,
    total: Math.round(product.price * qty * 1000) / 1000,
    customer_name: name, customer_phone: phone,
    region: str(req.body.region, 80), note: str(req.body.note, 500), lang: req.lang,
  });
  res.redirect(303, `/b/${shop.slug}/sent/${order.token}`);
});

app.get('/b/:shop/sent/:token', (req, res) => {
  const shop = D.shopBySlug(req.params.shop);
  const order = shop && D.db.prepare('SELECT * FROM orders WHERE shop_id = ? AND token = ?').get(shop.id, req.params.token);
  if (!order) return notFound(req, res);
  const wa = waLink(shop.whatsapp, buildOrderMessage(order.lang, shop, order));
  render(res, V.page(res.locals.ctx, req.t('sentTitle'), V.sent(res.locals.ctx, { shop, order, wa })));
});

// ---------- seller dashboard ----------
function sellerShop(req) {
  const shop = D.shopBySlug(req.params.shop);
  if (!shop) return { shop: null };
  const s = req.session;
  const ok = s && ((s.kind === 'seller' && s.shop_id === shop.id) || s.kind === 'admin');
  return { shop, ok };
}
function requireSeller(req, res, next) {
  const { shop, ok } = sellerShop(req);
  if (!shop) return notFound(req, res);
  if (!ok) return res.redirect(303, `/s/${shop.slug}`);
  req.shop = shop;
  next();
}

app.get('/s/:shop', (req, res) => {
  const { shop, ok } = sellerShop(req);
  if (!shop) return notFound(req, res);
  if (!ok) return render(res, V.page(res.locals.ctx, req.t('sellerLogin'), V.sellerLogin(res.locals.ctx, { shop })));
  const tab = ['orders', 'products', 'settings'].includes(req.query.tab) ? req.query.tab : 'orders';
  const status = ['new', 'done', 'cancelled'].includes(req.query.status) ? req.query.status : '';
  const orders = status
    ? D.db.prepare('SELECT * FROM orders WHERE shop_id = ? AND status = ? ORDER BY id DESC LIMIT 500').all(shop.id, status)
    : D.db.prepare('SELECT * FROM orders WHERE shop_id = ? ORDER BY id DESC LIMIT 500').all(shop.id);
  const stats = D.db.prepare(`SELECT COUNT(*) total, SUM(status='new') new, SUM(status='done') done,
    COALESCE(SUM(CASE WHEN status='done' THEN total END),0) revenue FROM orders WHERE shop_id = ?`).get(shop.id);
  const products = D.db.prepare("SELECT id, name, price, note, active, (image <> '') AS has_img FROM products WHERE shop_id = ? ORDER BY sort, id").all(shop.id);
  const edit = req.query.edit ? products.find((p) => p.id === Number(req.query.edit)) : null;
  render(res, V.page(res.locals.ctx, `${shop.name} — ${req.t('dashboard')}`, V.dashboard(res.locals.ctx, {
    shop, tab, status, orders, stats, products, edit, base: baseUrl(req), msg: req.query.ok ? req.t('saved') : null,
    custLink: (o) => waLink(o.customer_phone, t(req.lang)('custHello', { name: o.customer_name, n: o.number, shop: shop.name })),
    isAdmin: req.session.kind === 'admin',
  }), { logout: true }));
});

app.post('/s/:shop/login', (req, res) => {
  const shop = D.shopBySlug(req.params.shop);
  if (!shop) return notFound(req, res);
  if (limited(req, 'login', 20, 9e5)) return render(res, V.page(res.locals.ctx, req.t('sellerLogin'), V.sellerLogin(res.locals.ctx, { shop, error: req.t('err_rate') })), 429);
  if (!D.verifyPassword(req.body.password || '', shop.pass_hash)) {
    return render(res, V.page(res.locals.ctx, req.t('sellerLogin'), V.sellerLogin(res.locals.ctx, { shop, error: req.t('wrongLogin') })), 401);
  }
  setCookie(req, res, 'sid', D.createSession('seller', shop.id), 30 * 864e2);
  res.redirect(303, `/s/${shop.slug}`);
});

app.post('/s/:shop/orders/:id/status', requireSeller, (req, res) => {
  const st = ['new', 'done', 'cancelled'].includes(req.body.status) ? req.body.status : 'new';
  D.db.prepare('UPDATE orders SET status = ? WHERE id = ? AND shop_id = ?').run(st, Number(req.params.id), req.shop.id);
  res.redirect(303, `/s/${req.shop.slug}?tab=orders${req.body.filter ? '&status=' + encodeURIComponent(req.body.filter) : ''}`);
});

function productFields(body) {
  const price = Math.max(0, Math.round((parseFloat(String(body.price).replace(',', '.')) || 0) * 1000) / 1000);
  let image = null; // null = keep
  if (body.remove_image === '1') image = '';
  else if (typeof body.image === 'string' && body.image.length > 0) {
    if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(body.image) && body.image.length < 1_500_000) image = body.image;
  }
  return { name: str(body.name, 120), price, note: str(body.note, 500), image };
}
app.post('/s/:shop/products', requireSeller, (req, res) => {
  const f = productFields(req.body);
  if (f.name) {
    const sort = D.db.prepare('SELECT COALESCE(MAX(sort),0)+1 s FROM products WHERE shop_id = ?').get(req.shop.id).s;
    D.db.prepare('INSERT INTO products (shop_id, name, price, note, image, sort) VALUES (?,?,?,?,?,?)').run(req.shop.id, f.name, f.price, f.note, f.image || '', sort);
  }
  res.redirect(303, `/s/${req.shop.slug}?tab=products&ok=1`);
});
app.post('/s/:shop/products/:id', requireSeller, (req, res) => {
  const f = productFields(req.body);
  const id = Number(req.params.id);
  if (f.name) {
    D.db.prepare('UPDATE products SET name = ?, price = ?, note = ? WHERE id = ? AND shop_id = ?').run(f.name, f.price, f.note, id, req.shop.id);
    if (f.image !== null) D.db.prepare('UPDATE products SET image = ? WHERE id = ? AND shop_id = ?').run(f.image, id, req.shop.id);
  }
  res.redirect(303, `/s/${req.shop.slug}?tab=products&ok=1`);
});
app.post('/s/:shop/products/:id/toggle', requireSeller, (req, res) => {
  D.db.prepare('UPDATE products SET active = 1 - active WHERE id = ? AND shop_id = ?').run(Number(req.params.id), req.shop.id);
  res.redirect(303, `/s/${req.shop.slug}?tab=products`);
});
app.post('/s/:shop/products/:id/delete', requireSeller, (req, res) => {
  D.db.prepare('DELETE FROM products WHERE id = ? AND shop_id = ?').run(Number(req.params.id), req.shop.id);
  res.redirect(303, `/s/${req.shop.slug}?tab=products`);
});
app.post('/s/:shop/settings', requireSeller, (req, res) => {
  const name = str(req.body.name, 80) || req.shop.name;
  const currency = V.CURRENCIES.includes(req.body.currency) ? req.body.currency : req.shop.currency;
  D.db.prepare('UPDATE shops SET name = ?, whatsapp = ?, currency = ? WHERE id = ?').run(name, D.digits(req.body.whatsapp), currency, req.shop.id);
  if (req.body.password && String(req.body.password).length >= 6) {
    D.db.prepare('UPDATE shops SET pass_hash = ? WHERE id = ?').run(D.hashPassword(req.body.password), req.shop.id);
  }
  res.redirect(303, `/s/${req.shop.slug}?tab=settings&ok=1`);
});

// ---------- admin ----------
function isAdmin(req) { return req.session && req.session.kind === 'admin'; }
function requireAdmin(req, res, next) { return isAdmin(req) ? next() : res.redirect(303, '/admin'); }

app.get('/admin', (req, res) => {
  if (!isAdmin(req)) return render(res, V.page(res.locals.ctx, req.t('adminLogin'), V.adminLogin(res.locals.ctx, {})));
  const stats = D.db.prepare(`SELECT COUNT(*) shops, SUM(plan='monthly') monthly, SUM(plan='trial') trial,
    SUM(status='active') active FROM shops`).get();
  stats.orders = D.db.prepare('SELECT COUNT(*) c FROM orders').get().c;
  stats.orders7 = D.db.prepare("SELECT COUNT(*) c FROM orders WHERE created_at >= datetime('now','-7 days')").get().c;
  const shops = D.db.prepare(`SELECT s.*, (SELECT COUNT(*) FROM orders o WHERE o.shop_id = s.id) orders,
    (SELECT COUNT(*) FROM products p WHERE p.shop_id = s.id) products FROM shops s ORDER BY s.id DESC`).all();
  let flash = null;
  if (req.cookies.flash) { try { flash = JSON.parse(req.cookies.flash); } catch {} setCookie(req, res, 'flash', '', 0); }
  render(res, V.page(res.locals.ctx, req.t('admin'), V.admin(res.locals.ctx, { stats, shops, flash, base: baseUrl(req), error: req.query.e ? req.t('err_' + req.query.e) : null }), { logout: true }));
});
app.post('/admin/login', (req, res) => {
  if (limited(req, 'admin', 10, 9e5)) return render(res, V.page(res.locals.ctx, req.t('adminLogin'), V.adminLogin(res.locals.ctx, { error: req.t('err_rate') })), 429);
  const a = crypto.createHash('sha256').update(String(req.body.password || '')).digest();
  const b = crypto.createHash('sha256').update(OWNER_PASS).digest();
  if (!crypto.timingSafeEqual(a, b)) return render(res, V.page(res.locals.ctx, req.t('adminLogin'), V.adminLogin(res.locals.ctx, { error: req.t('wrongLogin') })), 401);
  setCookie(req, res, 'sid', D.createSession('admin'), 7 * 864e2);
  res.redirect(303, '/admin');
});
function flash(req, res, obj) { setCookie(req, res, 'flash', JSON.stringify(obj), 120); }
app.post('/admin/shops', requireAdmin, (req, res) => {
  const password = req.body.password && String(req.body.password).trim() ? String(req.body.password).trim() : genPassword();
  try {
    const shop = D.createShop({ slug: req.body.slug, name: req.body.name, email: req.body.email, whatsapp: req.body.whatsapp, password, plan: req.body.plan });
    flash(req, res, { kind: 'created', slug: shop.slug, email: shop.email, password });
    res.redirect(303, '/admin');
  } catch (e) { res.redirect(303, '/admin?e=' + encodeURIComponent(e.message)); }
});
app.post('/admin/shops/:id/:action', requireAdmin, (req, res) => {
  const shop = D.shopById(Number(req.params.id));
  if (!shop) return res.redirect(303, '/admin');
  const a = req.params.action;
  if (a === 'status') D.db.prepare('UPDATE shops SET status = ? WHERE id = ?').run(shop.status === 'active' ? 'suspended' : 'active', shop.id);
  else if (a === 'plan') D.db.prepare('UPDATE shops SET plan = ? WHERE id = ?').run(shop.plan === 'monthly' ? 'trial' : 'monthly', shop.id);
  else if (a === 'password') {
    const pw = genPassword();
    D.db.prepare('UPDATE shops SET pass_hash = ? WHERE id = ?').run(D.hashPassword(pw), shop.id);
    D.db.prepare("DELETE FROM sessions WHERE kind='seller' AND shop_id = ?").run(shop.id);
    flash(req, res, { kind: 'password', slug: shop.slug, email: shop.email, password: pw });
  }
  res.redirect(303, '/admin');
});

app.use(notFound);
app.use((err, req, res, next) => { console.error(err); res.status(500).type('text').send('Server error'); });

if (require.main === module) {
  app.listen(PORT, () => console.log(`[walink] listening on :${PORT} — db ${D.DB_FILE}`));
}
module.exports = app;
