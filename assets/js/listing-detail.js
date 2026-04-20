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
    other: "أخرى",
  };
  const CATEGORY_ICONS = {
    beans: "🫘", machines: "⚙️", grinders: "🌀",
    accessories: "🧰", cups: "☕", syrups: "🍯", other: "📦",
  };

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

  function render(listing, currentUser) {
    const photos = Array.isArray(listing.images) ? listing.images.filter(Boolean) : [];
    document.title = `${listing.title || "إعلان"} — Coffee World`;

    const slidesHTML = photos.length
      ? photos.map(src => `<div class="slide"><img src="${escapeHTML(src)}" alt="${escapeHTML(listing.title || "")}"></div>`).join("")
      : `<div class="slide"><span>${CATEGORY_ICONS[listing.category] || "☕"}</span></div>`;

    const dotsHTML = photos.length > 1
      ? photos.map((_, i) => `<span class="dot${i === 0 ? " active" : ""}" data-i="${i}"></span>`).join("")
      : "";

    const counterHTML = photos.length > 1 ? `<span class="listing-counter"><span id="cur">1</span>/${photos.length}</span>` : "";

    const priceHTML = listing.price
      ? `<div class="listing-price-big">${Number(listing.price).toLocaleString("ar-SA")} ر.س</div>`
      : `<div class="listing-price-big" style="color:var(--muted);">للتواصل للسعر</div>`;

    const metaBits = [];
    metaBits.push(`<span class="tag">${escapeHTML(CATEGORIES[listing.category] || listing.category || "أخرى")}</span>`);
    if (listing.city) metaBits.push(`📍 ${escapeHTML(listing.city)}`);
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

    $("#listing-root").innerHTML = `
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

      ${listing.phone ? `
      <section class="listing-info" style="padding:14px 18px;">
        <p class="listing-section-title">📞 معلومات التواصل</p>
        <div style="color:var(--coffee-900); font-weight:700; font-size:16px;">${escapeHTML(listing.phone)}</div>
      </section>` : ""}

      ${ownerBar}

      <div class="listing-contact-bar">
        <a class="btn btn-call" href="${phoneHref}">☎️ اتصال</a>
        <a class="btn btn-whatsapp" href="${waHref}" target="_blank" rel="noopener">💬 واتساب</a>
      </div>
    `;

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
      render(listing, currentUser);
    } catch (err) {
      $("#listing-root").innerHTML = `<div class="empty"><h3>تعذّر التحميل</h3><p>${escapeHTML(err.message)}</p></div>`;
    }
  });
})();
