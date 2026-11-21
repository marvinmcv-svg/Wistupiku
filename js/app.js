/* Wistʼupiku site: rendering, carousel, cart, WhatsApp funnel, live branch status, Caser-IA chat + voice. */
(function () {
  "use strict";
  const W = window.WISTU;
  const C = W.catalog();
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = W.money;
  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k, d, s = localStorage) { try { const v = s.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v, s = localStorage) { try { s.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const branchById = (id) => W.branches.find((b) => b.id === id);
  const sliceIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15c0-5 4-9 9-9s9 4 9 9H3z"/><path d="M6 15c.5 2 2 3 6 3s5.5-1 6-3M9 10l1 1M14 9l1 1"/></svg>';

  /* ================= cart ================= */
  let cart = sanitizeCart(store.get("wistu.cart", {}));
  const cartSubs = [];
  function sanitizeCart(c) {
    const out = {};
    for (const [id, q] of Object.entries(c || {})) if (C[id] && C[id].price != null && q > 0) out[id] = Math.min(50, Math.round(q));
    return out;
  }
  const cartLines = () => Object.entries(cart).map(([id, qty]) => ({ id, qty, name: C[id].name, price: C[id].price }));
  const cartTotal = () => cartLines().reduce((a, l) => a + l.price * l.qty, 0);
  const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
  function setCart(next, silent) { cart = sanitizeCart(next); store.set("wistu.cart", cart); cartSubs.forEach((f) => f(silent)); }
  function addToCart(id, qty = 1) {
    const it = C[id]; if (!it || it.price == null) return;
    setCart({ ...cart, [id]: (cart[id] || 0) + qty });
    toast(`✓ ${it.name} agregado`);
    const b = $("#cartCount"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
  }
  function changeQty(id, d) { const n = { ...cart }; n[id] = (n[id] || 0) + d; if (n[id] <= 0) delete n[id]; setCart(n); }

  let toastT;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("is-on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("is-on"), 2200); }

  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) { e.preventDefault(); addToCart(add.dataset.add); return; }
    const addMany = e.target.closest("[data-add-many]");
    if (addMany) { e.preventDefault(); const ids = addMany.dataset.addMany.split(","); const n = { ...cart }; ids.forEach((id) => { n[id] = (n[id] || 0) + 1; }); setCart(n); toast(`✓ ${addMany.dataset.name} agregado`); return; }
    if (e.target.closest("[data-cart]")) { e.preventDefault(); openDrawer(); return; }
    if (e.target.closest("[data-chat]")) { e.preventDefault(); openChat(); return; }
    const f = e.target.closest("[data-funnel]");
    if (f) { if (f.dataset.funnel) startFunnel(f.dataset.funnel); closeDrawer(); closeMnav(); }
    const tab = e.target.closest("[data-tab]");
    if (tab) selectTab(tab.dataset.tab);
  });

  /* ================= status helpers ================= */
  const openBranches = () => W.branches.filter((b) => W.branchStatus(b).open);
  function statusPill(b) {
    const s = W.branchStatus(b);
    const label = s.state === "open" ? "Abierto" : s.state === "closing" ? s.label : s.state === "opens" ? s.label : s.state === "closed" ? (s.tomorrow ? s.label : "Cerrado") : "Horario por confirmar";
    return `<span class="st st--${s.state}"><span class="dot"></span>${esc(label)}</span>`;
  }

  /* ================= ticker ================= */
  function renderTicker() {
    const combo = W.combos[0];
    const t = W.local();
    const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const items = [
      `${esc(combo.name)} <b>${money(combo.price)}</b> · empanada de queso + helado, todos los días`,
      `Lo nuevo de la casa: <b>jawita ${money(C.jawita.price)}</b>, la de las alturas`,
      `Hoy ${days[t.day]}: <b>${openBranches().length} de ${W.branches.length}</b> sucursales abiertas ahora`,
      `Pide por <b>WhatsApp</b> a tu sucursal o con <b>Caser-IA ✨</b>`,
    ].map((h) => `<span class="ticker__item">${sliceIcon}<span>${h}</span></span>`).join("");
    $("#ticker").innerHTML = items + items.replace(/<span class="ticker__item">/g, '<span class="ticker__item" aria-hidden="true">');
  }

  /* ================= nav ================= */
  const NAV = [["#promos", "Promos"], ["#combos", "Combo"], ["#carta", "Carta"], ["#pedir", "Pedir"], ["#sucursales", "Sucursales"], ["#historia", "Historia"]];
  function renderNav() {
    const html = NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join("") + '<button class="pill__ai" data-chat>Caser-IA ✨</button>';
    $$(".pill").forEach((p) => { p.innerHTML = html; });
    $("#mnavList").innerHTML = NAV.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("") + '<li><button data-chat>Caser-IA ✨</button></li>';
  }
  const burger = $("#burger"), mnav = $("#mnav");
  function closeMnav() { mnav.hidden = true; burger.setAttribute("aria-expanded", "false"); }
  burger.addEventListener("click", () => { const o = mnav.hidden; mnav.hidden = !o; burger.setAttribute("aria-expanded", String(o)); });
  mnav.addEventListener("click", (e) => { if (e.target.closest("a,button")) closeMnav(); });

  const hdr = $("#hdr");
  function onScroll() {
    const tick = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tick")) || 44;
    hdr.classList.toggle("is-solid", window.scrollY > tick);
    updateMbar();
  }

  /* ================= carousel ================= */
  const hero = $("#hero");
  const slides = $$(".slide", hero);
  let cur = 0, timer = null, paused = false, heroVisible = true;
  const dotsEl = $(".dots", hero);
  dotsEl.innerHTML = slides.map((s, i) => `<button role="tab" aria-label="${esc(s.getAttribute("aria-label"))}" aria-selected="${i === 0}"></button>`).join("");
  const dots = $$("button", dotsEl);
  function go(i) {
    cur = (i + slides.length) % slides.length;
    slides.forEach((s, k) => { const on = k === cur; s.classList.toggle("is-active", on); s.inert = !on; s.setAttribute("aria-hidden", String(!on)); });
    dots.forEach((d, k) => { d.setAttribute("aria-selected", String(k === cur)); d.tabIndex = k === cur ? 0 : -1; });
    const light = slides[cur].dataset.theme === "light";
    hero.classList.toggle("is-light", light);
    hdr.classList.toggle("on-light", light);
    syncHeroVideo();
  }
  function syncHeroVideo() {
    $$("[data-hero-video]").forEach((v) => {
      const on = v.closest(".slide").classList.contains("is-active") && heroVisible && !RM;
      if (on) { v.play().catch(() => {}); } else v.pause();
    });
  }
  function schedule() { clearInterval(timer); if (RM) return; timer = setInterval(() => { if (!paused && !document.hidden) go(cur + 1); }, 6500); }
  dots.forEach((d, i) => d.addEventListener("click", () => { go(i); schedule(); }));
  dotsEl.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { go(cur + (e.key === "ArrowRight" ? 1 : -1)); dots[cur].focus(); schedule(); } });
  hero.addEventListener("mouseenter", () => { paused = true; });
  hero.addEventListener("mouseleave", () => { paused = false; });
  hero.addEventListener("focusin", () => { paused = true; });
  hero.addEventListener("focusout", () => { paused = false; });
  let sx = null;
  hero.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener("touchend", (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) { go(cur + (dx < 0 ? 1 : -1)); schedule(); } sx = null; });
  new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; syncHeroVideo(); }, { threshold: .2 }).observe(hero);
  document.addEventListener("visibilitychange", syncHeroVideo);
  // QR card
  const qr = $("#qrCard");
  if (store.get("wistu.qrHidden", false, sessionStorage)) qr.hidden = true;
  $(".qr__x", qr).addEventListener("click", () => { qr.hidden = true; store.set("wistu.qrHidden", true, sessionStorage); });

  // prices printed from data.js (banner prices match the printed badges)
  $$("[data-price]").forEach((el) => { const it = C[el.dataset.price]; if (it && it.price != null) el.textContent = Number.isInteger(it.price) ? it.price : it.price.toFixed(2).replace(".", ","); });

  /* ================= branch selects ================= */
  function branchOptions(selected, includeCentral) {
    let html = '<option value="">Elige tu sucursal…</option>';
    if (includeCentral) html += `<option value="central"${selected === "central" ? " selected" : ""}>Línea de pedidos · consultas generales</option>`;
    for (const city of W.cities) {
      html += `<optgroup label="${esc(city)}">`;
      for (const b of W.branches.filter((x) => x.city === city)) {
        const s = W.branchStatus(b);
        const lab = s.state === "open" || s.state === "closing" ? "Abierto" : s.state === "unknown" ? "Consultar horario" : s.state === "opens" ? s.label : "Cerrado";
        html += `<option value="${b.id}"${selected === b.id ? " selected" : ""}>${esc(b.name)} · ${esc(lab)}</option>`;
      }
      html += "</optgroup>";
    }
    return html;
  }
  function renderStatusLines() {
    const n = openBranches().length;
    const total = W.branches.length;
    $("#openCount span:last-child").textContent = `${n} de ${total} abiertas`;
    let txt;
    if (n) txt = `<span class="dot dot--live"></span> <b>${n} de ${total}</b>&nbsp;sucursales abiertas ahora`;
    else {
      const t = W.local();
      const todays = W.branches.map((b) => (W.rangesFor(b, t.day) || []).map((r) => r[0]).filter((m) => m > t.min)).flat().sort((a, b) => a - b);
      txt = todays.length ? `<span class="dot"></span> Abrimos hoy a las ${W.fmtMin(todays[0])}` : `<span class="dot"></span> Volvemos mañana desde temprano`;
    }
    $("#obStatus").innerHTML = txt;
    $("#nowPill").innerHTML = `<span class="dot dot--live"></span> ${W.local().hhmm} en Bolivia · <b>${n} de ${total}</b> abiertas`;
  }

  /* ================= order box ================= */
  const obBranch = $("#obBranch");
  obBranch.innerHTML = branchOptions(store.get("wistu.branch", ""));
  $("#orderbox").addEventListener("submit", (e) => {
    e.preventDefault();
    const svc = $('input[name="ob-service"]:checked').value;
    startFunnel(svc, obBranch.value);
  });

  /* ================= discover rail ================= */
  $("#offers").innerHTML = W.offers.map((o) => `<a class="offer" href="${esc(o.href)}" target="_blank" rel="noopener"><img src="${esc(o.img)}" alt="${esc(o.alt)}" width="900" height="1125" loading="lazy"></a>`).join("");
  function railArrows(railId) {
    const rail = document.getElementById(railId === "offers" ? "offers" : "reelsRail");
    const btns = $$(`[data-rail="${railId}"]`);
    const upd = () => btns.forEach((b) => { const d = +b.dataset.dir; b.disabled = d < 0 ? rail.scrollLeft < 8 : rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8; });
    btns.forEach((b) => b.addEventListener("click", () => rail.scrollBy({ left: +b.dataset.dir * rail.clientWidth * .8, behavior: RM ? "auto" : "smooth" })));
    rail.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    upd();
  }

  /* ================= classics ================= */
  function renderClassics() {
    const c = W.combos[0];
    const sep = c.parts.reduce((a, p) => a + C[p].price, 0);
    let html = `<article class="classic classic--promo reveal">
      <div class="classic__img"><img src="assets/hero/slide-combo.webp" alt="${esc(c.name)}: empanada de queso y helado" width="980" height="605" loading="lazy"></div>
      <div class="classic__b"><span class="classic__tag">Promo · todos los días</span><h3>${esc(c.name)}</h3><p>${esc(c.note)}.</p>
      <div class="classic__f"><div><div class="price"><small>Bs</small>${c.price}</div><span class="save">Ahorras ${money(sep - c.price)}</span></div><button class="plus" data-add="${c.id}" aria-label="Agregar ${esc(c.name)}">+</button></div></div></article>`;
    for (const k of W.clasicos) {
      const sum = k.parts.reduce((a, p) => a + C[p].price, 0);
      html += `<article class="classic reveal">
        <div class="classic__img"><img src="${esc(k.img)}" alt="${esc(k.name)}" width="900" height="1125" loading="lazy"></div>
        <div class="classic__b"><span class="classic__tag">Clásico de la casa</span><h3>${esc(k.name)}</h3><p>${esc(k.desc)}</p><p class="classic__parts">${k.parts.map((p) => `${esc(C[p].name)} ${money(C[p].price)}`).join(" + ")}</p>
        <div class="classic__f"><div><div class="price"><small>Bs</small>${sum}</div></div>
        <button class="plus" data-add-many="${k.parts.join(",")}" data-name="${esc(k.name)}" aria-label="Agregar ${esc(k.name)}">+</button></div></div></article>`;
    }
    $("#classics").innerHTML = html;
  }

  /* ================= menu ================= */
  let tab = "horno";
  function renderMenuTabs() {
    $("#menuTabs").innerHTML = W.menu.map((c) => `<button role="tab" aria-selected="${c.id === tab}" data-tab="${c.id}">${esc(c.short)}</button>`).join("");
  }
  function selectTab(id) { if (!W.menu.some((c) => c.id === id)) return; tab = id; renderMenuTabs(); renderMenu(); }
  function renderMenu() {
    const cat = W.menu.find((c) => c.id === tab);
    const list = $("#menuList");
    list.classList.remove("is-all");
    list.innerHTML = cat.items.map((it, i) => {
      const tags = [it.star && '<span class="tag tag--star">La de siempre</span>', it.hot && '<span class="tag tag--hot">Destacada</span>', it.veg && '<span class="tag tag--veg">Sin carne</span>', it.spicy && '<span class="tag tag--spicy">Picante</span>'].filter(Boolean).join("");
      const right = it.price == null ? '<span class="mitem__p--na">Consulta</span>'
        : `<span class="mitem__p">${money(it.price)}</span><button class="plus" data-add="${it.id}" aria-label="Agregar ${esc(it.name)}">+</button>`;
      return `<div class="mitem${i >= 6 ? " is-extra" : ""}"><div class="mitem__n">${esc(it.name)} ${tags}</div>${it.desc ? `<p class="mitem__d">${esc(it.desc)}</p>` : ""}<div class="mitem__r">${right}</div></div>`;
    }).join("");
    const more = $("#menuMore");
    more.hidden = cat.items.length <= 6;
    more.textContent = `Ver las ${cat.items.length} ↓`;
  }
  $("#menuMore").addEventListener("click", () => { $("#menuList").classList.add("is-all"); $("#menuMore").hidden = true; });

  /* ================= combo + featured ================= */
  function renderCombos() {
    const c = W.combos[0];
    $("#comboCard").innerHTML = `<div class="combo__img"><img src="assets/hero/slide-combo.webp" alt="Empanada de queso con helado de canela" width="980" height="605" loading="lazy">
      <div class="combo__badges"><span>Favorito</span><span>Todos los días</span></div></div>
      <div class="combo__b"><p class="eyebrow" style="color:var(--red-deep);margin:0">Promo vigente</p><h3>${esc(c.name)}</h3><p>${esc(c.note)}. Tal como se disfruta desde siempre.</p>
      <div class="combo__f"><span class="combo__price"><small>Bs</small>${c.price}</span><button class="btn btn--dark btn--lg" data-add="${c.id}">Agregar al pedido</button></div>
      <p class="fine" style="opacity:.85;margin:0">${esc(c.rules)}</p></div>`;
    $("#featured").innerHTML = W.featured.map((f) => {
      const it = C[f.ref];
      const media = f.video ? `<video muted playsinline loop preload="none" poster="${esc(f.video)}.webp" data-autoplay aria-label="${esc(f.name)}"><source src="${esc(f.video)}.mp4" type="video/mp4"></video>`
        : `<img src="${esc(f.img)}" alt="${esc(f.name)}" width="900" height="1125" loading="lazy">`;
      return `<article class="feat reveal"><div class="feat__m">${media}</div><div class="feat__b"><span class="feat__tag">${esc(f.tag)}</span><h3>${esc(f.name)}</h3><p>${esc(f.desc)}</p>
        <div class="feat__f"><span class="price"><small>Bs</small>${it.price}</span><button class="plus plus--cream" data-add="${it.id}" aria-label="Agregar ${esc(f.name)}">+</button></div></div></article>`;
    }).join("");
  }

  /* ================= reels ================= */
  function renderReels() {
    $("#reelsRail").innerHTML = W.reels.map((r) => `<a class="reel" href="${esc(r.url)}" target="_blank" rel="noopener" aria-label="${esc(r.caption)} (abre Instagram)">
      <video muted playsinline loop preload="none" poster="${esc(r.src)}.webp" data-autoplay data-thresh=".35"><source src="${esc(r.src)}.mp4" type="video/mp4"></video>
      <span class="reel__cap">${esc(r.caption)}<small>Ver en Instagram ↗</small></span></a>`).join("");
  }
  function wireAutoplay() {
    if (RM) return;
    const io = new IntersectionObserver((ens) => ens.forEach((en) => { const v = en.target; if (en.intersectionRatio >= .35) v.play().catch(() => {}); else v.pause(); }), { threshold: [0, .35, .6] });
    $$("video[data-autoplay]").forEach((v) => io.observe(v));
  }

  /* ================= branches ================= */
  let city = store.get("wistu.city", "Cochabamba");
  function renderCityTabs() {
    $("#cityTabs").innerHTML = W.cities.map((c) => { const n = W.branches.filter((b) => b.city === c); const o = n.filter((b) => W.branchStatus(b).open).length;
      return `<button role="tab" aria-selected="${c === city}" data-city="${esc(c)}">${esc(c)} <small>(${o}/${n.length})</small></button>`; }).join("");
  }
  $("#cityTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-city]"); if (!b) return; city = b.dataset.city; store.set("wistu.city", city); renderCityTabs(); renderBranches(); });
  function renderBranches() {
    $("#branches").innerHTML = W.branches.filter((b) => b.city === city).map((b) => `<article class="branch">
      ${statusPill(b)}<h3>${esc(b.name)}</h3><span class="branch__city">${esc(b.city)}${b.airport ? " · aeropuerto" : ""}</span>
      <p>${esc(W.hoursText(b))}</p>${b.address ? `<p>${esc(b.address)}</p>` : '<p style="opacity:.6">Dirección por confirmar</p>'}
      <div class="branch__links"><a href="${esc(W.mapsUrl(b))}" target="_blank" rel="noopener">Cómo llegar ↗</a>
      <a href="${esc(W.waLink(b.wa, "Hola Wistʼupiku, quiero hacer un pedido 🥟"))}" target="_blank" rel="noopener">WhatsApp +${esc(b.wa)}</a></div></article>`).join("");
  }

  /* ================= feed + footer ================= */
  function renderFeed() { $("#feed").innerHTML = W.feed.map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener"><img src="${esc(f.img)}" alt="${esc(f.alt)}" width="900" height="1125" loading="lazy"></a>`).join(""); }
  function renderFooter() {
    const g = (title, items) => `<details><summary>${title}</summary><ul>${items.join("")}</ul></details>`;
    const prod = W.menu.map((c) => `<li><a href="#carta" data-tab="${c.id}">${esc(c.name)}</a></li>`);
    const promos = [`<li><a href="#combos">${esc(W.combos[0].name)} · ${money(W.combos[0].price)}</a></li>`, ...W.clasicos.map((k) => `<li><a href="#promos">${esc(k.name)}</a></li>`)];
    const orders = [`<li><a href="#pedir" data-funnel="delivery">Delivery por WhatsApp</a></li>`, `<li><a href="#pedir" data-funnel="pickup">Recojo en sucursal</a></li>`, `<li><a href="#pedir" data-funnel="evento">Eventos y refrigerios</a></li>`,
      `<li><a href="${esc(W.config.pedidosya)}" target="_blank" rel="noopener">PedidosYa ↗</a></li>`, `<li><button data-chat>Caser-IA ✨</button></li>`];
    const br = W.cities.map((c) => `<li><a href="#sucursales" data-city-link="${esc(c)}">${esc(c)} <small>· ${W.branches.filter((b) => b.city === c).length} sucursales</small></a></li>`);
    const brand = [`<li><a href="#historia">Nuestra historia</a></li>`, `<li><a href="${esc(W.config.jobs)}" target="_blank" rel="noopener">Trabaja con nosotros ↗</a></li>`, `<li><a href="${esc(W.config.instagram)}" target="_blank" rel="noopener">Instagram ↗</a></li>`, `<li><a href="${esc(W.config.facebook)}" target="_blank" rel="noopener">Facebook ↗</a></li>`];
    const el = $("#ftrGroups");
    el.innerHTML = g("Productos", prod) + g("Promos", promos) + g("Pedidos", orders) + g("Sucursales", br) + g("Wistʼupiku", brand);
    el.addEventListener("toggle", (e) => { if (e.target.open && window.innerWidth > 860) $$("details", el).forEach((d) => { if (d !== e.target) d.open = false; }); }, true);
    document.addEventListener("click", (e) => { if (!e.target.closest("#ftrGroups") && window.innerWidth > 860) $$("#ftrGroups details").forEach((d) => { d.open = false; }); });
    el.addEventListener("click", (e) => { const a = e.target.closest("[data-city-link]"); if (a) { city = a.dataset.cityLink; renderCityTabs(); renderBranches(); } });
    $("#year").textContent = new Date().getFullYear();
  }

  /* ================= drawer ================= */
  const drawer = $("#drawer"), scrim = $("#scrim");
  let lastFocus = null;
  function renderDrawer() {
    const ls = cartLines();
    $("#drawerBody").innerHTML = ls.length ? ls.map((l) => `<div class="dline"><div><b>${esc(l.name)}</b><br><small>${money(l.price)} c/u</small></div>
      <div class="qty"><button data-q="${l.id}" data-d="-1" aria-label="Quitar uno">−</button><span>${l.qty}</span><button data-q="${l.id}" data-d="1" aria-label="Agregar uno">+</button></div></div>`).join("")
      : '<div class="dempty"><b>Tu pedido está vacío</b>Agrega unas wistus desde la carta o pídeselas a Caser-IA ✨</div>';
    $("#drawerTotal").textContent = money(cartTotal());
    $("#drawerGo").hidden = !ls.length;
  }
  $("#drawerBody").addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (b) changeQty(b.dataset.q, +b.dataset.d); });
  function openDrawer() { lastFocus = document.activeElement; renderDrawer(); drawer.hidden = false; scrim.hidden = false; $(".x", drawer).focus(); updateMbar(); }
  function closeDrawer() { if (drawer.hidden) return; drawer.hidden = true; scrim.hidden = true; if (lastFocus) lastFocus.focus(); updateMbar(); }
  $("[data-close]", drawer).addEventListener("click", closeDrawer);
  scrim.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeDrawer(); closeChat(); closeMnav(); } });

  /* ================= funnel ================= */
  const fForm = $("#funnel");
  let step = 1;
  const fBranch = $("#fBranch");
  fBranch.innerHTML = branchOptions(store.get("wistu.branch", ""), true);
  const intent = () => (fForm.querySelector('input[name="intent"]:checked') || {}).value;
  function startFunnel(svc, branch) {
    const r = fForm.querySelector(`input[name="intent"][value="${svc}"]`);
    if (r) r.checked = true;
    if (branch) { fBranch.value = branch; store.set("wistu.branch", branch); }
    showStep(r ? 2 : 1);
    document.getElementById("pedir").scrollIntoView({ behavior: RM ? "auto" : "smooth" });
  }
  function showStep(n) {
    step = n;
    $$(".step", fForm).forEach((s) => s.classList.toggle("is-on", +s.dataset.step === n));
    $$("#steps li").forEach((li, i) => { li.classList.toggle("is-on", i + 1 === n); li.classList.toggle("is-done", i + 1 < n); });
    $("#fBack").hidden = n === 1;
    $("#fNext").hidden = n === 4;
    const it = intent();
    const isOrder = it === "delivery" || it === "pickup";
    $$("[data-for]", fForm).forEach((el) => { const f = el.dataset.for; el.hidden = !(f === it || (f === "order" && isOrder)); });
    $("#fMsg").textContent = "";
    if (n === 2) renderFCart();
    if (n === 4) renderReview();
    updatePhone();
  }
  function renderFCart() {
    const ls = cartLines();
    $("#fCart").innerHTML = ls.length ? ls.map((l) => `<div class="fcart__row"><b>${esc(l.name)}</b><span>${money(l.price * l.qty)}</span>
      <span class="qty"><button type="button" data-q="${l.id}" data-d="-1" aria-label="Quitar uno">−</button>${l.qty}<button type="button" data-q="${l.id}" data-d="1" aria-label="Agregar uno">+</button></span></div>`).join("") + `<div class="fcart__row"><b>Total referencial</b><span><b>${money(cartTotal())}</b></span></div>`
      : '<p class="fcart__empty">Aún no agregaste nada. Elige desde la carta 👇</p>';
  }
  $("#fCart").addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (b) changeQty(b.dataset.q, +b.dataset.d); });
  $("#picker").innerHTML = `<div class="picker__grid">${W.menu.flatMap((c) => c.items.filter((i) => i.price != null)).concat(W.combos).map((i) => `<button type="button" data-add="${i.id}">${esc(i.name)}<small>${money(i.price)}</small></button>`).join("")}</div>`;
  function fData() { return Object.fromEntries(new FormData(fForm).entries()); }
  function buildMessage() {
    const d = fData(), it = intent();
    const b = branchById(d.branch);
    const when = d.whenMode === "later" && d.whenTime ? `Hoy a las ${d.whenTime}` : "asap";
    if (it === "evento") return W.orderMessage({ service: "Evento / refrigerio", branch: b ? `${b.name} (${b.city})` : undefined, extra: `*Fecha:* ${d.evDate || "-"}\n*Personas:* ${d.evPeople || "-"}\n*Ocasión:* ${d.evOccasion || "-"}`, name: d.name, notes: d.notes });
    if (it === "consulta") return `¡Hola Wistʼupiku! 🥟 Tengo una consulta:\n${d.question || ""}${d.name ? `\n\n— ${d.name}` : ""}`;
    return W.orderMessage({ service: it, branch: b ? `${b.name} (${b.city})` : undefined, lines: cartLines(), total: cartTotal(), address: d.address, reference: d.reference, when, name: d.name, notes: d.notes });
  }
  function targetNumber() { const b = branchById(fData().branch); return b ? b.wa : W.config.callCenter; }
  function updatePhone() {
    const b = branchById(fData().branch);
    $("#phName").textContent = b ? `Wistʼupiku ${b.name}` : "Wistʼupiku";
    $("#phMsg").textContent = buildMessage();
  }
  fForm.addEventListener("input", (e) => {
    if (e.target.name === "whenMode") $(".chip__time", fForm).hidden = e.target.value !== "later";
    if (e.target.name === "branch") store.set("wistu.branch", e.target.value);
    if (e.target.name === "intent") setTimeout(() => showStep(2), 150);
    updatePhone();
  });
  function validate(n) {
    const d = fData(), it = intent();
    if (n === 1 && !it) return "Elige qué necesitas.";
    if (n === 2 && (it === "delivery" || it === "pickup") && !cartCount()) return "Agrega al menos un producto.";
    if (n === 2 && it === "consulta" && !(d.question || "").trim()) return "Escribe tu consulta.";
    if (n === 3) {
      if (!(d.name || "").trim()) return "¿Cómo te llamas?";
      if (!d.branch) return "Elige la sucursal.";
      if (it === "delivery" && !(d.address || "").trim()) return "Necesitamos tu dirección.";
      const b = branchById(d.branch);
      if (b && d.whenMode === "later") {
        if (!d.whenTime) return "Elige la hora.";
        if (W.toMin(d.whenTime) <= W.local().min) return "Esa hora ya pasó.";
        if (W.openAt(b, d.whenTime) === false) return `${b.name} está cerrada a esa hora (${W.hoursText(b)}).`;
      }
      if (b && it !== "evento" && it !== "consulta" && d.whenMode !== "later" && W.branchStatus(b).state === "closed") return `${b.name} está cerrada ahora. Programa una hora o elige otra sucursal.`;
      if (b && b.airport && cart["combo-tradicion"]) return "El Combo Tradición no es válido en sucursales de aeropuerto.";
    }
    return "";
  }
  $("#fNext").addEventListener("click", () => { const err = validate(step); if (err) { $("#fMsg").textContent = err; return; } showStep(Math.min(4, step + 1)); });
  $("#fBack").addEventListener("click", () => showStep(Math.max(1, step - 1)));
  function renderReview() {
    const msg = buildMessage();
    $("#review").textContent = msg;
    $("#waSend").href = W.waLink(targetNumber(), msg);
    const b = branchById(fData().branch);
    $("#waSend").lastChild.textContent = b ? `Enviar por WhatsApp a ${b.name}` : "Enviar por WhatsApp";
  }

  /* ================= mobile bar + fab ================= */
  const mbar = $("#mbar"), fab = $("#fab");
  function inView(el) { if (!el) return false; const r = el.getBoundingClientRect(); return r.top < innerHeight * .75 && r.bottom > innerHeight * .25; }
  function updateMbar() {
    const chatOpen = !$("#chat").hidden;
    const hide = inView(hero) || inView($("#pedir")) || inView($(".ftr")) || chatOpen || !drawer.hidden;
    mbar.classList.toggle("is-hidden", hide);
    const ftrOn = $(".ftr").getBoundingClientRect().top < innerHeight;
    fab.classList.toggle("is-hidden", ftrOn || chatOpen);
    const n = cartCount();
    const mc = $("#mbarCart"); mc.hidden = !n; mc.textContent = `🛍 ${n} · ${money(cartTotal())}`;
  }

  /* ================= cart subscribers ================= */
  cartSubs.push(() => {
    const n = cartCount(), b = $("#cartCount");
    b.hidden = !n; b.textContent = n;
    if (!drawer.hidden) renderDrawer();
    if (step === 2) renderFCart();
    updatePhone(); updateMbar();
  });

  /* ================= reveal ================= */
  function wireReveal() {
    if (RM || !("IntersectionObserver" in window)) { $$(".reveal").forEach((e) => e.classList.add("is-in")); return; }
    const io = new IntersectionObserver((ens) => ens.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } }), { threshold: .12 });
    $$(".reveal").forEach((e) => io.observe(e));
  }

  /* =====================================================================
   * Caser-IA chat
   * ===================================================================== */
  const chat = $("#chat"), log = $("#chatLog"), input = $("#chatText");
  const SS = sessionStorage;
  let msgs = store.get("wistu.chat.msgs", [], SS);
  let aState = store.get("wistu.chat.state", null, SS) || { cart: {}, order: {}, stage: "browsing", history: [] };
  let busy = false;
  const personaUsed = [];
  const miPedido = () => store.get("wistu.mipedido", []);

  function md(t) {
    const lines = esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|$|[.,!?])/g, "$1<b>$2</b>").split(/\n/);
    let html = "", inList = false;
    for (const l of lines) {
      const m = l.match(/^\s*(?:[-•]|\d+[.)])\s+(.*)/);
      if (m) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${m[1]}</li>`; continue; }
      if (inList) { html += "</ul>"; inList = false; }
      if (l.trim()) html += `<p>${l}</p>`;
    }
    return html + (inList ? "</ul>" : "");
  }
  const scrollLog = () => { log.scrollTop = log.scrollHeight; };
  function bubble(role, text) { const d = document.createElement("div"); d.className = `msg msg--${role}`; d.innerHTML = role === "bot" ? md(text) : esc(text); log.appendChild(d); scrollLog(); return d; }
  function renderLog() {
    log.innerHTML = "";
    if (!msgs.length) bubble("bot", "¡Hola, case! Soy **Caser-IA** ✨ Te ayudo a pedir tus wistus, ver promos o encontrar la sucursal más cercana. ¿Qué se te antoja?");
    msgs.forEach((m) => bubble(m.role === "user" ? "user" : "bot", m.content));
    renderStarters();
  }
  function renderStarters() {
    const s = ["¿Qué promo hay hoy?", "Quiero unas wistus", "¿Qué sucursales están abiertas?", "Opciones sin carne"];
    if (miPedido().length) s.unshift("🥟 Lo de siempre");
    $("#starters").innerHTML = msgs.length ? "" : s.map((x) => `<button type="button">${esc(x)}</button>`).join("");
  }
  $("#starters").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) send(b.textContent); });
  function openChat() {
    lastFocus = document.activeElement;
    chat.hidden = false; document.body.classList.add("chat-open");
    if (!log.children.length) renderLog();
    closeMnav(); updateMbar();
    setTimeout(() => input.focus(), 50);
  }
  function closeChat() { if (chat.hidden) return; chat.hidden = true; document.body.classList.remove("chat-open"); stopVoice(); updateMbar(); if (lastFocus) lastFocus.focus(); }
  $("[data-close]", chat).addEventListener("click", closeChat);
  $("#chatForm").addEventListener("submit", (e) => { e.preventDefault(); const t = input.value.trim(); if (t) send(t); });

  function chipsEl(options) {
    const d = document.createElement("div"); d.className = "qr-chips";
    d.innerHTML = options.slice(0, 4).map((o) => `<button type="button">${esc(o)}</button>`).join("");
    d.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b && !busy) { d.remove(); send(b.textContent); } });
    log.appendChild(d); scrollLog();
  }
  function cartCard(existing) {
    const ls = cartLines();
    const d = existing || document.createElement("div");
    d.className = "card";
    d.innerHTML = `<h4>🛍 Tu pedido</h4>${ls.map((l) => `<div class="card__row"><span>${l.qty} × ${esc(l.name)}</span><span>${money(l.price * l.qty)}</span></div>`).join("") || "<div>Vacío</div>"}
      <div class="card__row card__tot"><span>Total referencial</span><span>${money(cartTotal())}</span></div><button class="btn btn--outline" type="button" data-cart>Ver pedido</button>`;
    if (!existing) { log.appendChild(d); scrollLog(); }
    return d;
  }
  function readbackCard(s) {
    const d = document.createElement("div"); d.className = "card card--receipt";
    d.innerHTML = `<h4>🧾 Revisa tu pedido</h4>${s.lines.map((l) => `<div class="card__row"><span>${l.qty} × ${esc(l.name)}</span><span>${esc(l.subtotal_text)}</span></div>`).join("")}
      <div class="card__row card__tot"><span>Total</span><span>${esc(s.total_text)}</span></div>
      <div class="card__row"><span>${esc(s.service)}</span><span>${esc(s.branch)}</span></div>
      ${s.address ? `<div class="card__row"><span>Dirección</span><span>${esc(s.address)}</span></div>` : ""}
      <div class="card__row"><span>Cuándo</span><span>${esc(s.when)}</span></div><div class="card__row"><span>Nombre</span><span>${esc(s.name)}</span></div>
      <small style="opacity:.7">${esc(s.nota_total)}</small>`;
    log.appendChild(d); scrollLog();
  }
  const safeWa = (u) => typeof u === "string" && u.startsWith("https://wa.me/");
  function orderCard(e) {
    if (!safeWa(e.url)) return;
    const d = document.createElement("div"); d.className = "card card--order";
    d.innerHTML = `<h4>✅ Pedido ${esc(e.id)} listo</h4><div>${esc(e.branch)} · ${esc(e.total)}</div>
      <a class="btn btn--wa btn--block" href="${esc(e.url)}" target="_blank" rel="noopener">Enviar pedido por WhatsApp a ${esc(e.branch)}</a>`;
    log.appendChild(d); scrollLog();
    if (e.entry) { const h = miPedido().filter((x) => x.id !== e.entry.id); h.unshift(e.entry); store.set("wistu.mipedido", h.slice(0, 3)); }
  }
  function handoffCard(e) {
    if (!safeWa(e.url)) return;
    const d = document.createElement("div"); d.className = "card";
    d.innerHTML = `<h4>💬 Hablar con una persona</h4><a class="btn btn--wa btn--block" href="${esc(e.url)}" target="_blank" rel="noopener">WhatsApp · ${esc(e.to)}</a>`;
    log.appendChild(d); scrollLog();
  }
  function locationCard() {
    const d = document.createElement("div"); d.className = "card";
    d.innerHTML = `<h4>📍 Entrega con Pin</h4><div>Comparte tu ubicación y la sucursal recibe el pin exacto.</div><button class="btn btn--dark btn--block" type="button">📍 Compartir mi ubicación</button>`;
    $("button", d).addEventListener("click", () => {
      if (!navigator.geolocation) { toast("Tu navegador no comparte ubicación"); return; }
      navigator.geolocation.getCurrentPosition((p) => {
        aState.order = aState.order || {};
        aState.order.location = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) };
        store.set("wistu.chat.state", aState, SS);
        d.remove(); send("📍 Ubicación compartida");
      }, () => toast("No pudimos obtener tu ubicación"), { enableHighAccuracy: true, timeout: 12000 });
    });
    log.appendChild(d); scrollLog();
  }
  function errorBubble(kind) {
    const t = kind === "setup" ? "Caser-IA se está alistando 🛠️ Muy pronto podrás pedirme tus wistus. Mientras tanto:" : kind === "rate" ? "Muchas preguntas seguidas, case. Espera un minutito 🙏" : "Se cortó la conexión. Intenta de nuevo:";
    const d = bubble("bot", t);
    d.insertAdjacentHTML("beforeend", '<p><a href="#carta">Ver la carta</a> · <a href="#pedir" data-funnel>Pedir por WhatsApp</a></p>');
    d.addEventListener("click", (e) => { if (e.target.closest("a")) closeChat(); });
  }

  async function send(text, channel) {
    if (busy) return;
    text = String(text).slice(0, 600);
    input.value = "";
    $("#starters").innerHTML = "";
    stopSpeaking();
    msgs.push({ role: "user", content: text });
    bubble("user", text);
    busy = true;
    const bot = document.createElement("div"); bot.className = "msg msg--bot"; bot.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; log.appendChild(bot); scrollLog();
    setVoice(channel === "voice" ? "thinking" : voiceState);
    aState.cart = { ...cart };
    aState.history = miPedido();
    let full = "", cartCardEl = null;
    try {
      const res = await fetch("/api/caseria", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs.slice(-16), state: aState, channel: channel || "text", persona_used: personaUsed }) });
      if (!res.ok) {
        bot.remove(); msgs.pop();
        errorBubble([503, 404, 501, 405].includes(res.status) ? "setup" : res.status === 429 ? "rate" : "net");
        return;
      }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i); buf = buf.slice(i + 1);
          if (!line.trim()) continue;
          let ev; try { ev = JSON.parse(line); } catch { continue; }
          if (ev.type === "text") { full += ev.text; bot.innerHTML = md(full); scrollLog(); }
          else if (ev.type === "cart") { setCart(ev.cart, true); cartCardEl = cartCard(cartCardEl); }
          else if (ev.type === "options") chipsEl(ev.options || []);
          else if (ev.type === "readback") readbackCard(ev.summary);
          else if (ev.type === "location") locationCard();
          else if (ev.type === "order") orderCard(ev);
          else if (ev.type === "handoff") handoffCard(ev);
          else if (ev.type === "state") { aState = ev.state; store.set("wistu.chat.state", aState, SS); }
          else if (ev.type === "error") { if (!full) { bot.remove(); msgs.pop(); } errorBubble(ev.kind === "rate" ? "rate" : "net"); }
        }
      }
      if (full.trim()) msgs.push({ role: "assistant", content: full });
      else if (bot.isConnected && bot.querySelector(".typing")) bot.remove();
      msgs = msgs.slice(-20);
      store.set("wistu.chat.msgs", msgs, SS);
      if (channel === "voice" && full.trim()) speak(full); else if (voiceState !== "idle") setVoice("idle");
    } catch (err) {
      if (bot.isConnected) bot.remove();
      if (!full) msgs.pop();
      errorBubble("net");
      setVoice("idle");
    } finally { busy = false; scrollLog(); }
  }

  /* ================= voice (Web Speech API) ================= */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, voiceState = "idle", wakeLock = null, voiceOn = false;
  const mic = $("#mic"), vbar = $("#voicebar"), vstat = $("#voiceStatus"), hands = $("#handsfree");
  const VLABEL = { idle: "Toca el micrófono y habla", listening: "Escuchando…", thinking: "Pensando…", speaking: "Hablando… toca para interrumpir" };
  function setVoice(s) { voiceState = s; if (!SR) return; mic.className = `mic${s !== "idle" ? ` is-${s}` : ""}`; vstat.textContent = VLABEL[s]; mic.setAttribute("aria-label", s === "listening" ? "Detener" : s === "speaking" ? "Interrumpir" : "Hablar"); }
  async function lock() { try { if ("wakeLock" in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request("screen"); } catch {} }
  function unlock() { try { if (wakeLock) wakeLock.release(); } catch {} wakeLock = null; }
  function listen() {
    if (!SR || busy) return;
    stopSpeaking();
    rec = new SR();
    rec.lang = "es-BO"; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => { let t = ""; for (const r of e.results) { t += r[0].transcript; if (r.isFinal) finalText = t; } input.value = t; };
    rec.onerror = (e) => { setVoice("idle"); if (e.error === "not-allowed" || e.error === "service-not-allowed") { toast("Sin permiso de micrófono: escríbeme nomás 🙂"); voiceOn = false; } else if (e.error === "language-not-supported") { rec.lang = "es-419"; } };
    rec.onend = () => { rec = null; const t = (finalText || input.value).trim(); if (t && voiceState === "listening") send(t, "voice"); else if (voiceState === "listening") setVoice("idle"); };
    try { rec.start(); voiceOn = true; lock(); setVoice("listening"); } catch { setVoice("idle"); }
  }
  function stopListening() { if (rec) { try { rec.abort(); } catch {} rec = null; } }
  function stopVoice() { stopListening(); stopSpeaking(); setVoice("idle"); unlock(); voiceOn = false; }
  function stopSpeaking() { if ("speechSynthesis" in window) speechSynthesis.cancel(); }
  function voiceFor() {
    const vs = speechSynthesis.getVoices();
    return vs.find((v) => /es[-_]BO/i.test(v.lang)) || vs.find((v) => /es[-_](419|US|MX|AR|PE|CL|CO)/i.test(v.lang)) || vs.find((v) => /^es/i.test(v.lang));
  }
  function speakable(t) {
    return t.replace(/\*\*?/g, "").replace(/https?:\/\/\S+/g, "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}✨]/gu, "")
      .replace(/Bs\.?\s?(\d+)(?:[.,](\d{1,2}))?/g, (_, a, b) => `${a}${b ? ` con ${b}` : ""} bolivianos`)
      .replace(/(\d{1,2}):(\d{2})/g, (_, h, m) => (m === "00" ? `${+h} en punto` : `${+h} y ${+m}`)).replace(/\s+/g, " ").trim();
  }
  function speak(text) {
    if (!("speechSynthesis" in window)) { setVoice("idle"); return; }
    const u = new SpeechSynthesisUtterance(speakable(text));
    const v = voiceFor(); if (v) u.voice = v;
    u.lang = v ? v.lang : "es-419"; u.rate = 1.05;
    u.onend = () => { if (voiceState !== "speaking") return; setVoice("idle"); if (hands.checked && !chat.hidden) setTimeout(listen, 250); else unlock(); };
    setVoice("speaking");
    speechSynthesis.speak(u);
  }
  if (SR) {
    mic.hidden = false; vbar.hidden = false;
    mic.addEventListener("click", () => { if (voiceState === "listening") { const t = input.value.trim(); setVoice("thinking"); stopListening(); if (t) send(t, "voice"); else setVoice("idle"); } else listen(); });
    if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => {};
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) { stopListening(); if (voiceState === "listening") setVoice("idle"); } });

  /* ================= init ================= */
  function refreshLive() { renderTicker(); renderStatusLines(); renderCityTabs(); renderBranches(); obBranch.innerHTML = branchOptions(obBranch.value || store.get("wistu.branch", "")); fBranch.innerHTML = branchOptions(fBranch.value || store.get("wistu.branch", ""), true); }
  renderNav();
  go(0); schedule();
  renderClassics(); renderMenuTabs(); renderMenu(); renderCombos(); renderReels(); renderFeed(); renderFooter();
  refreshLive();
  setInterval(refreshLive, 60e3);
  railArrows("offers"); railArrows("reels");
  wireAutoplay(); wireReveal();
  cartSubs.forEach((f) => f(true));
  showStep(1);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateMbar);
  onScroll();
})();
