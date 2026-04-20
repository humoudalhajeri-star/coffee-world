/**
 * Barista detail page — LinkedIn-style profile view.
 * Reads ?id=<baristaId> and renders full info.
 */
(function () {
  const { $, toast, escapeHTML, formatDate, qs } = window.CW;

  const SKILL_LABELS = {
    "latte-art":"لاتيه آرت", "espresso":"إسبريسو", "v60":"في60",
    "chemex":"كيمكس", "aeropress":"آيروبرس", "cold-brew":"كولد برو",
    "cupping":"كابينج", "roasting":"تحميص", "q-grader":"Q-Grader",
    "management":"إدارة فرع", "training":"تدريب",
  };
  const EXPERIENCE_LABELS = {
    junior: "مبتدئ (أقل من سنة)",
    mid:    "متوسط (1-3 سنوات)",
    senior: "خبير (3+ سنوات)",
  };

  function normalizePhone(phone) {
    if (!phone) return "";
    let d = String(phone).replace(/[^\d]/g, "");
    if (!d) return "";
    if (d.startsWith("00")) d = d.slice(2);
    if (d.startsWith("0") && d.length === 10) return "966" + d.slice(1);
    if (d.length === 8 && /^[569]/.test(d)) return "965" + d;
    return d;
  }

  async function render(b, currentUser) {
    const root = $("#bd-root");
    document.title = `${b.name || "بريستا"} — CoffeZ`;
    window.CW_TRACK?.("ViewContent", {
      content_id: b.id,
      content_type: "barista",
      content_name: b.name,
    });

    const phoneClean = normalizePhone(b.phone);
    const phoneLink  = b.phone ? `tel:+${phoneClean}` : null;
    const waLink     = b.phone ? `https://wa.me/${phoneClean}` : null;
    const emailLink  = b.email ? `mailto:${b.email}` : null;

    const avatar = b.photo
      ? `<img src="${escapeHTML(b.photo)}" alt="${escapeHTML(b.name || "")}">`
      : `<span>👤</span>`;

    const experience = EXPERIENCE_LABELS[b.experience] || b.experience || "";
    const headlineBits = [experience];
    if (b.years) headlineBits.push(`${b.years} ${b.years == 1 ? "سنة" : "سنوات"} خبرة`);
    const headline = headlineBits.filter(Boolean).join(" · ");

    const metaBits = [];
    if (b.city) metaBits.push(`📍 ${escapeHTML(b.city)}`);
    if (b.createdAt) metaBits.push(`🗓️ انضم ${formatDate(b.createdAt)}`);

    const contactBtns = [];
    if (waLink)    contactBtns.push(`<a class="btn btn-gold" href="${waLink}" target="_blank" rel="noopener">💬 واتساب</a>`);
    if (phoneLink) contactBtns.push(`<a class="btn btn-primary" href="${phoneLink}">☎️ اتصال</a>`);
    if (emailLink) contactBtns.push(`<a class="btn btn-outline" href="${emailLink}">✉️ إيميل</a>`);

    const skillsHTML = (b.skills || []).length
      ? (b.skills || []).map(s => `<span class="bd-skill">${escapeHTML(SKILL_LABELS[s] || s)}</span>`).join("")
      : `<span style="color:var(--muted);">لم تُضف مهارات.</span>`;

    const infoItems = [];
    if (b.city)    infoItems.push({ label: "المدينة", value: escapeHTML(b.city) });
    if (b.years)   infoItems.push({ label: "سنوات الخبرة", value: escapeHTML(String(b.years)) });
    if (b.phone)   infoItems.push({ label: "الهاتف", value: `<a class="value" href="${phoneLink}">${escapeHTML(b.phone)}</a>` });
    if (b.email)   infoItems.push({ label: "البريد", value: `<a class="value" href="${emailLink}">${escapeHTML(b.email)}</a>` });

    /* --- Experiences --- */
    const formatMonth = (ym) => {
      if (!ym) return "";
      const [y, m] = ym.split("-");
      const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
      return m ? `${months[parseInt(m, 10) - 1] || m} ${y}` : y;
    };
    const experiences = (b.experiences || []).filter(e => e.place || e.role);
    const experiencesHTML = experiences.length ? `
      <section class="bd-section">
        <h2><span class="icon">💼</span> الخبرات السابقة</h2>
        <div class="bd-timeline">
          ${experiences.map(e => {
            const when = [
              formatMonth(e.from),
              e.current ? "حتى الآن" : formatMonth(e.to),
            ].filter(Boolean).join(" — ");
            return `
              <div class="bd-timeline-item">
                <div class="bd-timeline-dot"></div>
                <div class="bd-timeline-body">
                  <div class="bd-timeline-title">${escapeHTML(e.role || "—")}</div>
                  <div class="bd-timeline-sub">${escapeHTML(e.place || "")}</div>
                  ${when ? `<div class="bd-timeline-when">${escapeHTML(when)}</div>` : ""}
                </div>
              </div>`;
          }).join("")}
        </div>
      </section>` : "";

    /* --- Certifications --- */
    const certs = (b.certifications || []).filter(c => c.name);
    const certsHTML = certs.length ? `
      <section class="bd-section">
        <h2><span class="icon">🏆</span> الشهادات</h2>
        <div class="bd-cert-list">
          ${certs.map(c => `
            <div class="bd-cert-item">
              <div class="bd-cert-icon">🏅</div>
              <div>
                <div class="bd-cert-name">${escapeHTML(c.name)}</div>
                <div class="bd-cert-meta">
                  ${c.issuer ? escapeHTML(c.issuer) : ""}
                  ${c.issuer && c.year ? " · " : ""}
                  ${c.year ? escapeHTML(c.year) : ""}
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </section>` : "";

    /* --- Languages --- */
    const langs = (b.languages || []).filter(l => l.name);
    const languagesHTML = langs.length ? `
      <section class="bd-section">
        <h2><span class="icon">🌍</span> اللغات</h2>
        <div class="bd-skills">
          ${langs.map(l => `
            <span class="bd-skill" style="background:var(--cream-100);">
              ${escapeHTML(l.name)}
              ${l.level ? `<span style="color:var(--coffee-600); margin-inline-start:6px;">· ${escapeHTML(l.level)}</span>` : ""}
            </span>
          `).join("")}
        </div>
      </section>` : "";

    const cvSection = b.cv ? `
      <section class="bd-section">
        <h2><span class="icon">📄</span> السيرة الذاتية</h2>
        <a class="bd-cv-card" href="${escapeHTML(b.cv)}" target="_blank" rel="noopener"
           download="${escapeHTML(b.cvName || 'CV.pdf')}"
           style="text-decoration:none; color:inherit;">
          <div class="icon">📄</div>
          <div class="meta">
            <div class="name">${escapeHTML(b.cvName || "السيرة الذاتية.pdf")}</div>
            <div class="hint">اضغط للفتح أو التحميل</div>
          </div>
          <div style="color:var(--coffee-700); font-weight:800;">تحميل ↓</div>
        </a>
      </section>` : "";

    const isOwner = currentUser?.user?.id && b.ownerId === currentUser.user.id;
    const ownerActions = isOwner ? `
      <div class="bd-owner-actions">
        <a class="btn btn-outline" href="baristas.html">✎ تعديل الملف</a>
        <button class="btn btn-danger" id="bd-delete">🗑️ حذف الملف</button>
      </div>` : "";

    root.innerHTML = `
      <article class="bd-card">
        <div class="bd-banner"></div>
        <div class="bd-header">
          <div class="bd-avatar">${avatar}</div>
          <h1 class="bd-name">${escapeHTML(b.name || "بريستا")}</h1>
          ${headline ? `<p class="bd-headline">${escapeHTML(headline)}</p>` : ""}
          ${metaBits.length ? `<div class="bd-meta-row">${metaBits.join("")}</div>` : ""}
          ${contactBtns.length ? `<div class="bd-contact">${contactBtns.join("")}</div>` : ""}
        </div>

        ${b.bio ? `
        <section class="bd-section">
          <h2><span class="icon">📝</span> نبذة تعريفية</h2>
          <p class="bd-bio">${escapeHTML(b.bio)}</p>
        </section>` : ""}

        <section class="bd-section">
          <h2><span class="icon">⭐</span> المهارات</h2>
          <div class="bd-skills">${skillsHTML}</div>
        </section>

        ${infoItems.length ? `
        <section class="bd-section">
          <h2><span class="icon">📋</span> معلومات التواصل</h2>
          <div class="bd-info-grid">
            ${infoItems.map(it => `
              <div class="bd-info-item">
                <label>${it.label}</label>
                <div class="value">${it.value}</div>
              </div>
            `).join("")}
          </div>
        </section>` : ""}

        ${experiencesHTML}

        ${certsHTML}

        ${languagesHTML}

        ${cvSection}

        ${ownerActions}
      </article>
    `;

    root.querySelectorAll(".bd-contact a").forEach(a => {
      a.addEventListener("click", () => {
        const href = a.getAttribute("href") || "";
        let kind = "other";
        if (href.startsWith("https://wa.me")) kind = "whatsapp";
        else if (href.startsWith("tel:"))     kind = "call";
        else if (href.startsWith("mailto:"))  kind = "email";
        window.CW_TRACK?.("Contact", { description: `barista_${kind}`, content_id: b.id });
      });
    });

    if (isOwner) {
      $("#bd-delete").addEventListener("click", async () => {
        if (!confirm("حذف ملفك نهائياً؟")) return;
        try {
          await window.CoffeeAPI.Baristas.remove(b.id);
          toast("تم الحذف", "success");
          setTimeout(() => window.location.href = "baristas.html", 700);
        } catch (err) {
          toast("تعذّر الحذف: " + err.message, "error");
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const id = qs("id");
    if (!id) {
      $("#bd-root").innerHTML = `<div class="empty"><h3>لم يُحدَّد البريستا</h3><p><a href="baristas.html">ارجع للقائمة</a></p></div>`;
      return;
    }
    // Wait for Firebase auth to settle if enabled
    if (window.CW_FB) { try { await window.CW_FB.ready; } catch {} }
    try {
      const b = await window.CoffeeAPI.Baristas.get(id);
      if (!b) {
        $("#bd-root").innerHTML = `<div class="empty"><h3>هذا الملف غير موجود</h3><p><a href="baristas.html">ارجع للقائمة</a></p></div>`;
        return;
      }
      const currentUser = window.CoffeeAPI.Auth.current();
      render(b, currentUser);
    } catch (err) {
      $("#bd-root").innerHTML = `<div class="empty"><h3>تعذّر التحميل</h3><p>${escapeHTML(err.message)}</p></div>`;
    }
  });
})();
