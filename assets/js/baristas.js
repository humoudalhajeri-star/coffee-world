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

  let photoUrl = null;
  let cvUrl    = null;
  let cvName   = "";

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
  }
  function switchTab(tab) {
    $$("#auth-modal .tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
    $("#signin-form").style.display = tab === "signin" ? "" : "none";
    $("#signup-form").style.display = tab === "signup" ? "" : "none";
    $("#auth-title").textContent = tab === "signin" ? "تسجيل الدخول" : "إنشاء حساب";
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
      closeAuth();
      renderAuthArea();
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
      toast("مرحباً بك في Coffee World ✓", "success");
      closeAuth();
      renderAuthArea();
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
      if (!items.length) {
        grid.innerHTML = `<div class="empty"><h3>لا توجد ملفات بعد</h3><p>سجّل حسابك ثم اضغط "ملف جديد".</p></div>`;
        return;
      }
      const currentUser = window.CoffeeAPI.Auth.current();
      grid.innerHTML = items.map(b => cardHTML(b, currentUser)).join("");
    } catch (err) {
      grid.innerHTML = `<div class="empty"><h3>تعذّر التحميل</h3><p>${escapeHTML(err.message)}</p></div>`;
    }
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
    const phoneHref = b.phone ? `tel:${encodeURIComponent(b.phone)}` : "#";
    const waHref    = b.phone ? `https://wa.me/${(b.phone || "").replace(/[^\d]/g,"")}` : "#";
    const cvBtn     = b.cv ? `<a class="btn btn-outline" href="${escapeHTML(b.cv)}" target="_blank" rel="noopener">📄 السيرة</a>` : "";
    const canDelete = currentUser?.user?.id && b.ownerId === currentUser.user.id;
    const deleteBtn = canDelete
      ? `<button class="btn btn-danger" data-delete="${b.id}" title="حذف">🗑️</button>`
      : "";
    return `
      <article class="barista-card">
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
          <a class="btn btn-gold"    href="${waHref}" target="_blank" rel="noopener">💬 واتساب</a>
          <a class="btn btn-outline" href="${phoneHref}">☎️</a>
          ${cvBtn}
          ${deleteBtn}
        </div>
      </article>`;
  }

  function wireGridActions() {
    $("#baristas").addEventListener("click", async (e) => {
      const delBtn = e.target.closest("[data-delete]");
      if (!delBtn) return;
      if (!confirm("حذف هذا الملف؟")) return;
      try {
        await window.CoffeeAPI.Baristas.remove(delBtn.dataset.delete);
        toast("تم الحذف", "success");
        loadAndRender();
      } catch (err) {
        toast("تعذّر الحذف", "error");
      }
    });
  }

  /* ============ Profile modal ============ */
  function openModal() {
    const user = window.CoffeeAPI.Auth.current();
    if (!user) {
      toast("سجّل دخولك أولاً لإنشاء ملف", "info");
      openAuth("signin");
      return;
    }
    photoUrl = null; cvUrl = null; cvName = "";
    $("#profile-preview").innerHTML = "<span>👤</span>";
    $("#cv-name").textContent = "";
    $$("#skills-chips .chip").forEach(c => c.classList.remove("active"));
    $("#profile-form").reset();
    $("#profile-photo").value = "";
    $("#profile-cv").value = "";
    // Prefill from session
    $("#profile-form [name=name]").value  = user.user?.name || "";
    $("#profile-form [name=email]").value = user.user?.email || "";
    $("#profile-modal").classList.add("open");
  }
  function closeModal() { $("#profile-modal").classList.remove("open"); }

  async function handlePhoto(file) {
    if (!file) return;
    try {
      const res = await window.CoffeeAPI.Baristas.uploadPhoto(file);
      photoUrl = res.url;
      $("#profile-preview").innerHTML = `<img src="${escapeHTML(photoUrl)}" alt="">`;
    } catch (err) {
      toast("تعذّر رفع الصورة: " + err.message, "error");
    }
  }

  async function handleCV(file) {
    if (!file) return;
    cvName = file.name;
    $("#cv-name").textContent = "📄 " + cvName;
    try {
      const res = await window.CoffeeAPI.Baristas.uploadPhoto(file);
      cvUrl = res.url;
    } catch (err) {
      toast("تعذّر رفع السيرة: " + err.message, "error");
    }
  }

  async function submitForm(e) {
    e.preventDefault();
    const currentUser = window.CoffeeAPI.Auth.current();
    if (!currentUser) {
      toast("سجّل دخولك أولاً", "error");
      openAuth("signin");
      return;
    }
    const fd = new FormData(e.target);
    const skills = $$("#skills-chips .chip.active").map(c => c.dataset.skill);
    const data = {
      name:       fd.get("name").toString().trim(),
      city:       fd.get("city").toString().trim(),
      years:      Number(fd.get("years")) || 0,
      experience: fd.get("experience"),
      phone:      fd.get("phone").toString().trim(),
      email:      fd.get("email").toString().trim(),
      bio:        fd.get("bio").toString().trim(),
      skills,
      photo:      photoUrl,
      cv:         cvUrl,
      cvName,
      ownerId:    currentUser.user?.id,
    };
    if (!data.name || !data.experience || !data.phone) {
      toast("فضلاً أكمل الحقول الأساسية", "error");
      return;
    }
    try {
      await window.CoffeeAPI.Baristas.create(data);
      toast("تم نشر الملف ✓", "success");
      closeModal();
      loadAndRender();
    } catch (err) {
      toast("تعذّر النشر: " + err.message, "error");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderAuthArea();

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
