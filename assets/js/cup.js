/**
 * Stage 1 — Cup + recipe paper display.
 * Loads a recipe either from URL ?id=... (via API) or from sessionStorage.
 */
(function () {
  const { $, toast, escapeHTML, qs } = window.CW;
  const { MILK_LABELS, PUMP_LABELS, SIZE_LABELS, TEMP_LABELS, ICE_LABELS } = window.RECIPE_META;

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

  function ingredientLines(r) {
    const lines = [];
    if (r.shots) lines.push({ label: "إسبريسو شوت", value: `${r.shots} × 30مل` });
    if (r.water) lines.push({ label: "ماء ساخن",    value: `${r.water} مل` });
    if (r.milk)  lines.push({ label: "حليب",        value: `${r.milk} مل (${MILK_LABELS[r.milkType] || r.milkType})` });
    if (r.ice)   lines.push({ label: "ثلج",         value: ICE_LABELS[r.ice] || r.ice });
    if (r.sugar) lines.push({ label: "سكر",         value: `${r.sugar} ملعقة` });
    if (r.pumps && r.pumps.length) {
      lines.push({ label: "بومب / نكهات", value: r.pumps.map(p => PUMP_LABELS[p] || p).join("، ") });
    }
    return lines;
  }

  function render(r) {
    $("#rp-title").textContent = r.name || r.typeName || "وصفة";
    const metaParts = [
      r.typeName || "",
      SIZE_LABELS[r.size] || "",
      TEMP_LABELS[r.temp] || "",
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
    if (r.water) parts.push(`${r.water}مل ماء`);
    $("#cup-notes").textContent = parts.join(" · ");
    const scribble = [
      r.typeName,
      SIZE_LABELS[r.size],
      r.temp === "iced" ? "🧊" : "🔥",
    ].filter(Boolean).join("  ·  ");
    $("#cup-scribble").innerHTML = escapeHTML(scribble);

    const summaryParts = [];
    if (r.pumps?.length) summaryParts.push(`نكهات: ${r.pumps.map(p => PUMP_LABELS[p] || p).join("، ")}`);
    if (r.sugar) summaryParts.push(`سكر ${r.sugar}`);
    if (r.ice)   summaryParts.push(`ثلج: ${ICE_LABELS[r.ice]}`);
    $("#cup-summary").textContent = summaryParts.join(" • ");
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
