/**
 * CoffeZ — API Client
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
    users:    "cw.users",
    session:  "cw.session",
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
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        // QuotaExceededError: common when storing large images as data URLs.
        // Free space by stripping image payloads from older entries.
        if (Array.isArray(value)) {
          const trimmed = value.map((entry, i) => {
            if (i === 0) return entry; // keep the newest one whole
            const clone = { ...entry };
            if (Array.isArray(clone.images)) clone.images = [];
            if (clone.photo && clone.photo.startsWith && clone.photo.startsWith("data:")) clone.photo = null;
            if (clone.cv && clone.cv.startsWith && clone.cv.startsWith("data:")) clone.cv = null;
            return clone;
          });
          try {
            localStorage.setItem(key, JSON.stringify(trimmed));
            console.warn("LocalStorage quota hit — older media stripped.");
            return;
          } catch {}
        }
        throw new Error("تجاوز حجم التخزين المحلي. فعّل الـ API أو قلل حجم الصور.");
      }
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

  /**
   * Firebase bridge — if firebase-init.js has populated `window.CW_FB`,
   * `fb()` returns it (after auth settles). Otherwise returns null and
   * the caller falls through to HTTP + localStorage.
   */
  async function fb() {
    if (!window.CW_FB) return null;
    try { await window.CW_FB.ready; } catch {}
    return window.CW_FB;
  }

  /* ============= Recipes (Stage 1) ============= */
  const Recipes = {
    async list() {
      const f = await fb();
      if (f) return f.listDocs("recipes", { ownerOnly: true });
      return withFallback(
        () => http("GET", "/recipes"),
        () => LS.read(LS_KEYS.recipes)
      );
    },
    async get(id) {
      const f = await fb();
      if (f) return f.getDocById("recipes", id);
      return withFallback(
        () => http("GET", `/recipes/${encodeURIComponent(id)}`),
        () => LS.read(LS_KEYS.recipes).find(r => r.id === id) || null
      );
    },
    async create(recipe) {
      const f = await fb();
      if (f) return f.createDoc("recipes", recipe);
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
      const f = await fb();
      if (f) return f.deleteDoc("recipes", id);
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
    async list(searchText = "") {
      const f = await fb();
      if (f) return f.listDocs("listings", {
        searchFields: ["title", "description", "category", "city"],
        searchText,
      });
      return withFallback(
        () => http("GET", `/listings${searchText ? `?q=${encodeURIComponent(searchText)}` : ""}`),
        () => {
          let items = LS.read(LS_KEYS.listings);
          if (searchText) {
            const q = searchText.trim().toLowerCase();
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
      const f = await fb();
      if (f) return f.getDocById("listings", id);
      return withFallback(
        () => http("GET", `/listings/${encodeURIComponent(id)}`),
        () => LS.read(LS_KEYS.listings).find(l => l.id === id) || null
      );
    },
    async create(listing) {
      const f = await fb();
      if (f) return f.createDoc("listings", listing);
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
      const f = await fb();
      if (f) return f.deleteDoc("listings", id);
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
    async uploadImage(file, onProgress) {
      const f = await fb();
      if (f) {
        try {
          return await f.uploadImage(file, onProgress);
        } catch (err) {
          // Firebase Storage stuck or unavailable — fall back to embedding
          // a compressed copy directly inside the Firestore document.
          console.warn("Firebase Storage unavailable, embedding compressed image instead:", err?.message);
          const url = await compressImageFile(file, { maxDim: 800, quality: 0.72 });
          return { url, size: bytesOfDataURL(url) };
        }
      }
      return withFallback(
        () => {
          const fd = new FormData();
          fd.append("file", file);
          return http("POST", "/uploads", fd, { isForm: true });
        },
        async () => {
          const url = await compressImageFile(file, { maxDim: 1200, quality: 0.82 });
          return { url, size: bytesOfDataURL(url) };
        }
      );
    },
  };

  /* ============= Baristas (Stage 3) ============= */
  const Baristas = {
    async list(searchText = "") {
      const f = await fb();
      if (f) return f.listDocs("baristas", {
        searchFields: ["name", "city", "bio"],
        searchText,
      });
      return withFallback(
        () => http("GET", `/baristas${searchText ? `?q=${encodeURIComponent(searchText)}` : ""}`),
        () => {
          let items = LS.read(LS_KEYS.baristas);
          if (searchText) {
            const q = searchText.trim().toLowerCase();
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
      const f = await fb();
      if (f) return f.getDocById("baristas", id);
      return withFallback(
        () => http("GET", `/baristas/${encodeURIComponent(id)}`),
        () => LS.read(LS_KEYS.baristas).find(b => b.id === id) || null
      );
    },
    async create(profile) {
      const f = await fb();
      if (f) return f.createDoc("baristas", profile);
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
    async update(id, profile) {
      const f = await fb();
      if (f) return f.updateDoc("baristas", id, profile);
      return withFallback(
        () => http("PATCH", `/baristas/${encodeURIComponent(id)}`, profile),
        () => {
          const items = LS.read(LS_KEYS.baristas);
          const i = items.findIndex(b => b.id === id);
          if (i >= 0) {
            items[i] = { ...items[i], ...profile, updatedAt: new Date().toISOString() };
            LS.write(LS_KEYS.baristas, items);
            return items[i];
          }
          throw new Error("الملف غير موجود");
        }
      );
    },
    async remove(id) {
      const f = await fb();
      if (f) return f.deleteDoc("baristas", id);
      return withFallback(
        () => http("DELETE", `/baristas/${encodeURIComponent(id)}`),
        () => {
          const items = LS.read(LS_KEYS.baristas).filter(b => b.id !== id);
          LS.write(LS_KEYS.baristas, items);
          return { ok: true };
        }
      );
    },
    async uploadPhoto(file, onProgress) {
      const f = await fb();
      if (f) {
        try {
          return await f.uploadPhoto(file, onProgress);
        } catch (err) {
          console.warn("Firebase Storage unavailable, embedding file instead:", err?.message);
          const isImage = file.type && file.type.startsWith("image/");
          if (isImage) {
            // Fall back to a tiny compressed copy inside Firestore
            const url = await compressImageFile(file, { maxDim: 700, quality: 0.72 });
            return { url, size: bytesOfDataURL(url) };
          }
          // PDF fallback: embed if small enough to fit a Firestore doc (~1MB)
          if (file.size && file.size < 700_000) {
            const url = await fileToDataURL(file);
            return { url, size: bytesOfDataURL(url) };
          }
          const sizeKB = file.size ? Math.round(file.size / 1024) : 0;
          throw new Error(`حجم الملف كبير (${sizeKB}KB). Storage لم يستجب — جرّب ملف أصغر أو أعد المحاولة لاحقاً.`);
        }
      }
      return withFallback(
        () => {
          const fd = new FormData();
          fd.append("file", file);
          return http("POST", "/uploads", fd, { isForm: true });
        },
        async () => {
          const isImage = file.type && file.type.startsWith("image/");
          if (isImage) {
            const url = await compressImageFile(file, { maxDim: 800, quality: 0.82 });
            return { url, size: bytesOfDataURL(url) };
          }
          const url = await fileToDataURL(file);
          return { url, size: bytesOfDataURL(url) };
        }
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

  /**
   * Compress an image file client-side before storing it.
   * Downscales to fit within maxDim px on the longer side and re-encodes
   * as JPEG — a typical 4MB phone photo shrinks to ~150KB while still
   * looking good on a listing card. Non-images (PDFs) pass through
   * untouched — those need a real backend to persist.
   */
  async function compressImageFile(file, { maxDim = 1200, quality = 0.82 } = {}) {
    if (!file.type || !file.type.startsWith("image/")) {
      return fileToDataURL(file);
    }
    const dataURL = await fileToDataURL(file);
    const img = await loadImage(dataURL);
    let { naturalWidth: w, naturalHeight: h } = img;
    const scale = Math.min(maxDim / w, maxDim / h, 1);
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    // White background so transparent PNGs don't become black after JPEG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("الصورة غير صالحة"));
      img.src = src;
    });
  }

  function bytesOfDataURL(url) {
    // Rough size in bytes for a data URL (base64 overhead ~4/3).
    if (!url || !url.startsWith("data:")) return 0;
    const base64 = url.split(",")[1] || "";
    return Math.ceil(base64.length * 0.75);
  }

  /* ============= Auth ============= */
  async function sha256(text) {
    const buf = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(LS_KEYS.session) || "null"); }
    catch { return null; }
  }
  function writeSession(session) {
    if (session) sessionStorage.setItem(LS_KEYS.session, JSON.stringify(session));
    else sessionStorage.removeItem(LS_KEYS.session);
  }

  const Auth = {
    current() {
      // Synchronous current-user read. When Firebase is loaded, it has
      // its own user cache that we read through here; otherwise we read
      // the localStorage session.
      if (window.CW_FB?.auth) return window.CW_FB.auth.current();
      return readSession();
    },
    isAuthed() {
      return !!this.current();
    },
    async signUp({ name, email, password }) {
      if (!name || !email || !password) throw new Error("الاسم والبريد وكلمة المرور مطلوبة");
      if (password.length < 6) throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      email = email.trim().toLowerCase();
      const f = await fb();
      if (f) {
        try {
          return await f.auth.signUp({ name: name.trim(), email, password });
        } catch (err) {
          throw new Error(mapFirebaseAuthError(err));
        }
      }
      return withFallback(
        () => http("POST", "/auth/signup", { name, email, password }).then(res => {
          writeSession(res);
          return res;
        }),
        async () => {
          const users = LS.read(LS_KEYS.users);
          if (users.some(u => u.email === email)) {
            throw new Error("هذا البريد مسجّل مسبقاً");
          }
          const passwordHash = await sha256(password);
          const user = { id: LS.uid(), name: name.trim(), email, passwordHash, createdAt: new Date().toISOString() };
          users.push(user);
          LS.write(LS_KEYS.users, users);
          const session = { user: publicUser(user), token: "local" };
          writeSession(session);
          return session;
        }
      );
    },
    async signIn({ email, password }) {
      if (!email || !password) throw new Error("البريد وكلمة المرور مطلوبة");
      email = email.trim().toLowerCase();
      const f = await fb();
      if (f) {
        try {
          return await f.auth.signIn({ email, password });
        } catch (err) {
          throw new Error(mapFirebaseAuthError(err));
        }
      }
      return withFallback(
        () => http("POST", "/auth/signin", { email, password }).then(res => {
          writeSession(res);
          return res;
        }),
        async () => {
          const users = LS.read(LS_KEYS.users);
          const user = users.find(u => u.email === email);
          if (!user) throw new Error("لا يوجد حساب بهذا البريد");
          const hash = await sha256(password);
          if (hash !== user.passwordHash) throw new Error("كلمة المرور غير صحيحة");
          const session = { user: publicUser(user), token: "local" };
          writeSession(session);
          return session;
        }
      );
    },
    async signOut() {
      const f = await fb();
      if (f) return f.auth.signOut();
      try { await http("POST", "/auth/signout"); } catch {}
      writeSession(null);
      return { ok: true };
    },
  };

  function mapFirebaseAuthError(err) {
    const code = err?.code || "";
    return ({
      "auth/email-already-in-use": "هذا البريد مسجّل مسبقاً",
      "auth/invalid-email": "البريد الإلكتروني غير صحيح",
      "auth/weak-password": "كلمة المرور ضعيفة — 6 أحرف على الأقل",
      "auth/user-not-found": "لا يوجد حساب بهذا البريد",
      "auth/wrong-password": "كلمة المرور غير صحيحة",
      "auth/invalid-credential": "بيانات الدخول غير صحيحة",
      "auth/too-many-requests": "محاولات كثيرة — انتظر قليلاً ثم حاول مجدداً",
      "auth/network-request-failed": "تعذّر الاتصال — تحقق من الإنترنت",
    })[code] || err?.message || "حدث خطأ في المصادقة";
  }

  function publicUser(u) {
    return { id: u.id, name: u.name, email: u.email };
  }

  global.CoffeeAPI = { CONFIG, Recipes, Listings, Baristas, Auth };
})(window);
