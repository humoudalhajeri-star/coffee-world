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
  // Compact keys for the URL payload. typeName is skipped — it's derivable
  // from `type` via the DRINKS table, which saves ~40 bytes per link.
  function encodeRecipe(r) {
    const compact = {
      t: r.type, s: r.size, p: r.temp,
      h: r.shots, m: r.milk, mt: r.milkType,
      sg: r.sugar, f: r.foam, i: r.ice, w: r.water,
      pm: (r.pumps || []).map(p => [p.key, p.count]),
      n: r.notes || "",
    };
    const json = JSON.stringify(compact);
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeRecipe(s) {
    try {
      const b64 = s.replace(/-/g, "+").replace(/_/g, "/") +
        "=".repeat((4 - (s.length % 4)) % 4);
      const json = decodeURIComponent(escape(atob(b64)));
      const c = JSON.parse(json);
      const drink = lookup(M.DRINKS, c.t);
      return {
        type: c.t, size: c.s, temp: c.p,
        shots: c.h, milk: c.m, milkType: c.mt,
        sugar: c.sg, foam: c.f, ice: c.i, water: c.w,
        pumps: (c.pm || []).map(p => ({ key: p[0], count: p[1] })),
        name: drink?.name || c.t,
        typeName: drink?.name || c.t,
        notes: c.n || "",
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
    const body = buildShareText(recipe);
    const url  = buildShareableURL(recipe);
    const msg  = `${body}\n\n📱 اعرض الكوب بالتفصيل:\n${url}`;

    $("#share-preview").textContent = msg;

    // SMS / Email / Copy — text only (these channels can't reliably attach images)
    const encoded = encodeURIComponent(msg);
    $("#share-sms").href   = `sms:?&body=${encoded}`;
    $("#share-email").href = `mailto:?subject=${encodeURIComponent("طلبي من Coffee World")}&body=${encoded}`;

    // WhatsApp — send the actual receipt as an image so the colors,
    // sections, and layout arrive intact (plain text is ugly for WA).
    // Strategy: render the #receipt DOM to a PNG via html2canvas, then
    // share via the Web Share API (files). Fall back to downloading the
    // image + opening WA with text for browsers without file sharing.
    const waEl = $("#share-whatsapp");
    waEl.onclick = async (e) => {
      e.preventDefault();
      await shareAsWhatsApp(recipe, msg, url);
    };

    // Copy link
    const copyBtn = $("#share-copy");
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast("تم نسخ الرابط ✓", "success");
      } catch {
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

  /* ============================================================
   * WhatsApp sharing as an image — render the receipt DOM into a
   * PNG so the colors, sections, and layout arrive intact.
   * ============================================================ */

  async function renderReceiptAsBlob() {
    if (typeof html2canvas !== "function") {
      throw new Error("مكتبة توليد الصور لم تُحمَّل — تحقق من الاتصال");
    }
    const target = document.getElementById("receipt");
    // Wait for fonts so Tajawal renders in the snapshot
    if (document.fonts?.ready) {
      try { await document.fonts.ready; } catch {}
    }
    const canvas = await html2canvas(target, {
      backgroundColor: "#F3E8D1",
      scale: Math.min(window.devicePixelRatio || 1, 2) * 1.5,
      useCORS: true,
      logging: false,
      windowWidth: Math.max(target.scrollWidth, 600),
    });
    return await new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png", 0.92);
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function shareAsWhatsApp(recipe, fallbackText, shareUrl) {
    const waEl = $("#share-whatsapp");
    const original = waEl.innerHTML;
    waEl.innerHTML = '<span class="icon">⏳</span><span>جارٍ تحضير الصورة...</span>';
    waEl.style.pointerEvents = "none";

    const drink = lookup(M.DRINKS, recipe.type);
    const title = drink?.name || recipe.typeName || "طلبي";
    const caption = `☕ ${title}\n${shareUrl}`;
    const encodedCaption = encodeURIComponent(caption);

    try {
      const blob = await renderReceiptAsBlob();
      const file = new File([blob], `coffee-order-${Date.now()}.png`, { type: "image/png" });

      // Preferred: Web Share API with file attachment (iOS 16.4+, Android Chrome, etc.)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "طلبي من Coffee World",
          text: caption,
        });
        toast("تمت المشاركة ✓", "success");
        return;
      }

      // Fallback: download the image and open WhatsApp with the text caption
      downloadBlob(blob, `coffee-order-${title}.png`);
      toast("تم حفظ صورة الإيصال — أرفقها يدوياً في المحادثة", "info", 4500);
      const waURL = `https://api.whatsapp.com/send?text=${encodedCaption}`;
      // Small delay so the download notification lands before WA opens
      setTimeout(() => window.open(waURL, "_blank", "noopener"), 400);
    } catch (err) {
      console.error(err);
      // Last resort: plain text share (original behaviour)
      const waURL = `https://api.whatsapp.com/send?text=${encodeURIComponent(fallbackText)}`;
      window.open(waURL, "_blank", "noopener");
      toast("تعذّر توليد الصورة — أُرسل النص بدلاً منها", "info");
    } finally {
      waEl.innerHTML = original;
      waEl.style.pointerEvents = "";
    }
  }

  /**
   * Build a receipt-style text for sharing — matches the visual receipt
   * with sections, separators, and bilingual labels so the friend
   * receiving it can read the order clearly and show it to the barista.
   */
  function buildShareText(r) {
    const drink = lookup(M.DRINKS, r.type);
    const drinkAr = drink?.name || r.typeName || "";
    const drinkEn = (englishForDrink(r.type) || "").toUpperCase();
    const sizeM  = sizeMeta(r.size);
    const tempM  = tempMeta(r.temp);

    const owner = window.CoffeeAPI.Auth?.current?.()?.user?.name || "طلبي";
    const SEP = "━━━━━━━━━━━━━━━━━━━━";
    const out = [];

    out.push(`☕ ${drinkAr}${drinkEn ? ` · ${drinkEn}` : ""}`);
    out.push(SEP);
    out.push(`📋 ORDER FOR · ${owner}`);
    out.push(`🥤 ${sizeM.name} (${enSize(sizeM.key)}) · ${sizeM.ml}ml`);
    out.push(`${tempM.icon || "🔥"} ${tempM.name} · ${enTemp(tempM.key) || tempM.key}`);

    // COFFEE
    if (r.shots > 0) {
      const ml = r.shots * 30;
      out.push("", SEP, "☕ COFFEE · القهوة", SEP);
      out.push(`● Espresso · إسبريسو`);
      out.push(`   ${r.shots} Shot${r.shots > 1 ? "s" : ""} (${ml}ml) · 9 Bar`);
    }
    // WATER
    const wv = waterMl(r.water);
    if (wv > 0) {
      const wm = waterMeta(r.water);
      out.push("", SEP, "💧 WATER · الماء", SEP);
      out.push(`● Water · ماء`);
      out.push(`   ${wm.name} (${enWater(r.water)}) · ${wv}ml`);
    }
    // MILK
    if ((r.milk || 0) > 0) {
      const mm = milkMeta(r.milkType || "regular");
      const steamed = r.temp === "cold" || r.temp === "iced" ? "Cold" : "Steamed";
      out.push("", SEP, "🥛 MILK · الحليب", SEP);
      out.push(`● ${mm.name} · ${enMilk(r.milkType || "regular")}`);
      out.push(`   ${r.milk}ml · ${steamed}`);
    }
    // FOAM
    const fv = foamMl(r.foam);
    if (fv > 0) {
      const fm = foamMeta(r.foam);
      out.push("", SEP, "☁️ FOAM · الرغوة", SEP);
      out.push(`○ ${fm.name} · ${enFoam(r.foam)}`);
      out.push(`   ${fv}ml · ${enFoam(r.foam)}`);
    }
    // ICE
    if (r.ice && r.ice !== "none" && r.ice !== 0) {
      const im = iceMeta(r.ice);
      out.push("", SEP, "🧊 ICE · الثلج", SEP);
      out.push(`● ${im.name} · ${enIce(r.ice)}`);
    }
    // SUGAR
    if ((r.sugar || 0) > 0) {
      out.push("", SEP, "🍭 SUGAR · السكر", SEP);
      out.push(`● ${r.sugar} Spoon${r.sugar > 1 ? "s" : ""} · ${r.sugar} ملعقة`);
    }
    // PUMPS
    const pumps = normalizePumps(r.pumps);
    if (pumps.length) {
      out.push("", SEP, "✨ SYRUPS & PUMPS · السيروب", SEP);
      for (const p of pumps) {
        const meta = pumpMeta(p.key);
        const ml = p.count * 8;
        const tag = meta.tag ? ` [${meta.tag}]` : "";
        out.push(`${p.count >= 3 ? "●" : "○"} ${meta.en || meta.name} · ${meta.name}${tag}`);
        out.push(`   ${p.count} Pump${p.count > 1 ? "s" : ""} (${ml}ml)`);
      }
    }
    // NOTES
    if (r.notes) {
      out.push("", SEP, "📝 NOTES · ملاحظات", SEP);
      out.push(r.notes);
    }

    // footer
    const d = r.createdAt ? new Date(r.createdAt) : new Date();
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    const date = d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
    out.push("", SEP, `⏰ ${date} · ${time}`, SEP);
    out.push("— Coffee World ☕ —");

    return out.join("\n");
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
