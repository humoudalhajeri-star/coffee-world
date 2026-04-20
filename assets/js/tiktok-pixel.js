/**
 * CoffeZ — TikTok Pixel integration
 *
 * HOW TO ACTIVATE:
 * 1. Go to https://ads.tiktok.com/  →  Assets  →  Events  →  Web Events
 * 2. Create a Pixel (or open your existing one)
 * 3. Copy the Pixel ID (looks like: CXXXXXXXXXXXXXXXXXX)
 * 4. Replace the TIKTOK_PIXEL_ID value below
 * 5. Commit & push — تتبّع يشتغل فوراً
 *
 * Helper API (available globally as window.CW_TRACK):
 *   CW_TRACK("ViewContent",          { content_id, content_type, content_name })
 *   CW_TRACK("CompleteRegistration", { description })
 *   CW_TRACK("SubmitForm",           { description })
 *   CW_TRACK("Contact",              { description })
 *   CW_TRACK("Search",               { query })
 */
(function () {
  // ====== CONFIG — ضع Pixel ID هنا ======
  const TIKTOK_PIXEL_ID = "YOUR_PIXEL_ID_HERE";
  // =====================================

  // Safety: do nothing until user configures a real ID
  const isConfigured = TIKTOK_PIXEL_ID && TIKTOK_PIXEL_ID !== "YOUR_PIXEL_ID_HERE";

  // Always expose a safe helper so call sites don't crash before activation.
  window.CW_TRACK = function (eventName, params) {
    try {
      if (!isConfigured) return;
      if (window.ttq && typeof window.ttq.track === "function") {
        window.ttq.track(eventName, params || {});
      }
    } catch (e) { /* silent */ }
  };

  if (!isConfigured) return;

  // ====== TikTok Pixel base code (official snippet) ======
  !function (w, d, t) {
    w.TiktokAnalyticsObject = t;
    var ttq = w[t] = w[t] || [];
    ttq.methods = ["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
    ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
    for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
    ttq.load = function (e, n) {
      var r = "https://analytics.tiktok.com/i18n/pixel/events.js";
      var o = n && n.partner;
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = r;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[e] = n || {};
      var s = d.createElement("script");
      s.type = "text/javascript";
      s.async = true;
      s.src = r + "?sdkid=" + e + "&lib=" + t;
      var a = d.getElementsByTagName("script")[0];
      a.parentNode.insertBefore(s, a);
    };
    ttq.load(TIKTOK_PIXEL_ID);
    ttq.page();
  }(window, document, "ttq");
})();
