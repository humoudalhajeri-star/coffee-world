/**
 * Listing detail page — Haraj-style: image gallery + info + contact bar.
 */
(function () {
  const { $, $$, toast, escapeHTML, qs } = window.CW;

  const CATEGORIES = {
    beans: "حبوب قهوة",
    machines: "مكائن وإسبريسو",
    grinders: "مطاحن",
    accessories: "أدوات وإكسسوارات",
    cups: "أكواب وعبوات",
    syrups: "نكهات وبومب",
    traditional: "تراثي (دلال وفناجيل)",
    dates: "تمور",
    other: "أخرى",
  };
  const CATEGORY_ICONS = {
    beans: "🫘", machines: "⚙️", grinders: "🌀",
    accessories: "🧰", cups: "☕", syrups: "🍯",
    traditional: "🫖", dates: "🌴", other: "📦",
  };
  const COUNTRIES = {
    KW: { flag: "🇰🇼", name: "الكويت",   currency: "د.ك" },
    SA: { flag: "🇸🇦", name: "السعودية", currency: "ر.س" },
    AE: { flag: "🇦🇪", name: "الإمارات", currency: "د.إ" },
    QA: { flag: "🇶🇦", name: "قطر",     currency: "ر.ق" },
    BH: { flag: "🇧🇭", name: "البحرين",  currency: "د.ب" },
    OM: { flag: "🇴🇲", name: "عُمان",    currency: "ر.ع" },
  };
  const currencyOf = (country) => (COUNTRIES[country] || COUNTRIES.KW).currency;

  function relativeTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60_000);
    if (min < 1)   return "الآن";
    if (min < 60)  return `قبل ${min} د`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24)  return `قبل ${hrs} س`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `قبل ${days} يوم`;
    const months = Math.floor(days / 30);
    if (months < 12) return `قبل ${months} شهر`;
    return `قبل ${Math.floor(months / 12)} سنة`;
  }

  function normalizePhone(phone) {
    if (!phone) return "";
    let d = String(phone).replace(/[^\d]/g, "");
    if (!d) return "";
    if (d.startsWith("00")) d = d.slice(2);
    if (d.startsWith("0") && d.length === 10) return "966" + d.slice(1);
    if (d.length === 8 && /^[569]/.test(d)) return "965" + d;
    return d;
  }

  /** Look up seller info from /baristas (has photo) or /users (fallback). */
  async function fetchSeller(ownerId) {
    if (!ownerId) return null;
    const out = { name: "", photo: null, baristaId: null };
    try {
      const baristas = await window.CoffeeAPI.Baristas.list();
      const mine = (baristas || []).find(b => b.ownerId === ownerId);
      if (mine) {
        out.name  = mine.name  || "";
        out.photo = mine.photo || null;
        out.baristaId = mine.id;
      }
    } catch {}
    if (!out.name && window.CW_FB) {
      try {
        const u = await window.CW_FB.getDocById("users", ownerId);
        if (u) out.name = u.name || u.email || "";
      } catch {}
    }
    return out;
  }

  function render(listing, currentUser, seller) {
    const photos = Array.isArray(listing.images) ? listing.images.filter(Boolean) : [];
    document.title = `${listing.title || "إعلان"} — CoffeZ`;
    window.CW_TRACK?.("ViewContent", {
      content_id: listing.id,
      content_type: "product",
      content_name: listing.title,
      content_category: listing.category,
      value: Number(listing.price) || 0,
      currency: listing.currency || "SAR",
    });

    const fallbackIcon = CATEGORY_ICONS[listing.category] || "☕";
    const slidesHTML = photos.length
      ? photos.map(src => `<div class="slide"><img src="${escapeHTML(src)}" alt="${escapeHTML(listing.title || "")}"
          onerror='this.onerror=null;this.replaceWith(Object.assign(document.createElement("span"),{textContent:"${fallbackIcon}"}));'></div>`).join("")
      : `<div class="slide"><span>${fallbackIcon}</span></div>`;

    const dotsHTML = photos.length > 1
      ? photos.map((_, i) => `<span class="dot${i === 0 ? " active" : ""}" data-i="${i}"></span>`).join("")
      : "";

    const counterHTML = photos.length > 1 ? `<span class="listing-counter"><span id="cur">1</span>/${photos.length}</span>` : "";

    const curr = listing.currency || currencyOf(listing.country);
    const priceHTML = listing.price
      ? `<div class="listing-price-big">${Number(listing.price).toLocaleString("ar-SA")} ${escapeHTML(curr)}</div>`
      : `<div class="listing-price-big" style="color:var(--muted);">للتواصل للسعر</div>`;

    const metaBits = [];
    metaBits.push(`<span class="tag">${escapeHTML(CATEGORIES[listing.category] || listing.category || "أخرى")}</span>`);
    const loc = [];
    if (listing.city) loc.push(escapeHTML(listing.city));
    if (listing.country && COUNTRIES[listing.country]) {
      loc.push(`${COUNTRIES[listing.country].flag} ${COUNTRIES[listing.country].name}`);
    }
    if (loc.length) metaBits.push(`📍 ${loc.join(" · ")}`);
    if (listing.createdAt) metaBits.push(`🕒 ${relativeTime(listing.createdAt)}`);

    const phoneClean = normalizePhone(listing.phone);
    const phoneHref  = listing.phone ? `tel:+${phoneClean}` : "#";
    const waHref     = listing.phone ? `https://wa.me/${phoneClean}` : "#";

    const isOwner = currentUser?.user?.id && listing.ownerId === currentUser.user.id;
    const ownerBar = isOwner ? `
      <section class="listing-info" style="padding:12px 18px;">
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button class="btn btn-danger" id="ld-delete">🗑️ حذف الإعلان</button>
        </div>
      </section>` : "";

    const description = (listing.description || "").trim();

    const demoBanner = listing.isDemo ? `
      <div class="listing-demo-banner">
        <strong>🌱 إعلان تجريبي للعرض</strong> — هذا إعلان عرض تقديمي لمنصة CoffeZ. الرقم والبائع ليسا حقيقيين.
      </div>` : "";

    $("#listing-root").innerHTML = `
      ${demoBanner}
      <div class="listing-gallery">
        <div class="listing-slides" id="ld-slides">${slidesHTML}</div>
        ${counterHTML}
        ${dotsHTML ? `<div class="listing-dots" id="ld-dots">${dotsHTML}</div>` : ""}
      </div>

      <section class="listing-info">
        <h1>${escapeHTML(listing.title || "إعلان")}</h1>
        ${priceHTML}
        <div class="listing-meta-row">${metaBits.join("")}</div>
        ${description ? `
          <p class="listing-section-title">📝 الوصف</p>
          <p class="listing-description">${escapeHTML(description)}</p>
        ` : ""}
      </section>

      ${seller && (seller.name || seller.photo) ? `
      <section class="listing-info" style="padding:14px 18px;">
        <p class="listing-section-title">👤 البائع</p>
        <a ${seller.baristaId ? `href="barista.html?id=${escapeHTML(seller.baristaId)}"` : ""}
           style="display:flex; align-items:center; gap:12px; text-decoration:none; color:inherit;">
          <span class="seller-avatar">${seller.photo
            ? `<img src="${escapeHTML(seller.photo)}" alt="">`
            : `<span>👤</span>`}</span>
          <div>
            <div style="font-weight:800; color:var(--coffee-900); font-size:15px;">${escapeHTML(seller.name || "—")}</div>
            ${seller.baristaId ? `<div style="color:var(--coffee-700); font-size:12px;">اعرض ملفه ←</div>` : ""}
          </div>
        </a>
      </section>` : ""}

      ${listing.phone ? `
      <section class="listing-info" style="padding:14px 18px;">
        <p class="listing-section-title">📞 معلومات التواصل</p>
        <div style="color:var(--coffee-900); font-weight:700; font-size:16px;">${escapeHTML(listing.phone)}</div>
      </section>` : ""}

      ${ownerBar}

      <div class="listing-contact-bar">
        <button class="btn btn-share-listing" id="ld-share" type="button">📤 مشاركة</button>
        <a class="btn btn-call" href="${phoneHref}">☎️ اتصال</a>
        <a class="btn btn-whatsapp" href="${waHref}" target="_blank" rel="noopener">💬 واتساب</a>
      </div>
    `;

    $("#listing-root .btn-call")?.addEventListener("click", (e) => {
      if (listing.isDemo) {
        e.preventDefault();
        toast("هذا إعلان تجريبي للعرض فقط — الرقم غير حقيقي", "error", 3500);
        return;
      }
      window.CW_TRACK?.("Contact", { description: "listing_call", content_id: listing.id });
    });
    $("#listing-root .btn-whatsapp")?.addEventListener("click", (e) => {
      if (listing.isDemo) {
        e.preventDefault();
        toast("هذا إعلان تجريبي للعرض فقط — الرقم غير حقيقي", "error", 3500);
        return;
      }
      window.CW_TRACK?.("Contact", { description: "listing_whatsapp", content_id: listing.id });
    });

    // Wire gallery scroll → active dot + counter
    if (photos.length > 1) {
      const slides = $("#ld-slides");
      const dots = $$(".listing-dots .dot");
      const curEl = document.getElementById("cur");
      slides.addEventListener("scroll", () => {
        const w = slides.clientWidth;
        if (!w) return;
        const idx = Math.round(slides.scrollLeft / w);
        dots.forEach((d, i) => d.classList.toggle("active", i === idx));
        if (curEl) curEl.textContent = String(idx + 1);
      }, { passive: true });
      // Let user tap a dot to jump
      dots.forEach((d, i) => d.addEventListener("click", () => {
        slides.scrollTo({ left: i * slides.clientWidth, behavior: "smooth" });
      }));
    }

    // Share button — uses native share sheet on mobile, falls back to clipboard
    $("#ld-share")?.addEventListener("click", async () => {
      const url   = window.location.href;
      const title = listing.title || "إعلان من CoffeZ";
      const lines = [`☕ ${title}`];
      if (listing.price) lines.push(`💰 ${Number(listing.price).toLocaleString("ar-SA")} ${curr}`);
      if (listing.city || listing.country) {
        const loc = [listing.city, COUNTRIES[listing.country]?.name].filter(Boolean).join(" · ");
        if (loc) lines.push(`📍 ${loc}`);
      }
      lines.push("", url);
      const text = lines.join("\n");

      if (navigator.share) {
        try { await navigator.share({ title, text, url }); return; }
        catch { /* user cancelled */ }
      }
      try {
        await navigator.clipboard.writeText(text);
        toast("تم نسخ رابط الإعلان ✓", "success");
      } catch {
        toast("تعذّرت المشاركة — انسخ الرابط من المتصفح", "info");
      }
    });

    if (isOwner) {
      $("#ld-delete").addEventListener("click", async () => {
        if (!confirm("حذف هذا الإعلان؟")) return;
        try {
          await window.CoffeeAPI.Listings.remove(listing.id);
          toast("تم الحذف", "success");
          setTimeout(() => window.location.href = "marketplace.html", 700);
        } catch (err) {
          toast("تعذّر الحذف: " + err.message, "error");
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const id = qs("id");
    if (!id) {
      $("#listing-root").innerHTML = `<div class="empty"><h3>لم يُحدَّد الإعلان</h3><p><a href="marketplace.html">عد للسوق</a></p></div>`;
      return;
    }
    if (window.CW_FB) { try { await window.CW_FB.ready; } catch {} }
    try {
      const listing = await window.CoffeeAPI.Listings.get(id);
      if (!listing) {
        $("#listing-root").innerHTML = `<div class="empty"><h3>هذا الإعلان غير موجود</h3><p><a href="marketplace.html">عد للسوق</a></p></div>`;
        return;
      }
      const currentUser = window.CoffeeAPI.Auth.current();
      const seller = await fetchSeller(listing.ownerId);
      render(listing, currentUser, seller);
    } catch (err) {
      $("#listing-root").innerHTML = `<div class="empty"><h3>تعذّر التحميل</h3><p>${escapeHTML(err.message)}</p></div>`;
    }
  });
})();
