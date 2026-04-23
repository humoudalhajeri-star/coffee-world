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

  /* ============ ITEM DETAIL ============ */
  function renderItem(id) {
    const it = state.items.find((x) => x.id === id);
    const view = $('#view-item');
    if (!it) {
      view.innerHTML = emptyHTML('العنصر غير موجود', 'Item not found', '🔍',
        'رجوع للرئيسية', "location.hash='#/home'");
      return;
    }
    const cat = getCat(it.category);
    view.innerHTML = `
      <button class="back-link" onclick="location.hash='#/cat/${cat.id}'">← ${esc(cat.ar)} · ${esc(cat.en)}</button>

      <article class="detail-card" style="--cat-accent: var(--cat-${cat.id});">
        <div class="detail-head">
          <div class="detail-badges">
            <span class="badge cat" style="background:var(--cat-${cat.id});">${cat.icon} ${esc(cat.ar)} · ${esc(cat.en)}</span>
            ${it.important ? '<span class="badge important">⭐ مهم</span>' : ''}
            <span class="badge">${timeAgo(it.createdAt)}</span>
          </div>
        </div>

        <h2 class="detail-q">${esc(it.question)}</h2>

        <div class="detail-label">${cat.id === 'code' ? 'الكود · Code' : 'الإجابة · Answer'}</div>
        <div class="detail-a ${cat.mono ? 'mono' : ''}">${esc(it.answer)}</div>

        ${it.tags && it.tags.length ? `
          <div class="detail-label">الوسوم · Tags</div>
          <div class="chips">${it.tags.map((t) => `<span class="chip">#${esc(t)}</span>`).join('')}</div>
        ` : ''}

        <div class="detail-actions">
          <button class="btn btn-olive" data-act="copy">⧉ نسخ</button>
          <button class="btn btn-ghost" data-act="edit">✎ تعديل</button>
          <button class="btn btn-ghost" data-act="share">↗ مشاركة</button>
          <button class="btn btn-ghost" data-act="star">${it.important ? '★ إلغاء النجمة' : '☆ ضع نجمة'}</button>
          <button class="btn btn-danger" data-act="delete">🗑 حذف</button>
        </div>
      </article>
    `;

    $$('[data-act]').forEach((el) => {
      el.onclick = () => handleItemAct(el.dataset.act, it);
    });
  }

  async function handleItemAct(act, it) {
    if (act === 'copy') {
      const txt = `${it.question}\n\n${it.answer}`;
      try { await navigator.clipboard.writeText(txt); toast('تم النسخ ✓', 'success'); }
      catch { toast('تعذّر النسخ', 'error'); }
    } else if (act === 'edit') {
      openEditModal(it);
    } else if (act === 'share') {
      const txt = `${it.question}\n\n${it.answer}\n\n— خِزنة`;
      if (navigator.share) {
        try { await navigator.share({ title: it.question, text: txt }); } catch {}
      } else {
        try { await navigator.clipboard.writeText(txt); toast('نُسخ للمشاركة ✓', 'success'); }
        catch { toast('تعذّرت المشاركة', 'error'); }
      }
    } else if (act === 'star') {
      it.important = !it.important;
      persist();
      renderItem(it.id);
    } else if (act === 'delete') {
      if (!confirm('حذف هذا العنصر نهائياً؟')) return;
      state.items = state.items.filter((x) => x.id !== it.id);
      persist();
      toast('تم الحذف', 'success');
      go('cat/' + it.category);
    }
  }

  /* ============ SEARCH ============ */
  let searchFilter = { category: 'all', important: false, q: '' };

  function renderSearch() {
    // honor category filter passed from category page
    const fromCat = sessionStorage.getItem('khazna.cat');
    if (fromCat) {
      searchFilter.category = fromCat;
      sessionStorage.removeItem('khazna.cat');
    }

    const view = $('#view-search');
    view.innerHTML = `
      <div class="page-head">
        <h1>بحث <span class="en">SEARCH</span></h1>
      </div>

      <div class="search-hero" style="margin-bottom:18px;">
        <span class="s-ico">⌕</span>
        <input type="search" id="q-input" placeholder="ابحث في الأسئلة والإجابات والوسوم..." value="${esc(searchFilter.q)}">
      </div>

      <div class="chips" style="margin-bottom:16px;">
        <button class="chip ${searchFilter.category === 'all' ? 'active' : ''}" data-fcat="all">الكل · All</button>
        ${CATS.map((c) =>
          `<button class="chip ${searchFilter.category === c.id ? 'active' : ''}" data-fcat="${c.id}">${c.icon} ${esc(c.ar)}</button>`
        ).join('')}
        <button class="chip ${searchFilter.important ? 'active' : ''}" data-fimp="1">⭐ مهم فقط</button>
      </div>

      <div class="result-count" id="q-count"></div>
      <div class="entry-list" id="q-results"></div>
    `;

    const input = $('#q-input');
    input.addEventListener('input', (e) => { searchFilter.q = e.target.value; runSearch(); });
    input.focus();

    $$('[data-fcat]').forEach((el) => {
      el.onclick = () => { searchFilter.category = el.dataset.fcat; renderSearch(); };
    });
    $('[data-fimp]').onclick = () => { searchFilter.important = !searchFilter.important; renderSearch(); };

    runSearch();
  }

  function runSearch() {
    const q = (searchFilter.q || '').trim().toLowerCase();
    const results = state.items.filter((it) => {
      if (searchFilter.category !== 'all' && it.category !== searchFilter.category) return false;
      if (searchFilter.important && !it.important) return false;
      if (!q) return true;
      const hay = (it.question + ' ' + it.answer + ' ' + (it.tags || []).join(' ')).toLowerCase();
      return hay.includes(q);
    }).sort((a, b) => b.createdAt - a.createdAt);

    $('#q-count').textContent = results.length + ' نتيجة · ' + results.length + ' results';
    $('#q-results').innerHTML = results.length
      ? results.map((it) => resultCardHTML(it, q)).join('')
      : emptyHTML('لا نتائج', 'No results', '🔍');
    bindEntryCards();
  }

  function highlight(text, q) {
    if (!q) return esc(text);
    const safe = esc(text);
    const qq = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp(qq, 'ig'), (m) => `<mark>${m}</mark>`);
  }

  function resultCardHTML(it, q) {
    const cat = getCat(it.category);
    return `
      <button class="entry-card" data-item-go="${it.id}" style="--cat-accent: var(--cat-${cat.id});">
        <span class="entry-badge">${cat.icon} ${esc(cat.ar)}</span>
        <div class="entry-body">
          <div class="entry-title">${highlight(it.question, q)}</div>
          <div class="entry-preview">${highlight((it.answer || '').slice(0, 140), q)}</div>
          <div class="entry-meta"><span>${timeAgo(it.createdAt)}</span></div>
        </div>
        <div class="entry-star ${it.important ? 'on' : ''}">${it.important ? '★' : '☆'}</div>
      </button>`;
  }

  /* ============ PACKS ============ */
  function renderPacks() {
    const view = $('#view-packs');
    const sel = state.packDraft.selected;

    view.innerHTML = `
      <div class="page-head">
        <h1>الباقات <span class="en">COLLECTIONS</span></h1>
      </div>
      <p class="page-sub" style="margin-top:-14px; margin-bottom:22px;">
        اختر محفوظاتك، سمِّها باقة، صدّرها JSON أو احفظها للرجوع لاحقاً.
      </p>

      <div class="pack-draft-head">
        <strong>باقة جديدة · New Pack</strong>
        <span class="pack-draft-count">${sel.length} محدد</span>
      </div>

      <div class="field" style="margin-bottom:14px;">
        <div class="field-label">
          <span>اسم الباقة</span>
          <span class="en">Pack Name</span>
        </div>
        <input type="text" id="pack-name" value="${esc(state.packDraft.name)}" placeholder="مثلاً: أفضل React prompts">
      </div>

      <div class="section-head">
        <h2>اختر العناصر <span class="en">SELECT ITEMS</span></h2>
        ${state.items.length ? `<button class="link" id="pack-all">${sel.length === state.items.length ? 'مسح الكل' : 'تحديد الكل'}</button>` : ''}
      </div>

      <div style="margin-bottom:22px;">
        ${state.items.length ? state.items.map((it) => {
          const on = sel.includes(it.id);
          const c = getCat(it.category);
          return `
            <div class="pack-select ${on ? 'on' : ''}" data-sel="${it.id}">
              <div class="pack-check">${on ? '✓' : ''}</div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:700; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.icon} ${esc(it.question)}</div>
                <div style="font-size:11px; color:var(--muted);">${esc(c.ar)} · ${timeAgo(it.createdAt)}</div>
              </div>
            </div>`;
        }).join('') : '<p style="color:var(--muted); text-align:center; padding:30px;">لا يوجد محفوظات. احفظ أولاً.</p>'}
      </div>

      <div class="save-actions">
        <button class="btn btn-olive" id="pack-save" ${sel.length ? '' : 'disabled style="opacity:.5;"'}>💾 احفظ الباقة</button>
        <button class="btn btn-copper" id="pack-export" ${sel.length ? '' : 'disabled style="opacity:.5;"'}>⬇ تصدير JSON</button>
        <button class="btn btn-ghost" id="pack-clear">مسح الاختيار</button>
      </div>

      ${state.packs.length ? `
        <div class="section" style="margin-top:40px;">
          <div class="section-head"><h2>باقاتي المحفوظة <span class="en">MY PACKS</span></h2></div>
          ${state.packs.map((p) => `
            <div class="saved-pack">
              <div class="saved-pack-body">
                <strong>${esc(p.name)}</strong>
                <small>${p.itemIds.length} عنصر · ${timeAgo(p.createdAt)}</small>
              </div>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-ghost btn-sm" data-pack-exp="${p.id}">⬇ تصدير</button>
                <button class="btn btn-danger btn-sm" data-pack-del="${p.id}">🗑</button>
              </div>
            </div>
          `).join('')}
        </div>` : ''}
    `;

    $('#pack-name').oninput = (e) => { state.packDraft.name = e.target.value; };
    $$('[data-sel]').forEach((el) => {
      el.onclick = () => {
        const id = el.dataset.sel;
        const i = state.packDraft.selected.indexOf(id);
        if (i >= 0) state.packDraft.selected.splice(i, 1);
        else state.packDraft.selected.push(id);
        renderPacks();
      };
    });
    const allBtn = $('#pack-all');
    if (allBtn) allBtn.onclick = () => {
      state.packDraft.selected = state.packDraft.selected.length === state.items.length
        ? [] : state.items.map((x) => x.id);
      renderPacks();
    };
    $('#pack-clear').onclick = () => { state.packDraft.selected = []; renderPacks(); };
    $('#pack-save').onclick = savePackDraft;
    $('#pack-export').onclick = exportPackDraft;

    $$('[data-pack-exp]').forEach((el) => el.onclick = () => exportPackById(el.dataset.packExp));
    $$('[data-pack-del]').forEach((el) => el.onclick = () => {
      if (!confirm('حذف الباقة؟')) return;
      state.packs = state.packs.filter((p) => p.id !== el.dataset.packDel);
      persist();
      toast('تم الحذف', 'success');
      renderPacks();
    });
  }

  function packToJSON(name, itemIds) {
    return {
      app: 'Khazna', version: 2, packName: name || 'Untitled',
      exportedAt: new Date().toISOString(),
      items: state.items.filter((x) => itemIds.includes(x.id))
        .map(({ id, question, answer, category, important, tags, createdAt }) =>
          ({ id, question, answer, category, important, tags, createdAt })),
    };
  }

  function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function exportPackDraft() {
    if (!state.packDraft.selected.length) return;
    const name = (state.packDraft.name || 'khazna-pack').trim();
    downloadJSON(packToJSON(name, state.packDraft.selected),
      name.replace(/\s+/g, '-').toLowerCase() + '.json');
    toast('تم التصدير ✓', 'success');
  }

  function savePackDraft() {
    if (!state.packDraft.selected.length) return;
    if (!state.packDraft.name.trim()) { toast('اكتب اسم للباقة', 'error'); return; }
    state.packs.unshift({
      id: uid(), name: state.packDraft.name.trim(),
      itemIds: [...state.packDraft.selected], createdAt: Date.now(),
    });
    state.packDraft = { name: '', selected: [] };
    persist();
    toast('تم حفظ الباقة ✓', 'success');
    renderPacks();
  }

  function exportPackById(id) {
    const p = state.packs.find((x) => x.id === id);
    if (!p) return;
    downloadJSON(packToJSON(p.name, p.itemIds),
      p.name.replace(/\s+/g, '-').toLowerCase() + '.json');
    toast('تم التصدير ✓', 'success');
  }

  /* ============ LIBRARY ============ */
  function renderLibrary() {
    const total = state.items.length;
    const imp = state.items.filter((x) => x.important).length;
    const byCat = CATS
      .map((c) => ({ ...c, count: itemCount(c.id) }))
      .filter((c) => c.count > 0);

    $('#view-library').innerHTML = `
      <div class="page-head">
        <h1>المكتبة <span class="en">LIBRARY</span></h1>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-copper btn-sm" id="lib-exp">⬇ صدّر الكل</button>
          <button class="btn btn-danger btn-sm" id="lib-clear">مسح الكل</button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-box"><div class="stat-box-num">${total}</div><div class="stat-box-lbl">محفوظات · Saves</div></div>
        <div class="stat-box"><div class="stat-box-num">${byCat.length}</div><div class="stat-box-lbl">تصنيفات · Categories</div></div>
        <div class="stat-box"><div class="stat-box-num">${imp}</div><div class="stat-box-lbl">مهمة ⭐ · Starred</div></div>
        <div class="stat-box"><div class="stat-box-num">${state.packs.length}</div><div class="stat-box-lbl">باقات · Packs</div></div>
      </div>

      <div class="section-head">
        <h2>توزيع التصنيفات <span class="en">BY CATEGORY</span></h2>
      </div>

      ${byCat.length ? byCat.map((c) => `
        <div class="saved-pack" style="cursor:pointer;" data-cat-go="${c.id}">
          <div class="saved-pack-body" style="display:flex; align-items:center; gap:14px;">
            <div class="cat-tile-icon" style="width:36px; height:36px; font-size:16px; background:var(--cat-${c.id});">${c.icon}</div>
            <div>
              <strong>${esc(c.ar)} · ${esc(c.en)}</strong>
              <small>${c.count} محفوظ · ${Math.round((c.count / total) * 100)}%</small>
            </div>
          </div>
          <span style="color:var(--muted); font-size:18px;">›</span>
        </div>
      `).join('') : '<p style="color:var(--muted); text-align:center; padding:30px;">لا يوجد بيانات.</p>'}
    `;

    $('#lib-exp').onclick = () => {
      downloadJSON({
        app: 'Khazna', version: 2, exportedAt: new Date().toISOString(),
        items: state.items, packs: state.packs,
      }, 'khazna-full-export.json');
      toast('تم التصدير ✓', 'success');
    };
    $('#lib-clear').onclick = () => {
      if (!confirm('حذف كل البيانات نهائياً؟ لا يمكن التراجع.')) return;
      if (!confirm('متأكد 100%؟')) return;
      state.items = []; state.packs = []; persist();
      toast('تم المسح', 'success');
      go('home');
    };
    $$('[data-cat-go]').forEach((el) => el.onclick = () => go('cat/' + el.dataset.catGo));
  }

  /* ============ EDIT MODAL ============ */
  function openEditModal(it) {
    const modal = $('#edit-modal');
    $('#edit-q').value = it.question;
    $('#edit-a').value = it.answer;
    $('#edit-cat').innerHTML = CATS.map((c) =>
      `<option value="${c.id}" ${c.id === it.category ? 'selected' : ''}>${c.icon} ${c.ar} · ${c.en}</option>`
    ).join('');
    $('#edit-imp').classList.toggle('on', it.important);
    modal.dataset.editing = it.id;
    modal.classList.add('open');
  }
  function closeEditModal() {
    $('#edit-modal').classList.remove('open');
    delete $('#edit-modal').dataset.editing;
  }

  function submitEdit(e) {
    e.preventDefault();
    const id = $('#edit-modal').dataset.editing;
    const idx = state.items.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const q = $('#edit-q').value.trim();
    const a = $('#edit-a').value.trim();
    if (!q || !a) { toast('مطلوب', 'error'); return; }
    state.items[idx] = {
      ...state.items[idx],
      question: q, answer: a,
      category: $('#edit-cat').value,
      important: $('#edit-imp').classList.contains('on'),
      updatedAt: Date.now(),
    };
    persist();
    toast('تم التحديث ✓', 'success');
    closeEditModal();
    renderItem(id);
  }

  /* ============ SAVE-FROM-AI MODAL ============ */
  function openFab() {
    $('#fab-modal').classList.add('open');
    tryPaste();
  }
  function closeFab() { $('#fab-modal').classList.remove('open'); }

  async function tryPaste() {
    const ta = $('#fab-text');
    ta.value = '';
    try {
      const t = await navigator.clipboard.readText();
      if (t && t.trim()) { ta.value = t.trim(); parseQA(t); }
    } catch {}
  }

  function parseQA(text) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    let q = '', a = '';
    const qMatch = text.match(/(?:^|\n)(?:Q|س|سؤال|السؤال|Question)[:：]?\s*(.+)/i);
    const aMatch = text.match(/(?:^|\n)(?:A|ج|جواب|الإجابة|Answer)[:：]?\s*([\s\S]+)/i);
    if (qMatch && aMatch) { q = qMatch[1].trim(); a = aMatch[1].trim(); }
    else if (lines.length >= 2) { q = lines[0]; a = lines.slice(1).join('\n'); }
    else { a = text.trim(); }
    $('#fab-q').value = q;
    $('#fab-a').value = a;
  }

  function submitFab(e) {
    e.preventDefault();
    const q = $('#fab-q').value.trim();
    const a = $('#fab-a').value.trim();
    const cat = $('#fab-cat').value;
    if (!q && !a) { toast('ألصق شي أولاً', 'error'); return; }
    const newItem = {
      id: uid(),
      question: q || 'بدون عنوان',
      answer: a || q,
      category: cat, important: false, tags: [],
      createdAt: Date.now(),
    };
    state.items.unshift(newItem);
    persist();
    toast('تم الحفظ ✓', 'success');
    closeFab();
    go('item/' + newItem.id);
  }

  /* ============ BOOTSTRAP ============ */
  function bindGlobal() {
    // topbar
    $('#brand-home')?.addEventListener('click', () => go('home'));
    $('#nav-search')?.addEventListener('click', () => go('search'));
    $('#nav-packs')?.addEventListener('click', () => go('packs'));
    $('#nav-library')?.addEventListener('click', () => go('library'));

    // hero search box
    $('#home-search')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        searchFilter.q = e.target.value;
        searchFilter.category = 'all';
        go('search');
      }
    });

    // FAB
    $('#fab')?.addEventListener('click', openFab);
    $('#fab-close')?.addEventListener('click', closeFab);
    $('#fab-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'fab-modal') closeFab();
    });
    $('#fab-form')?.addEventListener('submit', submitFab);
    $('#fab-paste')?.addEventListener('click', tryPaste);
    $('#fab-text')?.addEventListener('input', (e) => parseQA(e.target.value));

    // prefill FAB category select
    const fabCat = $('#fab-cat');
    if (fabCat) {
      fabCat.innerHTML = CATS.map((c) =>
        `<option value="${c.id}" ${c.id === 'ai' ? 'selected' : ''}>${c.icon} ${c.ar} · ${c.en}</option>`
      ).join('');
    }

    // edit modal
    $('#edit-close')?.addEventListener('click', closeEditModal);
    $('#edit-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'edit-modal') closeEditModal();
    });
    $('#edit-form')?.addEventListener('submit', submitEdit);
    $('#edit-imp')?.addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('on');
    });

    // Esc closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeFab(); closeEditModal(); }
    });

    window.addEventListener('hashchange', handleRoute);
  }

  document.addEventListener('DOMContentLoaded', () => {
    load();
    bindGlobal();
    handleRoute();
  });
})();
