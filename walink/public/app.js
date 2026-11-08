(function () {
  var lang = document.body.getAttribute('data-lang') || 'ar';
  // local time rendering
  document.querySelectorAll('time[data-utc]').forEach(function (el) {
    var d = new Date(el.getAttribute('data-utc').replace(' ', 'T') + 'Z');
    if (!isNaN(d)) el.textContent = d.toLocaleString(lang === 'ar' ? 'ar-KW' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  });
  // copy buttons
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var inp = document.querySelector(b.getAttribute('data-copy'));
      var done = function () { var o = b.textContent; b.textContent = b.getAttribute('data-done'); setTimeout(function () { b.textContent = o; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(inp.value).then(done, function () { inp.select(); document.execCommand('copy'); done(); });
      else { inp.select(); document.execCommand('copy'); done(); }
    });
  });
  // confirm dialogs
  document.querySelectorAll('form[data-confirm]').forEach(function (f) {
    f.addEventListener('submit', function (e) { if (!confirm(f.getAttribute('data-confirm'))) e.preventDefault(); });
  });
  // catalog: picking a product scrolls to the form
  document.querySelectorAll('.prod input[type=radio]').forEach(function (r) {
    r.addEventListener('change', function () { var o = document.getElementById('order'); if (o) o.scrollIntoView({ behavior: 'smooth' }); });
  });
  var of = document.getElementById('orderForm');
  if (of) of.addEventListener('submit', function (e) {
    if (!document.querySelector('input[name=product_id]:checked')) { e.preventDefault(); alert(of.getAttribute('data-need')); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    var b = of.querySelector('button'); setTimeout(function () { b.disabled = true; }, 0);
  });
  // order sent: open WhatsApp automatically
  var wa = document.getElementById('waGo');
  if (wa && wa.getAttribute('data-auto')) setTimeout(function () { window.location.href = wa.href; }, 700);
  // product image: resize client-side to <=900px JPEG, store as data URL
  document.querySelectorAll('[data-imgform]').forEach(function (f) {
    var pick = f.querySelector('[data-imgpick]'), hidden = f.querySelector('input[name=image]'), prev = f.querySelector('.preview');
    pick.addEventListener('change', function () {
      var file = pick.files && pick.files[0]; if (!file) return;
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 900, w = img.width, h = img.height, s = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
        var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        hidden.value = c.toDataURL('image/jpeg', 0.82);
        prev.innerHTML = ''; var p = new Image(); p.src = hidden.value; prev.appendChild(p);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  });
})();
