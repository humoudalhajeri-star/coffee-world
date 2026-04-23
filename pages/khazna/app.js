/**
 * KHAZNA v2 — خِزنة
 * Category-first personal archive for AI conversations.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'khazna.v2';

  const CATS = [
    { id: 'code',     ar: 'كود',          en: 'Code',     icon: '⌘', mono: true  },
    { id: 'writing',  ar: 'كتابة',        en: 'Writing',  icon: '✎', mono: false },
    { id: 'ideas',    ar: 'أفكار',        en: 'Ideas',    icon: '☆', mono: false },
    { id: 'business', ar: 'أعمال',        en: 'Business', icon: '◆', mono: false },
    { id: 'health',   ar: 'صحة',          en: 'Health',   icon: '♡', mono: false },
    { id: 'coffee',   ar: 'قهوة',         en: 'Coffee',   icon: '☕', mono: false },
    { id: 'ai',       ar: 'ذكاء اصطناعي',  en: 'AI',       icon: '🧠', mono: false },
    { id: 'other',    ar: 'أخرى',         en: 'Other',    icon: '◦', mono: false },
  ];

  let state = {
    items: [],
    packs: [],
    packDraft: { name: '', selected: [] },
  };

  /* ============ STORAGE ============ */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        state.items = Array.isArray(d.items) ? d.items : [];
        state.packs = Array.isArray(d.packs) ? d.packs : [];
      }
    } catch {}
    if (state.items.length === 0) seedDemo();
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      items: state.items, packs: state.packs,
    }));
  }

  function seedDemo() {
    const now = Date.now();
    state.items = [
      {
        id: uid(),
        question: 'كيف أحسّن أداء React؟',
        answer: 'const MemoList = React.memo(List);\n\n// استخدم useMemo للعمليات الثقيلة:\nconst total = useMemo(() => items.reduce((s, i) => s + i.price, 0), [items]);\n\n// تجنّب re-renders بـ useCallback للدوال الممررة.',
        category: 'code', important: true, tags: ['react'],
        createdAt: now - 1000 * 60 * 60 * 2,
      },
      {
        id: uid(),
        question: 'قالب إيميل متابعة عميل محترف',
        answer: 'مرحباً [الاسم]،\n\nأتمنى أن يصلك هذا الإيميل بخير.\nأودّ متابعة محادثتنا السابقة حول [الموضوع]، وأتطلّع لسماع رأيك متى تسنّى لك ذلك.\n\nفي خدمتك،\n[اسمك]',
        category: 'writing', important: false, tags: ['email'],
        createdAt: now - 1000 * 60 * 60 * 24,
      },
      {
        id: uid(),
        question: '10 أفكار محتوى تسويقي لمقهى مختص',
        answer: '1) سلسلة "بيت القهوة" — قصص المزارعين.\n2) reels لطرق التحضير المختلفة.\n3) شراكات مع بريستاس محليين.\n4) محتوى تعليمي عن الأصول.\n5) live tastings في المقهى.',
        category: 'ideas', important: true, tags: ['marketing'],
        createdAt: now - 1000 * 60 * 60 * 24 * 3,
      },
    ];
    persist();
  }

  /* ============ HELPERS ============ */
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  function uid() {
    return 'k_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  }

  function esc(s) {
    return (s || '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)     return 'الآن';
    if (s < 3600)   return Math.floor(s / 60) + ' د';
    if (s < 86400)  return Math.floor(s / 3600) + ' س';
    if (s < 604800) return Math.floor(s / 86400) + ' ي';
    return new Date(ts).toLocaleDateString('ar');
  }

  function getCat(id) {
    return CATS.find((c) => c.id === id) || CATS[CATS.length - 1];
  }

  function itemCount(catId) {
    return state.items.filter((x) => x.category === catId).length;
  }

  function toast(msg, kind = '') {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show ' + kind;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.className = 'toast ' + kind; }, 2400);
  }

  /* ============ ROUTING ============ */
  const VIEWS = ['home', 'cat', 'item', 'search', 'packs', 'library'];
  let current = { view: 'home', param: null };

  function parseHash() {
    const h = (location.hash || '#/home').replace(/^#\/?/, '');
    const [view, param] = h.split('/');
    return { view: VIEWS.includes(view) ? view : 'home', param };
  }

  function go(path) { location.hash = '#/' + path.replace(/^\/+/, ''); }

  function handleRoute() {
    current = parseHash();
    $$('.view').forEach((v) => v.classList.toggle('active', v.dataset.view === current.view));
    render();
    window.scrollTo(0, 0);
  }

  /* ============ RENDER DISPATCH ============ */
  function render() {
    switch (current.view) {
      case 'home':    renderHome(); break;
      case 'cat':     renderCategory(current.param); break;
      case 'item':    renderItem(current.param); break;
      case 'search':  renderSearch(); break;
      case 'packs':   renderPacks(); break;
      case 'library': renderLibrary(); break;
    }
  }

  /* ============ HOME ============ */
  function renderHome() {
    const total = state.items.length;
    const impCount = state.items.filter((x) => x.important).length;
    const catsWithCount = CATS.map((c) => ({ ...c, count: itemCount(c.id) }));

    $('#home-stat-total').textContent = total;
    $('#home-stat-cats').textContent  = catsWithCount.filter((c) => c.count > 0).length;
    $('#home-stat-imp').textContent   = impCount;

    $('#home-cat-grid').innerHTML = catsWithCount.map((c) => `
      <button class="cat-tile" data-cat-go="${c.id}" style="--cat-accent: var(--cat-${c.id});">
        <div class="cat-tile-head">
          <div class="cat-tile-icon">${c.icon}</div>
          <div class="cat-tile-count">${c.count}</div>
        </div>
        <div class="cat-tile-name">
          ${esc(c.ar)}
          <span class="en">${esc(c.en)}</span>
        </div>
      </button>
    `).join('');

    const recent = [...state.items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    $('#home-recent').innerHTML = recent.length
      ? recent.map(entryCardHTML).join('')
      : emptyHTML('ابدأ بحفظ أول محادثة', 'Save your first entry', '📚');

    $$('[data-cat-go]').forEach((el) => {
      el.onclick = () => go('cat/' + el.dataset.catGo);
    });
    bindEntryCards();
  }

  function entryCardHTML(it) {
    const cat = getCat(it.category);
    return `
      <button class="entry-card" data-item-go="${it.id}" style="--cat-accent: var(--cat-${cat.id});">
        <span class="entry-badge">${cat.icon} ${esc(cat.ar)}</span>
        <div class="entry-body">
          <div class="entry-title">${esc(it.question)}</div>
          <div class="entry-preview">${esc((it.answer || '').slice(0, 120))}</div>
          <div class="entry-meta">
            <span>${timeAgo(it.createdAt)}</span>
            ${it.tags && it.tags.length ? `<span>· ${it.tags.length} وسم</span>` : ''}
          </div>
        </div>
        <div class="entry-star ${it.important ? 'on' : ''}">${it.important ? '★' : '☆'}</div>
      </button>`;
  }

  function bindEntryCards() {
    $$('[data-item-go]').forEach((el) => {
      el.onclick = () => go('item/' + el.dataset.itemGo);
    });
  }

  function emptyHTML(title, titleEn, emoji, ctaText, ctaAction) {
    return `
      <div class="empty">
        <div class="empty-emoji">${emoji}</div>
        <h3>${esc(title)}</h3>
        <p>${esc(titleEn)}</p>
        ${ctaText ? `<button class="btn btn-olive" onclick="${ctaAction}">${esc(ctaText)}</button>` : ''}
      </div>`;
  }

  /* ============ CATEGORY PAGE (main workflow) ============ */
  let draft = { question: '', answer: '', important: false, tags: [] };

  function renderCategory(catId) {
    const cat = getCat(catId);
    const items = state.items
      .filter((x) => x.category === cat.id)
      .sort((a, b) => b.createdAt - a.createdAt);
    const view = $('#view-cat');
    view.setAttribute('data-cat', cat.id);

    view.innerHTML = `
      <button class="back-link" onclick="location.hash='#/home'">← الرئيسية · Home</button>

      <div class="cat-banner" style="background: var(--cat-${cat.id}); --cat-accent: var(--cat-${cat.id});">
        <div class="cat-banner-body">
          <span class="cat-banner-icon">${cat.icon}</span>
          <h2>${esc(cat.ar)}<span class="en">${esc(cat.en)}</span></h2>
        </div>
        <div class="cat-banner-stats">
          <strong>${items.length}</strong>
          <small>${items.length === 1 ? 'محفوظ · ITEM' : 'محفوظات · ITEMS'}</small>
        </div>
      </div>

      <div class="save-panel" style="--cat-accent: var(--cat-${cat.id});">
        <div class="save-panel-head">
          <h3>
            أضف إدخال جديد
            <span class="en">+ NEW ENTRY</span>
          </h3>
        </div>

        <form id="cat-save-form" autocomplete="off">
          <div class="field">
            <div class="field-label">
              <span>العنوان / السؤال <span class="req">*</span></span>
              <span class="en">Title / Question</span>
            </div>
            <input type="text" id="cat-q" placeholder="${cat.id === 'code' ? 'مثلاً: اختصار React hooks' : 'مثلاً: كيف أحسّن...'}" required>
          </div>

          <div class="field ${cat.mono ? 'mono' : ''}">
            <div class="field-label">
              <span>${cat.id === 'code' ? 'الكود' : 'المحتوى / الإجابة'} <span class="req">*</span></span>
              <span class="en">${cat.id === 'code' ? 'Code' : 'Content / Answer'}</span>
            </div>
            <textarea id="cat-a" placeholder="${cat.id === 'code' ? '// ألصق الكود هنا...' : 'ألصق الإجابة أو المحتوى هنا...'}" required rows="${cat.mono ? 8 : 5}"></textarea>
          </div>

          <div class="toggle-row">
            <div class="toggle-lbl">
              ضع علامة مهم ⭐
              <span class="en">Mark as important</span>
            </div>
            <button type="button" class="toggle" id="cat-imp"></button>
          </div>

          <div class="save-actions">
            <button type="submit" class="btn btn-olive btn-lg">💾 احفظ في ${esc(cat.ar)}</button>
            <button type="reset" class="btn btn-ghost">مسح</button>
            <span style="margin-inline-start:auto; font-size:12px; color:var(--muted);">⌘/Ctrl + Enter للحفظ السريع</span>
          </div>
        </form>
      </div>

      <div class="section-head">
        <h2>محفوظات ${esc(cat.ar)} <span class="en">SAVED IN ${esc(cat.en).toUpperCase()}</span></h2>
        ${items.length ? `<a class="link" onclick="location.hash='#/search'; sessionStorage.setItem('khazna.cat','${cat.id}');">بحث في التصنيف</a>` : ''}
      </div>

      <div class="entry-list" id="cat-items">
        ${items.length
          ? items.map(entryCardHTML).join('')
          : emptyHTML('لا يوجد شي هنا بعد', 'Nothing here yet', cat.icon)}
      </div>
    `;

    bindCategoryForm(cat);
    bindEntryCards();
  }

  function bindCategoryForm(cat) {
    draft = { question: '', answer: '', important: false, tags: [] };
    const form = $('#cat-save-form');
    const q = $('#cat-q');
    const a = $('#cat-a');
    const imp = $('#cat-imp');

    q.addEventListener('input', (e) => { draft.question = e.target.value; });
    a.addEventListener('input', (e) => { draft.answer = e.target.value; });
    imp.addEventListener('click', () => {
      draft.important = !draft.important;
      imp.classList.toggle('on', draft.important);
    });

    a.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const qv = (q.value || '').trim();
      const av = (a.value || '').trim();
      if (!qv || !av) { toast('العنوان والمحتوى مطلوبان', 'error'); return; }
      const newItem = {
        id: uid(),
        question: qv,
        answer: av,
        category: cat.id,
        important: draft.important,
        tags: [],
        createdAt: Date.now(),
      };
      state.items.unshift(newItem);
      persist();
      toast('تم الحفظ في ' + cat.ar + ' ✓', 'success');
      renderCategory(cat.id);
    });

    form.addEventListener('reset', () => {
      draft = { question: '', answer: '', important: false, tags: [] };
      imp.classList.remove('on');
    });
  }

  /* expose for next part */
  window.KH = {
    state, CATS, STORAGE_KEY,
    persist, load, uid, esc, timeAgo, getCat, toast,
    go, handleRoute, render,
    entryCardHTML, bindEntryCards, emptyHTML,
    renderHome,
  };

  /* bootstrap is in part 2 */
})();
