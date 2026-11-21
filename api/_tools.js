/* Deterministic tools for Caser-IA, Wistʼupiku's ordering assistant.
 * The model only PROPOSES tool calls; everything that touches money, hours or orders is computed here,
 * from js/data.js — the same file the website renders. */
"use strict";
const W = require("../js/data.js");

const CAT = W.catalog();
const BY_ID = CAT;
const MAX_LINES = 30;
const ALLERGEN = "No tenemos información de alérgenos publicada; consultá directamente con la sucursal antes de pedir.";

// ---------- text utils ----------
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[ʼ'’]/g, "").replace(/[^a-z0-9½/.\s]/g, " ").replace(/\s+/g, " ").trim();
const words = (s) => norm(s).split(" ").filter(Boolean);
const STOP = new Set("de del la las el los un una unos unas y con para por favor quiero dame me tienen hay algo a al en que mas o un poco porfa quisiera".split(" "));

// local words + English + slang → menu words. Multi-word keys are matched first.
const SYN = {
  "sin carne": "@veg", "vegetariano": "@veg", "vegetariana": "@veg", "veggie": "@veg", "meat free": "@veg", "vegetarian": "@veg",
  "empanada": "@empanada", "empanadas": "@empanada", "wistu": "@empanada", "wistus": "@empanada", "wist": "@empanada",
  "cheese": "queso", "quesuda": "queso", "quesudas": "queso", "chicken": "pollo", "beef": "carne", "meat": "carne",
  "jerky": "charque", "spicy": "picante", "roja": "picante", "blanca": "queso", "hot": "picante",
  "drink": "@drink", "drinks": "@drink", "bebida": "@drink", "bebidas": "@drink", "gaseosa": "@drink", "refresco": "@refresco", "refrescos": "@refresco", "juice": "jugo",
  "coffee": "cafe", "cafecito": "cafe", "tea": "te", "icecream": "helado", "ice cream": "helado", "helados": "helado", "postre": "helado",
  "corn": "maiz", "humita": "huminta", "humitas": "huminta", "saltenas": "saltena", "pasteles": "pastel", "jawitas": "jawita",
  "litro": "1", "1l": "1", "lt": "1", "ltr": "1", "medio": "500", "chico": "500", "grande": "1", "mocochinchi": "pepa",
  "frito": "frita", "fritas": "frita", "horno": "horno", "horneada": "horno", "dulce": "dulce", "breakfast": "@desayuno", "desayuno": "@desayuno",
};

function expand(query) {
  let q = " " + norm(query) + " ";
  const flags = new Set();
  const excl = [];
  // "sin X" drops X (except "sin carne" which is a flag)
  q = q.replace(/ sin carne /g, " @veg ");
  q = q.replace(/ sin ([a-z]+)/g, (_, w) => { excl.push(SYN[w] && !SYN[w].startsWith("@") ? SYN[w] : w); return " "; });
  for (const k of Object.keys(SYN).filter((k) => k.includes(" "))) q = q.split(` ${k} `).join(` ${SYN[k]} `);
  const out = [];
  for (const w of q.split(" ").filter(Boolean)) {
    const s = SYN[w] || w;
    if (s.startsWith("@")) flags.add(s.slice(1));
    else if (!STOP.has(s)) out.push(s);
  }
  return { terms: out, flags, excl };
}

const KIND_RANK = { food: 0, combo: 1, helado: 2, drink: 3 };
const ORDER = {}; W.menu.forEach((c) => c.items.forEach((it) => { ORDER[it.id] = Object.keys(ORDER).length; }));
const itemWords = (it) => words(`${it.name} ${it.cat === "horno" ? "horno empanada" : it.cat === "fritas" ? "frita empanada" : ""}`);
const descWords = (it) => words(it.desc);
const prefixHit = (term, list) => list.some((w) => w === term || (term.length >= 3 && w.startsWith(term)));

function score(it, terms, flags, excl) {
  if (flags.has("veg") && !it.veg) return -1;
  if (flags.has("veg") && /carne|pollo|charque/.test(norm(it.name))) return -1;
  const nw = itemWords(it), dw = descWords(it);
  for (const x of excl) if (prefixHit(x, nw) || prefixHit(x, dw)) return -1;
  let s = 0;
  for (const t of terms) { if (prefixHit(t, nw)) s += 3; else if (!/^\d/.test(t) && prefixHit(t, dw)) s += 1; }
  if (flags.has("empanada") && (it.cat === "horno" || it.cat === "fritas")) s += 2;
  if (flags.has("drink") && it.kind === "drink") s += 2;
  if (flags.has("refresco") && it.cat === "refrescos") s += 2;
  if (flags.has("desayuno") && ["api", "tojori", "pastel-queso", "wistu-queso", "cafe-leche"].includes(it.id)) s += 2;
  if (flags.has("veg") && !terms.length && !flags.has("empanada") && !flags.has("drink")) s += it.kind === "food" ? (it.cat === "horno" || it.cat === "fritas" ? 1.5 : 1) : 0.5;
  return s;
}

function search(query, limit = 8) {
  const { terms, flags, excl } = expand(query);
  const res = [];
  for (const it of Object.values(CAT)) {
    const s = score(it, terms, flags, excl);
    if (s > 0) res.push([s, it]);
  }
  res.sort((a, b) => b[0] - a[0] || KIND_RANK[a[1].kind] - KIND_RANK[b[1].kind] || (ORDER[a[1].id] ?? 999) - (ORDER[b[1].id] ?? 999));
  return res.slice(0, limit).map(([, it]) => it);
}

const priceText = (it) => (it.price == null ? "precio por confirmar en sucursal" : W.money(it.price));
const brief = (it) => ({ id: it.id, name: it.name, price: it.price, price_text: priceText(it), desc: it.desc || undefined, veg: it.veg || undefined, orderable: it.price != null });

/** Resolve free text / id to {item} | {options} | {none}. */
function resolve(ref) {
  if (!ref) return { none: true };
  const r = String(ref).trim();
  if (BY_ID[r]) return { item: BY_ID[r] };
  const n = norm(r);
  const exact = Object.values(CAT).find((it) => norm(it.name) === n);
  if (exact) return { item: exact };
  let hits = search(r, 12);
  if (!hits.length) return { none: true };
  // size narrowing: "1 litro" / "500"
  const { terms } = expand(r);
  const wants1 = terms.includes("1"), wants500 = terms.includes("500");
  if (wants1 || wants500) {
    const f = hits.filter((it) => (wants1 ? /1 litro/.test(it.name) : /500 ml/.test(it.name)));
    if (f.length) hits = f;
  }
  const top = score(hits[0], terms, new Set(), []);
  const best = hits.filter((it) => score(it, terms, new Set(), []) === top);
  if (best.length === 1) return { item: best[0] };
  // prefer the exact base (e.g. "salteña de carne" over "semipicante") only when the extra words aren't asked
  const strict = best.filter((it) => itemWords(it).filter((w) => !STOP.has(w)).length <= terms.length + 1);
  if (strict.length === 1) return { item: strict[0] };
  return { options: best.slice(0, 4) };
}

// ---------- state ----------
function emptyState() {
  return { cart: {}, prevCart: null, order: {}, stage: "browsing", token: null, upsold: false, newsShown: false, history: [], lastOrder: null };
}

function sanitizeState(s) {
  const o = emptyState();
  if (!s || typeof s !== "object") return o;
  const cleanCart = (c) => {
    const out = {};
    if (c && typeof c === "object") {
      for (const [id, q] of Object.entries(c).slice(0, MAX_LINES)) {
        const it = BY_ID[id];
        const n = Math.round(Number(q));
        if (it && it.price != null && n > 0) out[id] = Math.min(50, n);
      }
    }
    return out;
  };
  o.cart = cleanCart(s.cart);
  o.prevCart = s.prevCart ? cleanCart(s.prevCart) : null;
  const ord = s.order && typeof s.order === "object" ? s.order : {};
  const str = (v, n = 160) => (typeof v === "string" ? v.slice(0, n).trim() : undefined);
  o.order = {};
  if (ord.service === "delivery" || ord.service === "pickup") o.order.service = ord.service;
  if (ord.branch && W.branches.some((b) => b.id === ord.branch)) o.order.branch = ord.branch;
  for (const k of ["address", "reference", "name", "notes", "payment"]) { const v = str(ord[k]); if (v) o.order[k] = v; }
  if (ord.when === "asap" || /^([01]\d|2[0-3]):[0-5]\d$/.test(ord.when || "")) o.order.when = ord.when;
  if (ord.location && isFinite(ord.location.lat) && isFinite(ord.location.lng) && Math.abs(ord.location.lat) <= 90 && Math.abs(ord.location.lng) <= 180) {
    o.order.location = { lat: +(+ord.location.lat).toFixed(6), lng: +(+ord.location.lng).toFixed(6) };
  }
  o.stage = ["browsing", "awaiting_confirmation", "placed"].includes(s.stage) ? s.stage : "browsing";
  o.token = typeof s.token === "string" && /^[a-z0-9]{4,16}$/.test(s.token) ? s.token : null;
  if (o.stage === "awaiting_confirmation" && (!o.token || o.token !== tokenFor(o))) { o.stage = "browsing"; o.token = null; }
  o.upsold = !!s.upsold;
  o.newsShown = !!s.newsShown;
  o.history = Array.isArray(s.history) ? s.history.slice(0, 3).map((h) => ({
    id: str(h && h.id, 16), at: str(h && h.at, 30), branch: W.branches.some((b) => b.id === (h && h.branch)) ? h.branch : undefined,
    service: h && (h.service === "delivery" || h.service === "pickup") ? h.service : undefined, cart: cleanCart(h && h.cart),
  })).filter((h) => h.id && Object.keys(h.cart).length) : [];
  if (s.lastOrder && typeof s.lastOrder === "object" && typeof s.lastOrder.id === "string") {
    o.lastOrder = { id: str(s.lastOrder.id, 16), token: str(s.lastOrder.token, 16), at: str(s.lastOrder.at, 30),
      branch: W.branches.some((b) => b.id === s.lastOrder.branch) ? s.lastOrder.branch : undefined, url: typeof s.lastOrder.url === "string" && s.lastOrder.url.startsWith("https://wa.me/") ? s.lastOrder.url.slice(0, 3000) : undefined,
      total: Number.isFinite(+s.lastOrder.total) ? +s.lastOrder.total : undefined };
  }
  return o;
}

function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
function tokenFor(state) {
  const cart = Object.keys(state.cart).sort().map((k) => `${k}:${state.cart[k]}`).join(",");
  const o = state.order || {};
  return fnv(JSON.stringify([cart, o.service, o.branch, o.address, o.reference, o.when, o.name, o.notes, o.payment, o.location && [o.location.lat, o.location.lng]]));
}

const lines = (cart) => Object.entries(cart).map(([id, qty]) => ({ id, name: BY_ID[id].name, qty, price: BY_ID[id].price, subtotal: BY_ID[id].price * qty }));
const total = (cart) => Math.round(lines(cart).reduce((a, l) => a + l.subtotal, 0) * 100) / 100;
const cartView = (cart) => ({ lines: lines(cart), total: total(cart), total_text: W.money(total(cart)), items: Object.values(cart).reduce((a, b) => a + b, 0) });

const branchById = (id) => W.branches.find((b) => b.id === id);
function resolveBranch(ref) {
  if (!ref) return null;
  const n = norm(ref);
  return W.branches.find((b) => b.id === ref) || W.branches.find((b) => norm(b.name) === n) ||
    W.branches.find((b) => norm(`${b.name} ${b.city}`).includes(n) || n.includes(norm(b.name))) || null;
}
const branchInfo = (b, now) => {
  const st = W.branchStatus(b, now);
  return { id: b.id, name: b.name, city: b.city, status: st.state, status_text: st.label, hours: W.hoursText(b), address: b.address || "dirección por confirmar", whatsapp: `+${b.wa}`, airport: !!b.airport };
};

// ---------- deals ----------
function dealHints(state) {
  const hints = [];
  const cart = state.cart;
  const branch = branchById(state.order.branch);
  for (const c of W.combos) {
    if (branch && branch.airport) continue; // not valid at airports (S7)
    const [main, side] = c.parts;
    const separate = c.parts.reduce((a, p) => a + BY_ID[p].price, 0);
    const n = Math.min(...c.parts.map((p) => cart[p] || 0));
    if (n > 0) {
      const after = Math.round((total(cart) - n * (separate - c.price)) * 100) / 100;
      hints.push({ type: "cambiar_a_combo", combo_id: c.id, combo: c.name, veces: n, ahorro: W.money(n * (separate - c.price)), total_si_acepta: after, total_si_acepta_text: W.money(after) });
    } else if ((cart[main] || 0) > 0 && !(cart[side] > 0)) {
      // almost a combo: only ever suggest adding the cheaper side, never another main
      const extra = c.price - BY_ID[main].price;
      const after = Math.round((total(cart) + extra) * 100) / 100;
      hints.push({ type: "casi_combo", combo_id: c.id, combo: c.name, falta: BY_ID[side].name, por_solo: W.money(extra), total_si_acepta: after, total_si_acepta_text: W.money(after) });
    }
  }
  return hints;
}

// ---------- tool schemas (JSON Schema; valid for Anthropic and OpenAI-style) ----------
const S = (props = {}, required = []) => ({ type: "object", properties: props, required, additionalProperties: false });
const TOOLS = [
  { name: "search_menu", description: "Busca en la carta por nombre, ingrediente o tipo (acepta español, inglés y jerga: 'sin carne', 'quesuda', 'refresco de 1 litro'). Devuelve ids, nombres y precios.", input_schema: S({ query: { type: "string" } }, ["query"]) },
  { name: "get_item_details", description: "Precio, descripción, combos que lo incluyen y aviso de alérgenos de un producto.", input_schema: S({ item: { type: "string", description: "id o nombre" } }, ["item"]) },
  { name: "get_whats_new", description: "Lo nuevo y destacado: combos, productos destacados y clásicos.", input_schema: S() },
  { name: "get_branches", description: "Sucursales con estado actual (abierta/cierra pronto/abre a las), horario, dirección y WhatsApp. Filtra por nombre o ciudad.", input_schema: S({ name: { type: "string" }, city: { type: "string", enum: ["Cochabamba", "Santa Cruz", "La Paz", "Sucre"] }, only_open: { type: "boolean" } }) },
  { name: "get_deals", description: "Promos vigentes y sugerencias según el carrito (con total_si_acepta, el total exacto a citar).", input_schema: S() },
  { name: "cart_add", description: "Agrega productos al carrito. Si es ambiguo devuelve opciones.", input_schema: S({ items: { type: "array", items: S({ item: { type: "string" }, qty: { type: "integer", minimum: 1, maximum: 50 }, note: { type: "string" } }, ["item"]) } }, ["items"]) },
  { name: "cart_remove", description: "Quita un producto (o algunas unidades).", input_schema: S({ item: { type: "string" }, qty: { type: "integer", minimum: 1 } }, ["item"]) },
  { name: "cart_set_qty", description: "Fija la cantidad de un producto (0 lo quita).", input_schema: S({ item: { type: "string" }, qty: { type: "integer", minimum: 0, maximum: 50 } }, ["item", "qty"]) },
  { name: "cart_clear", description: "Vacía el carrito.", input_schema: S() },
  { name: "cart_view", description: "Muestra el carrito y el total.", input_schema: S() },
  { name: "cart_undo", description: "Deshace el último cambio del carrito.", input_schema: S() },
  { name: "cart_swap_to_combo", description: "Cambia los productos del carrito por el combo (si están todas o casi todas las partes).", input_schema: S({ combo_id: { type: "string" } }, ["combo_id"]) },
  { name: "suggest_upsell", description: "Una única sugerencia por conversación (completar combo o una bebida).", input_schema: S() },
  { name: "get_my_orders", description: "Mi Pedido: los últimos pedidos de este dispositivo.", input_schema: S() },
  { name: "reorder", description: "Carga un pedido anterior (Mi Pedido) en el carrito.", input_schema: S({ index: { type: "integer", minimum: 0, maximum: 2 } }) },
  { name: "set_order_details", description: "Guarda datos del pedido y devuelve lo que falta. service: delivery|pickup. when: 'asap' o HH:MM de hoy.", input_schema: S({ service: { type: "string", enum: ["delivery", "pickup"] }, branch: { type: "string" }, address: { type: "string" }, reference: { type: "string" }, when: { type: "string" }, name: { type: "string" }, payment: { type: "string" }, notes: { type: "string" } }) },
  { name: "request_location", description: "Entrega con Pin: muestra el botón para compartir ubicación.", input_schema: S() },
  { name: "prepare_order", description: "Verifica el pedido y arma el resumen para confirmar. Luego TERMINÁ el turno y esperá el sí del cliente.", input_schema: S() },
  { name: "place_order", description: "Confirma el pedido SOLO tras un sí explícito a un resumen mostrado antes.", input_schema: S({ token: { type: "string" } }, ["token"]) },
  { name: "get_order_status", description: "Sigue tu Wistu: último pedido y botón para consultar a la sucursal.", input_schema: S() },
  { name: "handoff_to_human", description: "Pasa la conversación a una persona por WhatsApp (reclamos, eventos grandes, alergias, dudas).", input_schema: S({ reason: { type: "string" }, summary: { type: "string" } }, ["reason"]) },
  { name: "show_options", description: "Muestra 2–4 botones de respuesta rápida.", input_schema: S({ options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 } }, ["options"]) },
  { name: "log_miss", description: "Registra algo que el cliente pidió y no tenemos.", input_schema: S({ text: { type: "string" }, reason: { type: "string" } }, ["text"]) },
];

// ---------- execution ----------
/**
 * ctx = { state, now: Date, events: [], allowPlace: bool, tokenAtStart, log: fn }
 * returns a JSON-serialisable result; pushes UI events to ctx.events
 */
function run(name, args, ctx) {
  args = args && typeof args === "object" ? args : {};
  const st = ctx.state;
  const ev = (e) => ctx.events.push(e);
  const touchCart = () => { if (st.stage === "awaiting_confirmation") { st.stage = "browsing"; st.token = null; } ev({ type: "cart", cart: { ...st.cart } }); };
  const snapshot = () => { st.prevCart = { ...st.cart }; };
  const log = ctx.log || (() => {});

  switch (name) {
    case "search_menu": {
      const r = search(String(args.query || "").slice(0, 120));
      if (!r.length) { log({ evt: "caseria_miss", text: args.query, reason: "empty_search" }); return { results: [], note: "Sin resultados en la carta." }; }
      return { results: r.map(brief) };
    }
    case "get_item_details": {
      const r = resolve(args.item);
      if (r.options) return { ambiguous: true, options: r.options.map(brief) };
      if (!r.item) return { error: "no_encontrado" };
      const it = r.item;
      return { ...brief(it), categoria: (W.menu.find((c) => c.id === it.cat) || { name: "Combos" }).name,
        en_combos: W.combos.filter((c) => c.parts.includes(it.id)).map((c) => `${c.name} (${W.money(c.price)}): ${c.note}`),
        clasicos: W.clasicos.filter((c) => c.parts.includes(it.id)).map((c) => c.name),
        nota_precio: "Precio referencial; puede variar por sucursal.", alergenos: ALLERGEN };
    }
    case "get_whats_new": {
      st.newsShown = true;
      return { destacados: W.featured.map((f) => ({ ...brief(BY_ID[f.ref]), tag: f.tag })), nuevos: Object.values(CAT).filter((i) => i.hot).map(brief),
        combos: W.combos.map((c) => ({ id: c.id, name: c.name, price_text: W.money(c.price), incluye: c.note, condiciones: c.rules })),
        clasicos: W.clasicos.map((c) => ({ name: c.name, total_text: W.money(c.parts.reduce((a, p) => a + BY_ID[p].price, 0)), incluye: c.parts.map((p) => BY_ID[p].name) })) };
    }
    case "get_branches": {
      let list = W.branches;
      if (args.city) list = list.filter((b) => b.city === args.city);
      if (args.name) { const b = resolveBranch(args.name); list = b ? [b] : list.filter((x) => norm(x.city).includes(norm(args.name))); }
      let info = list.map((b) => branchInfo(b, ctx.now));
      if (args.only_open) info = info.filter((b) => b.status === "open" || b.status === "closing");
      const open = W.branches.filter((b) => W.branchStatus(b, ctx.now).open).length;
      return { hora_local: W.local(ctx.now).hhmm, abiertas_ahora: `${open} de ${W.branches.length}`, sucursales: info.slice(0, 12), mas: Math.max(0, info.length - 12) };
    }
    case "get_deals": {
      return { combos: W.combos.map((c) => { const sep = c.parts.reduce((a, p) => a + BY_ID[p].price, 0);
        return { id: c.id, name: c.name, price: c.price, price_text: W.money(c.price), incluye: c.note, por_separado: W.money(sep), ahorro: W.money(sep - c.price), condiciones: c.rules }; }),
        hints: dealHints(st), nota: "No hay promos por día de la semana publicadas. Citá total_si_acepta tal cual, no sumes vos." };
    }
    case "cart_add": {
      const added = [], options = [], errors = [];
      const items = Array.isArray(args.items) ? args.items.slice(0, 10) : [];
      const before = { ...st.cart };
      for (const req of items) {
        const r = resolve(req.item);
        if (r.options) { options.push({ pedido: req.item, opciones: r.options.map(brief) }); continue; }
        if (!r.item) { errors.push({ pedido: req.item, error: "no está en la carta" }); log({ evt: "caseria_miss", text: req.item, reason: "cart_add_unknown" }); continue; }
        if (r.item.price == null) { errors.push({ pedido: r.item.name, error: "precio por confirmar: no se puede agregar en línea; pedilo directo a la sucursal" }); continue; }
        if (!st.cart[r.item.id] && Object.keys(st.cart).length >= MAX_LINES) { errors.push({ pedido: r.item.name, error: "carrito lleno" }); continue; }
        const q = Math.max(1, Math.min(50, Math.round(Number(req.qty) || 1)));
        st.cart[r.item.id] = Math.min(50, (st.cart[r.item.id] || 0) + q);
        added.push({ id: r.item.id, name: r.item.name, qty: q, price_text: W.money(r.item.price) });
      }
      if (added.length) { st.prevCart = before; touchCart(); }
      if (options.length) ev({ type: "options", options: options[0].opciones.map((o) => o.name).slice(0, 4) });
      return { added, needs_choice: options, errors, cart: cartView(st.cart) };
    }
    case "cart_remove": {
      const r = resolve(args.item);
      const it = r.item || (r.options && r.options.find((o) => st.cart[o.id]));
      if (!it || !st.cart[it.id]) return { error: "ese producto no está en el carrito", cart: cartView(st.cart) };
      snapshot();
      const q = args.qty ? Math.max(1, Math.round(args.qty)) : st.cart[it.id];
      st.cart[it.id] -= q;
      if (st.cart[it.id] <= 0) delete st.cart[it.id];
      touchCart();
      return { removed: it.name, cart: cartView(st.cart) };
    }
    case "cart_set_qty": {
      const r = resolve(args.item);
      const it = r.item || (r.options && r.options.find((o) => st.cart[o.id]));
      if (!it) return { error: "no encontrado" };
      if (it.price == null) return { error: "precio por confirmar: no se puede pedir en línea" };
      snapshot();
      const q = Math.max(0, Math.min(50, Math.round(Number(args.qty) || 0)));
      if (q === 0) delete st.cart[it.id]; else st.cart[it.id] = q;
      touchCart();
      return { cart: cartView(st.cart) };
    }
    case "cart_clear": snapshot(); st.cart = {}; touchCart(); return { cart: cartView(st.cart) };
    case "cart_view": return { cart: cartView(st.cart) };
    case "cart_undo": {
      if (!st.prevCart) return { error: "no hay nada que deshacer", cart: cartView(st.cart) };
      st.cart = st.prevCart; st.prevCart = null; touchCart();
      return { undone: true, cart: cartView(st.cart) };
    }
    case "cart_swap_to_combo": {
      const c = W.combos.find((x) => x.id === args.combo_id) || W.combos.find((x) => norm(x.name).includes(norm(args.combo_id)));
      if (!c) return { error: "combo no encontrado" };
      const b = branchById(st.order.branch);
      if (b && b.airport) return { error: `${c.name} no es válido en sucursales de aeropuerto.` };
      const [main, side] = c.parts;
      if (!(st.cart[main] > 0)) return { error: `Para el ${c.name} necesitás ${BY_ID[main].name} en el carrito.` };
      snapshot();
      const n = st.cart[side] > 0 ? Math.min(st.cart[main], st.cart[side]) : 1;
      for (const p of c.parts) { if (st.cart[p]) { st.cart[p] -= n; if (st.cart[p] <= 0) delete st.cart[p]; } }
      st.cart[c.id] = (st.cart[c.id] || 0) + n;
      touchCart();
      return { swapped: `${n} × ${c.name}`, nota: "El helado es a elección (canela, leche o mixto): pedile el sabor al cliente y anotalo en notas.", cart: cartView(st.cart) };
    }
    case "suggest_upsell": {
      if (st.upsold) return { none: true, reason: "ya sugerimos algo en esta conversación" };
      if (!Object.keys(st.cart).length) return { none: true };
      st.upsold = true;
      const casi = dealHints(st).find((h) => h.type === "casi_combo");
      if (casi) return { suggestion: casi };
      const hasDrink = Object.keys(st.cart).some((id) => ["drink", "helado"].includes(BY_ID[id].kind) || id === "combo-tradicion");
      if (!hasDrink) {
        const units = Object.values(st.cart).reduce((a, b) => a + b, 0);
        const pick = st.cart["pastel-queso"] ? BY_ID.api : units >= 4 ? BY_ID["tumbo-1l"] : BY_ID.api;
        return { suggestion: { type: "bebida", item: brief(pick), total_si_acepta_text: W.money(total(st.cart) + pick.price) } };
      }
      return { none: true };
    }
    case "get_my_orders":
      return { orders: st.history.map((h, i) => ({ index: i, id: h.id, at: h.at, branch: (branchById(h.branch) || {}).name, service: h.service, ...cartView(h.cart) })) };
    case "reorder": {
      const h = st.history[args.index || 0];
      if (!h) return { error: "no hay pedidos guardados en este dispositivo" };
      snapshot();
      st.cart = { ...h.cart };
      if (h.branch) st.order.branch = h.branch;
      if (h.service) st.order.service = h.service;
      touchCart();
      return { loaded: h.id, cart: cartView(st.cart), branch: (branchById(h.branch) || {}).name, service: h.service };
    }
    case "set_order_details": {
      const errors = [];
      const o = st.order;
      const before = tokenFor(st);
      if (args.service) { if (["delivery", "pickup"].includes(args.service)) o.service = args.service; else errors.push("service debe ser delivery o pickup"); }
      if (args.branch) { const b = resolveBranch(args.branch); if (b) o.branch = b.id; else errors.push(`no existe la sucursal "${args.branch}"`); }
      for (const k of ["address", "reference", "name", "payment", "notes"]) if (typeof args[k] === "string" && args[k].trim()) o[k] = args[k].trim().slice(0, 160);
      if (args.when) {
        const w = String(args.when).trim().toLowerCase();
        const m = w.match(/^(\d{1,2})[:.h]?(\d{2})?$/);
        if (/^(asap|ya|ahora|lo antes posible|ahorita)$/.test(w)) o.when = "asap";
        else if (m && +m[1] < 24 && (!m[2] || +m[2] < 60)) {
          const hhmm = `${m[1].padStart(2, "0")}:${m[2] || "00"}`;
          if (W.toMin(hhmm) <= W.local(ctx.now).min) errors.push(`${hhmm} ya pasó; elegí una hora más tarde o "lo antes posible"`);
          else o.when = hhmm;
        } else errors.push("hora inválida: usá HH:MM o 'asap'");
      }
      const b = branchById(o.branch);
      if (b && o.when && o.when !== "asap" && W.openAt(b, o.when, ctx.now) === false) { errors.push(`${b.name} está cerrada a las ${o.when} (${W.hoursText(b)})`); delete o.when; }
      if (tokenFor(st) !== before && st.stage === "awaiting_confirmation") { st.stage = "browsing"; st.token = null; }
      return { saved: summaryDetails(st), missing: missing(st), errors, airport_note: b && b.airport ? "Combo Tradición no válido en aeropuertos." : undefined };
    }
    case "request_location": ev({ type: "location" }); return { shown: true };
    case "prepare_order": {
      const miss = missing(st);
      if (!Object.keys(st.cart).length) miss.unshift("productos");
      if (miss.length) return { ready: false, missing: miss };
      const b = branchById(st.order.branch);
      const s = W.branchStatus(b, ctx.now);
      if (st.order.when === "asap" && s.state !== "unknown" && !s.open) return { ready: false, error: `${b.name} está cerrada ahora (${s.label}). Ofrecé programar para una hora en que abra u otra sucursal.` };
      if (Object.keys(st.cart).includes("combo-tradicion") && b.airport) return { ready: false, error: "Combo Tradición no es válido en aeropuertos." };
      st.token = tokenFor(st);
      st.stage = "awaiting_confirmation";
      const summary = readback(st, ctx.now);
      ev({ type: "readback", summary });
      return { ready: true, token: st.token, summary, instruccion: "Mostrá el resumen en 1 frase, preguntá si confirma y TERMINÁ el turno. No digas 'confirmado'." };
    }
    case "place_order": {
      if (st.stage === "placed" && st.lastOrder && st.lastOrder.token === args.token) {
        return { already_placed: true, order_id: st.lastOrder.id };
      }
      if (!ctx.allowPlace) return { error: "not_confirmed", instruccion: "Todavía no: mostrá el resumen y esperá que el cliente diga que sí en su próximo mensaje." };
      if (st.stage !== "awaiting_confirmation" || !st.token || st.token !== tokenFor(st) || args.token !== st.token || st.token !== ctx.tokenAtStart) {
        return { error: "token_invalido", instruccion: "El pedido cambió desde el resumen. Volvé a llamar prepare_order." };
      }
      return placeOrder(st, ctx);
    }
    case "get_order_status": {
      const lo = st.lastOrder;
      if (!lo) return { none: true, note: "No hay pedidos hechos desde este dispositivo en esta sesión." };
      const b = branchById(lo.branch);
      const text = `Hola, quisiera saber el estado de mi pedido ${lo.id}.`;
      ev({ type: "handoff", url: W.waLink(b.wa, text), to: b.name });
      return { order_id: lo.id, branch: b.name, at: lo.at, note: "No tenemos seguimiento en vivo: la sucursal te responde por WhatsApp. Mostré el botón." };
    }
    case "handoff_to_human": {
      const b = branchById(st.order.branch);
      const num = b ? b.wa : W.config.callCenter;
      const text = `Hola Wistʼupiku, ${String(args.reason || "tengo una consulta").slice(0, 200)}.${args.summary ? ` ${String(args.summary).slice(0, 400)}` : ""}`;
      ev({ type: "handoff", url: W.waLink(num, text), to: b ? b.name : "Atención Wistʼupiku" });
      return { shown: true, to: b ? b.name : "línea de pedidos Cochabamba" };
    }
    case "show_options": {
      const opts = (Array.isArray(args.options) ? args.options : []).map((s) => String(s).slice(0, 40)).filter(Boolean).slice(0, 4);
      if (opts.length >= 2) ev({ type: "options", options: opts });
      return { shown: opts.length >= 2 };
    }
    case "log_miss": log({ evt: "caseria_miss", text: String(args.text || "").slice(0, 200), reason: String(args.reason || "").slice(0, 100) }); return { logged: true };
    default: return { error: `herramienta desconocida: ${name}` };
  }
}

function missing(st) {
  const o = st.order, m = [];
  if (!o.service) m.push("service (delivery o recojo)");
  if (!o.branch) m.push("branch (sucursal)");
  if (o.service === "delivery" && !o.address && !o.location) m.push("address (dirección o pin)");
  if (!o.when) m.push("when (lo antes posible u hora)");
  if (!o.name) m.push("name (nombre)");
  return m;
}
function summaryDetails(st) {
  const o = st.order, b = branchById(o.branch);
  return { service: o.service, branch: b ? `${b.name} (${b.city})` : undefined, address: o.address, reference: o.reference, pin: !!o.location, when: o.when, name: o.name, payment: o.payment, notes: o.notes };
}
function readback(st, now) {
  const b = branchById(st.order.branch);
  const v = cartView(st.cart);
  return { lines: v.lines.map((l) => ({ qty: l.qty, name: l.name, subtotal_text: W.money(l.subtotal) })), total: v.total, total_text: v.total_text,
    service: st.order.service === "delivery" ? "Delivery" : "Recojo en sucursal", branch: `${b.name} · ${b.city}`, when: st.order.when === "asap" ? "Lo antes posible" : `Hoy a las ${st.order.when}`,
    name: st.order.name, address: st.order.service === "delivery" ? [st.order.address, st.order.reference].filter(Boolean).join(" · ") || "📍 Pin compartido" : undefined,
    notes: st.order.notes, nota_total: "Total referencial; costo de delivery no incluido.", hora: W.local(now).hhmm };
}
function placeOrder(st, ctx) {
  const b = branchById(st.order.branch);
  const v = cartView(st.cart);
  const id = "WP-" + fnv(st.token + b.id).toUpperCase().replace(/[^A-Z0-9]/g, "").padEnd(5, "X").slice(0, 5);
  const o = st.order;
  const pin = o.location ? `https://maps.google.com/?q=${o.location.lat},${o.location.lng}` : undefined;
  const text = W.orderMessage({ orderId: id, service: o.service, branch: `${b.name} (${b.city})`, lines: v.lines, total: v.total, address: o.address, reference: o.reference, pin, when: o.when, name: o.name, payment: o.payment, notes: o.notes });
  const url = W.waLink(b.wa, text);
  const at = new Date(ctx.now).toISOString();
  const entry = { id, at, branch: b.id, service: o.service, cart: { ...st.cart } };
  st.lastOrder = { id, token: st.token, at, branch: b.id, url, total: v.total };
  st.history = [entry, ...st.history.filter((h) => h.id !== id)].slice(0, 3);
  st.stage = "placed";
  ctx.events.push({ type: "order", id, url, branch: b.name, total: v.total_text, entry });
  return { placed: true, order_id: id, branch: b.name, total_text: v.total_text, instruccion: "Decí que toque el botón verde para enviarlo por WhatsApp a la sucursal. No pegues el link." };
}

// ---------- confirmation guard ----------
const YES = /^(si+|sip|sii+|sí+|claro|dale|de una|confirmo|confirmar|confirmado|ok(ay)?|oki|listo|perfecto|bueno|mandalo|mándalo|envialo|envíalo|correcto|asi es|así es|yes|yep|sure|va|vale|ya|sí,? confirmar|si,? confirmar|sí,? confirmo|si,? confirmo|esta bien|está bien|todo bien)[\s!.¡👍✅🙌]*$/i;
const NOPE = /\b(no|pero|cambia|cambiá|cambiar|quita|quitá|quitar|agrega|agregá|agregar|espera|esperá|mejor|aumenta|añade|sin)\b/i;
function isYes(text) {
  const t = String(text || "").trim().toLowerCase().replace(/^(sí|si)[,!.]?\s+(sí|si)(?=[\s,!.]|$)/, "sí");
  if (!t || t.length > 60 || NOPE.test(t)) return false;
  return t.split(/[,.!]\s*/).filter(Boolean).every((part) => YES.test(part.trim())) || YES.test(t);
}

// OpenAI-style tool list
const openaiTools = () => TOOLS.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }));

module.exports = { TOOLS, openaiTools, run, sanitizeState, emptyState, tokenFor, isYes, search, resolve, cartView, dealHints, readback, ALLERGEN };
