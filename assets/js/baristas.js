/**
 * Stage 3 — Barista profiles with auth (sign in / sign up).
 */
(function () {
  const { $, $$, toast, escapeHTML, formatDate } = window.CW;

  const SKILL_LABELS = {
    "latte-art":"لاتيه آرت", "espresso":"إسبريسو", "v60":"في60",
    "chemex":"كيمكس", "aeropress":"آيروبرس", "cold-brew":"كولد برو",
    "cupping":"كابينج", "roasting":"تحميص", "q-grader":"Q-Grader",
    "management":"إدارة فرع", "training":"تدريب",
  };

  const EXPERIENCE_LABELS = {
    junior: "مبتدئ",
    mid:    "متوسط",
    senior: "خبير",
  };

  let photoUrl       = null;
  let cvUrl          = null;
  let cvName         = "";
  let editingId      = null;    // when set, submit updates this profile instead of creating
  let uploadingPhoto = false;
  let uploadingCv    = false;

  const LANG_LEVELS = ["مبتدئ", "متوسط", "متقدم", "طلاقة", "لغة أم"];

  /* ============ Dynamic sections (experiences / certifications / languages) ============
   * We render DOM nodes directly (not innerHTML strings) so the user's in-progress
   * typing survives add/remove of sibling entries.
   */
  function buildExperienceEntry(data = {}) {
    const el = document.createElement("div");
    el.className = "dyn-entry exp-entry";
    el.innerHTML = `
      <button type="button" class="remove-btn" aria-label="حذف">×</button>
      <div class="dyn-grid">
        <div class="field">
          <label>المقهى / الشركة</label>
          <input class="input f-place" value="${escapeHTML(data.place || "")}" placeholder="مثال: Dose Coffee" />
        </div>
        <div class="field">
          <label>المسمى الوظيفي</label>
          <input class="input f-role" value="${escapeHTML(data.role || "")}" placeholder="مثال: بريستا رئيسي" />
        </div>
        <div class="field">
          <label>من (شهر/سنة)</label>
          <input class="input f-from" type="month" value="${escapeHTML(data.from || "")}" />
        </div>
        <div class="field">
          <label>إلى (شهر/سنة)</label>
          <input class="input f-to" type="month" value="${escapeHTML(data.to || "")}" ${data.current ? "disabled" : ""} />
        </div>
      </div>
      <label class="current-chip">
        <input type="checkbox" class="f-current" ${data.current ? "checked" : ""} />
        أعمل حالياً هنا
      </label>
    `;
    el.querySelector(".remove-btn").addEventListener("click", () => el.remove());
    const currentChk = el.querySelector(".f-current");
    const toInput = el.querySelector(".f-to");
    currentChk.addEventListener("change", () => {
      toInput.disabled = currentChk.checked;
      if (currentChk.checked) toInput.value = "";
    });
    return el;
  }

  function buildCertificationEntry(data = {}) {
    const el = document.createElement("div");
    el.className = "dyn-entry cert-entry";
    el.innerHTML = `
      <button type="button" class="remove-btn" aria-label="حذف">×</button>
      <div class="dyn-grid">
        <div class="field">
          <label>اسم الشهادة</label>
          <input class="input f-name" list="cert-suggestions" value="${escapeHTML(data.name || "")}" placeholder="مثال: SCA Barista Foundation" />
        </div>
        <div class="field">
          <label>الجهة المانحة</label>
          <input class="input f-issuer" value="${escapeHTML(data.issuer || "")}" placeholder="مثال: SCA" />
        </div>
      </div>
      <div class="dyn-grid" style="margin-top:10px;">
        <div class="field">
          <label>سنة الحصول</label>
          <input class="input f-year" inputmode="numeric" value="${escapeHTML(data.year || "")}" placeholder="2024" />
        </div>
      </div>
    `;
    el.querySelector(".remove-btn").addEventListener("click", () => el.remove());
    return el;
  }

  function buildLanguageEntry(data = {}) {
    const el = document.createElement("div");
    el.className = "dyn-entry lang-entry";
    el.innerHTML = `
      <button type="button" class="remove-btn" aria-label="حذف">×</button>
      <div class="dyn-grid">
        <div class="field">
          <label>اللغة</label>
          <input class="input f-name" list="lang-suggestions" value="${escapeHTML(data.name || "")}" placeholder="مثال: العربية" />
        </div>
        <div class="field">
          <label>المستوى</label>
          <select class="select f-level">
            ${LANG_LEVELS.map(l =>
              `<option value="${l}" ${data.level === l ? "selected" : ""}>${l}</option>`
            ).join("")}
          </select>
        </div>
      </div>
    `;
    el.querySelector(".remove-btn").addEventListener("click", () => el.remove());
    return el;
  }

  function clearDynList(id) {
    const list = document.getElementById(id);
    if (list) list.innerHTML = "";
  }
  function fillDynList(id, items, builder) {
    const list = document.getElementById(id);
    if (!list) return;
    list.innerHTML = "";
    (items || []).forEach(item => list.appendChild(builder(item)));
  }

  function collectExperiences() {
    return $$("#experiences-list .exp-entry").map(el => ({
      place:   el.querySelector(".f-place").value.trim(),
      role:    el.querySelector(".f-role").value.trim(),
      from:    el.querySelector(".f-from").value,
      to:      el.querySelector(".f-to").value,
      current: el.querySelector(".f-current").checked,
    })).filter(e => e.place || e.role);
  }
  function collectCertifications() {
    return $$("#certifications-list .cert-entry").map(el => ({
      name:   el.querySelector(".f-name").value.trim(),
      issuer: el.querySelector(".f-issuer").value.trim(),
      year:   el.querySelector(".f-year").value.trim(),
    })).filter(c => c.name);
  }
  function collectLanguages() {
    return $$("#languages-list .lang-entry").map(el => ({
      name:  el.querySelector(".f-name").value.trim(),
      level: el.querySelector(".f-level").value,
    })).filter(l => l.name);
  }

  /* ============ Auth UI ============ */
  function renderAuthArea() {
    const area = $("#auth-area");
    const user = window.CoffeeAPI.Auth.current();
    if (user) {
      const initial = (user.user?.name || "?").trim().charAt(0);
      area.innerHTML = `
        <span class="auth-chip">
          <span class="av">${escapeHTML(initial)}</span>
          مرحباً، ${escapeHTML(user.user?.name || "")}
        </span>
        <button class="btn btn-outline" id="signout-btn">تسجيل خروج</button>`;
      $("#signout-btn").addEventListener("click", async () => {
        await window.CoffeeAPI.Auth.signOut();
        toast("تم تسجيل الخروج", "info");
        renderAuthArea();
      });
    } else {
      area.innerHTML = `
        <button class="btn btn-outline" id="open-signin">تسجيل الدخول</button>
        <button class="btn btn-gold"    id="open-signup">إنشاء حساب</button>`;
      $("#open-signin").addEventListener("click", () => openAuth("signin"));
      $("#open-signup").addEventListener("click", () => openAuth("signup"));
    }
  }

  function openAuth(tab = "signin") {
    $("#auth-modal").classList.add("open");
    switchTab(tab);
  }
  function closeAuth() {
    $("#auth-modal").classList.remove("open");
    $$("#auth-modal form").forEach(f => f.reset());
    // If the user cancelled before finishing, don't auto-pop the profile
    pendingProfileAfterAuth = false;
  }
  function switchTab(tab) {
    $$("#auth-modal .tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
    $("#signin-form").style.display = tab === "signin" ? "" : "none";
    $("#signup-form").style.display = tab === "signup" ? "" : "none";
    $("#auth-title").textContent = tab === "signin" ? "تسجيل الدخول" : "إنشاء حساب";
  }

  /**
   * If another page stashed a "return here after sign-in" URL in
   * sessionStorage (e.g. admin.html), navigate back to it.
   * Returns true if a redirect was triggered.
   */
  function honourReturnTo() {
    try {
      const url = sessionStorage.getItem("cw.returnTo");
      if (url) {
        sessionStorage.removeItem("cw.returnTo");
        setTimeout(() => { window.location.href = url; }, 400);
        return true;
      }
    } catch {}
    return false;
  }

  async function handleSignIn(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await window.CoffeeAPI.Auth.signIn({
        email: fd.get("email").toString(),
        password: fd.get("password").toString(),
      });
      toast("تم تسجيل الدخول ✓", "success");
      // Capture the intent *before* closeAuth resets pendingProfileAfterAuth
      const continueToProfile = pendingProfileAfterAuth;
      closeAuth();
      renderAuthArea();
      loadAndRender();
      // Priority: an external page requested a return (e.g. admin panel)
      if (honourReturnTo()) return;
      if (continueToProfile) setTimeout(openModal, 200);
    } catch (err) {
      toast(err.message || "تعذّر تسجيل الدخول", "error");
    }
  }
  async function handleSignUp(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await window.CoffeeAPI.Auth.signUp({
        name: fd.get("name").toString(),
        email: fd.get("email").toString(),
        password: fd.get("password").toString(),
      });
      toast("مرحباً بك في CoffeZ ✓", "success");
      const continueToProfile = pendingProfileAfterAuth;
      closeAuth();
      renderAuthArea();
      loadAndRender();
      if (honourReturnTo()) return;
      // Auto-open the profile modal so the user can continue where they
      // left off without tapping "new profile" again.
      if (continueToProfile) setTimeout(openModal, 200);
    } catch (err) {
      toast(err.message || "تعذّر إنشاء الحساب", "error");
    }
  }

  /* ============ Listing + cards ============ */
  async function loadAndRender() {
    const search = $("#search").value.trim();
    const exp    = $("#filter-exp").value;
    const grid   = $("#baristas");
    grid.innerHTML = `<div class="empty"><p>جارٍ التحميل...</p></div>`;
    try {
      let items = await window.CoffeeAPI.Baristas.list(search);
      if (exp) items = items.filter(b => b.experience === exp);
      const currentUser = window.CoffeeAPI.Auth.current();
      // Update the "new profile" button label based on whether the current
      // user already has a profile in the list.
      refreshNewProfileButton(items, currentUser);
      if (!items.length) {
        grid.innerHTML = `<div class="empty"><h3>لا توجد ملفات بعد</h3><p>سجّل حسابك ثم اضغط "ملف جديد".</p></div>`;
        return;
      }
      grid.innerHTML = items.map(b => cardHTML(b, currentUser)).join("");
    } catch (err) {
      grid.innerHTML = `<div class="empty"><h3>تعذّر التحميل</h3><p>${escapeHTML(err.message)}</p></div>`;
    }
  }

  function refreshNewProfileButton(items, currentUser) {
    const btn = $("#new-profile-btn");
    if (!btn) return;
    const uid = currentUser?.user?.id;
    const hasProfile = uid && (items || []).some(b => b.ownerId === uid);
    btn.innerHTML = hasProfile ? "✎ تحديث ملفي" : "＋ ملف جديد";
  }

  function cardHTML(b, currentUser) {
    const avatar = b.photo
      ? `<img src="${escapeHTML(b.photo)}" alt="${escapeHTML(b.name)}">`
      : `<span>👤</span>`;
    const skills = (b.skills || []).slice(0, 4)
      .map(s => `<span class="tag">${escapeHTML(SKILL_LABELS[s] || s)}</span>`).join(" ");
    const more = (b.skills || []).length > 4 ? `<span class="tag">+${(b.skills || []).length - 4}</span>` : "";
    const city = b.city ? `<span>📍 ${escapeHTML(b.city)}</span>` : "";
    const years = b.years ? `<span>⌛ ${escapeHTML(String(b.years))} سنة</span>` : "";
    const phoneClean = normalizePhone(b.phone);
    const phoneHref = b.phone ? `tel:+${phoneClean}` : "#";
    const waHref    = b.phone ? `https://wa.me/${phoneClean}` : "#";
    const cvBtn     = b.cv ? `<a class="btn btn-outline" href="${escapeHTML(b.cv)}" target="_blank" rel="noopener" download="${escapeHTML(b.cvName || 'CV.pdf')}" onclick="event.stopPropagation()">📄 السيرة</a>` : "";
    const canDelete = currentUser?.user?.id && b.ownerId === currentUser.user.id;
    const deleteBtn = canDelete
      ? `<button class="btn btn-danger" data-delete="${b.id}" title="حذف" onclick="event.stopPropagation()">🗑️</button>`
      : "";
    return `
      <article class="barista-card" data-open="${b.id}" role="button" tabindex="0">
        <div class="barista-banner"></div>
        <div class="barista-avatar">${avatar}</div>
        <div class="barista-body">
          <h3>${escapeHTML(b.name)}</h3>
          <div class="meta-row">
            <span class="tag">${escapeHTML(EXPERIENCE_LABELS[b.experience] || b.experience || "")}</span>
            ${years}
            ${city}
          </div>
          <div class="meta-row" style="margin-top:4px;">${skills} ${more}</div>
          <p>${escapeHTML((b.bio || "").slice(0, 160))}${(b.bio || "").length > 160 ? "..." : ""}</p>
          <small style="color:var(--muted);">🗓️ ${formatDate(b.createdAt)}</small>
        </div>
        <div class="barista-actions">
          <a class="btn btn-gold"    href="${waHref}" target="_blank" rel="noopener" onclick="event.stopPropagation()">💬 واتساب</a>
          <a class="btn btn-outline" href="${phoneHref}" onclick="event.stopPropagation()">☎️</a>
          ${cvBtn}
          ${deleteBtn}
        </div>
      </article>`;
  }

  /**
   * Normalize a phone number to international format without leading +.
   * Handles Saudi (05x → 9665x), Kuwait (9xxxxxxx → 965…), UAE, and
   * already-prefixed numbers. Used for tel: and wa.me links.
   */
  function normalizePhone(phone) {
    if (!phone) return "";
    let d = String(phone).replace(/[^\d]/g, "");
    if (!d) return "";
    // Strip leading country-code indicators
    if (d.startsWith("00")) d = d.slice(2);
    // Saudi local "05xxxxxxxx" (10 digits)
    if (d.startsWith("0") && d.length === 10) return "966" + d.slice(1);
    // Kuwait local "9xxxxxxx" or "5xxxxxxx" (8 digits)
    if (d.length === 8 && /^[569]/.test(d)) return "965" + d;
    // Already has a plausible country code
    return d;
  }

  function wireGridActions() {
    $("#baristas").addEventListener("click", async (e) => {
      const delBtn = e.target.closest("[data-delete]");
      if (delBtn) {
        if (!confirm("حذف هذا الملف؟")) return;
        try {
          await window.CoffeeAPI.Baristas.remove(delBtn.dataset.delete);
          toast("تم الحذف", "success");
          loadAndRender();
        } catch (err) {
          toast("تعذّر الحذف", "error");
        }
        return;
      }
      // Clicking anywhere else on the card opens the detail page
      const card = e.target.closest(".barista-card[data-open]");
      if (card) {
        window.location.href = `barista.html?id=${encodeURIComponent(card.dataset.open)}`;
      }
    });
    // Keyboard access (Enter on focused card)
    $("#baristas").addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const card = e.target.closest?.(".barista-card[data-open]");
      if (card) window.location.href = `barista.html?id=${encodeURIComponent(card.dataset.open)}`;
    });
  }

  // Set when the user clicked "new profile" while signed out, so that
  // once they complete sign-up/sign-in we can continue straight into
  // opening the profile modal without needing another click.
  let pendingProfileAfterAuth = false;

  /* ============ Profile modal ============ */
  async function openModal() {
    const user = window.CoffeeAPI.Auth.current();
    if (!user) {
      // Force the user to create an account first. Open the Sign-up tab
      // since the common case is a new visitor who has no account yet.
      pendingProfileAfterAuth = true;
      toast("يجب إنشاء حساب أولاً لإضافة ملف بريستا", "info", 3500);
      openAuth("signup");
      return;
    }

    // Reset
    photoUrl = null; cvUrl = null; cvName = ""; editingId = null;
    uploadingPhoto = false; uploadingCv = false;
    updateSubmitLock();
    $("#profile-preview").innerHTML = "<span>👤</span>";
    $("#cv-name").textContent = "";
    $$("#skills-chips .chip").forEach(c => c.classList.remove("active"));
    $("#profile-form").reset();
    $("#profile-photo").value = "";
    $("#profile-cv").value = "";
    // Clear dynamic sections
    clearDynList("experiences-list");
    clearDynList("certifications-list");
    clearDynList("languages-list");

    // Does the user already have a barista profile? If yes, open in edit mode.
    const mine = await findMyProfile(user.user?.id);
    if (mine) {
      editingId = mine.id;
      setModalTitle("تحديث ملفي");
      fillFormFromProfile(mine);
    } else {
      setModalTitle("ملف بريستا جديد");
      // Prefill name + email from the session
      $("#profile-form [name=name]").value  = user.user?.name || "";
      $("#profile-form [name=email]").value = user.user?.email || "";
    }

    $("#profile-modal").classList.add("open");
  }
  function closeModal() { $("#profile-modal").classList.remove("open"); }

  function setModalTitle(text) {
    const header = document.querySelector("#profile-modal .modal header h3");
    if (header) header.textContent = text;
  }

  async function findMyProfile(userId) {
    if (!userId) return null;
    try {
      const list = await window.CoffeeAPI.Baristas.list();
      return list.find(b => b.ownerId === userId) || null;
    } catch { return null; }
  }

  function fillFormFromProfile(p) {
    $("#profile-form [name=name]").value       = p.name || "";
    $("#profile-form [name=city]").value       = p.city || "";
    $("#profile-form [name=years]").value      = p.years || "";
    $("#profile-form [name=experience]").value = p.experience || "";
    $("#profile-form [name=phone]").value      = p.phone || "";
    $("#profile-form [name=email]").value      = p.email || "";
    $("#profile-form [name=bio]").value        = p.bio || "";
    // Skills
    $$("#skills-chips .chip").forEach(c => {
      c.classList.toggle("active", (p.skills || []).includes(c.dataset.skill));
    });
    // Dynamic sections
    fillDynList("experiences-list",    p.experiences || [],    buildExperienceEntry);
    fillDynList("certifications-list", p.certifications || [], buildCertificationEntry);
    fillDynList("languages-list",      p.languages || [],      buildLanguageEntry);
    // Photo + CV previews
    photoUrl = p.photo || null;
    cvUrl    = p.cv || null;
    cvName   = p.cvName || "";
    if (photoUrl) {
      $("#profile-preview").innerHTML = `<img src="${escapeHTML(photoUrl)}" alt="">`;
    }
    if (cvName) {
      $("#cv-name").textContent = "📄 " + cvName;
    }
  }

  async function handlePhoto(file) {
    if (!file) return;
    // Show a local preview immediately so the user sees their choice
    // even while the upload is still in progress.
    let localPreview = "";
    try {
      localPreview = URL.createObjectURL(file);
      $("#profile-preview").innerHTML = `
        <img src="${localPreview}" alt="">
        <div class="upload-overlay" id="photo-progress">⏳ جارٍ التحضير...</div>`;
    } catch {}
    uploadingPhoto = true;
    updateSubmitLock();
    try {
      let stuckAnnounced = false;
      const res = await window.CoffeeAPI.Baristas.uploadPhoto(file, (pct) => {
        stuckAnnounced = true; // progress arrived, no need for fallback notice
        const el = document.getElementById("photo-progress");
        if (el) el.textContent = `⏳ ${pct}%`;
      });
      if (!stuckAnnounced) {
        // Upload went through the Firestore-embed fallback; let the user know.
        toast("Storage بطيء — تم حفظ الصورة محلياً", "info");
      }
      photoUrl = res.url;
      // Swap to the final URL (server/firestore) once upload completes.
      $("#profile-preview").innerHTML = `<img src="${escapeHTML(photoUrl)}" alt="">`;
    } catch (err) {
      toast("تعذّر رفع الصورة: " + err.message, "error");
      $("#profile-preview").innerHTML = `<span>👤</span>`;
    } finally {
      uploadingPhoto = false;
      updateSubmitLock();
    }
  }

  async function handleCV(file) {
    if (!file) return;
    cvName = file.name;
    $("#cv-name").textContent = "⏳ جارٍ التحضير: " + cvName;
    uploadingCv = true;
    updateSubmitLock();
    try {
      const res = await window.CoffeeAPI.Baristas.uploadPhoto(file, (pct) => {
        $("#cv-name").textContent = `⏳ ${pct}% — ${cvName}`;
      });
      cvUrl = res.url;
      $("#cv-name").textContent = "✓ " + cvName;
    } catch (err) {
      toast("تعذّر رفع السيرة: " + err.message, "error");
      $("#cv-name").textContent = "✗ فشل الرفع: " + cvName;
    } finally {
      uploadingCv = false;
      updateSubmitLock();
    }
  }

  /**
   * Keep the submit button disabled while any file is still uploading,
   * so the profile never saves with a missing (null) photo/cv URL.
   */
  function updateSubmitLock() {
    const btn = document.querySelector("#profile-form button[type=submit]");
    if (!btn) return;
    const busy = uploadingPhoto || uploadingCv;
    btn.disabled = busy;
    if (busy) {
      btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
      btn.textContent = "⏳ جارٍ رفع الملفات...";
    } else if (btn.dataset.originalText) {
      btn.textContent = btn.dataset.originalText;
    }
  }

  async function submitForm(e) {
    if (e) e.preventDefault();

    // Uploads still in flight?
    if (uploadingPhoto || uploadingCv) {
      toast("انتظر قليلاً — لم يكتمل رفع الملفات بعد", "info", 4000);
      return;
    }

    const currentUser = window.CoffeeAPI.Auth.current();
    if (!currentUser) {
      toast("يجب تسجيل حساب أولاً", "info", 3500);
      openAuth("signup");
      return;
    }

    const form = document.getElementById("profile-form");
    const fd = new FormData(form);
    const skills = $$("#skills-chips .chip.active").map(c => c.dataset.skill);
    const data = {
      name:       (fd.get("name") || "").toString().trim(),
      city:       (fd.get("city") || "").toString().trim(),
      years:      Number(fd.get("years")) || 0,
      experience: (fd.get("experience") || "").toString(),
      phone:      (fd.get("phone") || "").toString().trim(),
      email:      (fd.get("email") || "").toString().trim(),
      bio:        (fd.get("bio") || "").toString().trim(),
      skills,
      experiences:    collectExperiences(),
      certifications: collectCertifications(),
      languages:      collectLanguages(),
      photo:      photoUrl,
      cv:         cvUrl,
      cvName,
      ownerId:    currentUser.user?.id,
    };

    // Explicit, specific validation so the user knows exactly what's missing
    const missing = [];
    if (!data.name)       missing.push("الاسم");
    if (!data.experience) missing.push("المستوى");
    if (!data.phone)      missing.push("رقم التواصل");
    if (missing.length) {
      toast("املأ الحقول المطلوبة: " + missing.join("، "), "error", 5000);
      return;
    }

    // Lock the submit button while we save so double-taps don't fire twice
    const submitBtn = document.querySelector("#profile-form button[type=submit]");
    const savedText = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "⏳ جارٍ الحفظ...";
    }

    try {
      if (editingId) {
        await window.CoffeeAPI.Baristas.update(editingId, data);
        toast("تم تحديث الملف ✓", "success");
      } else {
        await window.CoffeeAPI.Baristas.create(data);
        toast("تم نشر الملف ✓", "success");
      }
      closeModal();
      loadAndRender();
    } catch (err) {
      console.error("Save profile error:", err);
      toast("تعذّر الحفظ: " + (err.message || "خطأ غير معروف"), "error", 5000);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = savedText || "نشر الملف";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    // Wait for Firebase auth to settle before first render so the "sign in"
    // UI doesn't flash before detecting an already-logged-in user.
    if (window.CW_FB) {
      try { await window.CW_FB.ready; } catch {}
    }
    renderAuthArea();
    // Re-render when Firebase auth state changes (sign in/out from another tab etc.)
    window.addEventListener("cw-auth-changed", () => {
      renderAuthArea();
      loadAndRender();
    });

    // Auth modal wiring
    $("#close-auth").addEventListener("click", closeAuth);
    $("#auth-modal").addEventListener("click", (e) => {
      if (e.target.id === "auth-modal") closeAuth();
      if (e.target.matches("[data-cancel]")) closeAuth();
    });
    $$("#auth-modal .tab").forEach(t =>
      t.addEventListener("click", () => switchTab(t.dataset.tab))
    );
    $("#signin-form").addEventListener("submit", handleSignIn);
    $("#signup-form").addEventListener("submit", handleSignUp);

    // Profile modal wiring
    $("#new-profile-btn").addEventListener("click", openModal);
    $("#close-profile").addEventListener("click", closeModal);
    $("#cancel-profile").addEventListener("click", closeModal);
    $("#profile-modal").addEventListener("click", (e) => {
      if (e.target.id === "profile-modal") closeModal();
    });
    $("#profile-photo").addEventListener("change", (e) => handlePhoto(e.target.files[0]));
    $("#profile-cv").addEventListener("change", (e) => handleCV(e.target.files[0]));
    $("#profile-form").addEventListener("submit", submitForm);
    $("#skills-chips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (chip) chip.classList.toggle("active");
    });

    // Dynamic section add buttons
    $("#add-experience")?.addEventListener("click", () => {
      $("#experiences-list").appendChild(buildExperienceEntry());
    });
    $("#add-certification")?.addEventListener("click", () => {
      $("#certifications-list").appendChild(buildCertificationEntry());
    });
    $("#add-language")?.addEventListener("click", () => {
      $("#languages-list").appendChild(buildLanguageEntry());
    });

    let searchTimer;
    $("#search").addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadAndRender, 220);
    });
    $("#filter-exp").addEventListener("change", loadAndRender);

    wireGridActions();
    loadAndRender();
  });
})();
