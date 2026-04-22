/**
 * CoffeZ — Admin Panel logic
 *
 * Access control: a client-side allowlist of emails (below). Pair with
 * the Firestore rules in FIREBASE.md which grant bypass-ownership and
 * users-collection read to the same admin emails.
 */
(function () {
  const { $, $$, toast, escapeHTML, formatDate } = window.CW;

  // =====================================================================
  // Admin allowlist — add emails here (or in FIREBASE.md rules) to grant access.
  // =====================================================================
  const ADMIN_EMAILS = [
    "humoud.alhajeri@gmail.com",
    "humoudlahajeri3@gmail.com",
  ];

  const CATEGORIES = {
    beans: "حبوب قهوة",
    machines: "مكائن",
    grinders: "مطاحن",
    accessories: "أدوات",
    cups: "أكواب",
    syrups: "نكهات",
    traditional: "تراثي",
    dates: "تمور",
    other: "أخرى",
  };
  const EXPERIENCE = { junior: "مبتدئ", mid: "متوسط", senior: "خبير" };

  // Caches
  let allUsers = [];
  let allListings = [];
  let allBaristas = [];
  let allRecipes = [];
  let allVisits = [];

  function isAdmin(user) {
    const email = (user?.user?.email || "").toLowerCase();
    return ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email);
  }

  /* =================================================================
   * Data loaders — each tries Firebase first (CW_FB.listDocs) and
   * returns [] on permission failure so the admin can still see
   * whatever they're allowed.
   * ================================================================= */
  async function safeList(coll) {
    try {
      if (window.CW_FB) {
        await window.CW_FB.ready;
        return await window.CW_FB.listDocs(coll);
      }
      return [];
    } catch (err) {
      console.warn(`listDocs(${coll}) failed:`, err?.message);
      return [];
    }
  }

  async function loadAllData() {
    [allUsers, allListings, allBaristas, allRecipes, allVisits] = await Promise.all([
      safeList("users"),
      safeList("listings"),
      safeList("baristas"),
      safeList("recipes"),
      safeList("visits"),
    ]);
    renderStats();
    renderActivity();
    renderUsers();
    renderListings();
    renderBaristas();
    renderRecipes();
    renderAnalytics();
  }

  /* =================================================================
   * Dashboard
   * ================================================================= */
  function renderStats() {
    $("#st-users").textContent    = allUsers.length.toLocaleString("ar-SA");
    $("#st-listings").textContent = allListings.length.toLocaleString("ar-SA");
    $("#st-baristas").textContent = allBaristas.length.toLocaleString("ar-SA");
    $("#st-recipes").textContent  = allRecipes.length.toLocaleString("ar-SA");
  }

  function renderActivity() {
    const items = [
      ...allListings.map(x => ({ kind: "listing", icon: "🛍", title: x.title || "إعلان", at: x.createdAt })),
      ...allBaristas.map(x => ({ kind: "barista", icon: "☕", title: `${x.name || "بريستا"} انضم`, at: x.createdAt })),
      ...allRecipes.map(x =>  ({ kind: "recipe",  icon: "📝", title: x.name || "وصفة", at: x.createdAt })),
      ...allUsers.map(x =>    ({ kind: "user",    icon: "👤", title: `تسجيل مستخدم: ${x.name || x.email || ""}`, at: x.createdAt })),
    ]
      .filter(x => x.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 15);

    const list = $("#activity-list");
    if (!items.length) {
      list.innerHTML = `<div class="empty">لا يوجد نشاط بعد.</div>`;
      return;
    }
    list.innerHTML = items.map(it => `
      <div class="activity-item">
        <div class="activity-icon">${it.icon}</div>
        <div class="activity-body">
          <div class="activity-title">${escapeHTML(it.title)}</div>
          <div class="activity-meta">${formatDate(it.at)}</div>
        </div>
      </div>
    `).join("");
  }

  /* =================================================================
   * Users
   * ================================================================= */
  function userEmail(uid) {
    return allUsers.find(u => u.id === uid || u.uid === uid)?.email || "—";
  }
  function userName(uid) {
    return allUsers.find(u => u.id === uid || u.uid === uid)?.name || "—";
  }

  function renderUsers() {
    const q = ($("#users-search")?.value || "").trim().toLowerCase();
    const tbody = $("#users-table tbody");
    // Count per-user listings and barista profiles
    const rows = allUsers
      .filter(u => {
        if (!q) return true;
        return (u.name || "").toLowerCase().includes(q)
            || (u.email || "").toLowerCase().includes(q);
      })
      .map(u => {
        const uid = u.uid || u.id;
        const listingsCount = allListings.filter(x => x.ownerId === uid).length;
        const hasBarista = allBaristas.some(x => x.ownerId === uid);
        const isAdm = ADMIN_EMAILS.map(e => e.toLowerCase()).includes((u.email || "").toLowerCase());
        const isBanned = u.banned === true;
        const banChip = isBanned ? `<span class="tbl-chip" style="background:#FDECEA; color:var(--danger); margin-right:6px;">محظور</span>` : "";
        const banBtn = isAdm ? "" : (isBanned
          ? `<button class="btn btn-outline btn-sm" data-unban-user="${escapeHTML(uid)}">إلغاء الحظر</button>`
          : `<button class="btn btn-outline btn-sm" data-ban-user="${escapeHTML(uid)}" style="border-color:var(--danger); color:var(--danger);">🚫 حظر</button>`
        );
        return `
          <tr>
            <td>
              <b>${escapeHTML(u.name || "—")}</b>
              ${isAdm ? `<span class="tbl-chip" style="background:var(--gold); color:#2E1B10; margin-right:6px;">مشرف</span>` : ""}
              ${banChip}
            </td>
            <td>${escapeHTML(u.email || "")}</td>
            <td class="tbl-muted">${u.createdAt ? formatDate(u.createdAt) : "—"}</td>
            <td>${listingsCount}</td>
            <td>${hasBarista ? "✓" : "—"}</td>
            <td class="tbl-actions">
              ${isAdm ? `<span class="tbl-muted">—</span>` : `
                ${banBtn}
                <button class="btn btn-danger btn-sm" data-del-user="${escapeHTML(uid)}">حذف</button>
              `}
            </td>
          </tr>`;
      }).join("");
    tbody.innerHTML = rows || `<tr><td colspan="6" class="tbl-muted" style="text-align:center;">لا يوجد مستخدمون</td></tr>`;
  }

  async function deleteUserCascade(uid) {
    if (!confirm("حذف هذا المستخدم وكل إعلاناته وملف البريستا ووصفاته؟ (ملاحظة: حساب Firebase Auth لا يُحذف من هنا، فقط بياناته)")) return;
    try {
      await Promise.all([
        ...allListings.filter(x => x.ownerId === uid).map(x => window.CoffeeAPI.Listings.remove(x.id)),
        ...allBaristas.filter(x => x.ownerId === uid).map(x => window.CoffeeAPI.Baristas.remove(x.id)),
        ...allRecipes .filter(x => x.ownerId === uid).map(x => window.CoffeeAPI.Recipes.remove(x.id)),
      ]);
      // Try to delete the user doc too
      try {
        if (window.CW_FB) await window.CW_FB.deleteDoc("users", uid);
      } catch {}
      toast("تم حذف بيانات المستخدم", "success");
      loadAllData();
    } catch (err) {
      toast("فشل جزئي في الحذف: " + err.message, "error");
      loadAllData();
    }
  }

  /* =================================================================
   * Listings
   * ================================================================= */
  function renderListings() {
    const q = ($("#listings-search")?.value || "").trim().toLowerCase();
    const tbody = $("#listings-table tbody");
    const rows = allListings
      .filter(x => {
        if (!q) return true;
        return (x.title || "").toLowerCase().includes(q)
            || (x.description || "").toLowerCase().includes(q)
            || (x.city || "").toLowerCase().includes(q)
            || (x.category || "").toLowerCase().includes(q);
      })
      .map(x => {
        const thumb = (x.images && x.images[0])
          ? `<img class="tbl-thumb" src="${escapeHTML(x.images[0])}" alt="">`
          : `<div class="tbl-thumb" style="display:grid; place-items:center; font-size:20px;">☕</div>`;
        const price = x.price ? `${Number(x.price).toLocaleString("ar-SA")} ر.س` : "—";
        return `
          <tr>
            <td>${thumb}</td>
            <td>
              <a href="listing.html?id=${escapeHTML(x.id)}" style="color:var(--coffee-800); font-weight:700; text-decoration:none;">${escapeHTML(x.title || "—")}</a>
            </td>
            <td class="tbl-price">${price}</td>
            <td><span class="tbl-chip">${escapeHTML(CATEGORIES[x.category] || x.category || "—")}</span></td>
            <td>${escapeHTML(x.city || "—")}</td>
            <td><span class="tbl-muted">${escapeHTML(userName(x.ownerId))}</span></td>
            <td class="tbl-muted">${x.createdAt ? formatDate(x.createdAt) : "—"}</td>
            <td class="tbl-actions">
              <a class="btn btn-outline btn-sm" href="listing.html?id=${escapeHTML(x.id)}" target="_blank">عرض</a>
              <button class="btn btn-danger btn-sm" data-del-listing="${escapeHTML(x.id)}">حذف</button>
            </td>
          </tr>`;
      }).join("");
    tbody.innerHTML = rows || `<tr><td colspan="8" class="tbl-muted" style="text-align:center;">لا توجد إعلانات</td></tr>`;
  }

  /* =================================================================
   * Baristas
   * ================================================================= */
  function renderBaristas() {
    const q = ($("#baristas-search")?.value || "").trim().toLowerCase();
    const tbody = $("#baristas-table tbody");
    const rows = allBaristas
      .filter(b => {
        if (!q) return true;
        return (b.name || "").toLowerCase().includes(q)
            || (b.city || "").toLowerCase().includes(q);
      })
      .map(b => {
        const avatar = b.photo
          ? `<img class="tbl-avatar" src="${escapeHTML(b.photo)}" alt="">`
          : `<div class="tbl-avatar" style="display:grid; place-items:center;">👤</div>`;
        return `
          <tr>
            <td>${avatar}</td>
            <td>
              <a href="barista.html?id=${escapeHTML(b.id)}" style="color:var(--coffee-800); font-weight:700; text-decoration:none;">${escapeHTML(b.name || "—")}</a>
            </td>
            <td>${escapeHTML(b.city || "—")}</td>
            <td><span class="tbl-chip">${escapeHTML(EXPERIENCE[b.experience] || b.experience || "—")}</span></td>
            <td>${b.years || 0}</td>
            <td class="tbl-muted">${escapeHTML(b.phone || "—")}</td>
            <td class="tbl-muted">${escapeHTML(userEmail(b.ownerId))}</td>
            <td class="tbl-actions">
              <a class="btn btn-outline btn-sm" href="barista.html?id=${escapeHTML(b.id)}" target="_blank">عرض</a>
              <button class="btn btn-danger btn-sm" data-del-barista="${escapeHTML(b.id)}">حذف</button>
            </td>
          </tr>`;
      }).join("");
    tbody.innerHTML = rows || `<tr><td colspan="8" class="tbl-muted" style="text-align:center;">لا توجد ملفات بريستا</td></tr>`;
  }

  /* =================================================================
   * Recipes
   * ================================================================= */
  function renderRecipes() {
    const q = ($("#recipes-search")?.value || "").trim().toLowerCase();
    const tbody = $("#recipes-table tbody");
    const rows = allRecipes
      .filter(r => {
        if (!q) return true;
        return (r.name || "").toLowerCase().includes(q)
            || (r.typeName || "").toLowerCase().includes(q);
      })
      .map(r => `
        <tr>
          <td><b>${escapeHTML(r.name || "—")}</b></td>
          <td>${escapeHTML(r.typeName || r.type || "—")}</td>
          <td>${escapeHTML(r.size || "—")}</td>
          <td>${r.shots ?? "—"}</td>
          <td class="tbl-muted">${escapeHTML(userEmail(r.ownerId))}</td>
          <td class="tbl-muted">${r.createdAt ? formatDate(r.createdAt) : "—"}</td>
          <td class="tbl-actions">
            <a class="btn btn-outline btn-sm" href="cup.html?id=${escapeHTML(r.id)}" target="_blank">عرض</a>
            <button class="btn btn-danger btn-sm" data-del-recipe="${escapeHTML(r.id)}">حذف</button>
          </td>
        </tr>`).join("");
    tbody.innerHTML = rows || `<tr><td colspan="7" class="tbl-muted" style="text-align:center;">لا توجد وصفات مرئية (قد تكون قواعد Firestore تقيّد الوصول)</td></tr>`;
  }

  /* =================================================================
   * Delete handlers (event delegation — one listener per table)
   * ================================================================= */
  function wireDelete(tableId, handler) {
    const table = document.getElementById(tableId);
    if (!table) return;
    table.addEventListener("click", async (e) => {
      const btn = e.target.closest(
        "button[data-del-user], button[data-del-listing], button[data-del-barista], button[data-del-recipe], button[data-ban-user], button[data-unban-user]"
      );
      if (!btn) return;
      handler(btn);
    });
  }

  async function setUserBanned(uid, banned) {
    if (!window.CW_FB) {
      toast("هذه الميزة تحتاج Firebase", "error");
      return;
    }
    try {
      await window.CW_FB.updateDoc("users", uid, { banned });
      toast(banned ? "تم حظر المستخدم" : "تم إلغاء الحظر", "success");
      loadAllData();
    } catch (err) {
      toast("تعذّرت العملية: " + err.message, "error");
    }
  }

  function wireAllDeletes() {
    wireDelete("users-table", async (btn) => {
      if (btn.dataset.delUser) {
        await deleteUserCascade(btn.dataset.delUser);
      } else if (btn.dataset.banUser) {
        if (!confirm("حظر هذا المستخدم؟ سيُمنع من تسجيل الدخول حتى يُلغى الحظر.")) return;
        await setUserBanned(btn.dataset.banUser, true);
      } else if (btn.dataset.unbanUser) {
        await setUserBanned(btn.dataset.unbanUser, false);
      }
    });
    wireDelete("listings-table", async (btn) => {
      const id = btn.dataset.delListing;
      if (!id) return;
      if (!confirm("حذف هذا الإعلان؟")) return;
      try { await window.CoffeeAPI.Listings.remove(id); toast("تم الحذف", "success"); loadAllData(); }
      catch (err) { toast("تعذّر الحذف: " + err.message, "error"); }
    });
    wireDelete("baristas-table", async (btn) => {
      const id = btn.dataset.delBarista;
      if (!id) return;
      if (!confirm("حذف ملف البريستا؟")) return;
      try { await window.CoffeeAPI.Baristas.remove(id); toast("تم الحذف", "success"); loadAllData(); }
      catch (err) { toast("تعذّر الحذف: " + err.message, "error"); }
    });
    wireDelete("recipes-table", async (btn) => {
      const id = btn.dataset.delRecipe;
      if (!id) return;
      if (!confirm("حذف هذه الوصفة؟")) return;
      try { await window.CoffeeAPI.Recipes.remove(id); toast("تم الحذف", "success"); loadAllData(); }
      catch (err) { toast("تعذّر الحذف: " + err.message, "error"); }
    });
  }

  /* =================================================================
   * Analytics — aggregates docs from /visits
   * ================================================================= */
  const SECTION_LABELS = {
    home:        { icon: "🏠", label: "الرئيسية" },
    recipe:      { icon: "☕", label: "ابتكر وصفتك" },
    marketplace: { icon: "🛒", label: "السوق" },
    baristas:    { icon: "👥", label: "البريستا" },
    other:       { icon: "📄", label: "أخرى" },
  };

  function renderAnalytics() {
    const el = $("#analytics-content");
    if (!el) return;

    if (!allVisits || !allVisits.length) {
      el.innerHTML = `
        <div class="empty" style="padding:40px 20px;">
          <h3>ما وصلت زيارات بعد</h3>
          <p>إذا كنت تنتظر من ساعات وما ظهرت زيارات، تأكد من إضافة قاعدة Firestore للـ <code>visits</code> (راجع <strong>FIREBASE.md</strong>).</p>
          <p class="tbl-muted">كل زائر يُسجَّل مرة واحدة فقط لكل قسم في اليوم.</p>
        </div>`;
      return;
    }

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const tsOf = (v) => v.createdAt ? new Date(v.createdAt).getTime() : 0;

    const today    = allVisits.filter(v => (now - tsOf(v)) <= DAY).length;
    const last7    = allVisits.filter(v => (now - tsOf(v)) <= 7 * DAY).length;
    const last30   = allVisits.filter(v => (now - tsOf(v)) <= 30 * DAY).length;
    const total    = allVisits.length;
    const mobile   = allVisits.filter(v => v.device === "mobile").length;
    const desktop  = allVisits.filter(v => v.device === "desktop").length;

    // Section breakdown
    const bySection = {};
    allVisits.forEach(v => {
      const key = v.section || "other";
      bySection[key] = (bySection[key] || 0) + 1;
    });
    const sectionRows = Object.entries(bySection)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => {
        const info = SECTION_LABELS[key] || { icon: "📄", label: key };
        const pct = Math.round((count / total) * 100);
        return `
          <div class="section-row">
            <span class="section-icon">${info.icon}</span>
            <div class="section-body">
              <div class="section-label">${escapeHTML(info.label)}</div>
              <div class="section-bar">
                <div class="section-bar-fill" style="width:${pct}%"></div>
              </div>
            </div>
            <span class="section-count">${count.toLocaleString("ar-SA")}</span>
          </div>`;
      }).join("");

    // Recent 20
    const recent = [...allVisits]
      .filter(v => v.createdAt)
      .sort((a, b) => tsOf(b) - tsOf(a))
      .slice(0, 20)
      .map(v => {
        const info = SECTION_LABELS[v.section || "other"] || { icon: "📄", label: v.section };
        return `
          <div class="activity-item">
            <div class="activity-icon">${info.icon}</div>
            <div class="activity-body">
              <div class="activity-title">${escapeHTML(info.label)} · <span class="tbl-muted">${v.device === "mobile" ? "📱" : "💻"}</span></div>
              <div class="activity-meta">${formatDate(v.createdAt)}</div>
            </div>
          </div>`;
      }).join("");

    const mobilePct  = Math.round((mobile  / total) * 100);
    const desktopPct = Math.round((desktop / total) * 100);

    el.innerHTML = `
      <div class="admin-stats">
        <div class="stat-card" style="cursor:default;">
          <span class="stat-icon">📅</span>
          <div class="stat-body">
            <div class="stat-value">${today.toLocaleString("ar-SA")}</div>
            <div class="stat-label">اليوم (آخر 24 ساعة)</div>
          </div>
        </div>
        <div class="stat-card" style="cursor:default;">
          <span class="stat-icon">📊</span>
          <div class="stat-body">
            <div class="stat-value">${last7.toLocaleString("ar-SA")}</div>
            <div class="stat-label">آخر 7 أيام</div>
          </div>
        </div>
        <div class="stat-card" style="cursor:default;">
          <span class="stat-icon">📈</span>
          <div class="stat-body">
            <div class="stat-value">${last30.toLocaleString("ar-SA")}</div>
            <div class="stat-label">آخر 30 يوم</div>
          </div>
        </div>
        <div class="stat-card" style="cursor:default;">
          <span class="stat-icon">🌍</span>
          <div class="stat-body">
            <div class="stat-value">${total.toLocaleString("ar-SA")}</div>
            <div class="stat-label">الإجمالي</div>
          </div>
        </div>
      </div>

      <section class="admin-section">
        <div class="section-head"><h3>📱 الجهاز</h3></div>
        <div class="device-row">
          <div class="device-bar">
            <div class="device-fill mobile"  style="width:${mobilePct}%"></div>
            <div class="device-fill desktop" style="width:${desktopPct}%"></div>
          </div>
          <div class="device-legend">
            <span><span class="dot mobile"></span> جوال ${mobilePct}% (${mobile.toLocaleString("ar-SA")})</span>
            <span><span class="dot desktop"></span> كمبيوتر ${desktopPct}% (${desktop.toLocaleString("ar-SA")})</span>
          </div>
        </div>
      </section>

      <section class="admin-section">
        <div class="section-head"><h3>🏆 الأقسام الأكثر زيارة</h3></div>
        <div class="section-breakdown">${sectionRows}</div>
      </section>

      <section class="admin-section">
        <div class="section-head"><h3>🕒 آخر الزيارات (20)</h3></div>
        <div class="activity-list">${recent}</div>
      </section>
    `;
  }

  /* =================================================================
   * Tabs
   * ================================================================= */
  function switchTab(tab) {
    $$(".admin-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
    $$(".admin-panel").forEach(p => { p.hidden = p.dataset.panel !== tab; });
  }

  /* =================================================================
   * Demo seed — bulk insert realistic listings + barista profiles
   * to make the platform look alive on launch.
   * ================================================================= */
  async function bulkSeed(api, items, btn, label, defaultText) {
    if (!Array.isArray(items) || !items.length) {
      toast("لم تُحمَّل بيانات البذر", "error");
      return;
    }
    if (!confirm(`إضافة ${items.length} ${label} تجريبي${items.length > 1 ? "ين" : ""}؟`)) return;
    btn.disabled = true;
    let ok = 0, fail = 0;
    for (const it of items) {
      try {
        await api.create({ ...it, isDemo: true });
        ok++;
        btn.textContent = `⏳ ${ok}/${items.length}...`;
      } catch (err) { console.error("Seed failed:", err); fail++; }
    }
    btn.disabled = false;
    btn.textContent = defaultText;
    toast(`تمت الإضافة: ${ok} ✓${fail ? ` — فشل: ${fail}` : ""}`, ok ? "success" : "error");
    loadAllData();
  }

  async function bulkDelete(api, items, btn, label, defaultText) {
    if (!items.length) {
      toast(`لا توجد ${label} تجريبية للحذف`, "success");
      return;
    }
    if (!confirm(`حذف ${items.length} ${label} تجريبي نهائياً؟`)) return;
    btn.disabled = true;
    let ok = 0;
    for (const d of items) {
      try { await api.remove(d.id); ok++; btn.textContent = `⏳ ${ok}/${items.length}...`; }
      catch (err) { console.error("Delete failed:", err); }
    }
    btn.disabled = false;
    btn.textContent = defaultText;
    toast(`تم حذف ${ok} ${label} تجريبي`, "success");
    loadAllData();
  }

  function wireDemoSeed() {
    // Listings
    const seedBtn   = $("#seed-demo-btn");
    const deleteBtn = $("#delete-demo-btn");
    seedBtn?.addEventListener("click", () =>
      bulkSeed(window.CoffeeAPI.Listings, window.CW_SEED_LISTINGS, seedBtn, "إعلان", "🌱 إضافة إعلانات تجريبية"));
    deleteBtn?.addEventListener("click", () =>
      bulkDelete(window.CoffeeAPI.Listings, allListings.filter(l => l.isDemo), deleteBtn, "إعلان", "🗑 حذف التجريبية"));

    // Baristas
    const seedBaristasBtn   = $("#seed-baristas-btn");
    const deleteBaristasBtn = $("#delete-baristas-btn");
    seedBaristasBtn?.addEventListener("click", () =>
      bulkSeed(window.CoffeeAPI.Baristas, window.CW_SEED_BARISTAS, seedBaristasBtn, "بريستا", "🌱 إضافة بريستا تجريبيين"));
    deleteBaristasBtn?.addEventListener("click", () =>
      bulkDelete(window.CoffeeAPI.Baristas, allBaristas.filter(b => b.isDemo), deleteBaristasBtn, "بريستا", "🗑 حذف التجريبيين"));
  }

  /* =================================================================
   * Search wiring (debounced)
   * ================================================================= */
  function debounceInput(input, fn) {
    if (!input) return;
    let t;
    input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(fn, 200);
    });
  }

  /* =================================================================
   * Access gate
   * ================================================================= */
  function renderAccessDenied(user) {
    const email = user?.user?.email || "(غير محدّد)";
    $("#admin-gate").innerHTML = `
      <div class="admin-gate-inner">
        <div class="admin-gate-icon">🚫</div>
        <h2>الوصول مرفوض</h2>
        <p>بريدك الحالي <b style="color:var(--coffee-800);">${escapeHTML(email)}</b> غير مدرج في قائمة المشرفين.</p>
        <p style="font-size:13px; color:var(--muted); margin-top:10px;">
          إيميلات المشرفين المقبولة حالياً:<br>
          ${ADMIN_EMAILS.map(e => `<code style="background:#f3f0e8; padding:2px 6px; border-radius:4px; display:inline-block; margin:2px;">${escapeHTML(e)}</code>`).join("<br>")}
        </p>
        <div class="admin-gate-actions" style="margin-top:18px;">
          <a class="btn btn-outline" href="../index.html">الرئيسية</a>
          <button class="btn btn-primary" id="admin-logout-try">تسجيل خروج + دخول بحساب آخر</button>
        </div>
      </div>`;
    document.getElementById("admin-logout-try")?.addEventListener("click", async () => {
      await window.CoffeeAPI.Auth.signOut();
      try { sessionStorage.setItem("cw.returnTo", window.location.href); } catch {}
      window.location.href = "baristas.html";
    });
  }

  function renderSignInNeeded() {
    $("#admin-gate").innerHTML = `
      <div class="admin-gate-inner">
        <div class="admin-gate-icon">🔒</div>
        <h2>يجب تسجيل الدخول</h2>
        <p>سجّل دخولك بحساب المشرف للوصول للوحة التحكم.</p>
        <div class="admin-gate-actions">
          <a class="btn btn-primary" id="admin-signin-link" href="baristas.html">تسجيل الدخول</a>
          <a class="btn btn-outline" href="../index.html">الرئيسية</a>
        </div>
      </div>`;
    // Stash the return URL so the baristas page can send us back here
    // after sign-in. Use sessionStorage so it survives the full-page nav.
    $("#admin-signin-link").addEventListener("click", () => {
      try { sessionStorage.setItem("cw.returnTo", window.location.href); } catch {}
    });
  }

  function showAdminUI(user) {
    $("#admin-gate").hidden = true;
    $("#admin-content").hidden = false;
    const chip = $("#admin-user-chip");
    // Generic role label (no personal name) for a cleaner admin look
    chip.innerHTML = `
      <span>🛡️ المشرف</span>
      <button class="logout-btn" id="admin-logout">خروج</button>`;
    $("#admin-logout").addEventListener("click", async () => {
      await window.CoffeeAPI.Auth.signOut();
      window.location.reload();
    });
  }

  /* =================================================================
   * Init
   * ================================================================= */
  async function waitForUser(maxWaitMs = 6000) {
    // Give Firebase Auth extra time to restore the session after a
    // fresh page navigation (IndexedDB is async on some browsers).
    const start = Date.now();
    let user = window.CoffeeAPI.Auth.current();
    while (!user && Date.now() - start < maxWaitMs) {
      await new Promise(r => setTimeout(r, 200));
      user = window.CoffeeAPI.Auth.current();
    }
    return user;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    // Wait for Firebase auth state, then give it a bit of extra patience
    if (window.CW_FB) { try { await window.CW_FB.ready; } catch {} }
    const user = await waitForUser();

    if (!user) { renderSignInNeeded(); return; }
    if (!isAdmin(user)) { renderAccessDenied(user); return; }

    showAdminUI(user);

    // Wire tabs
    $$(".admin-tab").forEach(t =>
      t.addEventListener("click", () => switchTab(t.dataset.tab))
    );

    // Stat cards → jump to their corresponding tab with a smooth scroll
    $$(".stat-card[data-goto-tab]").forEach(card =>
      card.addEventListener("click", () => {
        switchTab(card.dataset.gotoTab);
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
    );

    // Wire searches
    debounceInput($("#users-search"),    renderUsers);
    debounceInput($("#listings-search"), renderListings);
    debounceInput($("#baristas-search"), renderBaristas);
    debounceInput($("#recipes-search"),  renderRecipes);

    // Wire refresh + deletes
    $("#refresh-activity")?.addEventListener("click", loadAllData);
    $("#refresh-analytics")?.addEventListener("click", loadAllData);
    wireAllDeletes();
    wireDemoSeed();

    // Also re-render when auth state changes (e.g. sign out from another tab)
    window.addEventListener("cw-auth-changed", () => window.location.reload());

    await loadAllData();
  });
})();
