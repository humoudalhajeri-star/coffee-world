/**
 * Coffee World — shared UI utilities.
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

  document.addEventListener("DOMContentLoaded", () => {
    setActiveNav();
    wireMenuToggle();
  });

  global.CW = { $, $$, toast, formatDate, escapeHTML, qs };
})(window);
