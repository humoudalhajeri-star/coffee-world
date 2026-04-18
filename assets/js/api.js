/**
 * Coffee World — API Client
 *
 * Single source of truth for all backend communication.
 * Configure `API_BASE_URL` (and optionally `API_TOKEN`) to point at your backend.
 *
 * While `API_BASE_URL` is empty, every method transparently falls back to
 * localStorage so the UI works end-to-end without a server. Once a real API
 * is plugged in, the same method signatures return parsed JSON from the server.
 */

(function (global) {
  const CONFIG = {
    // Set this to your backend base URL, e.g. "https://api.coffee-world.example"
    API_BASE_URL: "",
    API_TOKEN: "", // optional bearer token
    TIMEOUT_MS: 15000,
  };

  const LS_KEYS = {
    recipes:  "cw.recipes",
    listings: "cw.listings",
    baristas: "cw.baristas",
  };

  /* ============= low-level HTTP ============= */
  async function http(method, path, body, { isForm = false } = {}) {
    if (!CONFIG.API_BASE_URL) {
      throw new Error("OFFLINE");
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);
    try {
      const headers = {};
      if (!isForm) headers["Content-Type"] = "application/json";
      if (CONFIG.API_TOKEN) headers["Authorization"] = `Bearer ${CONFIG.API_TOKEN}`;
      const res = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
        method,
        headers,
        body: body == null ? undefined : (isForm ? body : JSON.stringify(body)),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
      }
      const ct = res.headers.get("content-type") || "";
      return ct.includes("application/json") ? res.json() : res.text();
    } finally {
      clearTimeout(timer);
    }
  }

  /* ============= local-storage helpers ============= */
  const LS = {
    read(key) {
      try { return JSON.parse(localStorage.getItem(key) || "[]"); }
      catch { return []; }
    },
    write(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    uid() {
      return "id_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    },
  };

  async function withFallback(remotePromise, localFn) {
    try {
      return await remotePromise();
    } catch (err) {
      if (err && err.message === "OFFLINE") return localFn();
      throw err;
    }
  }

  /* ============= Recipes (Stage 1) ============= */
  const Recipes = {
    async list() {
      return withFallback(
        () => http("GET", "/recipes"),
        () => LS.read(LS_KEYS.recipes)
      );
    },
    async get(id) {
      return withFallback(
        () => http("GET", `/recipes/${encodeURIComponent(id)}`),
        () => LS.read(LS_KEYS.recipes).find(r => r.id === id) || null
      );
    },
    async create(recipe) {
      return withFallback(
        () => http("POST", "/recipes", recipe),
        () => {
          const items = LS.read(LS_KEYS.recipes);
          const saved = { ...recipe, id: LS.uid(), createdAt: new Date().toISOString() };
          items.unshift(saved);
          LS.write(LS_KEYS.recipes, items);
          return saved;
        }
      );
    },
    async remove(id) {
      return withFallback(
        () => http("DELETE", `/recipes/${encodeURIComponent(id)}`),
        () => {
          const items = LS.read(LS_KEYS.recipes).filter(r => r.id !== id);
          LS.write(LS_KEYS.recipes, items);
          return { ok: true };
        }
      );
    },
  };

  /* ============= Marketplace (Stage 2) ============= */
  const Listings = {
    async list(query = "") {
      return withFallback(
        () => http("GET", `/listings${query ? `?q=${encodeURIComponent(query)}` : ""}`),
        () => {
          let items = LS.read(LS_KEYS.listings);
          if (query) {
            const q = query.trim().toLowerCase();
            items = items.filter(it =>
              (it.title || "").toLowerCase().includes(q) ||
              (it.description || "").toLowerCase().includes(q) ||
              (it.category || "").toLowerCase().includes(q)
            );
          }
          return items;
        }
      );
    },
    async get(id) {
      return withFallback(
        () => http("GET", `/listings/${encodeURIComponent(id)}`),
        () => LS.read(LS_KEYS.listings).find(l => l.id === id) || null
      );
    },
    async create(listing) {
      return withFallback(
        () => http("POST", "/listings", listing),
        () => {
          const items = LS.read(LS_KEYS.listings);
          const saved = { ...listing, id: LS.uid(), createdAt: new Date().toISOString() };
          items.unshift(saved);
          LS.write(LS_KEYS.listings, items);
          return saved;
        }
      );
    },
    async remove(id) {
      return withFallback(
        () => http("DELETE", `/listings/${encodeURIComponent(id)}`),
        () => {
          const items = LS.read(LS_KEYS.listings).filter(l => l.id !== id);
          LS.write(LS_KEYS.listings, items);
          return { ok: true };
        }
      );
    },
    /** Upload an image file. Server should return { url }. */
    async uploadImage(file) {
      return withFallback(
        () => {
          const fd = new FormData();
          fd.append("file", file);
          return http("POST", "/uploads", fd, { isForm: true });
        },
        () => fileToDataURL(file).then(url => ({ url }))
      );
    },
  };

  /* ============= Baristas (Stage 3) ============= */
  const Baristas = {
    async list(query = "") {
      return withFallback(
        () => http("GET", `/baristas${query ? `?q=${encodeURIComponent(query)}` : ""}`),
        () => {
          let items = LS.read(LS_KEYS.baristas);
          if (query) {
            const q = query.trim().toLowerCase();
            items = items.filter(b =>
              (b.name || "").toLowerCase().includes(q) ||
              (b.city || "").toLowerCase().includes(q) ||
              (b.skills || []).join(" ").toLowerCase().includes(q)
            );
          }
          return items;
        }
      );
    },
    async get(id) {
      return withFallback(
        () => http("GET", `/baristas/${encodeURIComponent(id)}`),
        () => LS.read(LS_KEYS.baristas).find(b => b.id === id) || null
      );
    },
    async create(profile) {
      return withFallback(
        () => http("POST", "/baristas", profile),
        () => {
          const items = LS.read(LS_KEYS.baristas);
          const saved = { ...profile, id: LS.uid(), createdAt: new Date().toISOString() };
          items.unshift(saved);
          LS.write(LS_KEYS.baristas, items);
          return saved;
        }
      );
    },
    async remove(id) {
      return withFallback(
        () => http("DELETE", `/baristas/${encodeURIComponent(id)}`),
        () => {
          const items = LS.read(LS_KEYS.baristas).filter(b => b.id !== id);
          LS.write(LS_KEYS.baristas, items);
          return { ok: true };
        }
      );
    },
    async uploadPhoto(file) {
      return withFallback(
        () => {
          const fd = new FormData();
          fd.append("file", file);
          return http("POST", "/uploads", fd, { isForm: true });
        },
        () => fileToDataURL(file).then(url => ({ url }))
      );
    },
  };

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  global.CoffeeAPI = { CONFIG, Recipes, Listings, Baristas };
})(window);
