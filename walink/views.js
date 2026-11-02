'use strict';
// Server-rendered HTML views. Every dynamic value goes through esc().
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CURRENCIES = ['KWD', 'SAR', 'AED', 'QAR', 'BHD', 'OMR', 'EGP', 'JOD', 'USD'];
const CUR_AR = { KWD: 'د.ك', SAR: 'ر.س', AED: 'د.إ', QAR: 'ر.ق', BHD: 'د.ب', OMR: 'ر.ع', EGP: 'ج.م', JOD: 'د.أ', USD: '$' };
const DEC3 = new Set(['KWD', 'BHD', 'OMR', 'JOD']);
const COUNTRIES = [
  ['965', '🇰🇼 +965'], ['966', '🇸🇦 +966'], ['971', '🇦🇪 +971'], ['974', '🇶🇦 +974'], ['973', '🇧🇭 +973'],
  ['968', '🇴🇲 +968'], ['20', '🇪🇬 +20'], ['962', '🇯🇴 +962'], ['964', '🇮🇶 +964'], ['961', '🇱🇧 +961'],
  ['212', '🇲🇦 +212'], ['90', '🇹🇷 +90'], ['44', '🇬🇧 +44'], ['1', '🇺🇸 +1'],
];
const CUR_CC = { KWD: '965', SAR: '966', AED: '971', QAR: '974', BHD: '973', OMR: '968', EGP: '20', JOD: '962', USD: '1' };

function money(n, cur, lang) {
  const v = Number(n || 0).toFixed(DEC3.has(cur) ? 3 : 2);
  return lang === 'ar' ? `${v} ${CUR_AR[cur] || cur}` : `${v} ${cur}`;
}
const time = (s) => `<time data-utc="${esc(s)}">${esc(s)} UTC</time>`;

function page(ctx, title, body, opts = {}) {
  const { t, lang, path } = ctx;
  const other = t('otherCode');
  return `<!doctype html>
<html lang="${lang}" dir="${t('dir')}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="theme-color" content="#25D366">
<link rel="icon" href="/static/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/style.css?v=1">
</head>
<body data-lang="${lang}">
<header class="top"><div class="wrap top-in">
  <a class="brand" href="/"><img src="/static/icon.svg" alt="" width="28" height="28"><b>walink</b><span class="tag">${esc(t('brandTag'))}</span></a>
  <nav class="top-nav">
    <a class="lang" href="/lang?l=${other}&amp;next=${encodeURIComponent(path)}">${esc(t('other'))}</a>
    ${opts.logout ? `<form method="post" action="/logout"><button class="btn ghost sm">${esc(t('logout'))}</button></form>` : ''}
  </nav>
</div></header>
<main class="wrap">${body}</main>
<footer class="foot wrap">walink · ${esc(t('noApi'))}</footer>
<script src="/static/app.js?v=1" defer></script>
</body></html>`;
}

const errBox = (e) => (e ? `<div class="alert err">${esc(e)}</div>` : '');
const okBox = (m) => (m ? `<div class="alert ok">${esc(m)}</div>` : '');

function landing({ t }, { demo, base }) {
  const steps = ['step1', 'step2', 'step3', 'step4', 'step5'].map((k, i) => `<li><span class="num">${i + 1}</span>${esc(t(k))}</li>`).join('');
  return `
<section class="hero">
  <h1>${esc(t('heroTitle'))}</h1>
  <p class="lead">${esc(t('heroSub'))}</p>
  <div class="row gap">
    <a class="btn" href="/signup">${esc(t('ctaSignup'))}</a>
    <a class="btn ghost" href="/login">${esc(t('ctaLogin'))}</a>
    <a class="btn ghost" href="/admin">${esc(t('ctaAdmin'))}</a>
  </div>
</section>
<section class="card"><h2>${esc(t('how'))}</h2><ol class="steps">${steps}</ol><p class="muted">${esc(t('noApi'))}</p></section>
${demo ? `<section class="card"><h2>${esc(t('demoLinks'))}</h2>
  <ul class="links">
    <li>${esc(t('catalog'))}: <a href="/b/${esc(demo)}" dir="ltr">${esc(base)}/b/${esc(demo)}</a></li>
    <li>${esc(t('panel'))}: <a href="/s/${esc(demo)}" dir="ltr">${esc(base)}/s/${esc(demo)}</a></li>
    <li>${esc(t('admin'))}: <a href="/admin" dir="ltr">${esc(base)}/admin</a></li>
  </ul></section>` : ''}`;
}

function signup({ t }, { error, v = {} }) {
  return `<section class="card narrow"><h1>${esc(t('signup'))}</h1><p class="muted">${esc(t('signupSub'))}</p>${errBox(error)}
<form method="post" action="/signup" class="form">
  <label>${esc(t('shopName'))}<input name="name" required maxlength="80" value="${esc(v.name)}"></label>
  <label>${esc(t('shopSlug'))}<input name="slug" required pattern="[a-z0-9][a-z0-9\\-]{1,28}[a-z0-9]" dir="ltr" value="${esc(v.slug)}" placeholder="myshop"></label>
  <label>${esc(t('email'))}<input name="email" type="email" required dir="ltr" value="${esc(v.email)}"></label>
  <label>${esc(t('whatsapp'))}<input name="whatsapp" inputmode="tel" required dir="ltr" value="${esc(v.whatsapp)}" placeholder="9655xxxxxxx"></label>
  <label>${esc(t('password'))}<input name="password" type="password" required minlength="6"></label>
  <button class="btn">${esc(t('create'))}</button>
</form><p class="muted">${esc(t('haveAccount'))} <a href="/login">${esc(t('login'))}</a></p></section>`;
}

function login({ t }, { error, email }) {
  return `<section class="card narrow"><h1>${esc(t('sellerLogin'))}</h1>${errBox(error)}
<form method="post" action="/login" class="form">
  <label>${esc(t('email'))}<input name="email" type="email" required dir="ltr" value="${esc(email)}"></label>
  <label>${esc(t('password'))}<input name="password" type="password" required></label>
  <button class="btn">${esc(t('login'))}</button>
</form><p class="muted">${esc(t('noAccount'))} <a href="/signup">${esc(t('signup'))}</a></p></section>`;
}

function sellerLogin({ t }, { shop, error }) {
  return `<section class="card narrow"><h1>${esc(t('sellerLogin'))}</h1><p><b>${esc(shop.name)}</b> · <span dir="ltr">${esc(shop.email)}</span></p>${errBox(error)}
<form method="post" action="/s/${esc(shop.slug)}/login" class="form">
  <label>${esc(t('password'))}<input name="password" type="password" required autofocus></label>
  <button class="btn">${esc(t('login'))}</button>
</form></section>`;
}

function adminLogin({ t }, { error }) {
  return `<section class="card narrow"><h1>${esc(t('adminLogin'))}</h1>${errBox(error)}
<form method="post" action="/admin/login" class="form">
  <label>${esc(t('password'))}<input name="password" type="password" required autofocus></label>
  <button class="btn">${esc(t('login'))}</button>
</form></section>`;
}

function catalog({ t, lang }, { shop, products, selected, error }) {
  if (shop.status !== 'active') return `<section class="card narrow center"><h1>${esc(shop.name)}</h1><p>${esc(t('shopUnavailable'))}</p></section>`;
  const sel = products.some((p) => p.id === selected) ? selected : (products.length === 1 ? products[0].id : null);
  const cards = products.map((p) => `
  <label class="prod">
    <input type="radio" name="product_id" value="${p.id}" form="orderForm" ${p.id === sel ? 'checked' : ''} required>
    ${p.has_img ? `<img src="/img/${p.id}" alt="${esc(p.name)}" loading="lazy">` : `<div class="noimg">📦</div>`}
    <div class="prod-b"><b>${esc(p.name)}</b>${p.note ? `<small>${esc(p.note)}</small>` : ''}
      <span class="price">${esc(money(p.price, shop.currency, lang))}</span>
      <span class="pick" data-a="${esc(t('choose'))}" data-b="${esc(t('chosen'))}"></span></div>
  </label>`).join('');
  const defCC = CUR_CC[shop.currency] || '965';
  const ccOpts = COUNTRIES.map(([v, l]) => `<option value="${v}" ${v === defCC ? 'selected' : ''}>${l}</option>`).join('');
  return `
<section class="shop-head"><h1>${esc(shop.name)}</h1></section>
${products.length ? `<div class="grid">${cards}</div>` : `<p class="card center muted">${esc(t('catalogEmpty'))}</p>`}
${products.length ? `<section class="card" id="order"><h2>${esc(t('yourDetails'))}</h2>${errBox(error)}
<form method="post" action="/b/${esc(shop.slug)}/order" class="form" id="orderForm" data-need="${esc(t('pickProduct'))}">
  <label>${esc(t('name'))}<input name="name" required maxlength="80" autocomplete="name"></label>
  <label>${esc(t('phone'))}<span class="phone" dir="ltr"><select name="cc" aria-label="code">${ccOpts}</select><input name="phone" inputmode="tel" required minlength="6" maxlength="16" autocomplete="tel-national" placeholder="5xxxxxxx"></span></label>
  <div class="row2">
    <label>${esc(t('region'))}<input name="region" maxlength="80"></label>
    <label>${esc(t('qty'))}<input name="qty" type="number" min="1" max="99" value="1"></label>
  </div>
  <label>${esc(t('note'))}<textarea name="note" rows="2" maxlength="500"></textarea></label>
  <button class="btn wa big"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/></svg>${esc(t('sendOrder'))}</button>
  <p class="muted small">${esc(t('payNote'))}</p>
</form></section>` : ''}`;
}

function sent({ t, lang }, { shop, order, wa }) {
  return `<section class="card narrow center">
  <h1>${esc(t('sentTitle'))}</h1>
  <p class="big-num">#${order.number}</p>
  <p>${esc(order.product_name)} × ${order.qty} — <b>${esc(money(order.total, shop.currency, lang))}</b></p>
  <p class="muted">${esc(t('sentSub'))}</p>
  <a class="btn wa big" id="waGo" href="${esc(wa)}" data-auto="1">${esc(t('openWa'))}</a>
  <p><a href="/b/${esc(shop.slug)}">${esc(t('backToShop'))}</a></p>
</section>`;
}

function statusBadge(t, s) { return `<span class="badge st-${esc(s)}">${esc(t('st_' + s))}</span>`; }

function dashboard(ctx, d) {
  const { t, lang } = ctx;
  const { shop, tab, base } = d;
  const link = `${base}/b/${shop.slug}`;
  const tabs = ['orders', 'products', 'settings'].map((k) => `<a class="tab ${tab === k ? 'on' : ''}" href="/s/${esc(shop.slug)}?tab=${k}">${esc(t(k))}${k === 'orders' && d.stats.new ? ` <span class="pill">${d.stats.new}</span>` : ''}</a>`).join('');
  let body = '';
  if (tab === 'orders') body = ordersTab(ctx, d);
  else if (tab === 'products') body = productsTab(ctx, d);
  else body = settingsTab(ctx, d);
  return `
<section class="dash-head">
  <div><h1>${esc(shop.name)}</h1><span class="muted">${esc(t('dashboard'))} · ${esc(t('plan'))}: ${esc(t('plan_' + shop.plan))} · ${statusBadge2(t, shop.status)}</span></div>
</section>
${!shop.whatsapp ? `<div class="alert err">${esc(t('needWa'))}</div>` : ''}
<section class="card share">
  <label class="muted">${esc(t('shareLink'))}</label>
  <div class="share-row"><input readonly value="${esc(link)}" dir="ltr" id="shareLink">
    <button class="btn sm" type="button" data-copy="#shareLink" data-done="${esc(t('copied'))}">${esc(t('copy'))}</button>
    <a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(link)}">${esc(t('shareWa'))}</a>
    <a class="btn sm ghost" target="_blank" rel="noopener" href="/b/${esc(shop.slug)}">${esc(t('openCatalog'))}</a></div>
</section>
<section class="stats">
  <div class="stat"><b>${d.stats.total || 0}</b><span>${esc(t('statOrders'))}</span></div>
  <div class="stat"><b>${d.stats.new || 0}</b><span>${esc(t('statNew'))}</span></div>
  <div class="stat"><b>${d.stats.done || 0}</b><span>${esc(t('statDone'))}</span></div>
  <div class="stat"><b>${esc(money(d.stats.revenue, shop.currency, lang))}</b><span>${esc(t('statRevenue'))}</span></div>
</section>
<nav class="tabs">${tabs}</nav>
${okBox(d.msg)}
${body}`;
}
function statusBadge2(t, s) { return `<span class="badge s-${esc(s)}">${esc(t('s_' + s))}</span>`; }

function ordersTab({ t, lang }, d) {
  const { shop, orders, status } = d;
  const filters = ['', 'new', 'done', 'cancelled'].map((s) => `<a class="chip ${status === s ? 'on' : ''}" href="/s/${esc(shop.slug)}?tab=orders${s ? '&status=' + s : ''}">${esc(s ? t('st_' + s) : t('all'))}</a>`).join('');
  if (!orders.length) return `<div class="chips">${filters}</div><p class="card center muted">${esc(t('noOrders'))}</p>`;
  const btn = (o, st, label, cls = 'ghost') => `<form method="post" action="/s/${esc(shop.slug)}/orders/${o.id}/status"><input type="hidden" name="status" value="${st}"><input type="hidden" name="filter" value="${esc(status)}"><button class="btn sm ${cls}">${esc(label)}</button></form>`;
  const rows = orders.map((o) => `
<article class="order st-${esc(o.status)}">
  <header><b>#${o.number}</b> ${statusBadge(t, o.status)} <span class="muted small">${time(o.created_at)}</span></header>
  <dl>
    <div><dt>${esc(t('name'))}</dt><dd>${esc(o.customer_name)}</dd></div>
    <div><dt>${esc(t('product'))}</dt><dd>${esc(o.product_name)} × ${o.qty}</dd></div>
    <div><dt>${esc(t('price'))}</dt><dd>${esc(money(o.unit_price, shop.currency, lang))}</dd></div>
    <div><dt>${esc(t('total'))}</dt><dd><b>${esc(money(o.total, shop.currency, lang))}</b></dd></div>
    <div><dt>${esc(t('region'))}</dt><dd>${esc(o.region || '—')}</dd></div>
    <div><dt>${esc(t('phone'))}</dt><dd dir="ltr">+${esc(o.customer_phone)}</dd></div>
    ${o.note ? `<div class="full"><dt>${esc(t('note'))}</dt><dd>${esc(o.note)}</dd></div>` : ''}
  </dl>
  <footer class="row gap">
    ${o.status !== 'done' ? btn(o, 'done', t('markDone'), '') : btn(o, 'new', t('markNew'))}
    <a class="btn sm wa" target="_blank" rel="noopener" href="${esc(d.custLink(o))}">${esc(t('waCustomer'))}</a>
    ${o.status === 'new' ? btn(o, 'cancelled', t('cancel')) : ''}
  </footer>
</article>`).join('');
  return `<div class="chips">${filters}</div><div class="orders">${rows}</div>`;
}

function productForm({ t }, shop, p) {
  const action = p ? `/s/${esc(shop.slug)}/products/${p.id}` : `/s/${esc(shop.slug)}/products`;
  return `<form method="post" action="${action}" class="form card" data-imgform>
  <h2>${esc(p ? t('edit') : t('addProduct'))}</h2>
  <div class="row2">
    <label>${esc(t('name'))}<input name="name" required maxlength="120" value="${esc(p && p.name)}"></label>
    <label>${esc(t('price'))} (${esc(shop.currency)})<input name="price" inputmode="decimal" required value="${p ? esc(p.price) : ''}" dir="ltr"></label>
  </div>
  <label>${esc(t('note'))}<input name="note" maxlength="500" value="${esc(p && p.note)}"></label>
  <label>${esc(t('image'))}<input type="file" accept="image/*" data-imgpick></label>
  <input type="hidden" name="image" value="">
  <div class="preview">${p && p.has_img ? `<img src="/img/${p.id}" alt="">` : ''}</div>
  ${p && p.has_img ? `<label class="check"><input type="checkbox" name="remove_image" value="1"> ${esc(t('removeImage'))}</label>` : ''}
  <div class="row gap"><button class="btn">${esc(t('save'))}</button>${p ? `<a class="btn ghost" href="/s/${esc(shop.slug)}?tab=products">${esc(t('cancel'))}</a>` : ''}</div>
</form>`;
}

function productsTab(ctx, d) {
  const { t, lang } = ctx;
  const { shop, products, edit } = d;
  const list = products.map((p) => `
<div class="pitem ${p.active ? '' : 'off'}">
  ${p.has_img ? `<img src="/img/${p.id}" alt="">` : '<div class="noimg sm">📦</div>'}
  <div class="grow"><b>${esc(p.name)}</b> ${p.active ? '' : `<span class="badge">${esc(t('hidden'))}</span>`}<br>
    <span class="price">${esc(money(p.price, shop.currency, lang))}</span> ${p.note ? `<small class="muted">· ${esc(p.note)}</small>` : ''}</div>
  <div class="row gap">
    <a class="btn sm ghost" href="/s/${esc(shop.slug)}?tab=products&edit=${p.id}">${esc(t('edit'))}</a>
    <form method="post" action="/s/${esc(shop.slug)}/products/${p.id}/toggle"><button class="btn sm ghost">${esc(p.active ? t('hide') : t('show'))}</button></form>
    <form method="post" action="/s/${esc(shop.slug)}/products/${p.id}/delete" data-confirm="${esc(t('confirmDel'))}"><button class="btn sm danger">${esc(t('del'))}</button></form>
  </div>
</div>`).join('');
  return `${productForm(ctx, shop, edit)}<div class="card plist">${list || `<p class="muted center">${esc(t('catalogEmpty'))}</p>`}</div>`;
}

function settingsTab({ t }, { shop }) {
  const cur = CURRENCIES.map((c) => `<option ${c === shop.currency ? 'selected' : ''}>${c}</option>`).join('');
  return `<form method="post" action="/s/${esc(shop.slug)}/settings" class="form card">
  <label>${esc(t('shopName'))}<input name="name" required maxlength="80" value="${esc(shop.name)}"></label>
  <label>${esc(t('whatsapp'))}<input name="whatsapp" inputmode="tel" required dir="ltr" value="${esc(shop.whatsapp)}" placeholder="9655xxxxxxx"></label>
  <label>${esc(t('currency'))}<select name="currency">${cur}</select></label>
  <label>${esc(t('newPassword'))}<input name="password" type="password" minlength="6" autocomplete="new-password"></label>
  <p class="muted small">${esc(t('email'))}: <span dir="ltr">${esc(shop.email)}</span></p>
  <button class="btn">${esc(t('save'))}</button>
</form>`;
}

function admin({ t }, { stats, shops, flash, base, error }) {
  const f = flash ? `<div class="alert ok"><b>${esc(flash.kind === 'created' ? t('shopCreated') : t('newPassIs'))}</b><br>
    ${esc(t('panel'))}: <a dir="ltr" href="/s/${esc(flash.slug)}">${esc(base)}/s/${esc(flash.slug)}</a><br>
    ${esc(t('catalog'))}: <a dir="ltr" href="/b/${esc(flash.slug)}">${esc(base)}/b/${esc(flash.slug)}</a><br>
    ${esc(t('email'))}: <span dir="ltr">${esc(flash.email)}</span> · ${esc(t('password'))}: <code dir="ltr">${esc(flash.password)}</code></div>` : '';
  const act = (s, a, label, cls = 'ghost') => `<form method="post" action="/admin/shops/${s.id}/${a}"><button class="btn sm ${cls}">${esc(label)}</button></form>`;
  const rows = shops.map((s) => `<tr>
    <td><b>${esc(s.name)}</b><br><small class="muted" dir="ltr">/${esc(s.slug)}</small></td>
    <td dir="ltr">${esc(s.email)}</td>
    <td dir="ltr">${s.whatsapp ? '+' + esc(s.whatsapp) : '—'}</td>
    <td><span class="badge p-${esc(s.plan)}">${esc(t('plan_' + s.plan))}</span></td>
    <td>${statusBadge2(t, s.status)}</td>
    <td>${s.orders}</td>
    <td class="small">${time(s.created_at)}</td>
    <td class="acts"><a class="btn sm ghost" href="/s/${esc(s.slug)}">${esc(t('panel'))}</a><a class="btn sm ghost" href="/b/${esc(s.slug)}">${esc(t('catalog'))}</a>
      ${act(s, 'plan', s.plan === 'monthly' ? t('toTrial') : t('toMonthly'))}
      ${act(s, 'status', s.status === 'active' ? t('suspend') : t('activate'), s.status === 'active' ? 'danger' : '')}
      ${act(s, 'password', t('resetPass'))}</td>
  </tr>`).join('');
  return `<h1>${esc(t('admin'))}</h1>${f}${errBox(error)}
<section class="stats">
  <div class="stat"><b>${stats.shops || 0}</b><span>${esc(t('shops'))}</span></div>
  <div class="stat"><b>${stats.monthly || 0}</b><span>${esc(t('subs'))}</span></div>
  <div class="stat"><b>${stats.trial || 0}</b><span>${esc(t('trials'))}</span></div>
  <div class="stat"><b>${stats.orders || 0}</b><span>${esc(t('allOrders'))} <small>(7d: ${stats.orders7})</small></span></div>
</section>
<details class="card" ${shops.length ? '' : 'open'}><summary><b>+ ${esc(t('createShop'))}</b></summary>
<form method="post" action="/admin/shops" class="form">
  <div class="row2"><label>${esc(t('shopName'))}<input name="name" required></label>
  <label>${esc(t('shopSlug'))}<input name="slug" required dir="ltr" pattern="[a-z0-9][a-z0-9\\-]{1,28}[a-z0-9]"></label></div>
  <div class="row2"><label>${esc(t('email'))}<input name="email" type="email" required dir="ltr"></label>
  <label>${esc(t('whatsapp'))}<input name="whatsapp" inputmode="tel" dir="ltr"></label></div>
  <div class="row2"><label>${esc(t('plan'))}<select name="plan"><option value="trial">${esc(t('plan_trial'))}</option><option value="monthly">${esc(t('plan_monthly'))}</option></select></label>
  <label>${esc(t('passOptional'))}<input name="password" dir="ltr" minlength="6"></label></div>
  <button class="btn">${esc(t('create'))}</button>
</form></details>
<section class="card"><h2>${esc(t('sellers'))}</h2><div class="tablewrap"><table>
<thead><tr><th>${esc(t('shopName'))}</th><th>${esc(t('email'))}</th><th>WhatsApp</th><th>${esc(t('plan'))}</th><th>${esc(t('status'))}</th><th>${esc(t('ordersCount'))}</th><th>${esc(t('registered'))}</th><th>${esc(t('actions'))}</th></tr></thead>
<tbody>${rows}</tbody></table></div></section>`;
}

function notFound({ t }) { return `<section class="card narrow center"><h1>404</h1><p>${esc(t('notFound'))}</p><a class="btn" href="/">walink</a></section>`; }

module.exports = { page, landing, signup, login, sellerLogin, adminLogin, catalog, sent, dashboard, admin, notFound, money, esc, CURRENCIES };
