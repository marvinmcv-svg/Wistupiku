/* Caser-IA endpoint: tool-calling agent loop, streams NDJSON events.
 * POST { messages:[{role,content}], state, channel:"text"|"voice" }
 * Provider: CASERIA_PROVIDER forces one; else NVIDIA if NVIDIA_API_KEY, else Anthropic if ANTHROPIC_API_KEY. */
"use strict";
const T = require("./_tools.js");
const { STATIC, liveContext } = require("./_prompt.js");
const persona = require("./_persona.js");

const MAX_ROUNDS = 6;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60e3);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 15;
}

function pickProvider() {
  const forced = (process.env.CASERIA_PROVIDER || "").toLowerCase();
  if (forced === "nvidia" && process.env.NVIDIA_API_KEY) return "nvidia";
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (forced) return null;
  if (process.env.NVIDIA_API_KEY) return "nvidia";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

function cleanMessages(raw) {
  const msgs = (Array.isArray(raw) ? raw : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1200) }));
  const out = [];
  for (const m of msgs) {
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += "\n" + m.content;
    else out.push({ ...m });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") { res.statusCode = 405; res.setHeader("Allow", "POST"); return res.end(JSON.stringify({ error: "method_not_allowed" })); }
  const provider = pickProvider();
  if (!provider) { res.statusCode = 503; res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ error: "not_configured" })); }
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  if (rateLimited(ip)) { res.statusCode = 429; res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ error: "rate_limited" })); }

  let body;
  try { body = await readBody(req); } catch { res.statusCode = 400; return res.end(JSON.stringify({ error: "bad_json" })); }
  const messages = cleanMessages(body.messages);
  if (!messages.length || messages[messages.length - 1].role !== "user") { res.statusCode = 400; return res.end(JSON.stringify({ error: "no_message" })); }
  const channel = body.channel === "voice" ? "voice" : "text";

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Accel-Buffering", "no");
  const emit = (e) => { try { res.write(JSON.stringify(e) + "\n"); } catch {} };

  const state = T.sanitizeState(body.state);
  const now = new Date();
  const lastUser = messages[messages.length - 1].content;
  const tokenAtStart = state.stage === "awaiting_confirmation" ? state.token : null;
  const saidYes = T.isYes(lastUser);
  const ctx = { state, now, events: [], allowPlace: !!tokenAtStart && saidYes, tokenAtStart, log: (o) => console.log(JSON.stringify(o)) };
  const flush = () => { for (const e of ctx.events.splice(0)) emit(e); };

  // Guard 1: a clear "yes" to a read-back shown in an earlier turn places the order here, before the model runs.
  let placedNow = null;
  if (tokenAtStart && saidYes && T.tokenFor(state) === tokenAtStart) {
    const r = T.run("place_order", { token: tokenAtStart }, ctx);
    if (r.placed) placedNow = r.order_id;
    flush();
  }
  ctx.allowPlace = false; // the model itself can never place an order in this turn (already placed above or not confirmed)

  const usedPersona = Array.isArray(body.persona_used) ? body.persona_used.slice(0, 20) : [];
  const hint = persona.easterEgg(lastUser) || (messages.length === 1 ? persona.pick("greeting", usedPersona) : placedNow ? persona.pick("order_confirmed", usedPersona) : null);
  const live = liveContext(state, now, { channel, placedNow, persona: hint });

  let wrote = "";
  let needBreak = false;
  const text = (t) => {
    if (!t) return;
    if (needBreak) { if (/[.!?…)\]"»😊🥟🧡✨]\s*$/u.test(wrote)) { emit({ type: "text", text: "\n\n" }); wrote += "\n\n"; } needBreak = false; }
    wrote += t; emit({ type: "text", text: t });
  };

  try {
    if (provider === "anthropic") await runAnthropic({ messages, live, channel, ctx, text, flush, onRound: () => { needBreak = wrote.length > 0; } });
    else await runNvidia({ messages, live, channel, ctx, text, flush, onRound: () => { needBreak = wrote.length > 0; } });
  } catch (err) {
    console.error(JSON.stringify({ evt: "caseria_error", provider, status: err && err.status, message: String(err && err.message).slice(0, 300) }));
    emit({ type: "error", kind: err && err.status === 429 ? "rate" : "upstream" });
  }
  flush();
  if (!wrote.trim() && placedNow) emit({ type: "text", text: "¡Listo, case! Toca el botón verde para enviar tu pedido por WhatsApp a la sucursal." });
  emit({ type: "state", state });
  res.end();
};

function execTool(name, input, ctx, flush) {
  let result;
  try { result = T.run(name, input, ctx); } catch (e) { result = { error: "tool_failed" }; }
  flush();
  return JSON.stringify(result);
}

async function runAnthropic({ messages, live, channel, ctx, text, flush, onRound }) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic();
  const model = channel === "voice" ? process.env.CASERIA_VOICE_MODEL || "claude-haiku-5-5" : process.env.CASERIA_MODEL || "claude-sonnet-5-5";
  const tools = T.TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));
  const msgs = messages.map((m) => ({ role: m.role, content: m.content }));
  const fallback = /^claude-sonnet-5-5$|^claude-opus-5-5$/.test(model);
  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (round) onRound();
    const params = {
      model, max_tokens: channel === "voice" ? 1024 : 2048,
      system: [{ type: "text", text: STATIC, cache_control: { type: "ephemeral" } }, { type: "text", text: live }],
      tools, messages: msgs,
      output_config: { effort: "low" },
    };
    if (fallback) { params.betas = ["server-side-fallback-2026-07-01"]; params.fallbacks = "default"; }
    const stream = client.beta.messages.stream(params);
    stream.on("text", (d) => text(d));
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") { text("Mejor sigamos con tu pedido, case. ¿Qué te sirvo?"); return; }
    const uses = msg.content.filter((b) => b.type === "tool_use");
    if (!uses.length || msg.stop_reason === "max_tokens") return;
    msgs.push({ role: "assistant", content: msg.content });
    msgs.push({ role: "user", content: uses.map((u) => ({ type: "tool_result", tool_use_id: u.id, content: execTool(u.name, u.input, ctx, flush) })) });
  }
}

async function runNvidia({ messages, live, channel, ctx, text, flush, onRound }) {
  const OpenAI = require("openai");
  const client = new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: "https://integrate.api.nvidia.com/v1" });
  const model = process.env.CASERIA_NVIDIA_MODEL || "nvidia/nemotron-3-ultra-550b-a55b";
  const msgs = [{ role: "system", content: STATIC + "\n\n" + live }, ...messages.map((m) => ({ role: m.role, content: m.content }))];
  const tools = T.openaiTools();
  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (round) onRound();
    const stream = await client.chat.completions.create({ model, messages: msgs, tools, tool_choice: "auto", stream: true, temperature: 0.4, max_tokens: channel === "voice" ? 600 : 1200 });
    const calls = [];
    let content = "";
    let inThink = false;
    for await (const chunk of stream) {
      const d = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
      if (!d) continue;
      if (d.content) {
        // hide any <think>…</think> reasoning some models emit
        let c = d.content;
        if (inThink || c.includes("<think>")) {
          const out = [];
          while (c) {
            if (inThink) { const i = c.indexOf("</think>"); if (i < 0) { c = ""; } else { c = c.slice(i + 8); inThink = false; } }
            else { const i = c.indexOf("<think>"); if (i < 0) { out.push(c); c = ""; } else { out.push(c.slice(0, i)); c = c.slice(i + 7); inThink = true; } }
          }
          c = out.join("");
        }
        content += c; text(c);
      }
      for (const tc of d.tool_calls || []) {
        const k = tc.index ?? calls.length;
        calls[k] = calls[k] || { id: tc.id, name: "", args: "" };
        if (tc.id) calls[k].id = tc.id;
        if (tc.function && tc.function.name) calls[k].name += tc.function.name;
        if (tc.function && tc.function.arguments) calls[k].args += tc.function.arguments;
      }
    }
    const real = calls.filter(Boolean).filter((c) => c.name);
    if (!real.length) return;
    real.forEach((c, i) => { if (!c.id) c.id = `call_${round}_${i}`; });
    msgs.push({ role: "assistant", content: content || null, tool_calls: real.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.args || "{}" } })) });
    for (const c of real) {
      let input = {};
      try { input = JSON.parse(c.args || "{}"); } catch { input = null; }
      msgs.push({ role: "tool", tool_call_id: c.id, content: input ? execTool(c.name, input, ctx, flush) : JSON.stringify({ error: "invalid_json" }) });
    }
  }
}

module.exports.cleanMessages = cleanMessages;
