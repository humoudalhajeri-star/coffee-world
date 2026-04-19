/**
 * Stage 1 result — renders the drink as:
 *   1. A layered cup visualization with measurement ticks.
 *   2. A receipt card with bilingual sections (coffee, milk, foam, pumps, ...).
 *   3. Save + Share + Print actions.
 */
(function () {
  const { $, $$, toast, escapeHTML, qs } = window.CW;
  const M = window.RECIPE_META;

  const lookup = (list, key) => (list || []).find(x => x.key === key);

  /* ====== Label helpers (tolerate legacy shapes) ====== */
  const sizeMeta = (k) => lookup(M.SIZES, k) || { key: k, name: k, ml: 0 };
  const tempMeta = (k) => {
    const legacy = { iced: { name: "بارد", en: "Cold" } };
    const t = lookup(M.TEMPS, k);
    if (t) return { ...t, en: enTemp(t.key) };
    return legacy[k] ? { key: k, name: legacy[k].name, icon: "🧊" } : { key: k, name: k, icon: "🔥" };
  };
  function enTemp(k) { return ({ cold: "Cold", warm: "Warm", hot: "Hot" })[k] || ""; }
  function enFoam(k) { return ({ none: "None", light: "Light", medium: "Medium", heavy: "Heavy" })[k] || ""; }
  function enIce(k)  { return ({ none: "None", light: "Light", regular: "Regular", heavy: "Heavy" })[k] || String(k); }
  function enWater(k){ return ({ none: "None", half: "Half", full: "Full" })[k] || ""; }
  function enMilk(k) {
    return ({
      regular: "Regular", skim: "Skim", "low-fat": "Low-fat",
      oat: "Oat", almond: "Almond", soy: "Soy",
      full: "Whole", low: "Low-fat", coconut: "Coconut", none: "None",
    })[k] || "";
  }
  const milkMeta = (k) => lookup(M.MILK_TYPES, k) || { key: k, name: k, icon: "🥛" };
  const foamMeta = (k) => lookup(M.FOAM_LEVELS, k) || { key: k, name: k };
  const iceMeta  = (k) => lookup(M.ICE_LEVELS,  k) || { key: k, name: typeof k === "number" ? `×${k}` : k };
  const waterMeta= (k) => lookup(M.WATER_LEVELS, k) || { key: k, name: typeof k === "number" ? `${k}ml` : k };

  function pumpMeta(key) {
    return lookup(M.PUMPS, key) || lookup(M.EXTRA_PUMPS, key) || { key, name: key, en: key, icon: "✨", tag: "" };
  }

  /* ====== Load recipe ====== */
  async function loadRecipe() {
    const id = qs("id");
    if (id) {
      try {
        const r = await window.CoffeeAPI.Recipes.get(id);
        if (r) return r;
      } catch (err) { console.error(err); }
    }
    const encoded = qs("r");
    if (encoded) {
      const r = decodeRecipe(encoded);
      if (r) return r;
    }
    const cached = sessionStorage.getItem("cw.currentRecipe");
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Compact base64 (URL-safe) encoding of a recipe so it can ride in a URL.
   * This lets a friend receive a link that reproduces the exact order
   * without needing a backend or shared account.
   */
  function encodeRecipe(r) {
    const compact = {
      t: r.type,  sz: r.size, tp: r.temp,
      sh: r.shots, mk: r.milk, mt: r.milkType,
      sg: r.sugar, fm: r.foam,  ic: r.ice, wt: r.water,
      pm: (r.pumps || []).map(p => [p.key, p.count]),
      nm: r.name, tn: r.typeName, nt: r.notes || "",
    };
    const json = JSON.stringify(compact);
    // base64url — safe for query strings
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeRecipe(s) {
    try {
      const b64 = s.replace(/-/g, "+").replace(/_/g, "/") +
        "=".repeat((4 - (s.length % 4)) % 4);
      const json = decodeURIComponent(escape(atob(b64)));
      const c = JSON.parse(json);
      return {
        type: c.t, size: c.sz, temp: c.tp,
        shots: c.sh, milk: c.mk, milkType: c.mt,
        sugar: c.sg, foam: c.fm, ice: c.ic, water: c.wt,
        pumps: (c.pm || []).map(p => ({ key: p[0], count: p[1] })),
        name: c.nm, typeName: c.tn, notes: c.nt || "",
      };
    } catch { return null; }
  }

  /* ====== Title + specs ====== */
  function fillTitle(r) {
    const drink = lookup(M.DRINKS, r.type) || { key: r.type, name: r.typeName || r.type, sub: "" };
    const enName = englishForDrink(drink.key) || drink.sub || "";
    $("#drink-name-ar").textContent = drink.name;
    $("#drink-name-en").textContent = enName.toUpperCase();
    $("#r-name-ar").textContent = drink.name;
    $("#r-name-en").textContent = enName.toUpperCase();

    const s = sizeMeta(r.size);
    const t = tempMeta(r.temp);
    const specsText = `طلبي · ${s.name} ${s.ml}ml · ${t.name} ${t.icon || ""}`;
    $("#title-specs").textContent = specsText;
    $("#r-specs").textContent = `${s.name} (${enSize(s.key)}) · ${s.ml}ml · ${t.name} ${enTemp(t.key)} ${t.icon || ""}`;
  }

  function enSize(k) { return ({ L: "Large", M: "Medium", S: "Small" })[k] || k; }

  function englishForDrink(key) {
    const map = {
      "latte": "Latte", "cappuccino": "Cappuccino", "espresso": "Espresso",
      "macchiato": "Macchiato", "flat-white": "Flat White", "americano": "Americano",
      "spanish-latte": "Spanish Latte", "cortado": "Cortado", "mocha": "Mocha",
      "iced-latte": "Iced Latte", "chocolate": "Hot Chocolate", "matcha-latte": "Matcha Latte",
      "iced-white-mocha": "Iced White Mocha", "iced-spanish": "Iced Spanish Latte",
      "iced-americano": "Iced Americano", "frappe": "Frappe", "tea": "Tea",
      "iced-mocha": "Iced Mocha",
    };
    return map[key] || "";
  }

  /* ====== Cup visualization (layered) ====== */
  function renderCup(r) {
    const layers = []; // top to bottom inside cup
    // Foam on top
    const foamVol = foamMl(r.foam);
    if (foamVol > 0) layers.push({ cls: "foam", volume: foamVol, label: `Foam ☁️ ${foamVol}ml` });

    // Pumps in order (top-down after foam)
    const pumps = normalizePumps(r.pumps);
    for (const p of pumps) {
      const meta = pumpMeta(p.key);
      const ml = p.count * 8;
      layers.push({
        cls: syrupClass(p.key),
        volume: ml,
        label: `${meta.en || meta.name} ${meta.icon || ""}`,
      });
    }

    // Milk
    if (r.milk > 0) layers.push({ cls: "milk", volume: r.milk, label: `${milkMeta(r.milkType).name} 🥛` });
    // Water
    const waterVol = waterMl(r.water);
    if (waterVol > 0) layers.push({ cls: "water", volume: waterVol, label: `Water 💧 ${waterVol}ml` });
    // Coffee at bottom
    const coffeeVol = (r.shots || 0) * 30;
    if (coffeeVol > 0) layers.push({ cls: "coffee", volume: coffeeVol, label: `Espresso ☕ ${coffeeVol}ml` });
    // Ice
    const iceVol = iceMl(r.ice);
    if (iceVol > 0) layers.push({ cls: "ice", volume: iceVol, label: `Ice 🧊 ${iceLabel(r.ice)}` });

    // Normalize: each layer gets a flex-grow proportional to volume
    const total = layers.reduce((sum, l) => sum + l.volume, 0) || 1;
    const wrap = $("#cup-layers");
    wrap.innerHTML = layers.map(l => {
      const pct = (l.volume / total) * 100;
      return `<div class="cup-layer ${l.cls}" style="height:${pct.toFixed(2)}%;">
        <span>${escapeHTML(l.label)}</span>
      </div>`;
    }).join("") || `<div class="cup-layer milk" style="height:100%"><span>—</span></div>`;

    // Ticks on the left: cumulative ml markers at actual layer boundaries
    const ticks = $("#cup-ticks");
    ticks.innerHTML = "";
    let acc = 0;
    const bottomUp = [...layers].reverse();
    for (const l of bottomUp) {
      acc += l.volume;
      const pct = Math.min(100, (acc / total) * 100);
      const tick = document.createElement("div");
      tick.className = "tick";
      tick.textContent = `${acc}ml`;
      tick.style.bottom = `${pct.toFixed(2)}%`;
      ticks.appendChild(tick);
    }
  }

  function syrupClass(key) {
    const map = {
      "classic": "syrup-classic",
      "white-mocha": "syrup-white",
      "mocha-sauce": "syrup-mocha",
      "mocha": "syrup-mocha",
      "caramel": "syrup-caramel",
      "vanilla": "syrup-vanilla",
      "hazelnut": "syrup-hazelnut",
      "rose": "syrup-rose",
    };
    return map[key] || "syrup-default";
  }

  function foamMl(k) {
    if (!k || k === "none") return 0;
    return ({ light: 15, medium: 30, heavy: 45 })[k] || 0;
  }
  function waterMl(k) {
    if (typeof k === "number") return k;
    return ({ none: 0, half: 120, full: 240 })[k] || 0;
  }
  function iceMl(k) {
    if (typeof k === "number") return k * 20;
    return ({ none: 0, light: 20, regular: 40, heavy: 80 })[k] || 0;
  }
  function iceLabel(k) { const i = iceMeta(k); return i.name || ""; }

  function normalizePumps(pumps) {
    if (!pumps || !pumps.length) return [];
    if (typeof pumps[0] === "string") return pumps.map(k => ({ key: k, count: 1 }));
    return pumps.map(p => ({ key: p.key, count: Number(p.count) || 1 }));
  }

  /* ====== Receipt rows ====== */
  function showSection(key, show) {
    $$(`[data-sec="${key}"], [data-sec-row="${key}"]`).forEach(el => { el.hidden = !show; });
  }

  function renderReceipt(r) {
    // Owner
    const user = window.CoffeeAPI.Auth?.current?.()?.user;
    $("#r-owner").textContent = user?.name || "طلبي";

    // Coffee
    const shots = r.shots || 0;
    if (shots > 0) {
      const ml = shots * 30;
      $("#r-coffee-ml").textContent = `${ml}ml`;
      $("#r-coffee-count").textContent = shots;
      $("#r-coffee-label").textContent = `Shots / شوت`;
      $("#r-coffee-sub").textContent = `${ml}ml · 9 Bar`;
      showSection("coffee", true);
    } else { showSection("coffee", false); }

    // Water
    const wv = waterMl(r.water);
    if (wv > 0) {
      $("#r-water-ml").textContent = `${wv}ml`;
      const wm = waterMeta(r.water);
      $("#r-water-ar").textContent = wm.name || "";
      $("#r-water-en").textContent = enWater(r.water) || `${wv}ml`;
      showSection("water", true);
    } else { showSection("water", false); }

    // Milk
    if ((r.milk || 0) > 0) {
      const mm = milkMeta(r.milkType || "regular");
      $("#r-milk-ml").textContent = `${r.milk}ml`;
      $("#r-milk-ar").textContent = mm.name;
      $("#r-milk-en").textContent = enMilk(r.milkType || "regular");
      $("#r-milk-sub").textContent = `${r.milk}ml · ${r.temp === "cold" || r.temp === "iced" ? "Cold" : "Steamed"}`;
      showSection("milk", true);
    } else { showSection("milk", false); }

    // Foam
    const fv = foamMl(r.foam);
    if (fv > 0) {
      const fm = foamMeta(r.foam);
      $("#r-foam-ml").textContent = `${fv}ml`;
      $("#r-foam-ar").textContent = fm.name;
      $("#r-foam-en").textContent = enFoam(r.foam);
      $("#r-foam-sub").textContent = `${fv}ml · ${enFoam(r.foam)}`;
      showSection("foam", true);
    } else { showSection("foam", false); }

    // Ice
    if (r.ice && r.ice !== "none" && r.ice !== 0) {
      const im = iceMeta(r.ice);
      $("#r-ice-level").textContent = enIce(r.ice);
      $("#r-ice-ar").textContent = im.name;
      showSection("ice", true);
    } else { showSection("ice", false); }

    // Sugar
    if ((r.sugar || 0) > 0) {
      $("#r-sugar-n").textContent = `×${r.sugar}`;
      $("#r-sugar-ar").textContent = `${r.sugar} ملعقة`;
      showSection("sugar", true);
    } else { showSection("sugar", false); }

    // Pumps
    const pumps = normalizePumps(r.pumps);
    const list = $("#r-pumps-list");
    if (pumps.length) {
      list.innerHTML = pumps.map(p => {
        const meta = pumpMeta(p.key);
        const ml = p.count * 8;
        const isSauce = meta.tag === "Sauce";
        const dotCls = p.count >= 3 ? "filled" : "";
        return `
          <div class="r-pump">
            <div class="title">
              <span>${escapeHTML(meta.name)}</span>
              <span class="en">${escapeHTML(meta.en || "")}</span>
              ${isSauce ? `<span class="tag">Sauce</span>` : ""}
            </div>
            <div class="main">
              <span class="left-badge"><span class="dot ${dotCls}"></span>${p.count}P</span>
              <div class="bilingual">
                <span>${p.count} بمب</span> /
                <b>${p.count} Pumps</b>
                <span class="right-icon">${meta.icon || "✨"}</span>
              </div>
            </div>
            <div class="sub">${ml}ml · ${p.count} Pumps</div>
          </div>`;
      }).join("");
      showSection("pumps", true);
    } else {
      list.innerHTML = "";
      showSection("pumps", false);
    }

    // Notes
    if (r.notes) {
      $("#r-notes-text").textContent = r.notes;
      showSection("notes", true);
    } else { showSection("notes", false); }

    // Stamp
    const d = r.createdAt ? new Date(r.createdAt) : new Date();
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    const date = d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
    $("#r-stamp").innerHTML = `${time.toUpperCase()}<br>${date}`;
  }

  /* ====== Actions: save / share / print ====== */
  function wireActions(recipe) {
    const saveBtn = $("#save-btn");
    if (recipe.id) {
      saveBtn.innerHTML = '<span>✓</span> <span>محفوظ</span>';
      saveBtn.disabled = true;
    } else {
      saveBtn.classList.add("ready");
      saveBtn.addEventListener("click", async () => {
        saveBtn.disabled = true;
        try {
          const saved = await window.CoffeeAPI.Recipes.create(recipe);
          toast("تم حفظ الطلب ✓", "success");
          const url = new URL(window.location.href);
          url.searchParams.set("id", saved.id);
          history.replaceState(null, "", url);
          saveBtn.innerHTML = '<span>✓</span> <span>محفوظ</span>';
          saveBtn.classList.remove("ready");
        } catch (err) {
          toast("تعذّر الحفظ: " + err.message, "error");
          saveBtn.disabled = false;
        }
      });
    }

    $("#share-btn").addEventListener("click", () => openShareModal(recipe));
    $("#close-share").addEventListener("click", closeShareModal);
    $("#share-modal").addEventListener("click", (e) => {
      if (e.target.id === "share-modal") closeShareModal();
    });

    $("#print-btn").addEventListener("click", () => window.print());
  }

  /* ====== Share modal ====== */
  function buildShareableURL(recipe) {
    const base = window.location.origin + window.location.pathname;
    return `${base}?r=${encodeRecipe(recipe)}`;
  }

  function openShareModal(recipe) {
    const drink = lookup(M.DRINKS, recipe.type);
    const title = drink?.name || recipe.typeName || "وصفتك";
    const body  = buildShareText(recipe);
    const url   = buildShareableURL(recipe);
    const msg   = `☕ ${title}\n\n${body}\n\n${url}`;

    $("#share-preview").textContent = msg;

    // Build channel URLs
    $("#share-whatsapp").href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    $("#share-sms").href      = `sms:?&body=${encodeURIComponent(msg)}`;
    $("#share-email").href    = `mailto:?subject=${encodeURIComponent("طلبي من Coffee World")}&body=${encodeURIComponent(msg)}`;

    // Copy button (one-time listener per open)
    const copyBtn = $("#share-copy");
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast("تم نسخ الرابط ✓", "success");
      } catch {
        // Fallback: select-and-copy via a hidden textarea
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        toast("تم نسخ الرابط ✓", "success");
      }
    };

    $("#share-modal").classList.add("open");
  }
  function closeShareModal() { $("#share-modal").classList.remove("open"); }

  function buildShareText(r) {
    const lines = [];
    const s = sizeMeta(r.size);
    const t = tempMeta(r.temp);
    lines.push(`${s.name} ${s.ml}ml · ${t.name} ${t.icon || ""}`);
    if (r.shots) lines.push(`• إسبريسو: ${r.shots} شوت`);
    if (r.milk)  lines.push(`• حليب: ${r.milk}ml ${milkMeta(r.milkType).name}`);
    if (r.foam && r.foam !== "none") lines.push(`• رغوة: ${foamMeta(r.foam).name}`);
    if (r.water && r.water !== "none") lines.push(`• ماء: ${waterMeta(r.water).name}`);
    if (r.ice && r.ice !== "none" && r.ice !== 0) lines.push(`• ثلج: ${iceMeta(r.ice).name}`);
    if (r.sugar) lines.push(`• سكر: ${r.sugar} ملاعق`);
    const pumps = normalizePumps(r.pumps);
    if (pumps.length) {
      const txt = pumps.map(p => `${pumpMeta(p.key).name} ×${p.count}`).join("، ");
      lines.push(`• نكهات: ${txt}`);
    }
    if (r.notes) lines.push(`• ملاحظات: ${r.notes}`);
    return lines.join("\n");
  }

  /* ====== Init ====== */
  document.addEventListener("DOMContentLoaded", async () => {
    const recipe = await loadRecipe();
    if (!recipe) {
      document.querySelector(".cup-main").innerHTML = `
        <div class="receipt" style="text-align:center; padding: 40px 20px;">
          <h2>لا توجد وصفة لعرضها</h2>
          <p>ابدأ من <a href="recipe.html">صفحة بناء الوصفة</a>.</p>
        </div>`;
      return;
    }
    fillTitle(recipe);
    renderCup(recipe);
    renderReceipt(recipe);
    wireActions(recipe);
  });
})();
