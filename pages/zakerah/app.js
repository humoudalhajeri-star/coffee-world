/**
 * ذاكرة الذكاء الاصطناعي — AI MEMORY
 * Premium memory system for AI users.
 * Types: prompt · code · note · answer · idea · template.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'zakerah.v1';

  const TYPES = [
    {
      id: 'prompt',
      ar: 'برومبت',
      arHint: 'أوامر الذكاء الاصطناعي',
      en: 'Prompt',
      icon: '✨',
      verb: 'برومبت جديد',
      verbEn: 'NEW PROMPT',
    },
    {
      id: 'code',
      ar: 'كود',
      en: 'Code',
      icon: '{ }',
      verb: 'كود جديد',
      verbEn: 'NEW CODE',
    },
    {
      id: 'note',
      ar: 'ملاحظة',
      en: 'Note',
      icon: '✎',
      verb: 'ملاحظة جديدة',
      verbEn: 'NEW NOTE',
    },
    {
      id: 'answer',
      ar: 'إجابة',
      en: 'Answer',
      icon: '💬',
      verb: 'إجابة محفوظة',
      verbEn: 'NEW ANSWER',
    },
    {
      id: 'idea',
      ar: 'فكرة',
      en: 'Idea',
      icon: '💡',
      verb: 'فكرة جديدة',
      verbEn: 'NEW IDEA',
    },
    {
      id: 'template',
      ar: 'قالب',
      en: 'Template',
      icon: '◳',
      verb: 'قالب جديد',
      verbEn: 'NEW TEMPLATE',
    },
  ];

  const SOURCES = ['ChatGPT', 'Claude', 'Gemini', 'Grok', 'Perplexity', 'Manual', 'Other'];

  const COLL_COLORS = [
    { id: 'teal',    hex: '#0D9488' },
    { id: 'indigo',  hex: '#4F46E5' },
    { id: 'purple',  hex: '#7C3AED' },
    { id: 'rose',    hex: '#E11D48' },
    { id: 'amber',   hex: '#D97706' },
    { id: 'emerald', hex: '#059669' },
    { id: 'blue',    hex: '#1D4ED8' },
    { id: 'slate',   hex: '#475569' },
  ];
  const COLL_ICONS = ['📁', '⭐', '💼', '💡', '🎨', '📚', '🧠', '☕', '🚀', '🔧', '✨', '🏷️'];

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
    collections: [],
    customTypes: [],     // user-defined types, same shape as built-in TYPES
    recent: [],          // recently viewed item ids (newest first, capped at 10)
    filter: { type: 'all', q: '' },
    editing: null,       // item being edited in modal
    creatingType: 'code',
    collEditing: null,   // collection being edited
    collCurrent: null,   // collection currently viewed (detail mode)
    newTypeOpen: false,  // inline "create type" form open?
  };

  /** Built-in TYPES merged with user-defined customTypes. Used everywhere. */
  function allTypes() {
    return TYPES.concat(state.customTypes || []);
  }

  // Seeded demo items — titles are unique and used to flag legacy data.
  const LEGACY_DEMO_TITLES = new Set([
    'إيميل احترافي موجَّه',
    'useMemo للعمليات الثقيلة في React',
    'الفرق بين useMemo و useCallback',
    'أفضل أدوات إدارة المهام لفريق صغير',
    'تطبيق يجمع screenshots المقاهي من انستقرام',
    'قالب مراجعة منتج (Product Review Outline)',
  ]);
  const LEGACY_DEMO_COLLS = new Set(['أفضل البرومبتس', 'مكتبة الكود']);

  function load() {
    let dirty = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        state.items = Array.isArray(d.items) ? d.items : [];
        state.collections = Array.isArray(d.collections) ? d.collections : [];
        state.customTypes = Array.isArray(d.customTypes) ? d.customTypes : [];
        state.recent = Array.isArray(d.recent) ? d.recent : [];
        // migrate legacy type 'info' → 'note'
        state.items.forEach((it) => { if (it.type === 'info') it.type = 'note'; });
        // back-fill isDemo for legacy seeded items so the banner + badge work
        state.items.forEach((it) => {
          if (it.isDemo === undefined && LEGACY_DEMO_TITLES.has(it.title)) {
            it.isDemo = true;
            dirty = true;
          }
        });
        state.collections.forEach((c) => {
          if (c.isDemo === undefined && LEGACY_DEMO_COLLS.has(c.name)) {
            c.isDemo = true;
            dirty = true;
          }
        });
      }
    } catch {}
    if (dirty) persist();
    // Intentionally no auto-seed here — welcome modal drives first-visit.
  }

  const WELCOMED_KEY = 'zakerah.welcomed';
  function hasWelcomed()   { return !!localStorage.getItem(WELCOMED_KEY); }
  function markWelcomed()  { localStorage.setItem(WELCOMED_KEY, '1'); }
  function shouldShowWelcome() {
    return !hasWelcomed() && state.items.length === 0 && state.collections.length === 0;
  }
  function countDemoItems() {
    return state.items.filter((it) => it.isDemo).length;
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      items: state.items,
      collections: state.collections,
      customTypes: state.customTypes,
      recent: state.recent,
    }));
  }

  function trackRecent(id) {
    if (!id) return;
    state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, 10);
    persist();
  }

  function seedCollections() {
    const now = Date.now();
    state.collections = [
      {
        id: uid(),
        name: 'أفضل البرومبتس',
        description: 'البرومبتس اللي تشتغل في ChatGPT و Claude بشكل ممتاز.',
        icon: '✨',
        color: '#7C3AED',
        itemIds: [],
        isDemo: true,
        createdAt: now,
      },
      {
        id: uid(),
        name: 'مكتبة الكود',
        description: 'Snippets جاهزة للنسخ — React, JS, CSS.',
        icon: '📚',
        color: '#0D9488',
        itemIds: [],
        isDemo: true,
        createdAt: now,
      },
    ];
    persist();
  }

  function seedDemo() {
    const now = Date.now();
    state.items = [
      {
        id: uid(),
        type: 'prompt',
        title: 'إيميل احترافي موجَّه',
        body: 'اكتب إيميلاً احترافياً لـ{{recipient}} بخصوص {{topic}}. الأسلوب: {{tone}}. اجعله موجزاً (3-4 فقرات) واختم بدعوة واضحة للتواصل.',
        source: 'ChatGPT',
        targetAi: 'ChatGPT',
        tags: ['email', 'writing'],
        usedCount: 0,
        important: true, isDemo: true,
        createdAt: now - 1000 * 60 * 60 * 2,
      },
      {
        id: uid(),
        type: 'code',
        title: 'useMemo للعمليات الثقيلة في React',
        body: "import { useMemo } from 'react';\n\nfunction TotalBill({ items }) {\n  const total = useMemo(\n    () => items.reduce((s, i) => s + i.price, 0),\n    [items]\n  );\n  return <h3>{total} KWD</h3>;\n}",
        source: 'Claude',
        lang: 'javascript',
        tags: ['react', 'performance'],
        important: true, isDemo: true,
        createdAt: now - 1000 * 60 * 60 * 6,
      },
      {
        id: uid(),
        type: 'note',
        title: 'الفرق بين useMemo و useCallback',
        body: 'useMemo يحفظ قيمة ناتج حساب ثقيل.\nuseCallback يحفظ مرجع الدالة نفسها.\n\nالقاعدة: استخدم useMemo للقيم، و useCallback للدوال الممرّرة كـprops لمكوّنات محفوظة بـReact.memo.',
        source: 'ChatGPT',
        sourceUrl: '',
        tags: ['react', 'hooks'],
        important: false, isDemo: true,
        createdAt: now - 1000 * 60 * 60 * 24,
      },
      {
        id: uid(),
        type: 'answer',
        title: 'أفضل أدوات إدارة المهام لفريق صغير',
        body: '١) Linear — أفضل للفرق التقنية.\n٢) Notion — الأكثر مرونة لكن يحتاج إعداد.\n٣) Things 3 — للأفراد فقط.\n٤) Asana — مناسب لفرق التسويق.\n\nالتوصية: Linear + Notion معاً.',
        source: 'Claude',
        tags: ['productivity', 'tools'],
        important: false, isDemo: true,
        createdAt: now - 1000 * 60 * 60 * 24 * 2,
      },
      {
        id: uid(),
        type: 'idea',
        title: 'تطبيق يجمع screenshots المقاهي من انستقرام',
        body: 'فكرة: تطبيق يلتقط screenshots المقاهي من قصص انستقرام، يصنّفها حسب المدينة، ويُنبّه المستخدم عند قرب أي منها.',
        source: 'Manual',
        status: 'exploring',
        priority: 'high',
        tags: ['coffee', 'app'],
        important: false, isDemo: true,
        createdAt: now - 1000 * 60 * 60 * 24 * 5,
      },
      {
        id: uid(),
        type: 'template',
        title: 'قالب مراجعة منتج (Product Review Outline)',
        body: '1. ملخص بسطر واحد\n2. الجمهور المستهدف\n3. أهم 3 مزايا\n4. أهم 3 عيوب\n5. مقارنة مع منافس قريب\n6. التوصية النهائية + لمن يناسب',
        source: 'Manual',
        tags: ['content', 'review'],
        important: false, isDemo: true,
        createdAt: now - 1000 * 60 * 60 * 24 * 7,
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

  function getType(id) {
    return allTypes().find((t) => t.id === id) || TYPES[0];
  }

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

  /* ============ TYPE FILTER DROPDOWN (next to "+ جديد") ============ */
  function renderTypeFilter() {
    const sel = $('#type-filter');
    if (!sel) return;
    const types = allTypes();
    const favCount = state.items.filter((x) => x.important).length;
    sel.innerHTML = `
      <option value="all">🗂 الكل (${state.items.length})</option>
      <option value="fav">⭐ المفضلة (${favCount})</option>
      <optgroup label="الأنواع · Types">
        ${types.map((t) =>
          `<option value="${esc(t.id)}">${t.icon} ${esc(t.ar)} (${countByType(t.id)})</option>`
        ).join('')}
      </optgroup>
    `;
    sel.value = state.filter.type || 'all';
  }

  /* ============ TABS ============ */
  function renderTabs() {
    const wrap = $('#tabs');
    const favCount = state.items.filter((x) => x.important).length;
    wrap.innerHTML = `
      <button class="tab ${state.filter.type === 'all' ? 'active' : ''}" data-tab="all">
        الكل · All
        <span class="tab-count">${state.items.length}</span>
      </button>
      <button class="tab ${state.filter.type === 'fav' ? 'active' : ''}" data-tab="fav" style="color: ${state.filter.type === 'fav' ? '#C89B3C' : ''}; border-bottom-color: ${state.filter.type === 'fav' ? '#C89B3C' : ''};">
        ⭐ المفضلة · Favorites
        <span class="tab-count" style="${state.filter.type === 'fav' ? 'background:#C89B3C; color:#fff;' : ''}">${favCount}</span>
      </button>
      ${allTypes().map((t) => `
        <button class="tab ${state.filter.type === t.id ? 'active' : ''}" data-tab="${t.id}" data-type="${t.id}">
          <span class="tab-dot" ${t.isCustom ? `style="background:${esc(t.color || '#0D9488')};"` : ''}></span>
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
    renderTypeFilter();
    renderTabs();
    renderList();
  }

  function filteredItems() {
    const q = (state.filter.q || '').trim().toLowerCase();
    const f = state.filter.type;
    return state.items.filter((it) => {
      if (f === 'fav' && !it.important) return false;
      if (f !== 'all' && f !== 'fav' && it.type !== f) return false;
      if (!q) return true;
      const hay = (it.title + ' ' + it.body + ' ' + (it.tags || []).join(' ')).toLowerCase();
      return hay.includes(q);
    }).sort((a, b) => b.createdAt - a.createdAt);
  }

  function renderRecentStrip() {
    // only on the "All" tab with no active search
    if (state.filter.type !== 'all' || state.filter.q) return '';
    const recent = state.recent
      .map((id) => state.items.find((x) => x.id === id))
      .filter(Boolean)
      .slice(0, 8);
    if (recent.length === 0) return '';
    return `
      <div class="recent-strip">
        <div class="recent-strip-head">
          <h4>
            ⏱ الأحدث تصفّحاً
            <span class="en">RECENTLY VIEWED</span>
          </h4>
          <button id="recent-clear">مسح</button>
        </div>
        <div class="recent-chips">
          ${recent.map((it) => {
            const t = getType(it.type);
            return `
              <button class="recent-chip" data-item="${it.id}" title="${esc(it.title)}">
                <span class="recent-chip-icon">${t.icon}</span>
                ${esc(it.title)}
              </button>`;
          }).join('')}
        </div>
      </div>`;
  }

  function renderDemoBanner() {
    // only show on the main "All" tab with no active search
    if (state.filter.type !== 'all' || state.filter.q) return '';
    const n = countDemoItems();
    if (n === 0) return '';
    return `
      <div class="demo-banner">
        <div>
          📘 في ذاكرتك <strong>${n} عنصر أمثلة</strong> جهّزناها لك.
          احذفها متى شئت لتبقى محفوظاتك الشخصية فقط.
        </div>
        <button class="btn btn-ghost btn-sm" id="clear-demos">🗑 احذف الأمثلة</button>
      </div>`;
  }

  function renderList() {
    const items = filteredItems();
    const listWrap = $('#list');
    const countEl = $('#count');

    countEl.textContent = items.length + (items.length === 1 ? ' عنصر · 1 item' : ' عناصر · ' + items.length + ' items');

    const recentStripHTML = renderRecentStrip();
    const demoBannerHTML = renderDemoBanner();

    if (items.length === 0) {
      listWrap.innerHTML = demoBannerHTML + recentStripHTML + `
        <div class="empty">
          <div class="empty-emoji">${state.filter.type === 'fav' ? '⭐' : '🧠'}</div>
          <h3>${
            state.filter.q ? 'لا نتائج' :
            state.filter.type === 'fav' ? 'لا توجد مفضلات بعد' :
            'ذاكرتك فارغة'
          }</h3>
          <p>${
            state.filter.q ? 'جرّب كلمة أخرى' :
            state.filter.type === 'fav' ? 'علّم أي عنصر بنجمة ⭐ ليظهر هنا' :
            'ابدأ بإضافة أول معلومة من الـAI'
          }</p>
          ${!state.filter.q && state.filter.type !== 'fav'
            ? '<button class="btn btn-indigo" onclick="window.Z.openCreate()">＋ أضف أول شي</button>'
            : ''}
        </div>`;
    } else {
      listWrap.innerHTML = demoBannerHTML + recentStripHTML + items.map(entryHTML).join('');
    }

    $$('[data-item]').forEach((el) => {
      el.onclick = () => window.Z.openDetail(el.dataset.item);
    });
    const clear = $('#recent-clear');
    if (clear) clear.onclick = () => { state.recent = []; persist(); render(); };
    const demoClearBtn = $('#clear-demos');
    if (demoClearBtn) demoClearBtn.onclick = clearDemoItems;
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
    } else if (it.source) {
      accessory = `<span class="entry-tag">📎 ${esc(it.source)}</span>`;
    }
    if (it.type === 'idea') {
      const st = STATUSES.find((s) => s.id === it.status);
      const pr = PRIORITIES.find((p) => p.id === it.priority);
      accessory =
        (st ? `<span class="entry-tag">● ${esc(st.ar)}</span>` : '') +
        (pr ? `<span class="entry-tag pill-prio-${pr.id}">◈ ${esc(pr.ar)}</span>` : '');
    }

    return `
      <button class="entry" data-type="${it.type}" data-item="${it.id}">
        <div class="entry-head">
          <span class="entry-type">${t.icon} ${esc(t.ar)} · ${esc(t.en)}</span>${it.isDemo ? '<span class="entry-demo">مثال</span>' : ''}
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

  /* ============ WELCOME (first visit) ============ */
  function openWelcome() {
    $('#welcome-modal')?.classList.add('open');
  }
  function closeWelcome() {
    $('#welcome-modal')?.classList.remove('open');
  }

  function startWithDemos() {
    seedDemo();
    seedCollections();
    markWelcomed();
    closeWelcome();
    render();
    toast('أهلاً! جهّزنا لك ٥ أمثلة', 'success');
  }

  function startBlank() {
    markWelcomed();
    persist();
    closeWelcome();
    render();
    toast('ذاكرة فارغة — ابدأ الحين ✨', 'success');
  }

  function clearDemoItems() {
    const demoCount = countDemoItems();
    const demoCollCount = state.collections.filter((c) => c.isDemo).length;
    if (demoCount === 0 && demoCollCount === 0) return;
    const msg = `حذف جميع الأمثلة (${demoCount} عنصر + ${demoCollCount} باقة)؟\nمحفوظاتك الشخصية لن تُمسّ.`;
    if (!confirm(msg)) return;
    state.items = state.items.filter((it) => !it.isDemo);
    state.collections = state.collections.filter((c) => !c.isDemo);
    // also clean remaining collections' itemIds of any now-missing refs
    state.collections.forEach((c) => {
      c.itemIds = (c.itemIds || []).filter((id) => state.items.find((x) => x.id === id));
    });
    state.recent = state.recent.filter((id) => state.items.find((x) => x.id === id));
    persist();
    toast('اختفت الأمثلة ✓', 'success');
    render();
  }

  /* ============ EVENT TRACKING (silent, silent on failure) ============ */
  const EVENT_DEDUPE_KEY = 'zakerah.events.once';
  async function logEvent(name, meta = {}) {
    try {
      if (!window.CW_FB) return;
      try { await window.CW_FB.ready; } catch {}
      if (typeof window.CW_FB.createDoc !== 'function') return;
      await window.CW_FB.createDoc('events', {
        name,
        app: 'zakerah',
        device: /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ? 'mobile' : 'desktop',
        ...meta,
      });
    } catch { /* never break UX on analytics failure */ }
  }
  function logEventOnce(name, meta) {
    try {
      let seen = [];
      try { seen = JSON.parse(localStorage.getItem(EVENT_DEDUPE_KEY) || '[]'); } catch {}
      if (seen.includes(name)) return;
      seen.push(name);
      localStorage.setItem(EVENT_DEDUPE_KEY, JSON.stringify(seen));
      logEvent(name, meta);
    } catch {}
  }

  /* ============ AUTH / CROSS-DEVICE PRO ============ */
  let authMode = 'signin'; // or 'signup'

  function currentUser() {
    return window.CW_FB?.auth?.current?.();
  }

  function isSignedIn() {
    return !!currentUser();
  }

  async function fbReady() {
    if (!window.CW_FB) return false;
    try { await window.CW_FB.ready; } catch {}
    return true;
  }

  function openAuth(mode = 'signin') {
    setAuthMode(mode);
    $('#auth-email').value = '';
    $('#auth-password').value = '';
    const msg = $('#auth-msg'); if (msg) msg.textContent = '';
    $('#auth-modal')?.classList.add('open');
    setTimeout(() => $('#auth-email')?.focus(), 60);
  }
  function closeAuth() { $('#auth-modal')?.classList.remove('open'); }

  function setAuthMode(mode) {
    authMode = mode;
    $$('[data-auth-tab]').forEach((el) => {
      el.classList.toggle('active', el.dataset.authTab === mode);
    });
    $('#auth-heading').textContent = mode === 'signup' ? 'إنشاء حساب' : 'تسجيل الدخول';
    $('#auth-submit').textContent  = mode === 'signup' ? 'إنشاء الحساب' : 'تسجيل الدخول';
    const pw = $('#auth-password');
    if (pw) pw.setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
  }

  function setAuthMsg(text, kind) {
    const m = $('#auth-msg');
    if (!m) return;
    m.textContent = text;
    m.style.color = kind === 'danger' ? 'var(--danger)'
                  : kind === 'success' ? 'var(--success)'
                  : 'var(--muted)';
  }

  async function submitAuth(e) {
    e.preventDefault();
    const email = $('#auth-email').value.trim().toLowerCase();
    const password = $('#auth-password').value;
    if (!email || !password) { setAuthMsg('⚠ عبّي الحقلين', 'danger'); return; }
    if (!await fbReady()) { setAuthMsg('⚠ تعذّر الاتصال بالخدمة', 'danger'); return; }

    const btn = $('#auth-submit');
    const original = btn.textContent;
    btn.disabled = true; btn.textContent = '⏳ ...';
    setAuthMsg('⏳ جارٍ التحقق...', '');

    try {
      if (authMode === 'signup') {
        await window.CW_FB.auth.signUp({ email, password });
        setAuthMsg('✓ تم إنشاء الحساب', 'success');
        logEvent('zakerah_signup', { proAtSignup: isPro() });
        // If Pro is already active locally (user activated before signing up),
        // mirror it into the account so any future device inherits it.
        if (isPro()) {
          await syncProToAccount(localStorage.getItem(PRO_KEY) || '1');
        }
      } else {
        await window.CW_FB.auth.signIn({ email, password });
        setAuthMsg('✓ تم تسجيل الدخول', 'success');
        logEvent('zakerah_signin');
        // Pull Pro status from the account and apply locally.
        await syncProFromAccount();
      }
      setTimeout(() => { closeAuth(); render(); }, 700);
    } catch (err) {
      console.error('auth failed', err);
      let friendly = err?.message || 'فشل';
      if (/invalid-email/i.test(friendly))          friendly = '⚠ الإيميل غير صالح';
      else if (/email-already-in-use/i.test(friendly)) friendly = '⚠ الإيميل مستخدم مسبقاً — سجّل دخول';
      else if (/weak-password/i.test(friendly))     friendly = '⚠ كلمة السر قصيرة — 6 أحرف على الأقل';
      else if (/wrong-password|invalid-credential/i.test(friendly)) friendly = '⚠ الإيميل أو كلمة السر غير صحيحة';
      else if (/user-not-found/i.test(friendly))    friendly = '⚠ لا يوجد حساب بهذا الإيميل';
      else if (/network/i.test(friendly))           friendly = '⚠ تحقق من اتصال الإنترنت';
      else friendly = '⚠ ' + friendly;
      setAuthMsg(friendly, 'danger');
    } finally {
      btn.disabled = false; btn.textContent = original;
    }
  }

  async function signOut() {
    if (!confirm('تسجيل الخروج؟ محفوظاتك المحلية لن تُمسّ، لكن ميزة Pro ستُزال من هذا الجهاز.')) return;
    try {
      await window.CW_FB?.auth?.signOut?.();
    } catch {}
    // Clear local Pro so shared devices don't inherit it.
    clearPro();
    toast('تم تسجيل الخروج', 'success');
    render();
    renderAuthUI();
    // Re-render settings if it's open
    if ($('#settings-modal')?.classList.contains('open')) renderSettings();
  }

  // Writes { zakerahPro, zakerahLicense } onto the user's Firestore doc.
  async function syncProToAccount(licenseKey) {
    const u = currentUser();
    if (!u) return;
    try {
      await window.CW_FB.updateDoc('users', u.user.id, {
        zakerahPro: true,
        zakerahLicense: licenseKey || '1',
        zakerahProAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('syncProToAccount failed', err);
    }
  }

  /** Keep the homepage banner + header button in sync with auth state. */
  function renderAuthUI() {
    const u = currentUser();
    const strip = $('#auth-strip');
    const btn   = $('#btn-account');

    if (u) {
      // Signed in: hide strip, show avatar letter
      if (strip) strip.hidden = true;
      if (btn) {
        btn.textContent = (u.user.email || '?').charAt(0).toUpperCase();
        btn.classList.add('signed-in');
        btn.setAttribute('title', u.user.email + (isPro() ? ' · Pro 💎' : ''));
      }
    } else {
      // Signed out: show strip, show plain 👤 icon
      if (strip) strip.hidden = false;
      if (btn) {
        btn.textContent = '👤';
        btn.classList.remove('signed-in');
        btn.setAttribute('title', 'تسجيل الدخول · Sign in');
      }
    }
  }

  async function syncProFromAccount() {
    const u = currentUser();
    if (!u) return;
    try {
      const doc = await window.CW_FB.getDocById('users', u.user.id);
      if (doc?.zakerahPro) {
        setPro(doc.zakerahLicense || 'account');
        toast('🎉 مرحباً بعودتك — Pro مفعّل', 'success');
      }
    } catch (err) {
      console.warn('syncProFromAccount failed', err);
    }
  }

  /* ============ PRO / PAYWALL ============ */
  const PRO_KEY = 'zakerah.pro';
  const FREE_BUILTIN_TYPE = 'prompt'; // only this built-in is free
  const FREE_TYPE_LIMIT = 0;   // no custom types on free tier
  const FREE_ITEM_LIMIT = 5;   // 5 saved items on free tier

  function isTypeAllowed(typeId) {
    if (isPro()) return true;
    return typeId === FREE_BUILTIN_TYPE;
  }
  // Live Gumroad product URL — Zakerah Pro, $2 one-time unlock.
  const GUMROAD_PRO_URL = 'https://1628954350904.gumroad.com/l/ecvxdq';
  // Product permalink used by the Gumroad license-verify API.
  const GUMROAD_PRODUCT_PERMALINK = 'ecvxdq';
  // Static unlock codes accepted by the app (legacy / marketing / founder keys).
  // Real Gumroad purchases receive unique license keys that are verified live.
  const VALID_UNLOCK_CODES = new Set([
    'ZAKERAH-PRO-2026',
    'ZAKERAH-PRO-LIFETIME',
    'COFFEZ-FOUNDER',
  ]);

  function isPro() { return !!localStorage.getItem(PRO_KEY); }
  function setPro(reason) { localStorage.setItem(PRO_KEY, reason || '1'); }
  function clearPro() { localStorage.removeItem(PRO_KEY); }

  function openPaywall(reason = 'types', lockedTypeAr = '') {
    const sub = $('#paywall-sub');
    const titleEl = $('#paywall-title');
    if (titleEl) {
      titleEl.textContent =
        reason === 'items'         ? 'وصلت حد الحفظ المجاني' :
        reason === 'locked-type'   ? `النوع "${lockedTypeAr}" مُقفَل` :
                                     'هذا النوع مُقفَل';
    }
    if (sub) {
      if (reason === 'items') {
        sub.innerHTML = `النسخة المجانية تسمح بحفظ <strong>${FREE_ITEM_LIMIT} عناصر</strong> فقط. رقِّ إلى Pro بـ$2 (مرة واحدة) لفتح كل شي.`;
      } else if (reason === 'locked-type') {
        sub.innerHTML = `النوع المجاني الوحيد هو <strong>✨ برومبت</strong> (أوامر الذكاء الاصطناعي). لاستخدام "${esc(lockedTypeAr)}" وبقية الأنواع، رقِّ إلى Pro بـ$2 (مرة واحدة).`;
      } else {
        sub.innerHTML = `النسخة المجانية تعطيك نوع واحد: <strong>✨ برومبت</strong> (أوامر الذكاء الاصطناعي). رقِّ إلى Pro بـ$2 (مرة واحدة) لفتح كل الأنواع + الأنواع المخصصة + حفظ غير محدود.`;
      }
    }
    $('#paywall-license').value = '';
    const msg = $('#paywall-msg'); if (msg) msg.textContent = '';
    const steps = $('#paywall-steps'); if (steps) steps.style.display = 'none';
    $('#paywall-modal')?.classList.add('open');
  }
  function closePaywall() { $('#paywall-modal')?.classList.remove('open'); }

  function showPaywallMsg(text, kind) {
    const msg = $('#paywall-msg');
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = kind === 'success' ? 'var(--success)'
                    : kind === 'danger'  ? 'var(--danger)'
                    : 'var(--muted)';
  }

  function finalizeActivation(keyShown) {
    setPro(keyShown);
    // Telemetry — figure out how many activations we're getting.
    logEventOnce('zakerah_activate_pro', {
      source: VALID_UNLOCK_CODES.has((keyShown || '').toUpperCase()) ? 'static' : 'gumroad',
      signedIn: isSignedIn(),
    });
    // If the user is signed in, also record Pro on their account so any
    // future device they sign into inherits it automatically.
    if (isSignedIn()) {
      syncProToAccount(keyShown);
      showPaywallMsg('✓ تم التفعيل! محفوظ في حسابك', 'success');
      toast('🎉 Pro مفتوح — محفوظ في حسابك', 'success');
      setTimeout(() => { closePaywall(); render(); }, 900);
    } else {
      showPaywallMsg('✓ تم التفعيل! استمتع بـPro', 'success');
      toast('🎉 Pro مفتوح', 'success');
      // Offer to tie it to an account so it survives clearing data
      setTimeout(() => {
        closePaywall();
        render();
        if (confirm('💡 نصيحة: سجّل حساباً لحفظ Pro ليشتغل على كل أجهزتك.\n\nتسجيل الحساب الآن؟')) {
          openAuth('signup');
        }
      }, 900);
    }
  }

  async function verifyGumroadLicense(code) {
    const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        product_permalink: GUMROAD_PRODUCT_PERMALINK,
        product_id: GUMROAD_PRODUCT_PERMALINK,
        license_key: code,
        increment_uses_count: 'false',
      }),
    });
    const data = await res.json().catch(() => ({ success: false }));
    return data;
  }

  async function activateLicense() {
    const raw = ($('#paywall-license')?.value || '').trim();
    if (!raw) {
      showPaywallMsg('⚠ ادخل رمز تفعيل', 'danger');
      return;
    }

    // 1) Static unlock codes (case-insensitive)
    const upper = raw.toUpperCase();
    if (VALID_UNLOCK_CODES.has(upper)) {
      finalizeActivation(upper);
      return;
    }

    // 2) Live Gumroad license verification
    const btn = $('#paywall-activate');
    const originalLabel = btn ? btn.textContent : 'فعّل';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ تحقّق...'; }
    showPaywallMsg('⏳ جارٍ التحقّق من Gumroad...', '');

    try {
      const data = await verifyGumroadLicense(raw);
      if (data && data.success) {
        finalizeActivation(raw);
        return;
      }
      showPaywallMsg('⚠ رمز غير صالح. تأكد من النسخ الصحيح.', 'danger');
    } catch (err) {
      console.error('License verification failed', err);
      showPaywallMsg('⚠ تعذّر الاتصال بـGumroad. تحقق من الإنترنت وأعد المحاولة.', 'danger');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
    }
  }

  /* ============ CUSTOM TYPES ============ */
  function saveNewType() {
    // freemium gate: limit free users to FREE_TYPE_LIMIT custom types
    if (!isPro() && (state.customTypes || []).length >= FREE_TYPE_LIMIT) {
      openPaywall('types');
      return;
    }

    const ar = ($('#new-type-ar')?.value || '').trim();
    const en = ($('#new-type-en')?.value || '').trim() || ar;
    const icon = ($('#new-type-icon')?.value || '').trim() || '🌟';
    const color = ($('#new-type-colors .swatch.active')?.dataset.newColor) || '#0D9488';
    if (!ar) { toast('اسم النوع مطلوب', 'error'); return; }

    // derive an id from AR name + random suffix for uniqueness
    const base = ar.toLowerCase().replace(/\s+/g, '-') || 'custom';
    const id = 'x_' + base.slice(0, 12) + '_' + Math.random().toString(36).slice(2, 6);

    const newType = {
      id, ar, en, icon, color,
      verb: 'إضافة ' + ar,
      verbEn: 'NEW ' + en.toUpperCase(),
      isCustom: true,
    };
    state.customTypes = (state.customTypes || []).concat(newType);
    state.newTypeOpen = false;
    state.creatingType = id;
    persist();
    toast('أُضيف النوع "' + ar + '" ✓', 'success');
    renderEditor(null, id);
  }

  function deleteCustomType(id) {
    const hasItems = state.items.some((it) => it.type === id);
    const warning = hasItems
      ? 'بعض العناصر تستخدم هذا النوع. ستُحوّل إلى "ملاحظة". تابع؟'
      : 'حذف هذا النوع؟';
    if (!confirm(warning)) return;

    state.customTypes = state.customTypes.filter((t) => t.id !== id);
    // reassign items to 'note' so they don't disappear
    state.items.forEach((it) => { if (it.type === id) it.type = 'note'; });
    persist();
    toast('تم الحذف', 'success');
    render();
    renderSettings();
  }

  /* ============ MODAL: CREATE / EDIT ============ */
  function openCreate(presetType) {
    state.editing = null;
    const requested = presetType || FREE_BUILTIN_TYPE;
    // If a free user hit a locked preset, fall back to the free type
    state.creatingType = isTypeAllowed(requested) ? requested : FREE_BUILTIN_TYPE;
    renderEditor(null, state.creatingType);
    $('#editor-modal').classList.add('open');
  }

  function openEdit(id) {
    const it = state.items.find((x) => x.id === id);
    if (!it) return;
    state.editing = id;
    renderEditor(it, it.type);
    $('#editor-modal').classList.add('open');
  }

  function closeEditor() {
    $('#editor-modal').classList.remove('open');
    state.editing = null;
  }

  function renderEditor(item, typeId) {
    const modal = $('#editor-modal .modal');
    const isEdit = !!item;
    const t = getType(typeId);
    const body = $('#editor-body');
    modal.setAttribute('data-type', typeId);

    $('#editor-title').textContent = isEdit ? 'تعديل' : t.verb;
    $('#editor-title-tag').textContent = isEdit ? 'EDIT · ' + t.en : t.verbEn;

    // Type picker (only when creating)
    const typePickerHTML = isEdit ? '' : `
      <div>
        <div class="field-label" style="margin-bottom:8px;">
          <span>النوع <span class="req">*</span></span>
          <span class="en">Type</span>
        </div>
        <div class="type-picker">
          ${allTypes().map((tt) => {
            const locked = !isTypeAllowed(tt.id);
            const lockStyle = locked ? 'opacity:0.55; position:relative;' : '';
            const customStyle = tt.isCustom ? `--pick-accent: ${esc(tt.color || '#0D9488')};` : '';
            return `
              <button type="button" class="type-pick ${tt.id === typeId && !locked ? 'active' : ''}"
                      data-pick="${tt.isCustom ? 'custom' : tt.id}" data-pick-type="${tt.id}"
                      ${locked ? `data-locked="1" data-locked-ar="${esc(tt.ar)}"` : ''}
                      style="${lockStyle}${customStyle}">
                <span class="type-pick-icon">${tt.icon}</span>
                ${esc(tt.ar)}${locked ? ' 🔒' : ''}
                ${tt.arHint ? `<div style="font-size:10px; color:var(--muted); margin-top:2px; line-height:1.3;">${esc(tt.arHint)}</div>` : ''}
                <div style="font-size:9px; opacity:.7; margin-top:2px;">${esc(tt.en)}</div>
              </button>`;
          }).join('')}
          <button type="button" class="type-pick" id="type-pick-add"
                  style="border-style: dashed; color: var(--muted);">
            <span class="type-pick-icon">＋</span>
            إضافة
            <div style="font-size:9px; opacity:.7; margin-top:2px;">ADD TYPE</div>
          </button>
        </div>

        ${state.newTypeOpen ? `
          <div style="background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px; margin-top: 10px;">
            <div class="field-label" style="margin-bottom:10px;">
              <span>نوع مخصص جديد</span>
              <span class="en">NEW CUSTOM TYPE</span>
            </div>
            <div class="field-row">
              <div class="field">
                <div class="field-label"><span>الاسم العربي <span class="req">*</span></span><span class="en">AR</span></div>
                <input type="text" id="new-type-ar" maxlength="30" placeholder="مثلاً: فوائد" required>
              </div>
              <div class="field">
                <div class="field-label"><span>الاسم الإنجليزي</span><span class="en">EN</span></div>
                <input type="text" id="new-type-en" maxlength="30" placeholder="Benefits">
              </div>
            </div>
            <div class="field-row" style="margin-top:10px;">
              <div class="field">
                <div class="field-label"><span>أيقونة (إيموجي)</span><span class="en">ICON</span></div>
                <input type="text" id="new-type-icon" maxlength="4" placeholder="🌟" value="🌟">
              </div>
              <div class="field">
                <div class="field-label"><span>اللون</span><span class="en">COLOR</span></div>
                <div class="picker-row" id="new-type-colors">
                  ${COLL_COLORS.map((c, i) =>
                    `<button type="button" class="swatch ${i === 0 ? 'active' : ''}"
                             data-new-color="${esc(c.hex)}"
                             style="background:${esc(c.hex)};"
                             aria-label="${esc(c.id)}"></button>`
                  ).join('')}
                </div>
              </div>
            </div>
            <div style="display:flex; gap:8px; margin-top:12px;">
              <button type="button" class="btn btn-indigo btn-sm" id="new-type-save">💾 احفظ النوع</button>
              <button type="button" class="btn btn-ghost btn-sm" id="new-type-cancel">إلغاء</button>
            </div>
          </div>
        ` : ''}
      </div>`;

    // Type-specific extra fields
    let extra = '';
    if (typeId === 'code') {
      extra = `
        <div class="field">
          <div class="field-label">
            <span>اللغة</span>
            <span class="en">Language</span>
          </div>
          <select id="ed-lang">
            ${LANGS.map((l) =>
              `<option value="${l}" ${(item && item.lang) === l ? 'selected' : ''}>${esc(l)}</option>`
            ).join('')}
          </select>
        </div>`;
    } else if (typeId === 'prompt') {
      extra = `
        <div class="field">
          <div class="field-label">
            <span>الـAI المستهدف</span>
            <span class="en">Target AI</span>
          </div>
          <select id="ed-target">
            ${TARGET_AIS.map((a) =>
              `<option value="${esc(a)}" ${(item && item.targetAi) === a ? 'selected' : ''}>${esc(a)}</option>`
            ).join('')}
          </select>
        </div>
        <div style="font-size:11px; color:var(--muted); padding: 0 2px;">
          💡 استخدم <code style="background:var(--prompt-soft); color:var(--prompt); padding:2px 6px; border-radius:4px; font-family:var(--mono);">{{name}}</code> للمتغيّرات — بتقدر تعبّيها عند الاستخدام.
        </div>`;
    } else if (typeId === 'note' || typeId === 'answer') {
      extra = `
        <div class="field">
          <div class="field-label"><span>رابط (اختياري)</span><span class="en">Reference URL</span></div>
          <input type="url" id="ed-url" placeholder="https://..." value="${esc(item && item.sourceUrl || '')}">
        </div>`;
    } else if (typeId === 'idea') {
      extra = `
        <div class="field-row">
          <div class="field">
            <div class="field-label"><span>الحالة</span><span class="en">Status</span></div>
            <select id="ed-status">
              ${STATUSES.map((s) =>
                `<option value="${s.id}" ${(item && item.status || 'new') === s.id ? 'selected' : ''}>${esc(s.ar)} · ${esc(s.en)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="field">
            <div class="field-label"><span>الأولوية</span><span class="en">Priority</span></div>
            <select id="ed-priority">
              ${PRIORITIES.map((p) =>
                `<option value="${p.id}" ${(item && item.priority || 'med') === p.id ? 'selected' : ''}>${esc(p.ar)} · ${esc(p.en)}</option>`
              ).join('')}
            </select>
          </div>
        </div>`;
    }

    const bodyFieldClass = typeId === 'code' ? 'field code-field' : 'field';
    const bodyLabelAr = {
      code: 'الكود', prompt: 'نص البرومبت', note: 'المحتوى',
      answer: 'الإجابة', idea: 'الفكرة', template: 'القالب',
    }[typeId] || 'المحتوى';
    const bodyLabelEn = {
      code: 'Code', prompt: 'Prompt text', note: 'Content',
      answer: 'Answer', idea: 'Idea', template: 'Template',
    }[typeId] || 'Content';
    const bodyPlaceholder = {
      code:     '// ألصق الكود هنا',
      prompt:   'اكتب البرومبت… استخدم {{placeholder}} للمتغيّرات',
      note:     'اكتب ما تبي تحفظه…',
      answer:   'ألصق إجابة الـAI…',
      idea:     'اشرح الفكرة بإيجاز…',
      template: 'اكتب القالب (خطوات أو هيكل قابل لإعادة الاستخدام)…',
    }[typeId] || '';

    body.innerHTML = `
      ${typePickerHTML}

      <div class="field">
        <div class="field-label">
          <span>العنوان <span class="req">*</span></span>
          <span class="en">Title</span>
        </div>
        <input type="text" id="ed-title" required maxlength="200"
               placeholder="مثلاً: ${typeId === 'code' ? 'useMemo في React' : 'قالب إيميل العملاء'}"
               value="${esc(item && item.title || '')}">
      </div>

      <div class="${bodyFieldClass}">
        <div class="field-label">
          <span>${esc(bodyLabelAr)} <span class="req">*</span></span>
          <span class="en">${esc(bodyLabelEn)}</span>
        </div>
        <textarea id="ed-body" required rows="${typeId === 'code' ? 10 : 6}"
                  placeholder="${esc(bodyPlaceholder)}">${esc(item && item.body || '')}</textarea>
      </div>

      ${extra}

      <div class="field">
        <div class="field-label"><span>المصدر</span><span class="en">Source</span></div>
        <select id="ed-source">
          ${SOURCES.map((s) =>
            `<option value="${esc(s)}" ${(item && item.source || 'ChatGPT') === s ? 'selected' : ''}>${esc(s)}</option>`
          ).join('')}
        </select>
      </div>

      <div class="field">
        <div class="field-label"><span>وسوم (افصل بفاصلة)</span><span class="en">Tags</span></div>
        <input type="text" id="ed-tags"
               placeholder="react, performance"
               value="${esc((item && item.tags || []).join(', '))}">
      </div>

      <div class="toggle-row">
        <div class="toggle-lbl">⭐ مهم <span class="en">Important</span></div>
        <button type="button" class="toggle ${item && item.important ? 'on' : ''}" id="ed-imp"></button>
      </div>
    `;

    // bind type picker
    $$('[data-pick-type]').forEach((el) => {
      el.onclick = () => {
        if (el.dataset.locked) {
          closeEditor();
          setTimeout(() => openPaywall('locked-type', el.dataset.lockedAr || ''), 160);
          return;
        }
        state.creatingType = el.dataset.pickType;
        state.newTypeOpen = false;
        renderEditor(null, state.creatingType);
      };
    });

    // "+ إضافة نوع" button
    const addTypeBtn = $('#type-pick-add');
    if (addTypeBtn) addTypeBtn.onclick = () => {
      if (!isPro() && (state.customTypes || []).length >= FREE_TYPE_LIMIT) {
        closeEditor();
        setTimeout(() => openPaywall('types'), 160);
        return;
      }
      state.newTypeOpen = true;
      renderEditor(null, state.creatingType);
    };

    // inline new-type form
    const cancelBtn = $('#new-type-cancel');
    if (cancelBtn) cancelBtn.onclick = () => {
      state.newTypeOpen = false;
      renderEditor(null, state.creatingType);
    };
    $$('[data-new-color]').forEach((el) => {
      el.onclick = () => {
        $$('[data-new-color]').forEach((x) => x.classList.remove('active'));
        el.classList.add('active');
      };
    });
    const saveBtn = $('#new-type-save');
    if (saveBtn) saveBtn.onclick = saveNewType;

    $('#ed-imp').onclick = (e) => e.currentTarget.classList.toggle('on');

    // keyboard shortcut: Cmd/Ctrl+Enter to submit
    $('#ed-body').addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        submitEditor();
      }
    });

    // Submit button label
    $('#editor-submit').textContent = isEdit ? '💾 حفظ التعديلات' : '＋ إضافة';
  }

  function submitEditor(e) {
    if (e) e.preventDefault();
    const isEdit = !!state.editing;

    // freemium gate: limit free users on new saves only (edits always allowed)
    if (!isEdit && !isPro() && state.items.length >= FREE_ITEM_LIMIT) {
      closeEditor();
      setTimeout(() => openPaywall('items'), 160);
      return;
    }

    const type = isEdit
      ? state.items.find((x) => x.id === state.editing).type
      : state.creatingType;

    const title = $('#ed-title').value.trim();
    const body  = $('#ed-body').value.trim();
    if (!title || !body) { toast('العنوان والمحتوى مطلوبان', 'error'); return; }

    const tags = ($('#ed-tags').value || '')
      .split(',').map((x) => x.trim()).filter(Boolean);
    const important = $('#ed-imp').classList.contains('on');

    const base = { title, body, tags, important, type };
    const sourceSelect = $('#ed-source');
    if (sourceSelect) base.source = sourceSelect.value;
    if (type === 'code') base.lang = $('#ed-lang').value;
    else if (type === 'prompt') {
      base.targetAi = $('#ed-target').value;
      base.usedCount = isEdit ? state.items.find((x) => x.id === state.editing).usedCount || 0 : 0;
    }
    else if (type === 'note' || type === 'answer') {
      const urlInp = $('#ed-url');
      if (urlInp) base.sourceUrl = urlInp.value.trim();
    }
    else if (type === 'idea') {
      base.status = $('#ed-status').value;
      base.priority = $('#ed-priority').value;
    }

    if (isEdit) {
      const idx = state.items.findIndex((x) => x.id === state.editing);
      state.items[idx] = { ...state.items[idx], ...base, updatedAt: Date.now() };
      persist();
      toast('تم التحديث ✓', 'success');
      const id = state.editing;
      closeEditor();
      openDetail(id);
    } else {
      const newItem = { id: uid(), ...base, createdAt: Date.now() };
      state.items.unshift(newItem);
      persist();
      toast('تمت الإضافة ✓', 'success');
      closeEditor();
      state.filter.type = type;
      render();
      setTimeout(() => openDetail(newItem.id), 120);
    }
  }

  /* ============ MODAL: DETAIL (VIEW) ============ */
  function openDetail(id) {
    const it = state.items.find((x) => x.id === id);
    if (!it) return;
    trackRecent(id);
    const t = getType(it.type);
    const modal = $('#detail-modal .modal');
    modal.setAttribute('data-type', it.type);
    $('#detail-title-tag').textContent = t.en.toUpperCase();

    const badges = [
      `<span class="badge type">${t.icon} ${esc(t.ar)} · ${esc(t.en)}</span>`,
      it.important ? '<span class="badge important">⭐ مهم</span>' : '',
      it.source ? `<span class="badge">📎 ${esc(it.source)}</span>` : '',
      `<span class="badge">${timeAgo(it.createdAt)}</span>`,
    ].filter(Boolean);

    // Accessory section (type-specific)
    let accessoryBlock = '';
    if (it.type === 'code' && it.lang) {
      accessoryBlock = `<span class="badge" style="font-family:var(--mono); background:var(--code-bg); color:var(--code-text); border:none;">${esc(it.lang)}</span>`;
    } else if (it.type === 'prompt' && it.targetAi) {
      accessoryBlock = `<span class="badge">→ ${esc(it.targetAi)}</span>${it.usedCount ? `<span class="badge">استُخدم ${it.usedCount}×</span>` : ''}`;
    } else if ((it.type === 'note' || it.type === 'answer') && it.sourceUrl) {
      accessoryBlock += `<a class="badge" href="${esc(it.sourceUrl)}" target="_blank" rel="noopener" style="color:var(--teal);">↗ فتح المرجع</a>`;
    } else if (it.type === 'idea') {
      const st = STATUSES.find((s) => s.id === it.status);
      const pr = PRIORITIES.find((p) => p.id === it.priority);
      if (st) accessoryBlock += `<span class="badge">● ${esc(st.ar)}</span>`;
      if (pr) accessoryBlock += `<span class="badge pill-prio-${pr.id}">◈ ${esc(pr.ar)}</span>`;
    }

    // Tags
    const tags = (it.tags || []).length
      ? `<div class="chips" style="margin-top:10px;">${it.tags.map((x) => `<span class="chip">#${esc(x)}</span>`).join('')}</div>`
      : '';

    // Variables UI (for prompts)
    let varsBlock = '';
    if (it.type === 'prompt') {
      const vars = extractVars(it.body);
      if (vars.length) {
        varsBlock = `
          <div class="vars-section">
            <div class="vars-label">🧩 عبّي المتغيّرات · Fill Variables</div>
            ${vars.map((v) => `
              <div class="var-field">
                <label>${esc(v)}</label>
                <input type="text" data-var="${esc(v)}" placeholder="...">
              </div>
            `).join('')}
            <div class="prompt-preview" id="prompt-preview">${highlightVars(it.body)}</div>
            <div style="display:flex; gap:6px; margin-top:10px; flex-wrap:wrap;">
              <button class="btn btn-primary btn-sm" id="copy-filled">⧉ انسخ المُعبّأ</button>
              <button class="btn btn-ghost btn-sm" id="copy-raw">انسخ الأصلي</button>
            </div>
          </div>`;
      }
    }

    const bodyClass = it.type === 'code' ? 'mono' : '';

    $('#detail-body').innerHTML = `
      <div class="detail-badges">${badges.join('')}</div>
      <h2 class="detail-q">${esc(it.title)}</h2>
      ${accessoryBlock ? `<div class="detail-badges">${accessoryBlock}</div>` : ''}
      ${tags}

      <div class="detail-label">${
        it.type === 'code'     ? 'الكود · Code' :
        it.type === 'prompt'   ? 'البرومبت · Prompt' :
        it.type === 'answer'   ? 'الإجابة · Answer' :
        it.type === 'template' ? 'القالب · Template' :
        it.type === 'idea'     ? 'الفكرة · Idea' :
        'المحتوى · Content'
      }</div>
      <div class="detail-body-text ${bodyClass}">${esc(it.body)}</div>

      ${varsBlock}

      ${state.collections.length ? `
        <div class="detail-label">الباقات · Collections</div>
        <div class="add-to-coll-list">
          ${state.collections.map((c) => {
            const on = (c.itemIds || []).includes(it.id);
            return `
              <button type="button" class="coll-pill ${on ? 'on' : ''}" data-toggle-coll="${c.id}" style="--coll-color: ${esc(c.color)};">
                <span class="coll-pill-dot"></span>
                ${esc(c.icon)} ${esc(c.name)}
              </button>`;
          }).join('')}
        </div>
      ` : ''}
    `;

    // Actions
    $('#detail-actions').innerHTML = `
      <button class="btn btn-primary btn-sm" data-act="copy">⧉ نسخ</button>
      <button class="btn btn-ghost btn-sm" data-act="share">↗ مشاركة</button>
      <button class="btn btn-ghost btn-sm" data-act="share-link">🔗 نسخ رابط</button>
      <button class="btn btn-ghost btn-sm" data-act="star">${it.important ? '★ إلغاء النجمة' : '☆ ضع نجمة'}</button>
      <button class="btn btn-ghost btn-sm" data-act="edit">✎ تعديل</button>
      <button class="btn btn-danger btn-sm" data-act="delete">🗑 حذف</button>
    `;

    $$('#detail-actions [data-act]').forEach((el) => {
      el.onclick = () => handleAction(el.dataset.act, it);
    });

    $$('#detail-body [data-toggle-coll]').forEach((el) => {
      el.onclick = () => toggleItemInCollection(el.dataset.toggleColl, it.id);
    });

    // Bind variable inputs (live preview)
    if (it.type === 'prompt') {
      $$('#detail-body [data-var]').forEach((inp) => {
        inp.addEventListener('input', () => updatePromptPreview(it.body));
      });
      const cf = $('#copy-filled');
      if (cf) cf.onclick = async () => {
        const filled = fillVars(it.body);
        await copy(filled);
        // bump use count
        const idx = state.items.findIndex((x) => x.id === it.id);
        if (idx >= 0) {
          state.items[idx].usedCount = (state.items[idx].usedCount || 0) + 1;
          persist();
        }
      };
      const cr = $('#copy-raw');
      if (cr) cr.onclick = () => copy(it.body);
    }

    $('#detail-modal').classList.add('open');
  }

  function closeDetail() {
    $('#detail-modal').classList.remove('open');
  }

  /* ============ PROMPT VARIABLES ============ */
  function extractVars(text) {
    const re = /\{\{([^}]+)\}\}/g;
    const found = new Set();
    let m;
    while ((m = re.exec(text || '')) !== null) {
      found.add(m[1].trim());
    }
    return Array.from(found);
  }

  function highlightVars(text) {
    return esc(text).replace(/\{\{([^}]+)\}\}/g, '<mark>{{$1}}</mark>');
  }

  function fillVars(text) {
    return (text || '').replace(/\{\{([^}]+)\}\}/g, (full, name) => {
      const inp = document.querySelector(`#detail-body [data-var="${CSS.escape(name.trim())}"]`);
      const val = inp ? inp.value.trim() : '';
      return val || full;
    });
  }

  function updatePromptPreview(rawBody) {
    const pv = $('#prompt-preview');
    if (!pv) return;
    const filled = fillVars(rawBody);
    pv.innerHTML = highlightVars(filled);
  }

  /* ============ ACTIONS ============ */
  function buildShareUrl(it) {
    const payload = {
      type: it.type,
      title: it.title,
      body: it.body,
      source: it.source,
      tags: it.tags || [],
    };
    if (it.type === 'code' && it.lang) payload.lang = it.lang;
    if (it.type === 'prompt' && it.targetAi) payload.targetAi = it.targetAi;

    const json = JSON.stringify(payload);
    // unicode-safe base64, URL-safe
    const b64 = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const base = location.origin + location.pathname.replace(/[^/]*$/, '');
    return base + 'share.html?d=' + b64;
  }

  async function handleAction(act, it) {
    if (act === 'copy') {
      await copy(it.body);
    } else if (act === 'share') {
      const t = getType(it.type);
      const shareUrl = buildShareUrl(it);
      const txt = `${t.icon} ${it.title}\n\n${it.body}\n\n— ذاكرة الذكاء الاصطناعي\n${shareUrl}`;
      if (navigator.share) {
        try { await navigator.share({ title: it.title, text: txt, url: shareUrl }); return; }
        catch {}
      }
      await copy(txt);
      toast('نُسخ للمشاركة ✓', 'success');
    } else if (act === 'share-link') {
      const url = buildShareUrl(it);
      await copy(url);
      toast('رابط المشاركة نُسخ ✓', 'success');
    } else if (act === 'star') {
      it.important = !it.important;
      persist();
      openDetail(it.id);
      renderList();
    } else if (act === 'edit') {
      closeDetail();
      setTimeout(() => openEdit(it.id), 120);
    } else if (act === 'delete') {
      if (!confirm('حذف هذا العنصر نهائياً؟')) return;
      state.items = state.items.filter((x) => x.id !== it.id);
      persist();
      toast('تم الحذف', 'success');
      closeDetail();
      render();
    }
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('تم النسخ ✓', 'success');
    } catch {
      toast('تعذّر النسخ', 'error');
    }
  }

  /* ============ SEARCH MODAL ============ */
  function openSearch() {
    $('#search-modal').classList.add('open');
    setTimeout(() => $('#search-input').focus(), 50);
  }
  function closeSearch() {
    $('#search-modal').classList.remove('open');
  }

  /* ============ EXPORT ALL ============ */
  function exportAll() {
    const data = {
      app: 'Zakerah', version: 1,
      exportedAt: new Date().toISOString(),
      items: state.items,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'zakerah-export-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('تم التصدير ✓', 'success');
  }

  /* ============ MONETIZE ============ */
  const PRICE_OPTIONS = ['مجاني', '$4.99', '$9.99', '$19.99', '$49.99'];

  function openMonetize() {
    renderMonetize();
    $('#monet-modal').classList.add('open');
  }
  function closeMonetize() {
    $('#monet-modal').classList.remove('open');
  }

  function renderMonetize() {
    const colls = state.collections;

    $('#monet-body').innerHTML = `
      <div class="monet-banner">
        <span class="monet-banner-tag">🚀 قريباً · COMING SOON</span>
        <strong>حوّل معرفتك إلى دخل.</strong>
        <p>
          مبيعات الباقات قادمة قريباً. جهّز أفضل باقاتك الآن — اضبط السعر والحالة، وحالما نفتح البيع
          ستكون باقاتك أول الجاهزة على الرف.
        </p>
      </div>

      ${colls.length === 0 ? `
        <div class="empty">
          <div class="empty-emoji">📦</div>
          <h3>لا توجد باقات بعد</h3>
          <p>أنشئ باقة من زر الباقات 📁 ثم ارجع هنا.</p>
        </div>
      ` : `
        <p style="font-size:12px; color:var(--muted); margin:0 0 14px;">
          ${colls.length} ${colls.length === 1 ? 'باقة' : 'باقات'} · اضبط السعر والحالة لكل باقة
        </p>
        ${colls.map((c) => {
          const m = c.monetize || { status: 'draft', visibility: 'private', price: 'مجاني' };
          const count = (c.itemIds || []).length;
          const statusLabel =
            m.status === 'ready'  ? { cls: 'monet-status-ready',  ar: 'جاهزة' } :
            m.status === 'paused' ? { cls: 'monet-status-paused', ar: 'موقوفة' } :
                                    { cls: 'monet-status-draft',  ar: 'مسودّة' };
          return `
            <div class="monet-row" style="--coll-color: ${esc(c.color)};">
              <div class="monet-row-head">
                <div class="monet-row-icon">${esc(c.icon)}</div>
                <div style="flex:1; min-width:0;">
                  <div class="monet-row-name">${esc(c.name)}</div>
                  <div class="monet-row-meta">
                    ${count} ${count === 1 ? 'عنصر' : 'عناصر'} ·
                    <span class="monet-status-pill ${statusLabel.cls}">${statusLabel.ar}</span>
                  </div>
                </div>
              </div>
              <div class="monet-row-controls">
                <select class="monet-select" data-monet-status="${c.id}">
                  <option value="draft"  ${m.status === 'draft'  ? 'selected' : ''}>مسودّة · Draft</option>
                  <option value="ready"  ${m.status === 'ready'  ? 'selected' : ''}>جاهزة · Ready</option>
                  <option value="paused" ${m.status === 'paused' ? 'selected' : ''}>موقوفة · Paused</option>
                </select>
                <select class="monet-select" data-monet-vis="${c.id}">
                  <option value="private" ${m.visibility === 'private' ? 'selected' : ''}>خاصة · Private</option>
                  <option value="public"  ${m.visibility === 'public'  ? 'selected' : ''}>عامة · Public</option>
                </select>
                <select class="monet-select" data-monet-price="${c.id}">
                  ${PRICE_OPTIONS.map((p) =>
                    `<option value="${esc(p)}" ${m.price === p ? 'selected' : ''}>${esc(p)}</option>`
                  ).join('')}
                </select>
              </div>
            </div>`;
        }).join('')}
      `}
    `;

    $$('[data-monet-status]').forEach((el) => {
      el.onchange = () => updateMonet(el.dataset.monetStatus, { status: el.value });
    });
    $$('[data-monet-vis]').forEach((el) => {
      el.onchange = () => updateMonet(el.dataset.monetVis, { visibility: el.value });
    });
    $$('[data-monet-price]').forEach((el) => {
      el.onchange = () => updateMonet(el.dataset.monetPrice, { price: el.value });
    });
  }

  function updateMonet(collId, patch) {
    const c = state.collections.find((x) => x.id === collId);
    if (!c) return;
    c.monetize = { ...(c.monetize || { status: 'draft', visibility: 'private', price: 'مجاني' }), ...patch };
    persist();
    toast('تم الحفظ ✓', 'success');
    renderMonetize();
  }

  /* ============ SETTINGS ============ */
  function openSettings() {
    renderSettings();
    $('#settings-modal').classList.add('open');
  }
  function closeSettings() {
    $('#settings-modal').classList.remove('open');
  }

  function renderSettings() {
    const totalItems = state.items.length;
    const totalColls = state.collections.length;
    const favs = state.items.filter((x) => x.important).length;
    const sizeKb = Math.round(
      (JSON.stringify({ items: state.items, collections: state.collections }).length / 1024) * 10
    ) / 10;

    $('#settings-body').innerHTML = `
      <div class="settings-section">
        <h4>الحساب · Account ${isPro() ? '<span class="pro-badge">💎 PRO</span>' : ''}</h4>
        ${(() => {
          const u = currentUser();
          if (u) {
            const initial = (u.user.email || '?').charAt(0).toUpperCase();
            return `
              <div class="account-card">
                <div class="account-avatar">${esc(initial)}</div>
                <div class="account-info">
                  <div class="account-email">${esc(u.user.email)}</div>
                  <div class="account-status">
                    ${isPro() ? '💎 Pro مفعّل ومربوط بالحساب' : '🆓 حساب مجاني'}
                  </div>
                </div>
                <button class="btn btn-ghost btn-sm" id="set-signout">خروج</button>
              </div>
              <p style="font-size:11px; color:var(--muted); margin:6px 0 0;">
                💡 ميزة Pro تنتقل مع حسابك لأي جهاز تسجل الدخول فيه. المحفوظات تبقى محلية.
              </p>
            `;
          }
          return `
            <p style="font-size:12px; color:var(--muted); margin:0 0 10px; line-height:1.7;">
              سجّل حساباً لحفظ Pro وتفعيله على كل أجهزتك بنقرة. المحفوظات تبقى محلية.
            </p>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn btn-teal btn-sm" id="set-signup">إنشاء حساب</button>
              <button class="btn btn-ghost btn-sm" id="set-signin">تسجيل الدخول</button>
            </div>
          `;
        })()}
      </div>

      <div class="settings-section">
        <h4>البيانات · Data</h4>
        <div class="settings-row">
          <div class="settings-row-body">
            <p class="settings-row-title">⬇ تصدير كل شي</p>
            <p class="settings-row-desc">ملف JSON يحتوي جميع العناصر والباقات — نسخة احتياطية أو نقل بين أجهزة.</p>
          </div>
          <button class="btn btn-indigo btn-sm" id="set-export">تصدير</button>
        </div>

        <div class="settings-row">
          <div class="settings-row-body">
            <p class="settings-row-title">⬆ استيراد ملف</p>
            <p class="settings-row-desc">ادمج بيانات من ملف JSON سابق التصدير. لن يُحذف أي شي — فقط تُضاف العناصر الجديدة.</p>
          </div>
          <button class="btn btn-ghost btn-sm" id="set-import">اختر ملف</button>
        </div>

        <div class="settings-row">
          <div class="settings-row-body">
            <p class="settings-row-title" style="color: var(--danger);">🗑 مسح كل شي</p>
            <p class="settings-row-desc">يحذف جميع العناصر والباقات والتاريخ المحفوظ في هذا الجهاز. لا يمكن التراجع.</p>
          </div>
          <button class="btn btn-danger btn-sm" id="set-clear">مسح كامل</button>
        </div>
      </div>

      ${!isPro() ? `
        <div class="settings-section">
          <h4>الحدود المجانية · Free Limits</h4>
          <div class="usage-meter">
            <span class="usage-meter-text">العناصر: ${state.items.length} / ${FREE_ITEM_LIMIT}</span>
            <div class="usage-meter-bar">
              <div class="usage-meter-fill" style="width: ${Math.min(100, (state.items.length / FREE_ITEM_LIMIT) * 100)}%"></div>
            </div>
          </div>
          <div class="usage-meter">
            <span class="usage-meter-text">أنواع مخصصة: ${state.customTypes.length} / ${FREE_TYPE_LIMIT}</span>
            <div class="usage-meter-bar">
              <div class="usage-meter-fill" style="width: ${Math.min(100, (state.customTypes.length / FREE_TYPE_LIMIT) * 100)}%"></div>
            </div>
          </div>
          ${(state.items.length >= FREE_ITEM_LIMIT || state.customTypes.length >= FREE_TYPE_LIMIT)
            ? '<button class="btn btn-primary" id="set-upgrade" style="width:100%; margin-top:8px;">💎 ترقية إلى Pro — $2</button>'
            : '<p style="font-size:12px; color:var(--muted); margin:8px 0 0;">رقِّ إلى Pro بـ$2 (مرة واحدة) لإزالة كل الحدود.</p>'}
        </div>
      ` : ''}

      <div class="settings-section">
        <h4>
          الأنواع المخصصة · Custom Types
          ${isPro() ? '<span class="pro-badge">💎 PRO</span>' : ''}
        </h4>
        ${state.customTypes.length === 0 ? `
          <p style="font-size:12px; color:var(--muted); margin:0; line-height:1.7;">
            لا توجد أنواع مخصصة بعد. عند إضافة عنصر جديد، استخدم زر "+ إضافة" في شريط اختيار النوع لإنشاء نوع خاص بك.
          </p>
        ` : state.customTypes.map((t) => `
          <div class="settings-row">
            <div class="settings-row-body" style="display:flex; align-items:center; gap:10px;">
              <div style="width:32px; height:32px; border-radius:8px; background:${esc(t.color || '#0D9488')}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">${esc(t.icon)}</div>
              <div style="flex:1; min-width:0;">
                <p class="settings-row-title">${esc(t.ar)} · ${esc(t.en)}</p>
                <p class="settings-row-desc">${state.items.filter((it) => it.type === t.id).length} عنصر يستخدم هذا النوع</p>
              </div>
            </div>
            <button class="btn btn-danger btn-sm" data-del-type="${esc(t.id)}">🗑 حذف</button>
          </div>
        `).join('')}
      </div>

      <div class="settings-section">
        <h4>إحصائيات · Stats</h4>
        <div class="about-box">
          <div class="about-kv"><span>عناصر · Items</span><span>${totalItems}</span></div>
          <div class="about-kv"><span>باقات · Collections</span><span>${totalColls}</span></div>
          <div class="about-kv"><span>مفضلة ⭐ · Favorites</span><span>${favs}</span></div>
          <div class="about-kv"><span>حجم البيانات · Storage</span><span>${sizeKb} KB</span></div>
        </div>
      </div>

      <div class="settings-section">
        <h4>الخصوصية · Privacy</h4>
        <div class="privacy-notice" style="margin:0;">
          <div class="privacy-notice-head">
            <span class="ico">🔒</span>
            <span>بياناتك — في جهازك فقط</span>
          </div>
          <ul>
            <li><strong>كل ما تحفظه يبقى في جهازك.</strong> لا نحن ولا أي طرف ثالث نطّلع عليه.</li>
            <li>البيانات محفوظة في <strong>localStorage</strong> الخاص بمتصفحك.</li>
            <li>لو مسحت بيانات المتصفح → كل المحفوظات تختفي.</li>
            <li>لو غيّرت الجهاز → البيانات لا تنتقل تلقائياً.</li>
            <li>لنقل بياناتك: <strong>تصدير JSON</strong> ← استيراد في الجهاز الثاني.</li>
            <li>الحساب (اختياري) لنقل Pro فقط — المحفوظات تبقى محلية.</li>
          </ul>
        </div>
      </div>

      <div class="settings-section">
        <h4>عن التطبيق · About</h4>
        <div class="about-box">
          <strong>ذاكرة الذكاء الاصطناعي</strong> · <span style="color:var(--muted);">AI Memory v1.0</span>
          <p style="font-size:12px; color:var(--muted); margin:10px 0 0; line-height:1.7;">
            دماغك الثاني لمحادثات الـAI. كل ما تحفظه يبقى محلياً على جهازك — بدون سحابة، بدون تتبّع.
          </p>
          <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
            <a href="landing.html" class="btn btn-ghost btn-sm">📖 الصفحة التعريفية</a>
            <button type="button" class="btn btn-ghost btn-sm" id="set-show-welcome">👋 إعادة الترحيب</button>
            <a href="/" class="btn btn-ghost btn-sm">🏠 CoffeZ</a>
          </div>
        </div>
      </div>
    `;

    $('#set-export').onclick = exportAll;
    $('#set-import').onclick = () => $('#import-file').click();
    $('#set-clear').onclick = handleClearAll;
    $('#set-show-welcome')?.addEventListener('click', () => {
      closeSettings();
      setTimeout(openWelcome, 160);
    });
    $('#set-upgrade')?.addEventListener('click', () => {
      closeSettings();
      setTimeout(() => openPaywall('types'), 160);
    });
    $('#set-signin')?.addEventListener('click', () => {
      closeSettings();
      setTimeout(() => openAuth('signin'), 160);
    });
    $('#set-signup')?.addEventListener('click', () => {
      closeSettings();
      setTimeout(() => openAuth('signup'), 160);
    });
    $('#set-signout')?.addEventListener('click', signOut);
    $$('[data-del-type]').forEach((el) => {
      el.onclick = () => deleteCustomType(el.dataset.delType);
    });
  }

  function handleClearAll() {
    if (!confirm('حذف جميع العناصر والباقات والتاريخ نهائياً؟ لا يمكن التراجع.')) return;
    if (!confirm('متأكد 100%؟ آخر فرصة قبل المسح.')) return;
    state.items = [];
    state.collections = [];
    state.customTypes = [];
    state.recent = [];
    persist();
    // Full reset also forgets the welcome so the user lands like a brand-new visitor.
    localStorage.removeItem(WELCOMED_KEY);
    toast('تم مسح كل شي', 'success');
    closeSettings();
    state.filter = { type: 'all', q: '' };
    render();
    openWelcome();
  }

  function handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const incomingItems = Array.isArray(data.items) ? data.items : [];
        const incomingColls = Array.isArray(data.collections) ? data.collections : [];

        const existingIds = new Set(state.items.map((x) => x.id));
        const newItems = incomingItems.filter((x) => x && x.id && !existingIds.has(x.id));
        const existingCollIds = new Set(state.collections.map((x) => x.id));
        const newColls = incomingColls.filter((x) => x && x.id && !existingCollIds.has(x.id));

        state.items = [...newItems, ...state.items];
        state.collections = [...newColls, ...state.collections];
        persist();
        toast(`تم استيراد ${newItems.length} عنصر و ${newColls.length} باقة ✓`, 'success');
        render();
        renderSettings();
      } catch (err) {
        console.error(err);
        toast('ملف غير صالح', 'error');
      }
    };
    reader.onerror = () => toast('تعذّر قراءة الملف', 'error');
    reader.readAsText(file);
  }

  /* ============ COLLECTIONS ============ */
  function openCollections() {
    state.collCurrent = null;
    renderCollectionsList();
    $('#coll-modal').classList.add('open');
  }
  function closeCollections() {
    $('#coll-modal').classList.remove('open');
    state.collEditing = null;
    state.collCurrent = null;
  }

  function renderCollectionsList() {
    $('#coll-modal-title').textContent = 'الباقات';
    const body = $('#coll-body');
    const colls = state.collections.sort((a, b) => b.createdAt - a.createdAt);

    body.innerHTML = `
      <p style="font-size:13px; color:var(--muted); margin:0 0 16px;">
        نظّم محفوظاتك في باقات مسمّاة — مثل "أفضل البرومبتس" أو "مكتبة الكود".
      </p>
      <div class="coll-grid">
        <button class="coll-add" id="coll-new">
          <span class="coll-add-plus">＋</span>
          <span>باقة جديدة · New Collection</span>
        </button>
        ${colls.map((c) => {
          const count = (c.itemIds || []).length;
          return `
            <button class="coll-card" data-coll="${c.id}" style="--coll-color: ${esc(c.color)};">
              <div class="coll-card-head">
                <div class="coll-icon">${esc(c.icon)}</div>
                <div class="coll-count">${count}</div>
              </div>
              <h4 class="coll-name">${esc(c.name)}</h4>
              <div class="coll-desc">${esc(c.description || '—')}</div>
              <div class="coll-meta">${timeAgo(c.createdAt)} · ${count === 1 ? '١ عنصر' : count + ' عناصر'}</div>
            </button>`;
        }).join('')}
      </div>
    `;

    $('#coll-new').onclick = () => openCollForm(null);
    $$('#coll-body [data-coll]').forEach((el) => {
      el.onclick = () => openCollDetail(el.dataset.coll);
    });
  }

  function openCollForm(existing) {
    state.collEditing = existing ? existing.id : null;
    const c = existing || { name: '', description: '', icon: '📁', color: '#0D9488' };
    $('#coll-modal-title').textContent = existing ? 'تعديل الباقة' : 'باقة جديدة';

    $('#coll-body').innerHTML = `
      <button class="back-link" id="coll-form-back" style="background:none; border:none; color:var(--muted); font-weight:700; font-size:12px; padding:0; cursor:pointer; margin-bottom:14px; display:inline-flex; gap:6px; align-items:center;">
        ← رجوع للقائمة
      </button>

      <form id="coll-form">
        <div class="field">
          <div class="field-label">
            <span>اسم الباقة <span class="req">*</span></span>
            <span class="en">Name</span>
          </div>
          <input type="text" id="coll-name" required maxlength="60"
                 placeholder="مثلاً: برومبتس التسويق"
                 value="${esc(c.name)}">
        </div>

        <div class="field">
          <div class="field-label">
            <span>وصف قصير (اختياري)</span>
            <span class="en">Description</span>
          </div>
          <input type="text" id="coll-desc" maxlength="200"
                 placeholder="ما الذي يميّز هذه الباقة؟"
                 value="${esc(c.description || '')}">
        </div>

        <div class="field">
          <div class="field-label">
            <span>الأيقونة</span>
            <span class="en">Icon</span>
          </div>
          <div class="icon-pick-row" id="icon-pick-row">
            ${COLL_ICONS.map((ic) =>
              `<button type="button" class="icon-pick ${ic === c.icon ? 'active' : ''}" data-icon="${esc(ic)}">${esc(ic)}</button>`
            ).join('')}
          </div>
        </div>

        <div class="field">
          <div class="field-label">
            <span>اللون</span>
            <span class="en">Color</span>
          </div>
          <div class="picker-row" id="color-pick-row">
            ${COLL_COLORS.map((col) =>
              `<button type="button" class="swatch ${col.hex === c.color ? 'active' : ''}" data-color="${esc(col.hex)}" style="background: ${esc(col.hex)};" aria-label="${esc(col.id)}"></button>`
            ).join('')}
          </div>
        </div>

        <input type="hidden" id="coll-icon-val" value="${esc(c.icon)}">
        <input type="hidden" id="coll-color-val" value="${esc(c.color)}">

        <div style="display:flex; gap:8px; margin-top:18px; flex-wrap:wrap;">
          <button type="submit" class="btn btn-indigo btn-lg" style="flex:1; min-width:160px;">
            ${existing ? '💾 حفظ التعديلات' : '＋ إنشاء الباقة'}
          </button>
          ${existing ? '<button type="button" class="btn btn-danger" id="coll-delete">🗑 حذف</button>' : ''}
        </div>
      </form>
    `;

    $('#coll-form-back').onclick = renderCollectionsList;

    $$('#icon-pick-row [data-icon]').forEach((el) => {
      el.onclick = () => {
        $$('#icon-pick-row [data-icon]').forEach((x) => x.classList.remove('active'));
        el.classList.add('active');
        $('#coll-icon-val').value = el.dataset.icon;
      };
    });
    $$('#color-pick-row [data-color]').forEach((el) => {
      el.onclick = () => {
        $$('#color-pick-row [data-color]').forEach((x) => x.classList.remove('active'));
        el.classList.add('active');
        $('#coll-color-val').value = el.dataset.color;
      };
    });

    $('#coll-form').addEventListener('submit', submitCollForm);

    const delBtn = $('#coll-delete');
    if (delBtn && existing) {
      delBtn.onclick = () => {
        if (!confirm('حذف هذه الباقة نهائياً؟ (العناصر تبقى محفوظة في ذاكرتك.)')) return;
        state.collections = state.collections.filter((x) => x.id !== existing.id);
        persist();
        toast('تم حذف الباقة', 'success');
        renderCollectionsList();
      };
    }
  }

  function submitCollForm(e) {
    e.preventDefault();
    const name = $('#coll-name').value.trim();
    if (!name) { toast('اسم الباقة مطلوب', 'error'); return; }
    const payload = {
      name,
      description: $('#coll-desc').value.trim(),
      icon: $('#coll-icon-val').value || '📁',
      color: $('#coll-color-val').value || '#0D9488',
    };

    if (state.collEditing) {
      const idx = state.collections.findIndex((x) => x.id === state.collEditing);
      if (idx >= 0) {
        state.collections[idx] = { ...state.collections[idx], ...payload, updatedAt: Date.now() };
      }
      persist();
      toast('تم التحديث ✓', 'success');
    } else {
      state.collections.unshift({
        id: uid(),
        ...payload,
        itemIds: [],
        createdAt: Date.now(),
      });
      persist();
      toast('تم إنشاء الباقة ✓', 'success');
    }
    state.collEditing = null;
    renderCollectionsList();
  }

  function openCollDetail(id) {
    const c = state.collections.find((x) => x.id === id);
    if (!c) return;
    state.collCurrent = id;
    $('#coll-modal-title').textContent = c.name;

    const items = (c.itemIds || [])
      .map((iid) => state.items.find((x) => x.id === iid))
      .filter(Boolean)
      .sort((a, b) => b.createdAt - a.createdAt);

    $('#coll-body').innerHTML = `
      <div class="coll-breadcrumb">
        <button id="coll-back-list">← كل الباقات</button>
        <span>/</span>
        <span>${esc(c.name)}</span>
      </div>

      <div class="coll-header" style="--coll-color: ${esc(c.color)};">
        <div class="coll-icon">${esc(c.icon)}</div>
        <div style="flex:1; min-width:0;">
          <h3>${esc(c.name)}</h3>
          <p>${esc(c.description || 'لا يوجد وصف')}</p>
          <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
            <button class="btn btn-indigo btn-sm" id="coll-add-items">＋ إضافة عناصر</button>
            <button class="btn btn-ghost btn-sm" id="coll-edit">✎ تعديل</button>
            <button class="btn btn-ghost btn-sm" id="coll-export-pdf">📄 PDF</button>
            <button class="btn btn-ghost btn-sm" id="coll-export-md">📝 Markdown</button>
            <button class="btn btn-ghost btn-sm" id="coll-export">⬇ JSON</button>
          </div>
        </div>
      </div>

      ${items.length ? `
        <div class="entries">
          ${items.map(entryHTML).join('')}
        </div>
      ` : `
        <div class="empty">
          <div class="empty-emoji">📭</div>
          <h3>الباقة فارغة</h3>
          <p>اضغط "+ إضافة عناصر" أعلاه لاختيار ما تبي ضمّه هنا.</p>
        </div>
      `}
    `;

    $('#coll-back-list').onclick = renderCollectionsList;
    $('#coll-add-items').onclick = () => openAddItemsPicker(id);
    $('#coll-edit').onclick = () => openCollForm(c);
    $('#coll-export').onclick = () => exportCollection(c);
    $('#coll-export-pdf').onclick = () => exportCollectionPDF(c);
    $('#coll-export-md').onclick = () => exportCollectionMarkdown(c);

    $$('#coll-body [data-item]').forEach((el) => {
      el.onclick = () => {
        closeCollections();
        setTimeout(() => openDetail(el.dataset.item), 120);
      };
    });
  }

  function openAddItemsPicker(collId) {
    const c = state.collections.find((x) => x.id === collId);
    if (!c) return;
    c.itemIds = c.itemIds || [];

    const body = $('#coll-body');
    $('#coll-modal-title').textContent = 'إضافة عناصر';

    // picker state — start with items already in the collection selected
    const selected = new Set(c.itemIds);
    const query = { q: '', type: 'all' };

    const typesOpts = allTypes()
      .map((t) => `<option value="${t.id}">${t.icon} ${esc(t.ar)}</option>`).join('');

    function paint() {
      const q = query.q.toLowerCase();
      const list = state.items
        .filter((it) => {
          if (query.type !== 'all' && it.type !== query.type) return false;
          if (!q) return true;
          const hay = (it.title + ' ' + it.body + ' ' + (it.tags || []).join(' ')).toLowerCase();
          return hay.includes(q);
        })
        .sort((a, b) => b.createdAt - a.createdAt);

      const existingInColl = c.itemIds.length;
      const toAdd = [...selected].filter((id) => !c.itemIds.includes(id)).length;
      const toRemove = c.itemIds.filter((id) => !selected.has(id)).length;

      body.innerHTML = `
        <div class="coll-breadcrumb">
          <button id="pick-back">← رجوع للباقة</button>
          <span>/</span>
          <span>إضافة عناصر إلى "${esc(c.name)}"</span>
        </div>

        <p style="font-size:13px; color:var(--muted); margin:0 0 14px;">
          اختر العناصر اللي تبي تضمّها. الأخضر = داخل الباقة، الرمادي = خارجها.
          <br>
          <strong style="color:var(--ink);">${selected.size}</strong> محدّد الآن
          ${toAdd ? `· <span style="color:var(--success);">+${toAdd} جديد</span>` : ''}
          ${toRemove ? `· <span style="color:var(--danger);">-${toRemove} سيُشال</span>` : ''}
        </p>

        <div class="toolbar" style="margin-bottom:14px;">
          <div class="search-field has-value">
            <span class="search-field-icon">⌕</span>
            <input type="search" id="pick-q" placeholder="ابحث في العناصر..." value="${esc(query.q)}">
          </div>
          <select class="type-select" id="pick-type" style="width:100%;">
            <option value="all">🗂 كل الأنواع (${state.items.length})</option>
            ${typesOpts}
          </select>
        </div>

        ${list.length === 0 ? `
          <div class="empty">
            <div class="empty-emoji">🔍</div>
            <h3>لا توجد عناصر</h3>
            <p>جرّب كلمة ثانية أو غيّر النوع.</p>
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:18px;">
            ${list.map((it) => {
              const t = getType(it.type);
              const on = selected.has(it.id);
              return `
                <label class="pack-select ${on ? 'on' : ''}" data-pick-item="${it.id}" style="cursor:pointer;">
                  <div class="pack-check">${on ? '✓' : ''}</div>
                  <div style="flex:1; min-width:0;">
                    <div style="font-size:13px; font-weight:700; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                      ${t.icon} ${esc(it.title)}
                    </div>
                    <div style="font-size:11px; color:var(--muted);">
                      ${esc(t.ar)} · ${timeAgo(it.createdAt)}
                      ${it.source ? `· ${esc(it.source)}` : ''}
                    </div>
                  </div>
                </label>`;
            }).join('')}
          </div>
        `}

        <div style="position: sticky; bottom: 0; background: var(--card); padding: 12px 0; border-top: 1px solid var(--line); display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-indigo" id="pick-save" style="flex:1; min-width:150px;">💾 حفظ التغييرات</button>
          <button class="btn btn-ghost" id="pick-cancel">إلغاء</button>
        </div>
      `;

      $('#pick-back').onclick = () => openCollDetail(collId);
      $('#pick-cancel').onclick = () => openCollDetail(collId);
      $('#pick-q').addEventListener('input', (e) => { query.q = e.target.value; paint(); });
      $('#pick-type').addEventListener('change', (e) => { query.type = e.target.value; paint(); });

      $$('[data-pick-item]').forEach((el) => {
        el.onclick = (ev) => {
          ev.preventDefault();
          const id = el.dataset.pickItem;
          if (selected.has(id)) selected.delete(id); else selected.add(id);
          paint();
        };
      });

      $('#pick-save').onclick = () => {
        c.itemIds = [...selected];
        persist();
        const added = c.itemIds.length - existingInColl + toRemove;
        toast(`تم الحفظ ✓ (الباقة فيها ${c.itemIds.length})`, 'success');
        openCollDetail(collId);
      };
    }

    paint();
  }

  function collectionItems(c) {
    return (c.itemIds || [])
      .map((iid) => state.items.find((x) => x.id === iid))
      .filter(Boolean)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  function safeFileName(name) {
    return (name || 'collection').replace(/\s+/g, '-').toLowerCase();
  }

  function exportCollection(c) {
    const items = collectionItems(c);
    const data = {
      app: 'AI Memory', collection: c.name, description: c.description,
      exportedAt: new Date().toISOString(), items,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFileName(c.name) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('تم التصدير JSON ✓', 'success');
  }

  function exportCollectionMarkdown(c) {
    const items = collectionItems(c);
    if (items.length === 0) { toast('الباقة فارغة', 'error'); return; }

    const today = new Date().toLocaleDateString('ar');
    const lines = [];
    lines.push(`# ${c.name}`);
    lines.push('');
    if (c.description) { lines.push(`> ${c.description}`); lines.push(''); }
    lines.push(`*${items.length} عنصر · صُدِّر في ${today}*`);
    lines.push('');
    lines.push('---');
    lines.push('');

    items.forEach((it, i) => {
      const t = getType(it.type);
      lines.push(`## ${i + 1}. ${it.title}`);
      lines.push('');
      const meta = [];
      meta.push(`**النوع**: ${t.icon} ${t.ar} · ${t.en}`);
      if (it.source) meta.push(`**المصدر**: ${it.source}`);
      if (it.lang) meta.push(`**اللغة**: \`${it.lang}\``);
      if (it.targetAi) meta.push(`**موجَّه لـ**: ${it.targetAi}`);
      if (it.tags && it.tags.length) meta.push(`**وسوم**: ${it.tags.map((x) => '#' + x).join(' ')}`);
      lines.push(meta.join(' · '));
      lines.push('');

      if (it.type === 'code') {
        lines.push('```' + (it.lang || ''));
        lines.push(it.body);
        lines.push('```');
      } else {
        lines.push(it.body);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    });

    lines.push(`_صُدِّر من ذاكرة الذكاء الاصطناعي · AI Memory · coffez.net/pages/zakerah_`);

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFileName(c.name) + '.md';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('تم التصدير Markdown ✓', 'success');
  }

  function exportCollectionPDF(c) {
    const items = collectionItems(c);
    if (items.length === 0) { toast('الباقة فارغة', 'error'); return; }

    const today = new Date().toLocaleDateString('ar');
    const css = `
      @page { size: A4; margin: 18mm; }
      * { box-sizing: border-box; }
      body {
        font-family: 'Tajawal', -apple-system, sans-serif;
        color: #0F1B2E; line-height: 1.7; margin: 0;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .cover { padding: 24px 0 32px; border-bottom: 3px solid ${c.color || '#0D9488'}; margin-bottom: 28px; }
      .cover .icon {
        display: inline-flex; align-items: center; justify-content: center;
        width: 56px; height: 56px; border-radius: 14px;
        background: ${c.color || '#0D9488'}; color: #fff; font-size: 26px;
        margin-bottom: 12px;
      }
      h1 { font-size: 30px; margin: 0 0 8px; font-weight: 900; color: #0B1F3A; }
      .desc { font-size: 14px; color: #5B6A81; margin: 0 0 8px; }
      .meta-row { font-size: 12px; color: #8E99AC; }

      .item { page-break-inside: avoid; padding: 16px 0 18px; border-bottom: 1px dashed #E2E6EE; }
      .item-num { font-size: 11px; color: #8E99AC; letter-spacing: 1px; font-weight: 700; }
      .item-title { font-size: 18px; font-weight: 800; margin: 4px 0 8px; color: #0B1F3A; }
      .badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
      .badge {
        background: #EEF1F6; color: #0F1B2E; font-size: 10px; font-weight: 700;
        padding: 3px 8px; border-radius: 999px; letter-spacing: 0.3px;
      }
      .badge.t { background: ${c.color || '#0D9488'}; color: #fff; }
      .body { font-size: 13px; color: #0F1B2E; white-space: pre-wrap; word-wrap: break-word; }
      .body.code {
        font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
        background: #0B1F3A; color: #B8EAE6; padding: 12px 14px;
        border-radius: 6px; font-size: 12px; line-height: 1.6;
      }
      .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #E2E6EE;
        font-size: 11px; color: #8E99AC; text-align: center; }
    `;

    const itemHTML = items.map((it, i) => {
      const t = getType(it.type);
      const badges = [
        `<span class="badge t">${t.icon} ${esc(t.ar)} · ${esc(t.en)}</span>`,
        it.source ? `<span class="badge">📎 ${esc(it.source)}</span>` : '',
        it.lang ? `<span class="badge">${esc(it.lang)}</span>` : '',
        it.targetAi ? `<span class="badge">→ ${esc(it.targetAi)}</span>` : '',
        ...(it.tags || []).map((x) => `<span class="badge">#${esc(x)}</span>`),
      ].filter(Boolean).join('');
      const isCode = it.type === 'code';
      return `
        <div class="item">
          <div class="item-num">${String(i + 1).padStart(2, '0')} / ${items.length}</div>
          <div class="item-title">${esc(it.title)}</div>
          <div class="badges">${badges}</div>
          <div class="body ${isCode ? 'code' : ''}">${esc(it.body)}</div>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${esc(c.name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
  <div class="cover">
    <div class="icon">${esc(c.icon)}</div>
    <h1>${esc(c.name)}</h1>
    ${c.description ? `<p class="desc">${esc(c.description)}</p>` : ''}
    <div class="meta-row">${items.length} عنصر · صُدِّر في ${today}</div>
  </div>
  ${itemHTML}
  <div class="footer">صُدِّر من ذاكرة الذكاء الاصطناعي · AI Memory · coffez.net/pages/zakerah</div>
  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 500));
  <\/script>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) { toast('السماح بالنوافذ مطلوب لإنشاء PDF', 'error'); return; }
    w.document.open(); w.document.write(html); w.document.close();
    toast('افتح حوار الطباعة → احفظ كـPDF', 'success');
  }

  function toggleItemInCollection(collId, itemId) {
    const c = state.collections.find((x) => x.id === collId);
    if (!c) return;
    c.itemIds = c.itemIds || [];
    const i = c.itemIds.indexOf(itemId);
    if (i >= 0) {
      c.itemIds.splice(i, 1);
      toast('أُزيل من "' + c.name + '"', 'success');
    } else {
      c.itemIds.unshift(itemId);
      toast('أُضيف إلى "' + c.name + '"', 'success');
    }
    persist();
    // refresh detail modal so pill state updates
    openDetail(itemId);
  }

  /* ============ BOOTSTRAP ============ */
  function bindGlobal() {
    // top buttons
    $('#brand-home')?.addEventListener('click', () => {
      state.filter = { type: 'all', q: '' };
      const inp = $('#search-inline');
      if (inp) { inp.value = ''; $('#search-wrap')?.classList.remove('has-value'); }
      render();
    });
    $('#btn-new')?.addEventListener('click', () => openCreate('prompt'));
    $('#btn-collections')?.addEventListener('click', openCollections);
    $('#btn-monet')?.addEventListener('click', openMonetize);
    $('#monet-close')?.addEventListener('click', closeMonetize);
    $('#monet-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'monet-modal') closeMonetize();
    });
    $('#btn-settings')?.addEventListener('click', openSettings);
    $('#settings-close')?.addEventListener('click', closeSettings);
    $('#settings-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'settings-modal') closeSettings();
    });
    $('#import-file')?.addEventListener('change', (e) => {
      handleImportFile(e.target.files[0]);
      e.target.value = ''; // allow re-picking the same file
    });
    $('#coll-close')?.addEventListener('click', closeCollections);
    $('#coll-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'coll-modal') closeCollections();
    });
    $('#fab')?.addEventListener('click', () => openCreate('prompt'));

    // editor modal
    $('#editor-close')?.addEventListener('click', closeEditor);
    $('#editor-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'editor-modal') closeEditor();
    });
    $('#editor-form')?.addEventListener('submit', submitEditor);

    // detail modal
    $('#detail-close')?.addEventListener('click', closeDetail);
    $('#detail-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'detail-modal') closeDetail();
    });

    // inline keyword search
    const searchInline = $('#search-inline');
    const searchWrap   = $('#search-wrap');
    const searchClear  = $('#search-clear');
    searchInline?.addEventListener('input', (e) => {
      state.filter.q = e.target.value;
      searchWrap?.classList.toggle('has-value', !!e.target.value);
      renderList();
    });
    searchClear?.addEventListener('click', () => {
      if (!searchInline) return;
      searchInline.value = '';
      state.filter.q = '';
      searchWrap?.classList.remove('has-value');
      searchInline.focus();
      renderList();
    });

    // type dropdown next to "+ جديد"
    const typeSelect = $('#type-filter');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        state.filter.type = e.target.value;
        render();
      });
    }

    // legacy search modal (kept for Cmd+K but not in the header anymore)
    $('#search-close')?.addEventListener('click', closeSearch);
    $('#search-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'search-modal') closeSearch();
    });
    $('#search-input')?.addEventListener('input', (e) => {
      state.filter.q = e.target.value;
      if (searchInline) searchInline.value = e.target.value;
      searchWrap?.classList.toggle('has-value', !!e.target.value);
      renderList();
    });
    $('#search-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSearch();
    });

    // global shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeEditor(); closeDetail(); closeSearch();
        closeCollections(); closeSettings(); closeMonetize();
        closePaywall(); closeAuth();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const inline = $('#search-inline');
        if (inline) { inline.focus(); inline.select(); }
        else openSearch();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openCreate('prompt');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    load();
    bindGlobal();
    renderAuthUI();
    // wire welcome CTAs (exist in DOM from first load)
    $('#welcome-demo')?.addEventListener('click', startWithDemos);
    $('#welcome-blank')?.addEventListener('click', startBlank);
    // auth modal
    $('#auth-close')?.addEventListener('click', closeAuth);
    $('#auth-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'auth-modal') closeAuth();
    });
    $('#auth-form')?.addEventListener('submit', submitAuth);
    $$('[data-auth-tab]').forEach((el) => {
      el.onclick = () => setAuthMode(el.dataset.authTab);
    });

    // paywall shortcut to sign-in for returning customers
    $('#paywall-signin')?.addEventListener('click', () => {
      closePaywall();
      setTimeout(() => openAuth('signin'), 160);
    });

    // If Firebase is already in a signed-in state when the app loads
    // (returning user on same browser), make sure Pro is synced from
    // the account even if localStorage was wiped.
    window.addEventListener('cw-auth-changed', () => {
      renderAuthUI();
      if (isSignedIn() && !isPro()) {
        syncProFromAccount();
      }
    });

    // Prominent header + strip sign-in entry points
    $('#btn-account')?.addEventListener('click', () => {
      if (isSignedIn()) {
        openSettings();
      } else {
        openAuth('signin');
      }
    });
    $('#strip-signin')?.addEventListener('click', () => openAuth('signin'));
    $('#strip-signup')?.addEventListener('click', () => openAuth('signup'));

    // wire paywall CTAs
    $('#paywall-close')?.addEventListener('click', closePaywall);
    $('#paywall-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'paywall-modal') closePaywall();
    });
    $('#paywall-buy')?.addEventListener('click', () => {
      logEvent('zakerah_gumroad_click', { signedIn: isSignedIn() });
      window.open(GUMROAD_PRO_URL, '_blank', 'noopener');
      const steps = $('#paywall-steps');
      if (steps) steps.style.display = 'block';
      $('#paywall-license')?.focus();
    });
    $('#paywall-activate')?.addEventListener('click', activateLicense);
    $('#paywall-license')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); activateLicense(); }
    });
    render();
    if (shouldShowWelcome()) openWelcome();
  });

  // Expose what HTML/onclick handlers need
  Object.assign(window.Z, {
    openCreate, openEdit, openDetail,
    closeEditor, closeDetail, closeSearch,
    openSearch, exportAll,
  });

})();
