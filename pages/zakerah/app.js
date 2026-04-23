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
        // migrate legacy type 'info' → 'note'
        state.items.forEach((it) => { if (it.type === 'info') it.type = 'note'; });
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
        type: 'prompt',
        title: 'إيميل احترافي موجَّه',
        body: 'اكتب إيميلاً احترافياً لـ{{recipient}} بخصوص {{topic}}. الأسلوب: {{tone}}. اجعله موجزاً (3-4 فقرات) واختم بدعوة واضحة للتواصل.',
        source: 'ChatGPT',
        targetAi: 'ChatGPT',
        tags: ['email', 'writing'],
        usedCount: 0,
        important: true,
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
        important: true,
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
        important: false,
        createdAt: now - 1000 * 60 * 60 * 24,
      },
      {
        id: uid(),
        type: 'answer',
        title: 'أفضل أدوات إدارة المهام لفريق صغير',
        body: '١) Linear — أفضل للفرق التقنية.\n٢) Notion — الأكثر مرونة لكن يحتاج إعداد.\n٣) Things 3 — للأفراد فقط.\n٤) Asana — مناسب لفرق التسويق.\n\nالتوصية: Linear + Notion معاً.',
        source: 'Claude',
        tags: ['productivity', 'tools'],
        important: false,
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
        important: false,
        createdAt: now - 1000 * 60 * 60 * 24 * 5,
      },
      {
        id: uid(),
        type: 'template',
        title: 'قالب مراجعة منتج (Product Review Outline)',
        body: '1. ملخص بسطر واحد\n2. الجمهور المستهدف\n3. أهم 3 مزايا\n4. أهم 3 عيوب\n5. مقارنة مع منافس قريب\n6. التوصية النهائية + لمن يناسب',
        source: 'Manual',
        tags: ['content', 'review'],
        important: false,
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

  /* ============ MODAL: CREATE / EDIT ============ */
  function openCreate(presetType) {
    state.editing = null;
    state.creatingType = presetType || 'code';
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
          ${TYPES.map((tt) => `
            <button type="button" class="type-pick ${tt.id === typeId ? 'active' : ''}"
                    data-pick="${tt.id}" data-pick-type="${tt.id}">
              <span class="type-pick-icon">${tt.icon}</span>
              ${esc(tt.ar)}
              <div style="font-size:9px; opacity:.7; margin-top:2px;">${esc(tt.en)}</div>
            </button>
          `).join('')}
        </div>
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
        state.creatingType = el.dataset.pickType;
        renderEditor(null, state.creatingType);
      };
    });

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
    `;

    // Actions
    $('#detail-actions').innerHTML = `
      <button class="btn btn-primary btn-sm" data-act="copy">⧉ نسخ</button>
      <button class="btn btn-ghost btn-sm" data-act="share">↗ مشاركة</button>
      <button class="btn btn-ghost btn-sm" data-act="star">${it.important ? '★ إلغاء النجمة' : '☆ ضع نجمة'}</button>
      <button class="btn btn-ghost btn-sm" data-act="edit">✎ تعديل</button>
      <button class="btn btn-danger btn-sm" data-act="delete">🗑 حذف</button>
    `;

    $$('#detail-actions [data-act]').forEach((el) => {
      el.onclick = () => handleAction(el.dataset.act, it);
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
  async function handleAction(act, it) {
    if (act === 'copy') {
      await copy(it.body);
    } else if (act === 'share') {
      const t = getType(it.type);
      const txt = `${t.icon} ${it.title}\n\n${it.body}\n\n— ذاكِرة / Zakerah`;
      if (navigator.share) {
        try { await navigator.share({ title: it.title, text: txt }); }
        catch {}
      } else {
        await copy(txt);
        toast('نُسخ للمشاركة ✓', 'success');
      }
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

  /* ============ BOOTSTRAP ============ */
  function bindGlobal() {
    // top buttons
    $('#brand-home')?.addEventListener('click', () => {
      state.filter = { type: 'all', q: '' };
      render();
    });
    $('#btn-new')?.addEventListener('click', () => openCreate('prompt'));
    $('#btn-search')?.addEventListener('click', openSearch);
    $('#btn-export')?.addEventListener('click', exportAll);
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

    // search modal
    $('#search-close')?.addEventListener('click', closeSearch);
    $('#search-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'search-modal') closeSearch();
    });
    $('#search-input')?.addEventListener('input', (e) => {
      state.filter.q = e.target.value;
      renderList();
    });
    $('#search-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSearch();
    });

    // global shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeEditor(); closeDetail(); closeSearch();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
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
    render();
  });

  // Expose what HTML/onclick handlers need
  Object.assign(window.Z, {
    openCreate, openEdit, openDetail,
    closeEditor, closeDetail, closeSearch,
    openSearch, exportAll,
  });

})();
