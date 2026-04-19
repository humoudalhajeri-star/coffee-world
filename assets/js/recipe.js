/**
 * Stage 1 — Recipe builder (redesigned, card-based).
 */
(function () {
  const { $, $$, toast, escapeHTML, formatDate } = window.CW;
  const M = window.RECIPE_META;

  if (!document.getElementById("drink-grid")) return;

  const state = {
    type:     "latte",
    size:     "M",
    temp:     "hot",
    shots:    1,
    milk:     80,
    milkType: "regular",
    sugar:    0,
    foam:     "light",
    ice:      "none",
    water:    "none",
    pumps:    [],   // [{ key, count }]
    notes:    "",
  };

  /* ============================================================
   * Renderers (build initial DOM)
   * ============================================================ */
  function renderDrinks() {
    $("#drink-grid").innerHTML = M.DRINKS.map(d => `
      <div class="drink-card${d.key === state.type ? " active" : ""}" data-key="${d.key}">
        <div class="drink-icon">${d.icon}</div>
        <div class="drink-name">${escapeHTML(d.name)}</div>
        <div class="drink-sub">${escapeHTML(d.sub)}</div>
      </div>
    `).join("");
  }

  function renderSizes() {
    $("#size-row").innerHTML = M.SIZES.map(s => `
      <div class="pick-card${s.key === state.size ? " active" : ""}" data-size="${s.key}">
        <span class="pick-icon">🥤</span>
        <div class="pick-name">${escapeHTML(s.name)} (${s.key})</div>
        <div class="pick-sub">${s.ml}ml</div>
      </div>
    `).join("");
  }

  function renderTemps() {
    const f = M.DRINK_FIELDS[state.type] || {};
    const allowed = f.temps || ["hot", "warm", "cold"];
    $("#temp-row").innerHTML = M.TEMPS.map(t => {
      const cls = ["pick-card"];
      if (t.key === state.temp) cls.push("active");
      if (!allowed.includes(t.key)) cls.push("disabled");
      return `<div class="${cls.join(" ")}" data-temp="${t.key}">
        <span class="pick-icon">${t.icon}</span>
        <div class="pick-name">${escapeHTML(t.name)}</div>
      </div>`;
    }).join("");
  }

  function renderPills(containerSel, items, stateKey) {
    $(containerSel).innerHTML = items.map(it => `
      <button class="pill${state[stateKey] === it.key ? " active" : ""}" data-key="${it.key}">
        ${it.icon ? `<span>${it.icon}</span>` : ""}${escapeHTML(it.name)}
      </button>
    `).join("");
  }

  function renderPumpsTable() {
    const rows = state.pumps.map(p => {
      const meta = findPumpMeta(p.key);
      if (!meta) return "";
      const steps = [1, 2, 3, 4].map(n => `
        <button class="pump-step${p.count === n ? " active" : ""}" data-key="${p.key}" data-n="${n}">${n}</button>
      `).join("");
      return `
        <div class="pump-row">
          <div class="pump-name">
            <span style="font-size:22px;">${meta.icon}</span>
            <div>
              <span class="pump-label">${escapeHTML(meta.name)}</span>
              <span class="pump-en">${escapeHTML(meta.en)}</span>
              ${meta.tag ? `<span class="pump-tag">${escapeHTML(meta.tag)}</span>` : ""}
            </div>
          </div>
          <div class="pump-steps">
            <button class="pump-step clear" data-key="${p.key}" data-n="0" title="إزالة">×</button>
            ${steps}
          </div>
          <button class="pump-delete" data-remove="${p.key}" title="حذف">–</button>
        </div>
      `;
    }).join("");

    $("#pumps-table").innerHTML = rows || `
      <div style="text-align:center; color:var(--ord-muted); padding: 12px 0;">
        لم تُضف أي نكهات بعد. اضغط "+ نكهات إضافية" لإضافة أول نكهة.
      </div>`;
  }

  function findPumpMeta(key) {
    return M.PUMPS.find(p => p.key === key) || M.EXTRA_PUMPS.find(p => p.key === key);
  }

  /* ============================================================
   * Meter helpers (pill text + cup fill visual)
   * ============================================================ */
  function updateShotsMeter() {
    const v = state.shots;
    $("#shots-pill").textContent = v === 0 ? "Shot 0" : `Shot (30ml) ${v}`;
    $("#shots").value = v;
    setSliderFill("#shots");
    const cup = $("#cup-shots");
    cup.style.setProperty("--fill", (v / 4) * 100 + "%");
    cup.querySelector("span").textContent = v === 0 ? "—" : `${v}S`;
  }
  function updateMilkMeter() {
    const v = state.milk;
    $("#milk-pill").textContent = `${v}ml`;
    $("#milk").value = v;
    setSliderFill("#milk");
    const cup = $("#cup-milk");
    cup.style.setProperty("--fill", (v / 300) * 100 + "%");
    cup.querySelector("span").textContent = v === 0 ? "—" : `${v}ml`;
  }
  function updateSugarMeter() {
    const v = state.sugar;
    $("#sugar-pill").textContent = `Spoon ${v}`;
    $("#sugar").value = v;
    setSliderFill("#sugar");
    const cup = $("#cup-sugar");
    cup.style.setProperty("--fill", (v / 5) * 100 + "%");
    cup.querySelector("span").textContent = v === 0 ? "—" : `×${v}`;
  }

  function setSliderFill(sel) {
    const el = $(sel);
    const min = Number(el.min);
    const max = Number(el.max);
    const val = Number(el.value);
    const pct = max === min ? 0 : ((val - min) / (max - min)) * 100;
    el.style.setProperty("--pct", pct + "%");
  }

  /* ============================================================
   * Wiring
   * ============================================================ */
  function wire() {
    // Drinks
    $("#drink-grid").addEventListener("click", (e) => {
      const card = e.target.closest(".drink-card");
      if (!card) return;
      state.type = card.dataset.key;
      $$("#drink-grid .drink-card").forEach(c => c.classList.toggle("active", c.dataset.key === state.type));
      applyDefaults();
    });

    // Size / Temp (generic)
    function wirePickRow(sel, stateKey, attr) {
      $(sel).addEventListener("click", (e) => {
        const card = e.target.closest(".pick-card");
        if (!card) return;
        state[stateKey] = card.dataset[attr];
        $$(`${sel} .pick-card`).forEach(c => c.classList.toggle("active", c.dataset[attr] === state[stateKey]));
      });
    }
    wirePickRow("#size-row", "size", "size");
    wirePickRow("#temp-row", "temp", "temp");

    // Pill groups
    function wirePills(sel, stateKey) {
      $(sel).addEventListener("click", (e) => {
        const pill = e.target.closest(".pill");
        if (!pill) return;
        state[stateKey] = pill.dataset.key;
        $$(`${sel} .pill`).forEach(p => p.classList.toggle("active", p.dataset.key === state[stateKey]));
      });
    }
    wirePills("#milk-type-chips", "milkType");
    wirePills("#foam-chips",      "foam");
    wirePills("#ice-chips",       "ice");
    wirePills("#water-chips",     "water");

    // Sliders
    $("#shots").addEventListener("input", (e) => { state.shots = Number(e.target.value); updateShotsMeter(); });
    $("#milk").addEventListener("input",  (e) => { state.milk  = Number(e.target.value); updateMilkMeter();  });
    $("#sugar").addEventListener("input", (e) => { state.sugar = Number(e.target.value); updateSugarMeter(); });

    // Pumps table
    $("#pumps-table").addEventListener("click", (e) => {
      const step = e.target.closest(".pump-step");
      const rm   = e.target.closest("[data-remove]");
      if (step) {
        const key = step.dataset.key;
        const n = Number(step.dataset.n);
        const pump = state.pumps.find(p => p.key === key);
        if (!pump) return;
        if (n === 0) {
          state.pumps = state.pumps.filter(p => p.key !== key);
        } else {
          pump.count = n;
        }
        renderPumpsTable();
      } else if (rm) {
        state.pumps = state.pumps.filter(p => p.key !== rm.dataset.remove);
        renderPumpsTable();
      }
    });

    // Add more pumps modal
    $("#add-more-pumps").addEventListener("click", openPumpModal);
    $("#close-pump-modal").addEventListener("click", closePumpModal);
    $("#pump-modal").addEventListener("click", (e) => {
      if (e.target.id === "pump-modal") closePumpModal();
    });
    $("#extra-pumps-chips").addEventListener("click", (e) => {
      const pill = e.target.closest(".pill");
      if (pill) togglePump(pill.dataset.key, pill);
    });

    // Tabs
    $$(".order-tab").forEach(t =>
      t.addEventListener("click", () => switchView(t.dataset.view))
    );

    // Buttons
    $("#done-btn").addEventListener("click", () => {
      const recipe = collect();
      sessionStorage.setItem("cw.currentRecipe", JSON.stringify(recipe));
      window.location.href = "cup.html";
    });
    $("#save-btn").addEventListener("click", handleSave);
    $("#reset-btn").addEventListener("click", () => {
      state.pumps = [];
      applyDefaults();
      renderPumpsTable();
      toast("تم إعادة الضبط", "info");
    });
  }

  function applyDefaults() {
    const def = M.DRINK_DEFAULTS[state.type];
    if (!def) return;
    Object.assign(state, def);
    applyBaristaRules();
    renderSizes();
    renderTemps();
    renderPills("#milk-type-chips", M.MILK_TYPES, "milkType");
    renderPills("#foam-chips",      M.FOAM_LEVELS,  "foam");
    renderPills("#ice-chips",       M.ICE_LEVELS,   "ice");
    renderPills("#water-chips",     M.WATER_LEVELS, "water");
    updateShotsMeter();
    updateMilkMeter();
    updateSugarMeter();
    renderPumpsTable();
  }

  /**
   * Barista rules — reconcile the drink with the customiser:
   *   1. Hide sections that do not apply (e.g. milk on espresso).
   *   2. Zero out hidden state values so they are not persisted.
   *   3. Gray-out temperatures that don't suit the drink and snap
   *      selection to the first allowed one when needed.
   *   4. Seed signature pumps for drinks that need them (mocha, etc.).
   */
  function applyBaristaRules() {
    const f = M.DRINK_FIELDS[state.type] || DEFAULT_FIELDS;

    // 1. section + meter visibility
    setHidden('[data-meter="shots"]', !f.shots);
    setHidden('[data-meter="milk"]',  !f.milk);
    setHidden('[data-meter="sugar"]', !f.sugar);
    setHidden('[data-field="milk-type"]', !f.milk);
    setHidden('[data-field="foam"]',      !f.foam);
    setHidden('[data-field="ice"]',       !f.ice);
    setHidden('[data-field="water"]',     !f.water);
    setHidden('[data-field="pumps"]',     !f.pumps);

    // 2. zero-out state for hidden fields (so the receipt doesn't show them)
    if (!f.shots) state.shots = 0;
    if (!f.milk)  { state.milk = 0; }
    if (!f.foam)  state.foam = "none";
    if (!f.ice)   state.ice  = "none";
    if (!f.water) state.water = "none";
    if (!f.pumps) state.pumps = [];

    // 3. temperatures: snap selection to first allowed temp if current not allowed
    const allowed = f.temps || ["hot", "warm", "cold"];
    if (!allowed.includes(state.temp)) state.temp = allowed[0];

    // 4. signature pumps (only if the drink defines defaults and user has none)
    if (f.pumps && Array.isArray(f.defaultPumps) && (!state.pumps || !state.pumps.length)) {
      state.pumps = f.defaultPumps.map(p => ({ ...p }));
    }
  }

  const DEFAULT_FIELDS = {
    shots: true, water: true, milk: true, foam: true, ice: true,
    sugar: true, pumps: true, temps: ["hot", "warm", "cold"],
  };

  function setHidden(selector, hidden) {
    const el = document.querySelector(selector);
    if (el) el.hidden = hidden;
  }

  /* ============================================================
   * Extra pumps modal
   * ============================================================ */
  function openPumpModal() {
    const all = [...M.PUMPS, ...M.EXTRA_PUMPS];
    const chips = all.map(p => {
      const added = state.pumps.some(pp => pp.key === p.key);
      return `<button class="pill${added ? " active" : ""}" data-key="${p.key}">${p.icon} ${escapeHTML(p.name)}</button>`;
    }).join("");
    $("#extra-pumps-chips").innerHTML = chips;
    $("#pump-modal").classList.add("open");
  }
  function closePumpModal() { $("#pump-modal").classList.remove("open"); }

  function togglePump(key, pill) {
    const idx = state.pumps.findIndex(p => p.key === key);
    if (idx >= 0) {
      state.pumps.splice(idx, 1);
      pill.classList.remove("active");
    } else {
      state.pumps.push({ key, count: 1 });
      pill.classList.add("active");
    }
    renderPumpsTable();
  }

  /* ============================================================
   * Tabs: Build / Saved
   * ============================================================ */
  function switchView(view) {
    $$(".order-tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
    $("#build-view").hidden = view !== "build";
    $("#saved-view").hidden = view !== "saved";
    if (view === "saved") renderSaved();
  }

  /* ============================================================
   * Collect + persistence
   * ============================================================ */
  function collect() {
    const name = $("#recipe-name").value.trim();
    const drink = M.DRINKS.find(d => d.key === state.type);
    return {
      ...state,
      typeName: drink?.name || state.type,
      name: name || `${drink?.name || state.type} — ${state.size}`,
    };
  }

  async function handleSave() {
    const recipe = collect();
    try {
      await window.CoffeeAPI.Recipes.create(recipe);
      toast("تم حفظ الوصفة ✓", "success");
      $("#recipe-name").value = "";
    } catch (err) {
      toast("تعذّر الحفظ: " + err.message, "error");
    }
  }

  async function renderSaved() {
    const list = await window.CoffeeAPI.Recipes.list();
    const wrap = $("#saved-list");
    if (!list.length) {
      wrap.innerHTML = `<div class="empty"><h3>لا توجد وصفات محفوظة</h3><p>ابنِ وصفة ثم اضغط "حفظ".</p></div>`;
      return;
    }
    const sizeName = k => (M.SIZES.find(s => s.key === k) || {}).name || k || "";
    const tempName = k => (M.TEMPS.find(t => t.key === k) || {}).name || k || "";
    wrap.innerHTML = list.map(r => `
      <div class="saved-item">
        <h4>${escapeHTML(r.name)}</h4>
        <small>${escapeHTML(r.typeName || "")} · ${formatDate(r.createdAt)}</small>
        <div class="meta-row" style="margin-top:6px;">
          <span class="tag">${escapeHTML(sizeName(r.size))}</span>
          <span class="tag">${escapeHTML(tempName(r.temp))}</span>
          <span class="tag">${r.shots || 0} شوت</span>
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
      const open = e.target.closest("[data-open]");
      const del  = e.target.closest("[data-delete]");
      if (open) {
        window.location.href = `cup.html?id=${encodeURIComponent(open.dataset.open)}`;
      } else if (del) {
        if (!confirm("حذف هذه الوصفة؟")) return;
        try {
          await window.CoffeeAPI.Recipes.remove(del.dataset.delete);
          toast("تم الحذف", "success");
          renderSaved();
        } catch { toast("تعذّر الحذف", "error"); }
      }
    });
  }

  /* ============================================================
   * Init
   * ============================================================ */
  document.addEventListener("DOMContentLoaded", () => {
    renderDrinks();
    applyDefaults();      // syncs sizes/temps/pills/meters/pumps + barista rules
    wire();
    wireSavedList();
  });
})();
