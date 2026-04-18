/**
 * Stage 1 — Recipe builder logic (recipe.html only).
 */
(function () {
  const { $, $$, toast, escapeHTML, formatDate } = window.CW;
  const { COFFEE_TYPES, SIZE_LABELS, TEMP_LABELS, ICE_LABELS } = window.RECIPE_META;

  // per-type sensible defaults (quantities) — separate from display labels
  const TYPE_DEFAULTS = {
    "espresso":       { shots: 2, milk: 0,   water: 0,   ice: 0, temp: "hot",  size: "S" },
    "americano":      { shots: 2, milk: 0,   water: 200, ice: 0, temp: "hot",  size: "M" },
    "cappuccino":     { shots: 2, milk: 150, water: 0,   ice: 0, temp: "hot",  size: "M" },
    "latte":          { shots: 2, milk: 220, water: 0,   ice: 0, temp: "hot",  size: "M" },
    "flat-white":     { shots: 2, milk: 140, water: 0,   ice: 0, temp: "hot",  size: "S" },
    "macchiato":      { shots: 2, milk: 40,  water: 0,   ice: 0, temp: "hot",  size: "S" },
    "mocha":          { shots: 2, milk: 200, water: 0,   ice: 0, temp: "hot",  size: "M" },
    "cortado":        { shots: 2, milk: 60,  water: 0,   ice: 0, temp: "hot",  size: "S" },
    "iced-latte":     { shots: 2, milk: 180, water: 0,   ice: 4, temp: "iced", size: "L" },
    "iced-americano": { shots: 2, milk: 0,   water: 180, ice: 4, temp: "iced", size: "L" },
    "spanish-latte":  { shots: 2, milk: 200, water: 0,   ice: 0, temp: "hot",  size: "M" },
    "turkish":        { shots: 0, milk: 0,   water: 120, ice: 0, temp: "hot",  size: "S" },
    "v60":            { shots: 0, milk: 0,   water: 250, ice: 0, temp: "hot",  size: "M" },
    "cold-brew":      { shots: 0, milk: 0,   water: 250, ice: 3, temp: "iced", size: "L" },
    "affogato":       { shots: 1, milk: 0,   water: 0,   ice: 0, temp: "hot",  size: "S" },
  };

  // Only run the builder on the recipe page
  if (!document.getElementById("type-chips")) return;

  const state = {
    type: "cappuccino",
    size: "M",
    temp: "hot",
    shots: 2,
    water: 0,
    milk: 150,
    milkType: "full",
    ice: 0,
    sugar: 0,
    pumps: [],
    notes: "",
  };

  function renderTypeChips() {
    const wrap = $("#type-chips");
    wrap.innerHTML = COFFEE_TYPES.map(t =>
      `<span class="chip${t.key === state.type ? " active" : ""}" data-type="${t.key}">${t.name}</span>`
    ).join("");
    wrap.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      $$("#type-chips .chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.type = chip.dataset.type;
      applyDefaultsFor(state.type);
    });
  }

  function applyDefaultsFor(typeKey) {
    const def = TYPE_DEFAULTS[typeKey];
    if (!def) return;
    Object.assign(state, def);
    setSlider("shots", state.shots, v => `${v}`);
    setSlider("water", state.water, v => `${v} مل`);
    setSlider("milk",  state.milk,  v => `${v} مل`);
    setSlider("ice",   state.ice,   v => ICE_LABELS[v] ?? v);
    $$("#size-chips .chip").forEach(c => c.classList.toggle("active", c.dataset.size === state.size));
    $$("#temp-chips .chip").forEach(c => c.classList.toggle("active", c.dataset.temp === state.temp));
  }

  function setSlider(id, value, fmt) {
    const input = document.getElementById(id);
    const out   = document.getElementById(`${id}-out`);
    input.value = value;
    out.textContent = fmt ? fmt(value) : value;
  }

  function wireSlider(id, key, fmt) {
    const input = document.getElementById(id);
    const out   = document.getElementById(`${id}-out`);
    input.addEventListener("input", () => {
      const v = Number(input.value);
      state[key] = v;
      out.textContent = fmt ? fmt(v) : v;
    });
  }

  function wireChipsGroup(sel, key) {
    const root = $(sel);
    root.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      $$(`${sel} .chip`).forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state[key] = chip.dataset[key];
    });
  }

  function wirePumps() {
    $("#pump-chips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      chip.classList.toggle("active");
      state.pumps = $$("#pump-chips .chip.active").map(c => c.dataset.pump);
    });
  }

  function collect() {
    state.milkType = $("#milk-type").value;
    state.sugar    = Number($("#sugar").value);
    state.notes    = $("#notes").value.trim();
    const name     = $("#recipe-name").value.trim();
    const typeName = COFFEE_TYPES.find(t => t.key === state.type)?.name || state.type;
    return {
      ...state,
      name: name || `${typeName} — ${SIZE_LABELS[state.size]}`,
      typeName,
    };
  }

  async function renderSaved() {
    const list = await window.CoffeeAPI.Recipes.list();
    const wrap = $("#saved-list");
    if (!list.length) {
      wrap.innerHTML = `<div class="empty"><h3>لا توجد وصفات محفوظة بعد</h3><p>ابنِ وصفتك أعلاه ثم اضغط "حفظ".</p></div>`;
      return;
    }
    wrap.innerHTML = list.map(r => `
      <div class="saved-item">
        <h4>${escapeHTML(r.name)}</h4>
        <small>${escapeHTML(r.typeName || "")} · ${formatDate(r.createdAt)}</small>
        <div class="meta-row">
          <span class="tag">${SIZE_LABELS[r.size] || r.size}</span>
          <span class="tag">${TEMP_LABELS[r.temp] || r.temp}</span>
          <span class="tag">${r.shots} شوت</span>
        </div>
        <div class="actions">
          <button class="btn btn-outline" data-open="${r.id}">عرض</button>
          <button class="btn btn-danger"  data-delete="${r.id}">حذف</button>
        </div>
      </div>
    `).join("");
  }

  function wireSavedList() {
    $("#saved-list").addEventListener("click", async (e) => {
      const openBtn = e.target.closest("[data-open]");
      const delBtn  = e.target.closest("[data-delete]");
      if (openBtn) {
        window.location.href = `cup.html?id=${encodeURIComponent(openBtn.dataset.open)}`;
      } else if (delBtn) {
        if (!confirm("حذف هذه الوصفة؟")) return;
        try {
          await window.CoffeeAPI.Recipes.remove(delBtn.dataset.delete);
          toast("تم الحذف", "success");
          renderSaved();
        } catch (err) {
          toast("تعذّر الحذف", "error");
        }
      }
    });
  }

  function wireButtons() {
    $("#done-btn").addEventListener("click", () => {
      const recipe = collect();
      sessionStorage.setItem("cw.currentRecipe", JSON.stringify(recipe));
      window.location.href = "cup.html";
    });

    $("#save-btn").addEventListener("click", async () => {
      const recipe = collect();
      try {
        await window.CoffeeAPI.Recipes.create(recipe);
        toast("تم حفظ الوصفة ✓", "success");
        $("#recipe-name").value = "";
        renderSaved();
      } catch (err) {
        toast("تعذّر الحفظ: " + err.message, "error");
      }
    });

    $("#reset-btn").addEventListener("click", () => {
      applyDefaultsFor(state.type);
      $("#sugar").value = 0; $("#sugar-out").textContent = "0"; state.sugar = 0;
      $$("#pump-chips .chip").forEach(c => c.classList.remove("active"));
      state.pumps = [];
      $("#notes").value = ""; state.notes = "";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderTypeChips();
    wireChipsGroup("#size-chips", "size");
    wireChipsGroup("#temp-chips", "temp");
    wirePumps();
    wireSlider("shots", "shots", v => `${v}`);
    wireSlider("water", "water", v => `${v} مل`);
    wireSlider("milk",  "milk",  v => `${v} مل`);
    wireSlider("ice",   "ice",   v => ICE_LABELS[v] ?? v);
    wireSlider("sugar", "sugar", v => `${v}`);
    wireButtons();
    wireSavedList();
    // Sync UI with initial state (avoids slider/label mismatch on first paint)
    applyDefaultsFor(state.type);
    renderSaved();
  });
})();
