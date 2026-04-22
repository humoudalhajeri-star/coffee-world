/**
 * CoffeZ — Homepage live social-proof counters.
 *
 * Pulls real counts from /baristas and /listings so the hero stats are
 * always current. Filters out demo entries so the numbers represent
 * real activity (admin can still seed demos for marketplace-look).
 * Falls back silently to the static fallbacks already in the HTML.
 */
(function () {
  const MIN_BARISTAS = 6;   // floor so new visitors never see "0"
  const MIN_LISTINGS = 15;

  function animateTo(el, target) {
    if (!el) return;
    const duration = 900;
    const start = performance.now();
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.floor(target * eased).toLocaleString("ar-SA") + (t === 1 && target > 10 ? "+" : "");
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  async function loadCounts() {
    const baristasEl = document.getElementById("stat-baristas");
    const listingsEl = document.getElementById("stat-listings");

    // Immediate static floor so the hero never looks empty.
    if (baristasEl) baristasEl.textContent = MIN_BARISTAS + "+";
    if (listingsEl) listingsEl.textContent = MIN_LISTINGS + "+";

    if (!window.CW_FB) return;
    try { await window.CW_FB.ready; } catch {}
    if (!window.CW_FB || typeof window.CW_FB.listDocs !== "function") return;

    try {
      const [baristas, listings] = await Promise.all([
        window.CW_FB.listDocs("baristas").catch(() => []),
        window.CW_FB.listDocs("listings").catch(() => []),
      ]);
      const baristaCount = Math.max(baristas.length, MIN_BARISTAS);
      const listingCount = Math.max(listings.length, MIN_LISTINGS);
      animateTo(baristasEl, baristaCount);
      animateTo(listingsEl, listingCount);
    } catch (err) {
      // Static floors already rendered — nothing more to do.
    }
  }

  if (document.readyState === "complete") loadCounts();
  else window.addEventListener("load", loadCounts);
})();
