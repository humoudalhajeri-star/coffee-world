/**
 * Stage 2 — Coffee marketplace (Haraj-inspired).
 *
 * Browse: image-focused cards in a 2/3/4-column grid. Tap a card to
 * open the detail page (`listing.html?id=…`) with a swipeable gallery.
 *
 * Sell: photo-first uploader — the first tile is a big "+" add button
 * and newly-picked images appear as thumbnails with upload progress
 * overlays. Title/price/description follow the photos, matching the
 * flow in familiar classifieds apps.
 */
(function () {
  const { $, $$, toast, escapeHTML } = window.CW;

  const MAX_PHOTOS = 10;

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

  /** Arabic relative-time like "قبل 3 ساعات". */
  function relativeTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60_000);
    if (min < 1)  return "الآن";
    if (min < 60) return `قبل ${min} د`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `قبل ${hrs} س`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `قبل ${days} يوم`;
    const months = Math.floor(days / 30);
    if (months < 12) return `قبل ${months} شهر`;
    return `قبل ${Math.floor(months / 12)} سنة`;
  }

  /* ============ Grid ============ */
  let imageQueue = []; // current form's photo state

  async function loadAndRender() {
    const search = $("#search").value.trim();
    const cat    = $("#filter-category").value;
    const grid   = $("#listings");
    grid.innerHTML = `<div class="empty"><p>جارٍ التحميل...</p></div>`;
    try {
      let items = await window.CoffeeAPI.Listings.list(search);
      if (cat) items = items.filter(i => i.category === cat);
      if (!items.length) {
        grid.innerHTML = `<div class="empty" style="grid-column:1/-1;"><h3>لا توجد إعلانات بعد</h3><p>كن أول من يضيف إعلاناً — اضغط "أضف إعلانك".</p></div>`;
        return;
      }
      grid.innerHTML = items.map(cardHTML).join("");
    } catch (err) {
      grid.innerHTML = `<div class="empty"><h3>تعذّر التحميل</h3><p>${escapeHTML(err.message)}</p></div>`;
    }
  }

  function cardHTML(it) {
    const photos = Array.isArray(it.images) ? it.images.filter(Boolean) : [];
    const img = photos[0];
    const mediaBody = img
      ? `<img src="${escapeHTML(img)}" alt="${escapeHTML(it.title)}" loading="lazy">`
      : `<span class="fallback">${CATEGORY_ICONS[it.category] || "☕"}</span>`;
    const countBadge = photos.length > 1
      ? `<span class="market-count-badge">📷 ${photos.length}</span>` : "";
    const priceBadge = it.price
      ? `<span class="market-price-badge">${Number(it.price).toLocaleString("ar-SA")} ر.س</span>`
      : `<span class="market-price-badge" style="background:#6b6b6b;">للتواصل</span>`;
    const cityBit = it.city ? `📍 ${escapeHTML(it.city)}` : "";
    const timeBit = relativeTime(it.createdAt);
    const metaParts = [cityBit, timeBit].filter(Boolean);
    const metaRow = metaParts.map((p, i) =>
      (i === 0 ? p : `<span class="dot">·</span>${p}`)
    ).join(" ");

    return `
      <article class="market-card" data-open="${escapeHTML(it.id)}" role="button" tabindex="0">
        <div class="market-media">
          ${mediaBody}
          ${priceBadge}
          ${countBadge}
        </div>
        <div class="market-body">
          <h3 class="market-title">${escapeHTML(it.title || "بدون عنوان")}</h3>
          <div class="market-meta">${metaRow}</div>
        </div>
      </article>`;
  }

  function wireGridOnce() {
    $("#listings").addEventListener("click", (e) => {
      const card = e.target.closest(".market-card[data-open]");
      if (!card) return;
      window.location.href = `listing.html?id=${encodeURIComponent(card.dataset.open)}`;
    });
    $("#listings").addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const card = e.target.closest?.(".market-card[data-open]");
      if (card) window.location.href = `listing.html?id=${encodeURIComponent(card.dataset.open)}`;
    });
  }

  /* ============ Photo uploader (photo-first) ============ */
  function renderPreviews() {
    const slots = imageQueue.map((entry, idx) => {
      const isPending = typeof entry !== "string";
      const src = escapeHTML(isPending ? entry.url : entry);
      const coverBadge = idx === 0 ? `<span class="cover-badge">رئيسية</span>` : "";
      const progress = isPending
        ? `<div class="progress">⏳ ${entry.pct != null ? entry.pct + "%" : ""}</div>`
        : "";
      return `
        <div class="photo-slot">
          <img src="${src}" alt="">
          <button type="button" class="remove" data-remove="${idx}" aria-label="حذف">×</button>
          ${coverBadge}
          ${progress}
        </div>`;
    });
    // Show the "+" add tile as long as we're below MAX_PHOTOS
    if (imageQueue.length < MAX_PHOTOS) {
      slots.unshift(`
        <label class="photo-add-tile" for="listing-files" aria-label="إضافة صور">
          <span class="icon">＋</span>
          <span>أضف صور</span>
          <small>حتى ${MAX_PHOTOS}</small>
        </label>`);
    }
    $("#listing-preview").innerHTML = slots.join("");
    $("#photo-count-hint").textContent = `${imageQueue.length} / ${MAX_PHOTOS} صور`;
  }

  async function handleFiles(files) {
    const arr = Array.from(files).slice(0, MAX_PHOTOS - imageQueue.length);
    for (const f of arr) {
      const localUrl = URL.createObjectURL(f);
      const placeholderIdx = imageQueue.push({ pending: true, url: localUrl }) - 1;
      renderPreviews();
      try {
        const res = await window.CoffeeAPI.Listings.uploadImage(f, (pct) => {
          imageQueue[placeholderIdx] = { pending: true, url: localUrl, pct };
          renderPreviews();
        });
        imageQueue[placeholderIdx] = res.url;
        renderPreviews();
      } catch (err) {
        imageQueue.splice(placeholderIdx, 1);
        renderPreviews();
        toast("تعذّر رفع صورة: " + err.message, "error");
      }
    }
    // Clear file input so picking the same file again still fires change
    $("#listing-files").value = "";
  }

  function wirePreviewActions() {
    $("#listing-preview").addEventListener("click", (e) => {
      const removeBtn = e.target.closest("[data-remove]");
      if (!removeBtn) return;
      e.preventDefault();
      e.stopPropagation();
      const idx = Number(removeBtn.dataset.remove);
      if (!Number.isNaN(idx)) {
        imageQueue.splice(idx, 1);
        renderPreviews();
      }
    });
  }

  /* ============ Modal ============ */
  function openModal() {
    imageQueue = [];
    $("#listing-form").reset();
    $("#listing-files").value = "";
    renderPreviews();
    $("#listing-modal").classList.add("open");
  }
  function closeModal() { $("#listing-modal").classList.remove("open"); }

  async function submitForm(e) {
    if (e) e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);

    const finalImages = imageQueue.filter(x => typeof x === "string");
    const stillUploading = imageQueue.length - finalImages.length;
    if (stillUploading > 0) {
      toast(`انتظر اكتمال رفع ${stillUploading} صورة...`, "info", 4000);
      return;
    }

    const data = {
      title:       (fd.get("title") || "").toString().trim(),
      price:       Number(fd.get("price")) || 0,
      category:    (fd.get("category") || "").toString(),
      city:        (fd.get("city") || "").toString().trim(),
      phone:       (fd.get("phone") || "").toString().trim(),
      description: (fd.get("description") || "").toString().trim(),
      images:      finalImages,
    };

    const missing = [];
    if (!data.title)    missing.push("العنوان");
    if (!data.category) missing.push("الفئة");
    if (!data.phone)    missing.push("رقم التواصل");
    if (missing.length) {
      toast("املأ: " + missing.join("، "), "error", 4500);
      return;
    }

    const submitBtn = form.querySelector("button[type=submit]");
    const saved = submitBtn?.textContent;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "⏳ جارٍ النشر..."; }
    try {
      await window.CoffeeAPI.Listings.create(data);
      toast("تم نشر الإعلان ✓", "success");
      closeModal();
      loadAndRender();
    } catch (err) {
      toast("تعذّر النشر: " + err.message, "error");
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = saved || "نشر الإعلان"; }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#new-listing-btn").addEventListener("click", openModal);
    $("#close-listing").addEventListener("click", closeModal);
    $("#cancel-listing").addEventListener("click", closeModal);
    $("#listing-modal").addEventListener("click", (e) => {
      if (e.target.id === "listing-modal") closeModal();
    });
    $("#listing-files").addEventListener("change", (e) => handleFiles(e.target.files));
    $("#listing-form").addEventListener("submit", submitForm);

    let searchTimer;
    $("#search").addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadAndRender, 220);
    });
    $("#filter-category").addEventListener("change", loadAndRender);

    wireGridOnce();
    wirePreviewActions();
    loadAndRender();
  });
})();
