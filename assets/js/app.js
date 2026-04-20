/**
 * CoffeZ — shared UI utilities.
 */
(function (global) {
  function $(sel, root = document) { return root.querySelector(sel); }
  function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function toast(message, type = "info", timeout = 2800) {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; }, timeout - 300);
    setTimeout(() => el.remove(), timeout);
  }

  function setActiveNav() {
    const page = (document.body.dataset.page || "").trim();
    $$(".nav-links a").forEach(a => {
      if (a.dataset.page === page) a.classList.add("active");
    });
  }

  function wireMenuToggle() {
    const toggle = $(".menu-toggle");
    const list = $(".nav-links");
    if (!toggle || !list) return;
    toggle.addEventListener("click", () => list.classList.toggle("open"));
    $$(".nav-links a").forEach(link =>
      link.addEventListener("click", () => list.classList.remove("open"))
    );
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("ar", {
        year: "numeric", month: "short", day: "numeric"
      });
    } catch { return iso; }
  }

  function escapeHTML(str = "") {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function qs(key, fallback = null) {
    const url = new URL(window.location.href);
    return url.searchParams.get(key) ?? fallback;
  }

  /**
   * Open or download a CV (or any file URL) reliably across browsers.
   * iOS Safari refuses to open `data:application/pdf;…` from plain
   * <a> tags, so we convert such URLs to a Blob URL first.
   */
  function openCV(url, filename) {
    if (!url) return;
    const name = filename || "CV.pdf";
    let finalUrl = url;
    let isBlob = false;

    if (url.startsWith("data:")) {
      try {
        const [meta, base64] = url.split(",");
        const mime = (meta.match(/:(.*?);/) || [])[1] || "application/pdf";
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });
        finalUrl = URL.createObjectURL(blob);
        isBlob = true;
      } catch (err) {
        console.error("CV data URL parse failed:", err);
      }
    }

    const a = document.createElement("a");
    a.href = finalUrl;
    a.target = "_blank";
    a.rel = "noopener";
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();

    if (isBlob) {
      // Revoke after enough time for the tab/open-with dialog to consume it.
      setTimeout(() => URL.revokeObjectURL(finalUrl), 60_000);
    }
  }

  /**
   * Page-wide interceptor: any click on an <a href="data:…"> triggers
   * openCV() automatically, so existing CV links work without per-page
   * wiring. Use a capture listener so it runs before default navigation.
   */
  document.addEventListener("click", (e) => {
    const a = e.target.closest?.('a[href^="data:"]');
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (!href.startsWith("data:")) return;
    e.preventDefault();
    e.stopPropagation();
    const name = a.getAttribute("download") || a.dataset.filename || "file";
    openCV(href, name);
  }, true);

  const ADMIN_EMAILS = [
    "humoud.alhajeri@gmail.com",
    "humoudlahajeri3@gmail.com",
  ].map(e => e.toLowerCase());

  /** Inject "لوحة التحكم" link in the main nav once we know the user is admin. */
  function wireAdminLink() {
    const maybeAddLink = () => {
      const user = window.CoffeeAPI?.Auth?.current?.();
      const email = (user?.user?.email || "").toLowerCase();
      if (!ADMIN_EMAILS.includes(email)) return;
      const navList = document.querySelector(".site-header .nav-links");
      if (!navList) return;
      if (navList.querySelector('a[data-page="admin"]')) return; // already added
      // Determine relative path based on current location
      const inPages = /\/pages\//.test(location.pathname);
      const href = inPages ? "admin.html" : "pages/admin.html";
      const li = document.createElement("li");
      li.innerHTML = `<a href="${href}" data-page="admin">🛡️ الإدارة</a>`;
      navList.appendChild(li);
    };
    maybeAddLink();
    window.addEventListener("cw-auth-changed", maybeAddLink);
    // Firebase auth can resolve slightly after DOMContentLoaded — retry briefly.
    setTimeout(maybeAddLink, 600);
    setTimeout(maybeAddLink, 1800);
  }

  document.addEventListener("DOMContentLoaded", () => {
    setActiveNav();
    wireMenuToggle();
    wireAdminLink();
  });

  global.CW = { $, $$, toast, formatDate, escapeHTML, qs, openCV };
})(window);
