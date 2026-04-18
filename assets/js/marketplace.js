/**
 * Stage 2 — Coffee marketplace.
 */
(function () {
  const { $, $$, toast, escapeHTML, formatDate } = window.CW;

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

  let imageQueue = []; // {url} entries for the current form

  async function loadAndRender() {
    const search = $("#search").value.trim();
    const cat    = $("#filter-category").value;
    const grid   = $("#listings");
    grid.innerHTML = `<div class="empty"><p>جارٍ التحميل...</p></div>`;
    try {
      let items = await window.CoffeeAPI.Listings.list(search);
      if (cat) items = items.filter(i => i.category === cat);
      if (!items.length) {
        grid.innerHTML = `<div class="empty"><h3>لا توجد إعلانات بعد</h3><p>كن أول من يضيف إعلاناً بالضغط على "إعلان جديد".</p></div>`;
        return;
      }
      grid.innerHTML = items.map(cardHTML).join("");
    } catch (err) {
      grid.innerHTML = `<div class="empty"><h3>تعذّر التحميل</h3><p>${escapeHTML(err.message)}</p></div>`;
    }
  }

  function cardHTML(it) {
    const img = (it.images && it.images[0]) || null;
    const media = img
      ? `<img src="${escapeHTML(img)}" alt="${escapeHTML(it.title)}">`
      : `<span>${CATEGORY_ICONS[it.category] || "☕"}</span>`;
    const price = it.price ? `<div class="price">${Number(it.price).toLocaleString("ar-SA")} ر.س</div>` : "";
    const city = it.city ? `<span>📍 ${escapeHTML(it.city)}</span>` : "";
    const phoneHref = it.phone ? `tel:${encodeURIComponent(it.phone)}` : "#";
    const waHref    = it.phone ? `https://wa.me/${(it.phone || "").replace(/[^\d]/g,"")}` : "#";
    return `
      <article class="listing-card">
        <div class="listing-media">${media}</div>
        <div class="listing-body">
          <h3>${escapeHTML(it.title)}</h3>
          ${price}
          <div class="meta-row">
            <span class="tag">${escapeHTML(CATEGORIES[it.category] || it.category || "")}</span>
            ${city}
            <span>🗓️ ${formatDate(it.createdAt)}</span>
          </div>
          <p>${escapeHTML((it.description || "").slice(0, 120))}${(it.description || "").length > 120 ? "..." : ""}</p>
        </div>
        <div class="listing-actions">
          <a class="btn btn-outline" href="${phoneHref}">☎️ اتصال</a>
          <a class="btn btn-gold"    href="${waHref}" target="_blank" rel="noopener">💬 واتساب</a>
          <button class="btn btn-danger" data-delete="${it.id}" title="حذف">🗑️</button>
        </div>
      </article>`;
  }

  function wireGridActionsOnce() {
    $("#listings").addEventListener("click", async (e) => {
      const delBtn = e.target.closest("[data-delete]");
      if (!delBtn) return;
      if (!confirm("حذف هذا الإعلان؟")) return;
      try {
        await window.CoffeeAPI.Listings.remove(delBtn.dataset.delete);
        toast("تم الحذف", "success");
        loadAndRender();
      } catch (err) {
        toast("تعذّر الحذف", "error");
      }
    });
  }

  /* ===== Modal + form ===== */
  function openModal() {
    imageQueue = [];
    $("#listing-preview").innerHTML = "";
    $("#listing-form").reset();
    $("#listing-modal").classList.add("open");
  }
  function closeModal() {
    $("#listing-modal").classList.remove("open");
  }

  async function handleFiles(files) {
    const arr = Array.from(files).slice(0, 6 - imageQueue.length);
    for (const f of arr) {
      try {
        const res = await window.CoffeeAPI.Listings.uploadImage(f);
        imageQueue.push(res.url);
      } catch (err) {
        toast("تعذّر رفع صورة: " + err.message, "error");
      }
    }
    renderPreviews();
  }
  function renderPreviews() {
    $("#listing-preview").innerHTML = imageQueue
      .map(url => `<img src="${escapeHTML(url)}" alt="">`)
      .join("");
  }

  async function submitForm(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const data = {
      title:       fd.get("title").toString().trim(),
      price:       Number(fd.get("price")) || 0,
      category:    fd.get("category"),
      city:        fd.get("city").toString().trim(),
      phone:       fd.get("phone").toString().trim(),
      description: fd.get("description").toString().trim(),
      images:      imageQueue.slice(),
    };
    if (!data.title || !data.category || !data.phone) {
      toast("فضلاً أكمل الحقول الأساسية", "error");
      return;
    }
    try {
      await window.CoffeeAPI.Listings.create(data);
      toast("تم نشر الإعلان ✓", "success");
      closeModal();
      loadAndRender();
    } catch (err) {
      toast("تعذّر النشر: " + err.message, "error");
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

    wireGridActionsOnce();
    loadAndRender();
  });
})();
