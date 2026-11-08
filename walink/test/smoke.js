'use strict';
// End-to-end smoke test: boots the app on a temp DB and exercises every flow over HTTP.
const fs = require('fs'); const os = require('os'); const path = require('path'); const assert = require('assert');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'walink-'));
process.env.OWNER_PASS = 'owner-secret';
const app = require('../server');
const srv = app.listen(0);
const B = `http://127.0.0.1:${srv.address().port}`;
const jar = {};
async function req(method, p, body, who = 'anon') {
  const h = { cookie: Object.entries(jar[who] || {}).map(([k, v]) => `${k}=${v}`).join('; ') };
  if (body) h['content-type'] = 'application/x-www-form-urlencoded';
  const r = await fetch(B + p, { method, headers: h, body: body && new URLSearchParams(body).toString(), redirect: 'manual' });
  for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const [k, v] = kv.split('='); (jar[who] ||= {})[k] = v; }
  return { status: r.status, loc: r.headers.get('location'), text: await r.text() };
}
(async () => {
  let r = await req('GET', '/'); assert.equal(r.status, 200); assert.match(r.text, /dir="rtl"/);
  r = await req('GET', '/lang?l=en&next=/'); assert.equal(r.status, 303);
  r = await req('GET', '/'); assert.match(r.text, /dir="ltr"/); assert.match(r.text, /How it works/);
  await req('GET', '/lang?l=ar&next=/');
  // buyer catalog
  r = await req('GET', '/b/demo'); assert.equal(r.status, 200); assert.match(r.text, /قهوة مختصة/);
  const pid = /name="product_id" value="(\d+)"/.exec(r.text)[1];
  r = await req('POST', '/b/demo/order', { product_id: pid, name: 'سارة', cc: '965', phone: '55551234', region: 'السالمية', note: 'بدون سكر', qty: '2' });
  assert.equal(r.status, 303); assert.match(r.loc, /^\/b\/demo\/sent\//);
  r = await req('GET', r.loc); assert.equal(r.status, 200);
  const wa = /id="waGo" href="([^"]+)"/.exec(r.text)[1].replace(/&amp;/g, '&');
  assert.match(wa, /^https:\/\/wa\.me\/96500000000\?text=/);
  const msg = decodeURIComponent(wa.split('text=')[1]);
  assert.match(msg, /#1/); assert.match(msg, /سارة/); assert.match(msg, /\+96555551234/); assert.match(msg, /9\.000/);
  // invalid order
  r = await req('POST', '/b/demo/order', { product_id: pid, name: '', cc: '965', phone: '1' }); assert.match(r.loc, /e=1/);
  // seller: unauthenticated shows login
  r = await req('GET', '/s/demo', null, 'seller'); assert.match(r.text, /type="password"/);
  r = await req('POST', '/s/demo/login', { password: 'nope' }, 'seller'); assert.equal(r.status, 401);
  r = await req('POST', '/s/demo/login', { password: 'owner-secret' }, 'seller'); assert.equal(r.status, 303);
  r = await req('GET', '/s/demo', null, 'seller'); assert.match(r.text, /سارة/); assert.match(r.text, /بدون سكر/); assert.match(r.text, /\/b\/demo/);
  const oid = /\/s\/demo\/orders\/(\d+)\/status/.exec(r.text)[1];
  r = await req('POST', `/s/demo/orders/${oid}/status`, { status: 'done' }, 'seller'); assert.equal(r.status, 303);
  r = await req('GET', '/s/demo?status=done', null, 'seller'); assert.match(r.text, /سارة/);
  // products CRUD
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  r = await req('POST', '/s/demo/products', { name: 'Test Bag', price: '3.250', note: 'n', image: png }, 'seller'); assert.equal(r.status, 303);
  r = await req('GET', '/s/demo?tab=products', null, 'seller'); assert.match(r.text, /Test Bag/);
  const np = [...r.text.matchAll(/products\/(\d+)\/delete/g)].map((m) => m[1]).pop();
  r = await req('GET', `/img/${np}`); assert.equal(r.status, 200);
  await req('POST', `/s/demo/products/${np}`, { name: 'Test Bag 2', price: '4', note: '' }, 'seller');
  r = await req('GET', '/b/demo'); assert.match(r.text, /Test Bag 2/);
  await req('POST', `/s/demo/products/${np}/toggle`, {}, 'seller');
  r = await req('GET', '/b/demo'); assert.doesNotMatch(r.text, /Test Bag 2/);
  await req('POST', `/s/demo/products/${np}/delete`, {}, 'seller');
  // settings
  await req('POST', '/s/demo/settings', { name: 'متجري', whatsapp: '+965 9999 8888', currency: 'KWD' }, 'seller');
  r = await req('GET', '/b/demo'); assert.match(r.text, /متجري/);
  // another seller can't touch demo
  r = await req('POST', '/signup', { name: 'Other', slug: 'other-shop', email: 'o@x.com', whatsapp: '96511112222', password: 'secret12' }, 'other');
  assert.equal(r.loc, '/s/other-shop');
  r = await req('POST', `/s/demo/orders/${oid}/status`, { status: 'new' }, 'other'); assert.equal(r.loc, '/s/demo');
  r = await req('GET', '/s/demo', null, 'other'); assert.match(r.text, /type="password"/);
  // generic login
  r = await req('POST', '/login', { email: 'o@x.com', password: 'secret12' }, 'other2'); assert.equal(r.loc, '/s/other-shop');
  // admin
  r = await req('GET', '/admin', null, 'adm'); assert.match(r.text, /type="password"/);
  r = await req('POST', '/admin/login', { password: 'bad' }, 'adm'); assert.equal(r.status, 401);
  r = await req('POST', '/admin/login', { password: 'owner-secret' }, 'adm'); assert.equal(r.status, 303);
  r = await req('GET', '/admin', null, 'adm'); assert.match(r.text, /o@x\.com/); assert.match(r.text, /demo@walink\.app/);
  r = await req('POST', '/admin/shops', { name: 'Admin Shop', slug: 'adminshop', email: 'a@b.co', whatsapp: '965', plan: 'monthly' }, 'adm');
  r = await req('GET', '/admin', null, 'adm'); assert.match(r.text, /Admin Shop/); const gen = /<code dir="ltr">([^<]+)<\/code>/.exec(r.text)[1];
  r = await req('POST', '/login', { email: 'a@b.co', password: gen }, 'x'); assert.equal(r.loc, '/s/adminshop');
  r = await req('GET', '/admin', null, 'adm'); const sid = /admin\/shops\/(\d+)\/status/.exec(r.text)[1];
  await req('POST', `/admin/shops/${sid}/status`, {}, 'adm');
  r = await req('GET', '/b/adminshop'); assert.match(r.text, /غير متاح/);
  // cross-origin POST rejected
  const x = await fetch(B + '/admin/login', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/x-www-form-urlencoded' }, body: 'password=owner-secret', redirect: 'manual' });
  assert.equal(x.status, 403);
  // XSS escape
  await req('POST', '/b/demo/order', { product_id: pid, name: '<script>alert(1)</script>', cc: '965', phone: '55551234' });
  r = await req('GET', '/s/demo', null, 'seller'); assert.doesNotMatch(r.text, /<script>alert/);
  console.log('ALL SMOKE TESTS PASSED');
  srv.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
