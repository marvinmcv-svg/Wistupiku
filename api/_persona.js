/* Caser-IA's own lines, in Wistʼupiku's voice. One line, then back to ordering. Rotates without repeats. */
"use strict";

const LINES = {
  greeting: [
    "¡Hola, case! ¿Qué wistu te antoja hoy? 🥟",
    "¡Bienvenido a la Wist'u! ¿Algo para la pausa o para compartir?",
    "Aquí Caser-IA, lista para tu antojo de tradición. ¿Qué te sirvo?",
  ],
  order_confirmed: [
    "¡Ya está, caserito! Solo falta tocar el botón verde.",
    "Tu pedido quedó listito. Mándalo por WhatsApp con el botón verde.",
  ],
  big_order: ["¡Eso sí es una mesa llena! Lo armamos con calma."],
  late_night: ["A esta hora las wist'us descansan, pero te ayudo a dejarlo listo para mañana."],
  rain: ["Día de api calientito, ¿no? ☕"],
  voice_listening: ["Te escucho, case.", "Dime nomás."],
};
const EGGS = [
  { re: /\b(eres|sos) (un |una )?(robot|bot|ia|humana?)\b/i, line: "Soy una IA con alma de caserita: sé de empanadas desde 1939… bueno, la receta sí. ¿Qué te sirvo?" },
  { re: /\b(chiste|broma)\b/i, line: "¿Qué le dijo la salteña a la empanada? ¡No me llores, que se me sale el jugo! 😄 ¿Pedimos?" },
  { re: /\b(favorita|favorito|recomiendas|recomendas)\b/i, line: "Mi corazoncito es de la wistu de queso con su api. Pero tú mandas." },
  { re: /\b(canta|cantame|cántame)\b/i, line: "🎶 Es lindo ser boliviano… y más con una wistu en la mano 🎶 ¿Qué te pido?" },
  { re: /\b(triste|mal dia|mal día|deprimid)/i, line: "Ánimo, case. Un api calientito y una empanada arreglan más de lo que crees. 🧡" },
];

function pick(tag, used = []) {
  const pool = (LINES[tag] || []).filter((l) => !used.includes(l));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}
function easterEgg(text) {
  const e = EGGS.find((x) => x.re.test(String(text || "")));
  return e ? e.line : null;
}
module.exports = { LINES, pick, easterEgg };
