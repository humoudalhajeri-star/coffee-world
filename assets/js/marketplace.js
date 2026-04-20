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

  /** Gulf countries + their currencies (symbol used in Arabic UIs). */
  const COUNTRIES = {
    KW: { flag: "🇰🇼", name: "الكويت",   currency: "د.ك", code: "KWD" },
    SA: { flag: "🇸🇦", name: "السعودية", currency: "ر.س", code: "SAR" },
    AE: { flag: "🇦🇪", name: "الإمارات", currency: "د.إ", code: "AED" },
    QA: { flag: "🇶🇦", name: "قطر",     currency: "ر.ق", code: "QAR" },
    BH: { flag: "🇧🇭", name: "البحرين",  currency: "د.ب", code: "BHD" },
    OM: { flag: "🇴🇲", name: "عُمان",    currency: "ر.ع", code: "OMR" },
  };
  const DEFAULT_COUNTRY = "KW";

  /** Major cities for each Gulf country — keep ordering rough by population. */
  const CITIES = {
    KW: ["مدينة الكويت", "السالمية", "حولي", "الفروانية", "الأحمدي", "الجهراء", "مبارك الكبير", "الفحيحيل", "صباح السالم"],
    SA: ["الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر", "الظهران", "الأحساء", "الطائف", "أبها", "تبوك", "بريدة", "خميس مشيط", "حائل", "نجران", "ينبع", "جازان"],
    AE: ["دبي", "أبوظبي", "الشارقة", "العين", "عجمان", "رأس الخيمة", "الفجيرة", "أم القيوين"],
    QA: ["الدوحة", "الريان", "الوكرة", "أم صلال", "الخور", "الشحانية", "الضعاين"],
    BH: ["المنامة", "المحرق", "الرفاع", "مدينة عيسى", "مدينة حمد", "سترة", "جدحفص", "الزلاق"],
    OM: ["مسقط", "صلالة", "صحار", "نزوى", "صور", "البريمي", "الرستاق", "إبراء", "بهلاء"],
  };

  /** Convert Arabic/Persian digits (٠-٩ or ۰-۹) into standard 0-9. */
  function normalizeDigits(str) {
    if (str == null) return "";
    return String(str)
      .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
      .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0));
  }

  function parsePrice(raw) {
    const norm = normalizeDigits(raw).replace(/[^\d.]/g, "");
    const n = parseFloat(norm);
    return isNaN(n) ? 0 : n;
  }

  function currencyOf(country) {
    return (COUNTRIES[country] || COUNTRIES[DEFAULT_COUNTRY]).currency;
  }
  function countryName(country) {
    const c = COUNTRIES[country];
    return c ? `${c.flag} ${c.name}` : "";
  }

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

  /* ============ Auth UI (Haraj-style: gated posting) ============ */
  // When set, we auto-open the listing form right after sign-in/up finishes.
  let pendingListingAfterAuth = false;

  function renderAuthArea() {
    const area = $("#auth-area");
    if (!area) return;
    const session = window.CoffeeAPI.Auth.current();
    if (session) {
      const name = session.user?.name || session.user?.email || "مستخدم";
      const initial = (name || "?").trim().charAt(0);
      area.innerHTML = `
        <span class="auth-chip">
          <span class="av">${escapeHTML(initial)}</span>
          ${escapeHTML(name)}
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

  function openAuth(tab = "signup", reason) {
    $("#auth-modal").classList.add("open");
    const reasonEl = $("#auth-reason");
    if (reasonEl && reason) reasonEl.textContent = reason;
    switchAuthTab(tab);
  }
  function closeAuth() {
    $("#auth-modal").classList.remove("open");
    $$("#auth-modal form").forEach(f => f.reset());
    pendingListingAfterAuth = false;
  }
  function switchAuthTab(tab) {
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
      const shouldOpen = pendingListingAfterAuth;
      closeAuth();
      renderAuthArea();
      loadAndRender();
      if (shouldOpen) setTimeout(openModal, 200);
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
      const shouldOpen = pendingListingAfterAuth;
      closeAuth();
      renderAuthArea();
      loadAndRender();
      if (shouldOpen) setTimeout(openModal, 200);
    } catch (err) {
      toast(err.message || "تعذّر إنشاء الحساب", "error");
    }
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
    const curr = currencyOf(it.country);
    const priceBadge = it.price
      ? `<span class="market-price-badge">${Number(it.price).toLocaleString("ar-SA")} ${curr}</span>`
      : `<span class="market-price-badge" style="background:#6b6b6b;">للتواصل</span>`;
    const locBits = [];
    if (it.city) locBits.push(escapeHTML(it.city));
    if (it.country && COUNTRIES[it.country]) locBits.push(COUNTRIES[it.country].flag);
    const cityBit = locBits.length ? `📍 ${locBits.join(" ")}` : "";
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
  async function openModal() {
    const session = window.CoffeeAPI.Auth.current();
    if (!session) {
      // Haraj-style: force sign-up/sign-in before the user can post.
      pendingListingAfterAuth = true;
      toast("يجب إنشاء حساب أولاً لنشر إعلان", "info", 3500);
      openAuth("signup", "لإضافة إعلان جديد، يجب إنشاء حساب أولاً (مجاني، ثانية واحدة).");
      return;
    }

    imageQueue = [];
    $("#listing-form").reset();
    $("#listing-files").value = "";
    renderPreviews();

    // Pre-fill phone (and city if it matches a known Gulf city) from the
    // user's barista profile if they have one — saves retyping.
    try {
      const mine = await findMyBaristaProfile(session.user?.id);
      if (mine) {
        const phoneInput = $("#listing-form [name=phone]");
        const cityInput  = $("#listing-form [name=city]");
        if (phoneInput && !phoneInput.value) phoneInput.value = mine.phone || "";
        if (cityInput && mine.city) {
          // Find which country contains this city; pre-select country + city
          const matchedCountry = Object.keys(CITIES).find(c => CITIES[c].includes(mine.city));
          if (matchedCountry) {
            const countrySel = $("#listing-country");
            if (countrySel) {
              countrySel.value = matchedCountry;
              countrySel.dispatchEvent(new Event("change"));
            }
            cityInput.value = mine.city;
          }
        }
      }
    } catch {}

    $("#listing-modal").classList.add("open");
  }
  function closeModal() { $("#listing-modal").classList.remove("open"); }

  async function findMyBaristaProfile(userId) {
    if (!userId) return null;
    try {
      const list = await window.CoffeeAPI.Baristas.list();
      return list.find(b => b.ownerId === userId) || null;
    } catch { return null; }
  }

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

    const country = (fd.get("country") || DEFAULT_COUNTRY).toString();
    const data = {
      title:       (fd.get("title") || "").toString().trim(),
      price:       parsePrice(fd.get("price")),
      currency:    currencyOf(country),
      country,
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

  document.addEventListener("DOMContentLoaded", async () => {
    // Wait for Firebase auth to settle before first render so we don't
    // flash "sign in" before realising the user is already logged in.
    if (window.CW_FB) { try { await window.CW_FB.ready; } catch {} }
    renderAuthArea();
    window.addEventListener("cw-auth-changed", () => {
      renderAuthArea();
    });

    // Auth modal wiring
    $("#close-auth").addEventListener("click", closeAuth);
    $("#auth-modal").addEventListener("click", (e) => {
      if (e.target.id === "auth-modal") closeAuth();
      if (e.target.matches("[data-cancel]")) closeAuth();
    });
    $$("#auth-modal .tab").forEach(t =>
      t.addEventListener("click", () => switchAuthTab(t.dataset.tab))
    );
    $("#signin-form").addEventListener("submit", handleSignIn);
    $("#signup-form").addEventListener("submit", handleSignUp);

    // Listing modal wiring
    $("#new-listing-btn").addEventListener("click", openModal);
    $("#close-listing").addEventListener("click", closeModal);
    $("#cancel-listing").addEventListener("click", closeModal);
    $("#listing-modal").addEventListener("click", (e) => {
      if (e.target.id === "listing-modal") closeModal();
    });
    $("#listing-files").addEventListener("change", (e) => handleFiles(e.target.files));
    $("#listing-form").addEventListener("submit", submitForm);

    // Live currency + city options: update both when country changes
    const countrySel = $("#listing-country");
    const citySel    = $("#listing-city");

    const populateCities = () => {
      if (!citySel) return;
      const code = countrySel?.value || DEFAULT_COUNTRY;
      const cities = CITIES[code] || [];
      const previous = citySel.value;
      citySel.innerHTML = cities.map(c =>
        `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`
      ).join("");
      // Try to keep previously selected city if it exists in the new country.
      if (cities.includes(previous)) citySel.value = previous;
    };

    const updateCurrencySuffix = () => {
      const code = countrySel?.value || DEFAULT_COUNTRY;
      const curr = currencyOf(code);
      const suffix = document.getElementById("price-currency-suffix");
      const hint = document.getElementById("price-currency-hint");
      if (suffix) suffix.textContent = curr;
      if (hint) hint.textContent = `(${curr})`;
    };

    countrySel?.addEventListener("change", () => {
      updateCurrencySuffix();
      populateCities();
    });
    updateCurrencySuffix();
    populateCities();

    // Accept Arabic digits in the price input — mirror them back as Western
    // digits live so the value sent on submit is always numeric.
    const priceInput = $("#listing-price");
    priceInput?.addEventListener("input", () => {
      const caret = priceInput.selectionStart;
      const normalized = normalizeDigits(priceInput.value);
      if (normalized !== priceInput.value) {
        priceInput.value = normalized;
        try { priceInput.setSelectionRange(caret, caret); } catch {}
      }
    });

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
