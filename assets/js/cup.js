/**
 * Stage 1 — Cup + recipe paper display.
 * Loads a recipe either from URL ?id=... (via API) or from sessionStorage.
 */
(function () {
  const { $, toast, escapeHTML, qs } = window.CW;
  const M = window.RECIPE_META;

  const lookup = (list, key) => (list || []).find(x => x.key === key);

  async function loadRecipe() {
    const id = qs("id");
    if (id) {
      try {
        const rec = await window.CoffeeAPI.Recipes.get(id);
        if (rec) return rec;
      } catch (err) {
        console.error(err);
      }
    }
    const cached = sessionStorage.getItem("cw.currentRecipe");
    if (cached) return JSON.parse(cached);
    return null;
  }

  function pumpLabel(p) {
    if (typeof p === "string") {
      const meta = lookup(M.PUMPS, p) || lookup(M.EXTRA_PUMPS, p);
      return meta ? meta.name : p;
    }
    const meta = lookup(M.PUMPS, p.key) || lookup(M.EXTRA_PUMPS, p.key);
    const name = meta ? meta.name : p.key;
    return p.count && p.count > 1 ? `${name} ×${p.count}` : name;
  }

  function sizeLabel(key) { const s = lookup(M.SIZES, key); return s ? `${s.name} (${s.key}) ${s.ml}ml` : key; }
  function tempLabel(key) {
    const map = { iced: "بارد", cold: "بارد", warm: "دافئ", hot: "ساخن" };
    const t = lookup(M.TEMPS, key);
    return (t && t.name) || map[key] || key;
  }
  function milkTypeLabel(key) {
    const legacy = { full: "كامل الدسم", low: "قليل الدسم", coconut: "جوز الهند", none: "بدون حليب" };
    const m = lookup(M.MILK_TYPES, key);
    return (m && m.name) || legacy[key] || key;
  }
  function foamLabel(key)  { const f = lookup(M.FOAM_LEVELS,  key); return f ? f.name : key; }
  function iceLabel(key)   {
    if (typeof key === "number") return ["بدون ثلج","ثلج خفيف","ثلج عادي","ثلج كثير","ثلج مملوء","ثلج فقط"][key] || String(key);
    const i = lookup(M.ICE_LEVELS, key);
    return i ? i.name : key;
  }
  function waterLabel(key) {
    if (typeof key === "number") return `${key} مل`;
    const w = lookup(M.WATER_LEVELS, key);
    return w ? w.name : key;
  }

  function ingredientLines(r) {
    const lines = [];
    if (r.shots) lines.push({ label: "إسبريسو شوت",  value: `${r.shots} × 30مل` });
    if (r.water && r.water !== "none") lines.push({ label: "ماء", value: waterLabel(r.water) });
    if (r.milk)  lines.push({ label: "حليب", value: `${r.milk} مل (${milkTypeLabel(r.milkType || "regular")})` });
    if (r.foam && r.foam !== "none") lines.push({ label: "رغوة", value: foamLabel(r.foam) });
    if (r.ice && r.ice !== "none" && r.ice !== 0) lines.push({ label: "ثلج", value: iceLabel(r.ice) });
    if (r.sugar) lines.push({ label: "سكر", value: `${r.sugar} ملعقة` });
    if (r.pumps && r.pumps.length) {
      const txt = r.pumps.map(pumpLabel).join("، ");
      lines.push({ label: "بومب / نكهات", value: txt });
    }
    return lines;
  }

  function render(r) {
    $("#rp-title").textContent = r.name || r.typeName || "وصفة";
    const metaParts = [
      r.typeName || "",
      sizeLabel(r.size),
      tempLabel(r.temp),
    ].filter(Boolean);
    $("#rp-meta").textContent = metaParts.join(" · ");
    $("#rp-id").textContent   = r.id || "—";

    const list = ingredientLines(r);
    $("#rp-list").innerHTML = list.length
      ? list.map(l => `<li><b>${escapeHTML(l.label)}</b><span>${escapeHTML(l.value)}</span></li>`).join("")
      : `<li><span>لا توجد مقادير محددة</span></li>`;

    $("#rp-notes").textContent = r.notes ? `ملاحظات: ${r.notes}` : "";

    // cup visuals
    const parts = [];
    if (r.shots) parts.push(`${r.shots}x إسبريسو`);
    if (r.milk)  parts.push(`${r.milk}مل حليب`);
    if (r.water && r.water !== "none") parts.push(waterLabel(r.water));
    $("#cup-notes").textContent = parts.join(" · ");
    const scribble = [
      r.typeName,
      (lookup(M.SIZES, r.size)?.name) || r.size,
      r.temp === "cold" || r.temp === "iced" ? "🧊" : (r.temp === "warm" ? "🌡️" : "🔥"),
    ].filter(Boolean).join("  ·  ");
    $("#cup-scribble").innerHTML = escapeHTML(scribble);

    const summary = [];
    if (r.pumps?.length) summary.push(`نكهات: ${r.pumps.map(pumpLabel).join("، ")}`);
    if (r.sugar) summary.push(`سكر ${r.sugar}`);
    if (r.ice && r.ice !== "none" && r.ice !== 0) summary.push(iceLabel(r.ice));
    if (r.foam && r.foam !== "none") summary.push(foamLabel(r.foam));
    $("#cup-summary").textContent = summary.join(" • ");
  }

  async function handleSave(recipe) {
    try {
      const saved = await window.CoffeeAPI.Recipes.create(recipe);
      toast("تم حفظ الوصفة ✓", "success");
      const url = new URL(window.location.href);
      url.searchParams.set("id", saved.id);
      history.replaceState(null, "", url);
    } catch (err) {
      toast("تعذّر الحفظ: " + err.message, "error");
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const recipe = await loadRecipe();
    if (!recipe) {
      document.querySelector("main").innerHTML = `
        <div class="empty card">
          <h3>لا توجد وصفة لعرضها</h3>
          <p>ابدأ من صفحة <a href="recipe.html">ابتكار الوصفات</a>.</p>
        </div>`;
      return;
    }
    render(recipe);

    $("#print-btn").addEventListener("click", () => window.print());
    $("#save-btn").addEventListener("click", () => {
      if (recipe.id) { toast("هذه الوصفة محفوظة مسبقاً", "info"); return; }
      handleSave(recipe);
    });
  });
})();
