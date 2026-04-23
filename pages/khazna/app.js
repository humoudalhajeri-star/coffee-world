/**
 * KHAZNA — خِزنة
 * AI conversation vault (localStorage-based web app)
 */
(function () {
  'use strict';

  /* ============ CONSTANTS ============ */
  const STORAGE_KEY = 'khazna.v1';
  const CATS = [
    { id: 'business', ar: 'أعمال',       en: 'Business', icon: '💼' },
    { id: 'coffee',   ar: 'قهوة',        en: 'Coffee',   icon: '☕' },
    { id: 'ai',       ar: 'ذكاء اصطناعي', en: 'AI',       icon: '🧠' },
    { id: 'code',     ar: 'كود',         en: 'Code',     icon: '⌘' },
    { id: 'writing',  ar: 'كتابة',       en: 'Writing',  icon: '✎' },
    { id: 'ideas',    ar: 'أفكار',       en: 'Ideas',    icon: '☆' },
    { id: 'health',   ar: 'صحة',         en: 'Health',   icon: '♡' },
    { id: 'other',    ar: 'أخرى',        en: 'Other',    icon: '◦' },
  ];

  /* ============ STATE / STORAGE ============ */
  let state = {
    items: [],
    packs: [],
    filters: { category: 'all', important: false },
    packDraft: { name: '', selected: [] },
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        state.items = Array.isArray(data.items) ? data.items : [];
        state.packs = Array.isArray(data.packs) ? data.packs : [];
      }
    } catch (e) { console.warn('load failed', e); }

    if (state.items.length === 0) seedDemo();
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      items: state.items,
      packs: state.packs,
    }));
  }

  function seedDemo() {
    const now = Date.now();
    state.items = [
      {
        id: 'demo1',
        question: 'كيف أحسّن أداء تطبيق React؟',
        answer: '1) استخدم useMemo و useCallback للعمليات الثقيلة.\n2) قسّم المكونات الكبيرة.\n3) lazy load للمسارات.\n4) تجنّب re-renders غير الضرورية عبر React.memo.',
        category: 'code',
        important: true,
        tags: ['react', 'performance'],
        createdAt: now - 1000 * 60 * 60 * 2,
      },
      {
        id: 'demo2',
        question: 'اكتب لي إيميل احترافي لمتابعة عميل',
        answer: 'مرحباً [الاسم]،\n\nأتمنى أن يصلك هذا الإيميل بخير. أودّ فقط المتابعة بخصوص [الموضوع]...',
        category: 'writing',
        important: false,
        tags: ['email'],
        createdAt: now - 1000 * 60 * 60 * 24,
      },
      {
        id: 'demo3',
        question: 'أفكار محتوى تسويقي لمقهى مختص',
        answer: '1) سلسلة "بيت القهوة" — قصص المزارعين.\n2) reels لطريقة تحضير كل قهوة.\n3) شراكة مع بريستاس محليين.\n4) محتوى تعليمي عن الأصول.',
        category: 'business',
        important: true,
        tags: ['marketing', 'café'],
        createdAt: now - 1000 * 60 * 60 * 24 * 3,
      },
    ];
    state.packs = [];
    persist();
  }

  /* ============ HELPERS ============ */
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const uid = () => 'k_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  const esc = (s) => (s || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)      return 'الآن';
    if (s < 3600)    return Math.floor(s / 60) + ' د';
    if (s < 86400)   return Math.floor(s / 3600) + ' س';
    if (s < 604800)  return Math.floor(s / 86400) + ' ي';
    return new Date(ts).toLocaleDateString('ar');
  }

  function getCat(id) {
    return CATS.find((c) => c.id === id) || CATS[CATS.length - 1];
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
  const ROUTES = ['home', 'save', 'detail', 'search', 'collection', 'library'];
  let currentView = 'home';
  let currentDetailId = null;

  function parseHash() {
    const h = (location.hash || '#/home').replace(/^#\/?/, '');
    const [view, param] = h.split('/');
    return { view: ROUTES.includes(view) ? view : 'home', param };
  }

  function navigate(path) {
    location.hash = '#/' + path.replace(/^\/+/, '');
  }

  function handleRoute() {
    const { view, param } = parseHash();
    currentView = view;
    currentDetailId = view === 'detail' ? param : null;

    $$('.view').forEach((el) => el.classList.toggle('active', el.id === 'view-' + view));
    $$('.sb-item[data-route]').forEach((el) => {
      el.classList.toggle('active', el.dataset.route === view);
    });

    closeDrawer();
    render();
    window.scrollTo(0, 0);
  }

  /* ============ VIEW RENDERERS ============ */
  function render() {
    switch (currentView) {
      case 'home':       renderHome(); break;
      case 'save':       renderSave(); break;
      case 'detail':     renderDetail(); break;
      case 'search':     renderSearch(); break;
      case 'collection': renderCollection(); break;
      case 'library':    renderLibrary(); break;
    }
  }

  function renderHome() {
    const recent = [...state.items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
    const important = state.items.filter((x) => x.important).slice(0, 4);
    const catsWithCount = CATS
      .map((c) => ({ ...c, count: state.items.filter((x) => x.category === c.id).length }))
      .filter((c) => c.count > 0);

    $('#home-recent').innerHTML = recent.length
      ? recent.map(itemCardHTML).join('')
      : emptyStateHTML('ابدأ بحفظ أول محادثة', 'Save your first conversation', '💾');

    $('#home-cats').innerHTML = catsWithCount.length
      ? catsWithCount.map((c) => `
          <button class="cat-tile" data-cat="${c.id}">
            <span class="cat-tile-icon">${c.icon}</span>
            <span class="cat-tile-body">
              <strong>${esc(c.ar)} <span class="en">${esc(c.en)}</span></strong>
              <small>${c.count} ${c.count === 1 ? 'عنصر' : 'عناصر'}</small>
            </span>
          </button>`).join('')
      : '<p style="color:var(--muted); font-size:13px;">التصنيفات ستظهر هنا بعد الحفظ.</p>';

    $('#home-important').innerHTML = important.length
      ? important.map(itemCardHTML).join('')
      : '<p style="color:var(--muted); font-size:13px;">علّم أي عنصر بنجمة ⭐ ليظهر هنا.</p>';

    $('#home-stat-total').textContent = state.items.length;
    $('#home-stat-cats').textContent  = catsWithCount.length;
    $('#home-stat-imp').textContent   = state.items.filter((x) => x.important).length;

    bindCards();
    $$('[data-cat]').forEach((el) => {
      el.onclick = () => {
        state.filters.category = el.dataset.cat;
        navigate('search');
      };
    });
  }

  function itemCardHTML(item) {
    const cat = getCat(item.category);
    return `
      <div class="item-card" data-id="${item.id}">
        <div class="item-card-head">
          <span class="item-cat-tag">${cat.icon} ${esc(cat.ar)}</span>
          <span class="item-star ${item.important ? 'on' : ''}">${item.important ? '★' : '☆'}</span>
        </div>
        <div class="item-q">${esc(item.question)}</div>
        <div class="item-a">${esc(item.answer)}</div>
        <div class="item-meta">
          <span>${timeAgo(item.createdAt)}</span>
          ${item.tags && item.tags.length ? '<span>· ' + item.tags.length + ' وسم</span>' : ''}
        </div>
      </div>`;
  }

  function emptyStateHTML(title, titleEn, emoji) {
    return `
      <div class="empty-state">
        <div class="emoji">${emoji}</div>
        <h3>${esc(title)}</h3>
        <p>${esc(titleEn)}</p>
        <button class="btn btn-primary" onclick="location.hash='#/save'">＋ حفظ جديد</button>
      </div>`;
  }

  function bindCards() {
    $$('.item-card[data-id]').forEach((el) => {
      el.onclick = () => navigate('detail/' + el.dataset.id);
    });
  }

  /* ============ SAVE VIEW ============ */
  let saveDraft = { id: null, question: '', answer: '', category: 'other', important: false, tags: [] };

  function renderSave() {
    const editing = !!saveDraft.id;
    $('#save-title').textContent = editing ? 'تعديل' : 'حفظ جديد';
    $('#save-title-en').textContent = editing ? 'EDIT' : 'NEW SAVE';

    $('#save-q').value = saveDraft.question;
    $('#save-a').value = saveDraft.answer;

    const catSel = $('#save-cat');
    catSel.innerHTML = CATS.map((c) =>
      `<option value="${c.id}" ${c.id === saveDraft.category ? 'selected' : ''}>${c.icon} ${c.ar} · ${c.en}</option>`
    ).join('');

    $('#save-important').classList.toggle('on', saveDraft.important);

    renderTags();
  }

  function renderTags() {
    const wrap = $('#save-tags');
    wrap.innerHTML = saveDraft.tags.map((t, i) =>
      `<span class="chip active">${esc(t)} <button class="chip-remove" data-tag-i="${i}">×</button></span>`
    ).join('') + '<button class="chip" id="add-tag">＋ وسم</button>';

    $$('#save-tags [data-tag-i]').forEach((el) => {
      el.onclick = (e) => {
        e.stopPropagation();
        saveDraft.tags.splice(+el.dataset.tagI, 1);
        renderTags();
      };
    });
    $('#add-tag').onclick = () => {
      const t = prompt('اسم الوسم:');
      if (t && t.trim()) { saveDraft.tags.push(t.trim()); renderTags(); }
    };
  }

  function startSaveNew() {
    saveDraft = { id: null, question: '', answer: '', category: 'other', important: false, tags: [] };
    navigate('save');
  }

  function startSaveEdit(id) {
    const it = state.items.find((x) => x.id === id);
    if (!it) return;
    saveDraft = {
      id: it.id, question: it.question, answer: it.answer,
      category: it.category, important: !!it.important, tags: [...(it.tags || [])],
    };
    navigate('save');
  }

  function submitSave(e) {
    e.preventDefault();
    const q = $('#save-q').value.trim();
    const a = $('#save-a').value.trim();
    const cat = $('#save-cat').value;
    const important = $('#save-important').classList.contains('on');

    if (!q || !a) { toast('السؤال والجواب مطلوبان', 'error'); return; }

    if (saveDraft.id) {
      const idx = state.items.findIndex((x) => x.id === saveDraft.id);
      if (idx >= 0) {
        state.items[idx] = {
          ...state.items[idx],
          question: q, answer: a, category: cat, important,
          tags: [...saveDraft.tags], updatedAt: Date.now(),
        };
      }
      persist();
      toast('تم التحديث ✓', 'success');
      navigate('detail/' + saveDraft.id);
    } else {
      const newItem = {
        id: uid(), question: q, answer: a, category: cat, important,
        tags: [...saveDraft.tags], createdAt: Date.now(),
      };
      state.items.unshift(newItem);
      persist();
      toast('تم الحفظ ✓', 'success');
      navigate('detail/' + newItem.id);
    }
  }

  /* ============ DETAIL VIEW ============ */
  function renderDetail() {
    const it = state.items.find((x) => x.id === currentDetailId);
    const wrap = $('#detail-body');
    if (!it) {
      wrap.innerHTML = emptyStateHTML('العنصر غير موجود', 'Item not found', '🔍');
      return;
    }
    const cat = getCat(it.category);
    wrap.innerHTML = `
      <div class="detail-wrap">
        <article class="detail-main">
          <div class="detail-chips">
            <span class="item-cat-tag">${cat.icon} ${esc(cat.ar)} · ${esc(cat.en)}</span>
            ${it.important ? '<span class="item-cat-tag" style="background:var(--gold-soft); color:#7a6228;">⭐ مهم</span>' : ''}
            <span class="item-cat-tag" style="background:transparent; border:1px solid var(--line);">${timeAgo(it.createdAt)}</span>
          </div>
          <h2 class="detail-q">${esc(it.question)}</h2>
          <div class="detail-lbl">الإجابة · Answer</div>
          <div class="detail-a">${esc(it.answer)}</div>
          ${it.tags && it.tags.length ? `
            <div class="detail-lbl">الوسوم · Tags</div>
            <div class="chips">${it.tags.map((t) => `<span class="chip">#${esc(t)}</span>`).join('')}</div>
          ` : ''}
        </article>
        <aside class="detail-side">
          <div class="card">
            <div class="action-list">
              <button class="action-btn" data-act="copy">
                <span class="act-ico">⧉</span> نسخ <span class="en">Copy</span>
              </button>
              <button class="action-btn" data-act="edit">
                <span class="act-ico">✎</span> تعديل <span class="en">Edit</span>
              </button>
              <button class="action-btn" data-act="share">
                <span class="act-ico">↗</span> مشاركة <span class="en">Share</span>
              </button>
              <button class="action-btn" data-act="star">
                <span class="act-ico">${it.important ? '★' : '☆'}</span>
                ${it.important ? 'إلغاء التمييز' : 'ضع نجمة'} <span class="en">${it.important ? 'Unstar' : 'Star'}</span>
              </button>
              <button class="action-btn danger" data-act="delete">
                <span class="act-ico">🗑</span> حذف <span class="en">Delete</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    `;

    $$('#detail-body [data-act]').forEach((el) => {
      el.onclick = () => handleDetailAction(el.dataset.act, it);
    });
  }

  async function handleDetailAction(act, it) {
    if (act === 'copy') {
      const txt = `Q: ${it.question}\n\nA: ${it.answer}`;
      try { await navigator.clipboard.writeText(txt); toast('تم النسخ ✓', 'success'); }
      catch { toast('تعذّر النسخ', 'error'); }
    } else if (act === 'edit') {
      startSaveEdit(it.id);
    } else if (act === 'share') {
      const txt = `${it.question}\n\n${it.answer}\n\n— خِزنة`;
      if (navigator.share) {
        try { await navigator.share({ title: it.question, text: txt }); } catch {}
      } else {
        try { await navigator.clipboard.writeText(txt); toast('تم النسخ للمشاركة', 'success'); }
        catch { toast('تعذّرت المشاركة', 'error'); }
      }
    } else if (act === 'star') {
      it.important = !it.important;
      persist();
      renderDetail();
    } else if (act === 'delete') {
      if (!confirm('حذف هذا العنصر نهائياً؟')) return;
      state.items = state.items.filter((x) => x.id !== it.id);
      persist();
      toast('تم الحذف', 'success');
      navigate('home');
    }
  }

  /* ============ SEARCH VIEW ============ */
  function renderSearch() {
    const input = $('#search-input');
    const cached = sessionStorage.getItem('khazna.q') || '';
    if (cached && !input.value) {
      input.value = cached;
      sessionStorage.removeItem('khazna.q');
    }

    const chipsWrap = $('#search-cat-chips');
    chipsWrap.innerHTML = `
      <button class="chip ${state.filters.category === 'all' ? 'active' : ''}" data-fcat="all">الكل · All</button>
      ${CATS.map((c) =>
        `<button class="chip ${state.filters.category === c.id ? 'active' : ''}" data-fcat="${c.id}">${c.icon} ${esc(c.ar)}</button>`
      ).join('')}
      <button class="chip ${state.filters.important ? 'active' : ''}" data-fimp="1">⭐ مهم</button>
    `;
    $$('[data-fcat]').forEach((el) => {
      el.onclick = () => { state.filters.category = el.dataset.fcat; runSearch(); };
    });
    $('[data-fimp]').onclick = () => {
      state.filters.important = !state.filters.important;
      runSearch();
    };

    runSearch();
  }

  function runSearch() {
    const q = ($('#search-input').value || '').trim().toLowerCase();
    let results = state.items.filter((it) => {
      if (state.filters.category !== 'all' && it.category !== state.filters.category) return false;
      if (state.filters.important && !it.important) return false;
      if (!q) return true;
      const hay = (it.question + ' ' + it.answer + ' ' + (it.tags || []).join(' ')).toLowerCase();
      return hay.includes(q);
    }).sort((a, b) => b.createdAt - a.createdAt);

    const catChips = document.querySelectorAll('[data-fcat]');
    catChips.forEach((el) => el.classList.toggle('active', el.dataset.fcat === state.filters.category));
    const impChip = document.querySelector('[data-fimp]');
    if (impChip) impChip.classList.toggle('active', state.filters.important);

    $('#search-count').textContent = results.length + ' نتيجة';
    $('#search-results').innerHTML = results.length
      ? results.map((it) => resultRowHTML(it, q)).join('')
      : '<div class="empty-state"><div class="emoji">🔍</div><h3>لا توجد نتائج</h3><p>جرّب كلمة مختلفة أو أزل الفلاتر</p></div>';

    $$('.result-row[data-id]').forEach((el) => {
      el.onclick = () => navigate('detail/' + el.dataset.id);
    });
  }

  function highlight(text, q) {
    if (!q) return esc(text);
    const safe = esc(text);
    const qEsc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp(qEsc, 'ig'), (m) => `<mark>${m}</mark>`);
  }

  function resultRowHTML(it, q) {
    const cat = getCat(it.category);
    return `
      <div class="result-row" data-id="${it.id}">
        <div class="result-icon">${cat.icon}</div>
        <div class="result-body">
          <div class="result-title">${highlight(it.question, q)} ${it.important ? '<span style="color:var(--gold)">★</span>' : ''}</div>
          <div class="result-snippet">${highlight(it.answer.slice(0, 120), q)}</div>
        </div>
        <div class="result-meta">${timeAgo(it.createdAt)}</div>
      </div>`;
  }

  /* ============ COLLECTION (PACK) VIEW ============ */
  function renderCollection() {
    const body = $('#collection-body');
    const selectedCount = state.packDraft.selected.length;

    body.innerHTML = `
      <div class="pack-summary">
        <div>
          <strong>إنشاء باقة · Create Pack</strong>
          <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">اختر العناصر لتجميعها في باقة قابلة للتصدير</div>
        </div>
        <span class="pack-summary-num">${selectedCount} محدد</span>
      </div>

      <div class="field">
        <div class="field-label">
          <span>اسم الباقة <span class="en">Pack Name</span></span>
        </div>
        <input type="text" id="pack-name" placeholder="مثلاً: أفضل React prompts" value="${esc(state.packDraft.name)}">
      </div>

      <div class="section-head">
        <h2>اختر من خزنتك <span class="en">SELECT ITEMS</span></h2>
        <button class="link" id="pack-all">تحديد الكل</button>
      </div>

      <div class="pack-list">
        ${state.items.length ? state.items.map((it) => {
          const on = state.packDraft.selected.includes(it.id);
          const cat = getCat(it.category);
          return `
            <div class="pack-select-row ${on ? 'on' : ''}" data-sel="${it.id}">
              <div class="pack-check">${on ? '✓' : ''}</div>
              <div class="pack-select-body">
                <div class="result-title">${cat.icon} ${esc(it.question)}</div>
                <div class="result-snippet">${esc(it.answer.slice(0, 100))}</div>
              </div>
            </div>`;
        }).join('') : '<p style="color:var(--muted); text-align:center; padding:40px;">لا توجد عناصر للاختيار. احفظ أولاً.</p>'}
      </div>

      <div style="display:flex; gap:10px; margin-top:22px; flex-wrap:wrap;">
        <button class="btn btn-primary" id="pack-export" ${selectedCount ? '' : 'disabled style="opacity:.5;"'}>
          ⬇ تصدير كـJSON
        </button>
        <button class="btn btn-gold" id="pack-save" ${selectedCount ? '' : 'disabled style="opacity:.5;"'}>
          💾 حفظ الباقة
        </button>
        <button class="btn btn-ghost" id="pack-clear">مسح الاختيار</button>
      </div>

      ${state.packs.length ? `
        <div class="section" style="margin-top:40px;">
          <div class="section-head"><h2>باقاتي المحفوظة <span class="en">MY PACKS</span></h2></div>
          <div class="pack-list">
            ${state.packs.map((p) => `
              <div class="pack-row-saved">
                <div class="pack-row-saved-body">
                  <strong>${esc(p.name)}</strong>
                  <small>${p.itemIds.length} عنصر · ${timeAgo(p.createdAt)}</small>
                </div>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-ghost btn-sm" data-pack-exp="${p.id}">تصدير</button>
                  <button class="btn btn-danger btn-sm" data-pack-del="${p.id}">حذف</button>
                </div>
              </div>`).join('')}
          </div>
        </div>` : ''}
    `;

    $$('[data-sel]').forEach((el) => {
      el.onclick = () => {
        const id = el.dataset.sel;
        const i = state.packDraft.selected.indexOf(id);
        if (i >= 0) state.packDraft.selected.splice(i, 1);
        else state.packDraft.selected.push(id);
        renderCollection();
      };
    });
    $('#pack-name').oninput = (e) => { state.packDraft.name = e.target.value; };
    $('#pack-all').onclick = () => {
      state.packDraft.selected = state.packDraft.selected.length === state.items.length
        ? [] : state.items.map((x) => x.id);
      renderCollection();
    };
    $('#pack-clear').onclick = () => { state.packDraft.selected = []; renderCollection(); };
    $('#pack-export').onclick = exportDraftPack;
    $('#pack-save').onclick = saveDraftPack;

    $$('[data-pack-exp]').forEach((el) => {
      el.onclick = () => exportPackById(el.dataset.packExp);
    });
    $$('[data-pack-del]').forEach((el) => {
      el.onclick = () => {
        if (!confirm('حذف الباقة؟')) return;
        state.packs = state.packs.filter((p) => p.id !== el.dataset.packDel);
        persist();
        toast('تم حذف الباقة', 'success');
        renderCollection();
      };
    });
  }

  function packToJSON(name, itemIds) {
    return {
      app: 'Khazna',
      version: 1,
      packName: name || 'Untitled Pack',
      exportedAt: new Date().toISOString(),
      items: state.items
        .filter((x) => itemIds.includes(x.id))
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

  function exportDraftPack() {
    if (!state.packDraft.selected.length) return;
    const name = (state.packDraft.name || 'khazna-pack').trim();
    downloadJSON(packToJSON(name, state.packDraft.selected),
      name.replace(/\s+/g, '-').toLowerCase() + '.json');
    toast('تم التصدير ✓', 'success');
  }

  function saveDraftPack() {
    if (!state.packDraft.selected.length) return;
    if (!state.packDraft.name.trim()) { toast('اكتب اسم للباقة', 'error'); return; }
    state.packs.unshift({
      id: uid(), name: state.packDraft.name.trim(),
      itemIds: [...state.packDraft.selected], createdAt: Date.now(),
    });
    state.packDraft = { name: '', selected: [] };
    persist();
    toast('تم حفظ الباقة ✓', 'success');
    renderCollection();
  }

  function exportPackById(id) {
    const p = state.packs.find((x) => x.id === id);
    if (!p) return;
    downloadJSON(packToJSON(p.name, p.itemIds),
      p.name.replace(/\s+/g, '-').toLowerCase() + '.json');
    toast('تم التصدير ✓', 'success');
  }

  /* ============ LIBRARY VIEW ============ */
  function renderLibrary() {
    const total = state.items.length;
    const importantCount = state.items.filter((x) => x.important).length;
    const byCat = CATS
      .map((c) => ({ ...c, count: state.items.filter((x) => x.category === c.id).length }))
      .filter((c) => c.count > 0);

    $('#lib-stats').innerHTML = `
      <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-lbl">محفوظات <span class="en">Total Saves</span></div></div>
      <div class="stat-card"><div class="stat-num">${byCat.length}</div><div class="stat-lbl">تصنيفات <span class="en">Categories</span></div></div>
      <div class="stat-card"><div class="stat-num">${importantCount}</div><div class="stat-lbl">مهمة ⭐ <span class="en">Starred</span></div></div>
      <div class="stat-card"><div class="stat-num">${state.packs.length}</div><div class="stat-lbl">باقات <span class="en">Packs</span></div></div>
    `;

    $('#lib-breakdown').innerHTML = byCat.length ? byCat.map((c) => `
      <div class="breakdown-row">
        <div class="breakdown-icon">${c.icon}</div>
        <div class="breakdown-bar-wrap">
          <div class="breakdown-label">
            <span>${esc(c.ar)} <span class="en" style="display:inline-block;">· ${esc(c.en)}</span></span>
            <small>${c.count} · ${Math.round((c.count / total) * 100)}%</small>
          </div>
          <div class="breakdown-bar"><div class="breakdown-bar-fill" style="width:${(c.count / total) * 100}%"></div></div>
        </div>
      </div>`).join('') : '<p style="color:var(--muted); text-align:center; padding:30px;">ابدأ بحفظ عناصر لرؤية الإحصائيات.</p>';

    $('#lib-export').onclick = () => {
      downloadJSON({
        app: 'Khazna', version: 1, exportedAt: new Date().toISOString(),
        items: state.items, packs: state.packs,
      }, 'khazna-full-export.json');
      toast('تم تصدير كل البيانات ✓', 'success');
    };

    $('#lib-clear').onclick = () => {
      if (!confirm('حذف كل شي نهائياً؟ لا يمكن التراجع.')) return;
      if (!confirm('متأكد 100%؟')) return;
      state.items = []; state.packs = [];
      persist();
      toast('تم المسح', 'success');
      navigate('home');
    };
  }

  /* ============ SAVE-FROM-AI MODAL ============ */
  function openFabModal() {
    $('#fab-modal').classList.add('open');
    tryPasteClipboard();
  }
  function closeFabModal() {
    $('#fab-modal').classList.remove('open');
  }

  async function tryPasteClipboard() {
    const ta = $('#fab-text');
    ta.value = '';
    try {
      const txt = await navigator.clipboard.readText();
      if (txt && txt.trim()) {
        ta.value = txt.trim();
        autoParseQA(txt);
      }
    } catch {
      /* clipboard permission denied or unavailable */
    }
  }

  function autoParseQA(text) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    let q = '', a = '';
    const qMatch = text.match(/(?:^|\n)(?:Q|س|السؤال|سؤال|Question)[:：]?\s*(.+)/i);
    const aMatch = text.match(/(?:^|\n)(?:A|ج|الجواب|الإجابة|Answer)[:：]?\s*([\s\S]+)/i);
    if (qMatch && aMatch) { q = qMatch[1].trim(); a = aMatch[1].trim(); }
    else if (lines.length >= 2) { q = lines[0]; a = lines.slice(1).join('\n'); }
    else { a = text.trim(); }

    $('#fab-q').value = q;
    $('#fab-a').value = a;
  }

  function submitFabQuick(e) {
    e?.preventDefault();
    const q = $('#fab-q').value.trim();
    const a = $('#fab-a').value.trim();
    if (!q && !a) { toast('ألصق المحادثة أولاً', 'error'); return; }
    const newItem = {
      id: uid(),
      question: q || 'بدون عنوان',
      answer: a || q,
      category: 'ai', important: false, tags: [], createdAt: Date.now(),
    };
    state.items.unshift(newItem);
    persist();
    toast('تم الحفظ من الـAI ✓', 'success');
    closeFabModal();
    if (currentView === 'home') renderHome();
    else navigate('detail/' + newItem.id);
  }

  /* ============ BIND VIEW-SPECIFIC EVENTS ============ */
  function bindViews() {
    $('#save-form')?.addEventListener('submit', submitSave);
    $('#save-important')?.addEventListener('click', () => {
      saveDraft.important = !saveDraft.important;
      $('#save-important').classList.toggle('on', saveDraft.important);
    });
    $('#save-q')?.addEventListener('input', (e) => { saveDraft.question = e.target.value; });
    $('#save-a')?.addEventListener('input', (e) => { saveDraft.answer = e.target.value; });
    $('#save-cat')?.addEventListener('change', (e) => { saveDraft.category = e.target.value; });

    $$('[data-save-new]').forEach((el) => el.addEventListener('click', startSaveNew));

    $('#search-input')?.addEventListener('input', runSearch);

    $('#fab')?.addEventListener('click', openFabModal);
    $('#fab-close')?.addEventListener('click', closeFabModal);
    $('#fab-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'fab-modal') closeFabModal();
    });
    $('#fab-form')?.addEventListener('submit', submitFabQuick);
    $('#fab-paste')?.addEventListener('click', tryPasteClipboard);
    $('#fab-text')?.addEventListener('input', (e) => autoParseQA(e.target.value));
  }

  /* expose for bootstrap */
  window.KH_core = { bindViews };

  /* ============ INIT (bootstrap) ============ */
  function closeDrawer() {
    $('.sidebar')?.classList.remove('open');
    $('.drawer-scrim')?.classList.remove('show');
  }
  function openDrawer() {
    $('.sidebar')?.classList.add('open');
    $('.drawer-scrim')?.classList.add('show');
  }

  function bindGlobal() {
    $('#menu-btn')?.addEventListener('click', openDrawer);
    $('.drawer-scrim')?.addEventListener('click', closeDrawer);

    $$('.sb-item[data-route]').forEach((el) => {
      el.addEventListener('click', () => navigate(el.dataset.route));
    });

    $('#topsearch-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = e.target.value.trim();
        if (q) {
          sessionStorage.setItem('khazna.q', q);
          navigate('search');
        }
      }
    });

    window.addEventListener('hashchange', handleRoute);
  }

  document.addEventListener('DOMContentLoaded', () => {
    load();
    bindGlobal();
    window.KH_core.bindViews();
    handleRoute();
  });
})();
