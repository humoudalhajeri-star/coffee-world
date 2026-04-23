/**
 * ZAKERAH — ذاكِرة
 * Your external memory for AI conversations.
 * Types: code · prompt · info · idea.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'zakerah.v1';

  const TYPES = [
    {
      id: 'code',
      ar: 'كود',
      en: 'Code',
      icon: '{ }',
      verb: 'أضف كود',
      verbEn: 'NEW CODE',
      accent: 'var(--code)',
    },
    {
      id: 'prompt',
      ar: 'برومبت',
      en: 'Prompt',
      icon: '✨',
      verb: 'أضف برومبت',
      verbEn: 'NEW PROMPT',
      accent: 'var(--prompt)',
    },
    {
      id: 'info',
      ar: 'معلومة',
      en: 'Info',
      icon: '📝',
      verb: 'أضف معلومة',
      verbEn: 'NEW INFO',
      accent: 'var(--info)',
    },
    {
      id: 'idea',
      ar: 'فكرة',
      en: 'Idea',
      icon: '💡',
      verb: 'أضف فكرة',
      verbEn: 'NEW IDEA',
      accent: 'var(--idea)',
    },
  ];

  const LANGS = [
    'javascript', 'typescript', 'python', 'html', 'css',
    'sql', 'bash', 'json', 'php', 'go', 'rust', 'swift', 'other',
  ];

  const TARGET_AIS = [
    'ChatGPT', 'Claude', 'Gemini', 'Grok', 'Perplexity',
    'Midjourney', 'DALL-E', 'Other',
  ];

  const STATUSES = [
    { id: 'new',       ar: 'جديد',    en: 'New' },
    { id: 'exploring', ar: 'يُستكشف', en: 'Exploring' },
    { id: 'pursuing',  ar: 'قيد التنفيذ', en: 'Pursuing' },
    { id: 'shipped',   ar: 'منجز',    en: 'Shipped' },
    { id: 'archived',  ar: 'مؤرشف',   en: 'Archived' },
  ];

  const PRIORITIES = [
    { id: 'low', ar: 'منخفضة', en: 'Low' },
    { id: 'med', ar: 'متوسطة', en: 'Medium' },
    { id: 'high', ar: 'عالية', en: 'High' },
  ];

  /* ============ STATE ============ */
  let state = {
    items: [],
    filter: { type: 'all', q: '' },
    editing: null, // item being edited in modal
    creatingType: 'code',
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        state.items = Array.isArray(d.items) ? d.items : [];
      }
    } catch {}
    if (state.items.length === 0) seedDemo();
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: state.items }));
  }

  function seedDemo() {
    const now = Date.now();
    state.items = [
      {
        id: uid(),
        type: 'code',
        title: 'useMemo للعمليات الثقيلة في React',
        body: "import { useMemo } from 'react';\n\nfunction TotalBill({ items }) {\n  const total = useMemo(\n    () => items.reduce((s, i) => s + i.price, 0),\n    [items]\n  );\n  return <h3>{total} KWD</h3>;\n}",
        lang: 'javascript',
        tags: ['react', 'performance'],
        important: true,
        createdAt: now - 1000 * 60 * 60 * 3,
      },
      {
        id: uid(),
        type: 'prompt',
        title: 'إيميل احترافي بالعربي',
        body: 'اكتب لي إيميل احترافي بالعربي لـ{{recipient}} بخصوص {{topic}}. الأسلوب: {{tone}}. اجعله موجزاً (3-4 فقرات) واختم بدعوة واضحة للتواصل.',
        targetAi: 'ChatGPT',
        tags: ['email', 'writing'],
        usedCount: 0,
        important: false,
        createdAt: now - 1000 * 60 * 60 * 24,
      },
      {
        id: uid(),
        type: 'info',
        title: 'فرق useMemo عن useCallback',
        body: 'useMemo يحفظ قيمة ناتج حساب ثقيل.\nuseCallback يحفظ مرجع الدالة نفسها.\n\nالقاعدة: استخدم useMemo للقيم، واستخدم useCallback للدوال الممرّرة كـprops لمكوّنات محفوظة بـReact.memo.',
        source: 'ChatGPT',
        sourceUrl: '',
        tags: ['react', 'hooks'],
        important: true,
        createdAt: now - 1000 * 60 * 60 * 24 * 2,
      },
      {
        id: uid(),
        type: 'idea',
        title: 'تطبيق يجمع screenshots القهوة من انستقرام',
        body: 'فكرة: تطبيق يلتقط screenshots المقاهي من قصص انستقرام، يصنّفها حسب المدينة، ويُنبّه المستخدم عند قرب أي منها.',
        status: 'exploring',
        priority: 'high',
        tags: ['coffee', 'app'],
        important: false,
        createdAt: now - 1000 * 60 * 60 * 24 * 5,
      },
    ];
    persist();
  }

  /* ============ UTILS ============ */
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  function uid() {
    return 'z_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  }

  function esc(s) {
    return (s || '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)     return 'الآن';
    if (s < 3600)   return Math.floor(s / 60) + 'د';
    if (s < 86400)  return Math.floor(s / 3600) + 'س';
    if (s < 604800) return Math.floor(s / 86400) + 'ي';
    return new Date(ts).toLocaleDateString('ar');
  }

  function getType(id) { return TYPES.find((t) => t.id === id) || TYPES[0]; }

  function countByType(id) {
    return state.items.filter((it) => it.type === id).length;
  }

  function toast(msg, kind = '') {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show ' + kind;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.className = 'toast ' + kind; }, 2400);
  }

  /* ============ TABS ============ */
  function renderTabs() {
    const wrap = $('#tabs');
    wrap.innerHTML = `
      <button class="tab ${state.filter.type === 'all' ? 'active' : ''}" data-tab="all">
        الكل · All
        <span class="tab-count">${state.items.length}</span>
      </button>
      ${TYPES.map((t) => `
        <button class="tab ${state.filter.type === t.id ? 'active' : ''}" data-tab="${t.id}" data-type="${t.id}">
          <span class="tab-dot"></span>
          ${t.icon} ${esc(t.ar)} · ${esc(t.en)}
          <span class="tab-count">${countByType(t.id)}</span>
        </button>
      `).join('')}
    `;
    $$('[data-tab]').forEach((el) => {
      el.onclick = () => {
        state.filter.type = el.dataset.tab;
        render();
      };
    });
  }

  /* ============ LIST ============ */
  function render() {
    renderTabs();
    renderList();
  }

  function filteredItems() {
    const q = (state.filter.q || '').trim().toLowerCase();
    return state.items.filter((it) => {
      if (state.filter.type !== 'all' && it.type !== state.filter.type) return false;
      if (!q) return true;
      const hay = (it.title + ' ' + it.body + ' ' + (it.tags || []).join(' ')).toLowerCase();
      return hay.includes(q);
    }).sort((a, b) => b.createdAt - a.createdAt);
  }

  function renderList() {
    const items = filteredItems();
    const listWrap = $('#list');
    const countEl = $('#count');

    countEl.textContent = items.length + (items.length === 1 ? ' عنصر · 1 item' : ' عناصر · ' + items.length + ' items');

    if (items.length === 0) {
      listWrap.innerHTML = `
        <div class="empty">
          <div class="empty-emoji">🧠</div>
          <h3>${state.filter.q ? 'لا نتائج' : 'ذاكرتك فارغة'}</h3>
          <p>${state.filter.q ? 'جرّب كلمة أخرى' : 'ابدأ بإضافة أول معلومة من الـAI'}</p>
          ${!state.filter.q ? '<button class="btn btn-indigo" onclick="window.Z.openCreate()">＋ أضف أول شي</button>' : ''}
        </div>`;
      return;
    }

    listWrap.innerHTML = items.map(entryHTML).join('');
    $$('[data-item]').forEach((el) => {
      el.onclick = () => window.Z.openDetail(el.dataset.item);
    });
  }

  function highlight(text, q) {
    if (!q) return esc(text);
    const safe = esc(text);
    const qq = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp(qq, 'ig'), (m) => `<mark>${m}</mark>`);
  }

  function entryHTML(it) {
    const t = getType(it.type);
    const q = state.filter.q.toLowerCase();

    let previewClass = '';
    if (it.type === 'code') previewClass = 'mono';

    const tags = (it.tags || []).map((x) => `<span class="entry-tag">#${esc(x)}</span>`).join('');

    // Type-specific foot accessories
    let accessory = '';
    if (it.type === 'code' && it.lang) {
      accessory = `<span class="entry-lang">${esc(it.lang)}</span>`;
    } else if (it.type === 'prompt' && it.targetAi) {
      accessory = `<span class="entry-tag">→ ${esc(it.targetAi)}</span>`;
    } else if (it.type === 'info' && it.source) {
      accessory = `<span class="entry-tag">📎 ${esc(it.source)}</span>`;
    } else if (it.type === 'idea') {
      const st = STATUSES.find((s) => s.id === it.status);
      const pr = PRIORITIES.find((p) => p.id === it.priority);
      accessory =
        (st ? `<span class="entry-tag">● ${esc(st.ar)}</span>` : '') +
        (pr ? `<span class="entry-tag pill-prio-${pr.id}">◈ ${esc(pr.ar)}</span>` : '');
    }

    return `
      <button class="entry" data-type="${it.type}" data-item="${it.id}">
        <div class="entry-head">
          <span class="entry-type">${t.icon} ${esc(t.ar)} · ${esc(t.en)}</span>
          <div class="entry-meta-side">
            <span>${timeAgo(it.createdAt)}</span>
            <span class="entry-star ${it.important ? 'on' : ''}">${it.important ? '★' : '☆'}</span>
          </div>
        </div>
        <h3 class="entry-title">${highlight(it.title, q)}</h3>
        <div class="entry-preview ${previewClass}">${highlight((it.body || '').slice(0, 180), q)}${(it.body || '').length > 180 ? '…' : ''}</div>
        <div class="entry-foot">
          ${accessory}
          ${tags}
          <span class="entry-action-icon">→</span>
        </div>
      </button>`;
  }

  /* Expose globals for part 2 */
  window.Z = window.Z || {};
  Object.assign(window.Z, {
    state, STORAGE_KEY,
    TYPES, LANGS, TARGET_AIS, STATUSES, PRIORITIES,
    persist, load, uid, esc, timeAgo, getType, countByType, toast,
    render, renderTabs, renderList, entryHTML, filteredItems, highlight,
  });

  /* part 2 provides: openCreate, openDetail, openEdit, bindGlobal, bootstrap */

})();
