/**
 * CoffeZ — Visit tracking for the admin analytics dashboard.
 *
 * Strategy: one visit doc per browser per day per top-level section
 * (home / recipe / marketplace / baristas). That keeps Firestore
 * write costs near-zero — a typical visitor creates ≤ 4 docs per day
 * regardless of how many pages they click through.
 *
 * Silent on failure: if Firestore rules reject the write (e.g. the
 * admin hasn't added the /visits rule yet), analytics stays dormant
 * and nothing in the UX breaks.
 *
 * Admin/legal pages are excluded from counts on purpose — we only
 * want to measure real visitor reach.
 */
(function () {
  const STORAGE_KEY = "cw.visitLog";

  function sectionOf(pathname) {
    const p = (pathname || "/").toLowerCase();
    if (p === "/" || p.endsWith("/index.html")) return "home";
    if (p.includes("recipe") || p.includes("cup")) return "recipe";
    if (p.includes("listing") || p.includes("marketplace")) return "marketplace";
    if (p.includes("barista")) return "baristas";
    return "other";
  }

  function shouldSkip(pathname) {
    const p = (pathname || "").toLowerCase();
    return /admin|terms|privacy/.test(p);
  }

  async function logVisit() {
    try {
      if (shouldSkip(location.pathname)) return;

      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const section = sectionOf(location.pathname);
      const dedupeKey = `${today}:${section}`;

      // Read + update the rolling dedupe log (keep last 30 entries).
      let log = [];
      try { log = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch {}
      if (log.includes(dedupeKey)) return;

      // Wait for Firebase to settle.
      if (!window.CW_FB) return;
      try { await window.CW_FB.ready; } catch {}
      if (!window.CW_FB || typeof window.CW_FB.createDoc !== "function") return;

      const ua = navigator.userAgent || "";
      const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);

      await window.CW_FB.createDoc("visits", {
        page: (location.pathname || "/").replace(/\/$/, "") || "/",
        section,
        device: isMobile ? "mobile" : "desktop",
        ref: (document.referrer || "").slice(0, 200) || null,
      });

      log.push(dedupeKey);
      if (log.length > 30) log = log.slice(-30);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    } catch {
      // Silent — analytics must never break the UX.
    }
  }

  if (document.readyState === "complete") setTimeout(logVisit, 500);
  else window.addEventListener("load", () => setTimeout(logVisit, 500));
})();
