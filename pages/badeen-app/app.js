/**
 * بَعدين — PWA logic
 *
 * Uses IndexedDB to persist screenshots as Blobs (no network needed).
 * Everything is local to the user's device — zero backend.
 */

const DB_NAME = 'ba3deenDB';
const DB_VERSION = 1;
const STORE_SCREENSHOTS = 'screenshots';
const STORE_SENT = 'sent';

const CATEGORIES = {
  recipe:   { icon: '🍳', label: 'وصفات',  color: '#FFB570' },
  shop:     { icon: '🛒', label: 'تسوق',   color: '#8AC5FF' },
  meme:     { icon: '😂', label: 'ميمز',   color: '#FFA3D8' },
  work:     { icon: '💼', label: 'عمل',     color: '#5EEAD4' },
  travel:   { icon: '✈️', label: 'سفر',     color: '#FEF08A' },
  important:{ icon: '⭐', label: 'مهم',     color: '#D4A017' },
  other:    { icon: '📋', label: 'أخرى',   color: '#D6D3D1' },
};

let db;
let currentView = 'welcome';
let allScreenshots = [];
let currentFilter = 'all';
let swipeIndex = 0;
let swipeQueue = [];
let currentDetailId = null;
let pendingShare = null;

/* ================= IndexedDB ================= */

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_SCREENSHOTS)) {
        const store = db.createObjectStore(STORE_SCREENSHOTS, { keyPath: 'id', autoIncrement: true });
        store.createIndex('category', 'category');
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains(STORE_SENT)) {
        db.createObjectStore(STORE_SENT, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

function tx(storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function addScreenshot(record) {
  return new Promise((resolve, reject) => {
    const req = tx(STORE_SCREENSHOTS, 'readwrite').add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function getAllScreenshots() {
  return new Promise((resolve, reject) => {
    const req = tx(STORE_SCREENSHOTS).getAll();
    req.onsuccess = () => resolve(req.result.sort((a,b)=>b.createdAt - a.createdAt));
    req.onerror = (e) => reject(e.target.error);
  });
}

function getScreenshot(id) {
  return new Promise((resolve, reject) => {
    const req = tx(STORE_SCREENSHOTS).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function updateScreenshot(record) {
  return new Promise((resolve, reject) => {
    const req = tx(STORE_SCREENSHOTS, 'readwrite').put(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function deleteScreenshot(id) {
  return new Promise((resolve, reject) => {
    const req = tx(STORE_SCREENSHOTS, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

function addSent(record) {
  return new Promise((resolve, reject) => {
    const req = tx(STORE_SENT, 'readwrite').add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function getAllSent() {
  return new Promise((resolve, reject) => {
    const req = tx(STORE_SENT).getAll();
    req.onsuccess = () => resolve(req.result.sort((a,b)=>b.createdAt - a.createdAt));
    req.onerror = (e) => reject(e.target.error);
  });
}

function getSentForScreenshot(screenshotId) {
  return getAllSent().then(list => list.filter(s => s.screenshotId === screenshotId));
}

/* ================= Utilities ================= */

function qs(s, el = document) { return el.querySelector(s); }
function qsa(s, el = document) { return [...el.querySelectorAll(s)]; }

function toast(msg, kind = '') {
  const t = qs('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + kind;
  setTimeout(() => { t.className = 'toast ' + kind; }, 2200);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return 'قبل ' + m + ' دقيقة';
  const h = Math.floor(m / 60);
  if (h < 24) return 'قبل ' + h + ' ساعة';
  const d = Math.floor(h / 24);
  if (d < 30) return 'قبل ' + d + ' يوم';
  const mo = Math.floor(d / 30);
  return 'قبل ' + mo + ' شهر';
}

function showView(name) {
  qsa('.view').forEach(v => v.classList.remove('active'));
  qs('#view-' + name).classList.add('active');
  currentView = name;
  qsa('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  window.scrollTo(0, 0);
}

function imageFromBlob(blob) {
  return URL.createObjectURL(blob);
}

/* ================= Upload ================= */

async function handleUpload(files) {
  if (!files || !files.length) return;
  const progressEl = qs('#upload-progress');
  progressEl.style.display = 'block';

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    progressEl.textContent = `جاري رفع ${i + 1}/${files.length}...`;

    // Save blob directly for persistence across sessions
    const record = {
      blob: file,
      size: file.size,
      name: file.name || 'screenshot-' + Date.now(),
      category: guessCategory(file.name),
      note: '',
      createdAt: Date.now(),
    };
    await addScreenshot(record);
  }

  progressEl.style.display = 'none';
  toast(`تم رفع ${files.length} صورة ✓`, 'success');
  await refreshLibrary();
  if (currentView === 'welcome') showView('library');
}

function guessCategory(filename = '') {
  const lower = filename.toLowerCase();
  if (/recipe|طبخ|وصفة|food/.test(lower)) return 'recipe';
  if (/shop|متجر|shop|amazon/.test(lower)) return 'shop';
  if (/meme|مضحك|haha/.test(lower)) return 'meme';
  if (/work|عمل|business/.test(lower)) return 'work';
  if (/travel|سفر|hotel/.test(lower)) return 'travel';
  return 'other';
}

/* ================= Library rendering ================= */

async function refreshLibrary() {
  allScreenshots = await getAllScreenshots();
  renderLibrary();
}

function renderLibrary() {
  const body = qs('#library-content');
  const total = allScreenshots.length;

  if (total === 0) {
    body.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📸</div>
        <h3>ابدأ بإضافة Screenshots</h3>
        <p>ارفع أي صور تبيها — تقدر تستخدم زر ＋ للاختيار من ألبومك.</p>
      </div>
    `;
    return;
  }

  const filtered = currentFilter === 'all'
    ? allScreenshots
    : allScreenshots.filter(s => s.category === currentFilter);

  const totalSize = allScreenshots.reduce((acc, s) => acc + (s.size || 0), 0);

  // Category counts
  const counts = {};
  allScreenshots.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1; });

  const chipsHTML = ['all', ...Object.keys(CATEGORIES)].map(key => {
    const label = key === 'all' ? `الكل (${total})` :
      `${CATEGORIES[key].icon} ${CATEGORIES[key].label} ${counts[key] ? '(' + counts[key] + ')' : ''}`;
    return `<span class="chip ${currentFilter === key ? 'active' : ''}" data-cat="${key}">${label}</span>`;
  }).join('');

  const gridHTML = filtered.map(s => `
    <div class="thumb" data-id="${s.id}">
      <img src="${imageFromBlob(s.blob)}" alt="">
      <span class="thumb-cat">${CATEGORIES[s.category]?.icon || '📋'}</span>
      ${s.sentCount ? `<span class="thumb-sent">${s.sentCount} 📤</span>` : ''}
    </div>
  `).join('');

  body.innerHTML = `
    <div class="lib-stats">
      <div class="lib-stats-num">${total}</div>
      <div class="lib-stats-lbl">screenshot · ${formatSize(totalSize)}</div>
    </div>

    <div class="lib-actions">
      <button class="lib-btn lib-btn-primary" onclick="startSwipe()">
        🔀 فرز سريع
      </button>
      <button class="lib-btn" onclick="qs('#file-input').click()">
        ＋ أضف صور
      </button>
    </div>

    <div class="category-filter">
      ${chipsHTML}
    </div>

    <div class="grid">
      ${gridHTML || '<div class="empty"><p>ما فيه شي بهذي الفئة.</p></div>'}
    </div>
  `;

  qsa('.chip', body).forEach(c => {
    c.addEventListener('click', () => {
      currentFilter = c.dataset.cat;
      renderLibrary();
    });
  });
  qsa('.thumb', body).forEach(t => {
    t.addEventListener('click', () => openDetail(parseInt(t.dataset.id)));
  });
}

/* ================= Detail ================= */

async function openDetail(id) {
  const s = await getScreenshot(id);
  if (!s) return;
  currentDetailId = id;
  const sent = await getSentForScreenshot(id);

  const recipientsNames = [...new Set(sent.flatMap(x => x.recipients))];

  qs('#detail-content').innerHTML = `
    <div class="detail-img">
      <img src="${imageFromBlob(s.blob)}" alt="">
    </div>
    <div class="detail-info">
      <div class="detail-title">${CATEGORIES[s.category]?.icon || '📋'} ${s.name || 'Screenshot'}</div>
      <div class="detail-meta">
        ${relativeTime(s.createdAt)} · ${formatSize(s.size)} · ${CATEGORIES[s.category]?.label || '-'}
      </div>
      ${recipientsNames.length ? `
        <div class="detail-sent">
          💌 أرسلتها سابقاً لـ: ${recipientsNames.join(' · ')}
        </div>` : ''}
      <div class="detail-actions">
        <button class="detail-btn detail-btn-share" onclick="openShareModal(${id})">
          💌 إرسال
        </button>
        <button class="detail-btn detail-btn-delete" onclick="handleDelete(${id})">
          🗑 حذف
        </button>
      </div>
    </div>
  `;
  showView('detail');
}

async function handleDelete(id) {
  if (!confirm('حذف الـ screenshot نهائياً؟')) return;
  await deleteScreenshot(id);
  await refreshLibrary();
  toast('تم الحذف ✓', 'success');
  showView('library');
}

/* ================= Share ================= */

const KNOWN_RECIPIENTS = ['أم محمد', 'فاطمة', 'خالد', 'نورة', 'عبدالله', 'سارة', 'المدير', 'الأصدقاء'];
let selectedRecipients = new Set();

function openShareModal(id) {
  pendingShare = id;
  selectedRecipients = new Set();
  qs('#share-note').value = '';
  renderRecipientSuggestions();
  qs('#share-modal').classList.add('active');
}
function closeShareModal() {
  qs('#share-modal').classList.remove('active');
  pendingShare = null;
}
function renderRecipientSuggestions() {
  qs('#recipient-suggestions').innerHTML = KNOWN_RECIPIENTS.map(name =>
    `<span class="recipient-chip ${selectedRecipients.has(name) ? 'selected' : ''}" data-name="${name}">${name}</span>`
  ).join('');
  qsa('#recipient-suggestions .recipient-chip').forEach(c => {
    c.addEventListener('click', () => {
      const name = c.dataset.name;
      if (selectedRecipients.has(name)) selectedRecipients.delete(name);
      else selectedRecipients.add(name);
      renderRecipientSuggestions();
    });
  });
}

async function handleSendShare() {
  const manualInput = qs('#manual-recipient').value.trim();
  if (manualInput) selectedRecipients.add(manualInput);

  const note = qs('#share-note').value.trim();
  const recipients = [...selectedRecipients];
  if (!recipients.length) {
    toast('اختر شخص واحد على الأقل', 'error');
    return;
  }

  // Record the send
  await addSent({
    screenshotId: pendingShare,
    recipients,
    note,
    createdAt: Date.now(),
  });

  // Update screenshot sentCount
  const s = await getScreenshot(pendingShare);
  s.sentCount = (s.sentCount || 0) + 1;
  await updateScreenshot(s);

  // Try Web Share API
  if (navigator.share && navigator.canShare?.({ files: [new File([s.blob], s.name, { type: s.blob.type })] })) {
    try {
      const file = new File([s.blob], s.name || 'screenshot.png', { type: s.blob.type });
      await navigator.share({
        files: [file],
        title: 'من بَعدين',
        text: note || '',
      });
    } catch {}
  } else {
    // Download fallback
    const url = imageFromBlob(s.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = s.name || 'screenshot.png';
    a.click();
  }

  closeShareModal();
  toast(`أرسلت لـ ${recipients.length} شخص ✓`, 'success');
  qs('#manual-recipient').value = '';
  if (currentView === 'detail' && currentDetailId === pendingShare) {
    openDetail(pendingShare);
  }
  await refreshLibrary();
}

/* ================= Sent inbox ================= */

async function renderSent() {
  const list = await getAllSent();
  const body = qs('#sent-content');

  if (!list.length) {
    body.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📤</div>
        <h3>ما أرسلت شي بعد</h3>
        <p>لما ترسل screenshot لأحد، يظهر هنا مع اسمه والوقت.</p>
      </div>
    `;
    return;
  }

  const screenshots = await getAllScreenshots();
  const byId = {};
  screenshots.forEach(s => { byId[s.id] = s; });

  const itemsHTML = list.map(item => {
    const s = byId[item.screenshotId];
    return `
      <div class="sent-item" data-id="${item.screenshotId}">
        <div class="sent-thumb">
          ${s ? `<img src="${imageFromBlob(s.blob)}" alt="">` : '<div style="padding:20px; text-align:center; color:#999;">🗑</div>'}
        </div>
        <div class="sent-body">
          <div class="sent-to">إلى: ${item.recipients.join(' · ')}</div>
          ${item.note ? `<div class="sent-note">"${item.note}"</div>` : ''}
          <div class="sent-when">${relativeTime(item.createdAt)}</div>
        </div>
      </div>
    `;
  }).join('');

  body.innerHTML = `
    <div class="lib-stats">
      <div class="lib-stats-num">${list.length}</div>
      <div class="lib-stats-lbl">أرسلتها</div>
    </div>
    ${itemsHTML}
  `;

  qsa('.sent-item', body).forEach(i => {
    i.addEventListener('click', () => openDetail(parseInt(i.dataset.id)));
  });
}

/* ================= Swipe ================= */

function startSwipe() {
  swipeQueue = allScreenshots.slice();
  swipeIndex = 0;
  if (!swipeQueue.length) {
    toast('ما فيه screenshots للفرز', 'error');
    return;
  }
  renderSwipeCard();
  showView('swipe');
}

function renderSwipeCard() {
  const body = qs('#swipe-content');
  const s = swipeQueue[swipeIndex];
  if (!s) {
    body.innerHTML = `
      <div class="empty" style="flex:1; display:flex; flex-direction:column; justify-content:center;">
        <div class="empty-icon">🎉</div>
        <h3>خلّصت الفرز!</h3>
        <p>تمام — كلها اتصنّفت. ارجع للمكتبة تشوفها منظّمة.</p>
        <button class="btn btn-primary" style="margin-top:20px; max-width:280px; margin-inline:auto;" onclick="showView('library')">
          ↩ رجوع للمكتبة
        </button>
      </div>
    `;
    qs('#swipe-progress-fill').style.width = '100%';
    return;
  }

  const progress = Math.round((swipeIndex / swipeQueue.length) * 100);
  qs('#swipe-progress-fill').style.width = progress + '%';
  qs('#swipe-counter').textContent = `${swipeIndex + 1}/${swipeQueue.length}`;

  body.innerHTML = `
    <div class="swipe-card-wrap">
      <div class="swipe-card" id="current-card">
        <img src="${imageFromBlob(s.blob)}" alt="">
        <div class="swipe-card-info">
          <h3>${CATEGORIES[s.category]?.icon || '📋'} ${s.name || 'Screenshot'}</h3>
          <p>${relativeTime(s.createdAt)} · ${formatSize(s.size)}</p>
        </div>
        <div class="swipe-card-overlay keep" id="overlay-keep">💾 احفظ</div>
        <div class="swipe-card-overlay delete" id="overlay-delete">🗑 احذف</div>
      </div>
    </div>
  `;

  attachSwipeGestures(qs('#current-card'));
}

let dragStart = null;
function attachSwipeGestures(card) {
  const onStart = (e) => {
    dragStart = {
      x: e.touches ? e.touches[0].clientX : e.clientX,
      y: e.touches ? e.touches[0].clientY : e.clientY,
    };
  };
  const onMove = (e) => {
    if (!dragStart) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;
    card.style.transform = `translate(${dx}px, ${dy * 0.3}px) rotate(${dx * 0.04}deg)`;
    const overlayKeep = qs('#overlay-keep');
    const overlayDel = qs('#overlay-delete');
    if (dx > 30) {
      overlayKeep.style.opacity = Math.min(dx / 100, 1);
      overlayKeep.style.transform = 'translate(-50%, -50%) scale(' + Math.min(0.4 + dx / 150, 1.2) + ')';
      overlayDel.style.opacity = 0;
    } else if (dx < -30) {
      overlayDel.style.opacity = Math.min(-dx / 100, 1);
      overlayDel.style.transform = 'translate(-50%, -50%) scale(' + Math.min(0.4 + -dx / 150, 1.2) + ')';
      overlayKeep.style.opacity = 0;
    } else {
      overlayKeep.style.opacity = 0;
      overlayDel.style.opacity = 0;
    }
  };
  const onEnd = (e) => {
    if (!dragStart) return;
    const x = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX) - dragStart.x;
    dragStart = null;
    if (x > 100) {
      handleSwipe('keep');
    } else if (x < -100) {
      handleSwipe('delete');
    } else {
      card.style.transform = '';
      qs('#overlay-keep').style.opacity = 0;
      qs('#overlay-delete').style.opacity = 0;
    }
  };
  card.addEventListener('touchstart', onStart, { passive: true });
  card.addEventListener('touchmove', onMove, { passive: true });
  card.addEventListener('touchend', onEnd);
  card.addEventListener('mousedown', onStart);
  card.addEventListener('mousemove', (e) => { if (dragStart) onMove(e); });
  window.addEventListener('mouseup', onEnd);
}

async function handleSwipe(action) {
  const s = swipeQueue[swipeIndex];
  const card = qs('#current-card');
  if (card) {
    card.style.transform = (action === 'keep' ? 'translate(400px, 0) rotate(18deg)' : 'translate(-400px, 0) rotate(-18deg)');
    card.style.opacity = '0';
  }
  if (action === 'delete') {
    await deleteScreenshot(s.id);
  }
  setTimeout(() => {
    swipeIndex++;
    renderSwipeCard();
  }, 250);
}

/* ================= Init ================= */

document.addEventListener('DOMContentLoaded', async () => {
  await openDB();
  await refreshLibrary();

  // Tabs
  qsa('.tab').forEach(t => {
    t.addEventListener('click', () => {
      const name = t.dataset.tab;
      showView(name);
      if (name === 'library') refreshLibrary();
      if (name === 'sent') renderSent();
    });
  });

  // File input
  qs('#file-input').addEventListener('change', (e) => {
    handleUpload(e.target.files);
    e.target.value = '';
  });

  // Welcome buttons
  qs('#welcome-start').addEventListener('click', () => qs('#file-input').click());
  qs('#welcome-skip').addEventListener('click', () => showView('library'));

  // Back buttons
  qsa('[data-back]').forEach(b => b.addEventListener('click', () => showView(b.dataset.back)));

  // Modal
  qs('#share-close').addEventListener('click', closeShareModal);
  qs('#share-modal').addEventListener('click', (e) => {
    if (e.target === qs('#share-modal')) closeShareModal();
  });
  qs('#share-send').addEventListener('click', handleSendShare);

  // FAB
  qs('#fab').addEventListener('click', () => qs('#file-input').click());

  // Start on welcome if no screenshots, else library
  if (allScreenshots.length === 0) {
    showView('welcome');
  } else {
    showView('library');
  }

  // PWA install prompt handling
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredInstall = e;
  });
});
