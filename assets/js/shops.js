/**
 * CoffeZ — Shops signup form.
 * Writes to Firestore /shopRequests for the admin to review.
 */
(function () {
  const { $, toast } = window.CW;

  const form       = $("#shop-form");
  const successBox = $("#shop-form-success");

  async function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {
      ownerName:    (fd.get("ownerName")    || "").toString().trim(),
      shopName:     (fd.get("shopName")     || "").toString().trim(),
      category:     (fd.get("category")     || "").toString(),
      country:      (fd.get("country")      || "").toString(),
      city:         (fd.get("city")         || "").toString().trim(),
      phone:        (fd.get("phone")        || "").toString().trim(),
      instagram:    (fd.get("instagram")    || "").toString().trim().replace(/^@/, ""),
      productCount: (fd.get("productCount") || "").toString(),
      notes:        (fd.get("notes")        || "").toString().trim(),
      status:       "pending",
    };

    if (!data.ownerName || !data.shopName || !data.phone || !data.category || !data.country) {
      toast("الحقول المعلّمة بـ * إجبارية", "error");
      return;
    }

    const btn = form.querySelector("button[type=submit]");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "⏳ جارٍ الإرسال...";

    try {
      if (!window.CW_FB) throw new Error("قاعدة البيانات غير متوفرة — حاول مرة أخرى");
      try { await window.CW_FB.ready; } catch {}
      await window.CW_FB.createDoc("shopRequests", data);

      // TikTok conversion event — this is a high-value action.
      window.CW_TRACK?.("CompleteRegistration", { description: "shop_signup" });
      window.CW_TRACK?.("Lead", { description: "merchant_partner" });

      form.hidden = true;
      successBox.hidden = false;
      successBox.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      console.error("Shop signup failed:", err);
      toast("تعذّر الإرسال — جرّب مرة ثانية أو راسلنا على Founder@coffez.net", "error", 4500);
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    form?.addEventListener("submit", handleSubmit);
  });
})();
