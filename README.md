# Wistʼupiku · sitio web + Caser-IA ✨

Sitio de pedidos para **Wistʼupiku**: empanadas y repostería tradicional boliviana desde 1939
(Cochabamba · Santa Cruz · La Paz · Sucre). Incluye **Caser-IA**, una asistente de pedidos con herramientas
deterministas y modo voz, que arma el pedido y lo envía por WhatsApp a la sucursal elegida.

Todo el contenido (carta, precios, combos, sucursales, horarios, WhatsApp) vive en **`js/data.js`**, con la
fuente de cada dato en un comentario. El sitio y la asistente leen ese mismo archivo, así que nunca se contradicen.

## Estructura

```
index.html          estructura de la página + SEO (Open Graph, schema.org Restaurant)
css/styles.css      sistema de diseño (tokens de marca arriba, con el origen de cada color)
js/data.js          TODO el contenido + catalog() + horarios / estado de sucursales / mensaje de WhatsApp
js/app.js           render, carrusel, carrito, embudo de WhatsApp, estado en vivo, chat + voz
api/caseria.js      endpoint de Caser-IA: bucle de herramientas, responde NDJSON en streaming
api/_tools.js       herramientas deterministas (carta, carrito, promos, pedido, derivación) + esquemas
api/_prompt.js      prompt del sistema + contexto en vivo
api/_persona.js     frases propias de la marca y easter eggs
tests/tools.test.js pruebas de las herramientas (npm test)
assets/             fotos y reels de la propia cuenta de Wistʼupiku (webp / mp4), íconos, QR
```

## Correr localmente

```bash
npm install
```

```bash
npm test
```

```bash
npx vercel dev
```

## Desplegar en Vercel

1. Importa el repositorio en Vercel (sitio estático + funciones en `api/`, sin build).
2. En **Vercel → Project → Settings → Environment Variables** agrega la clave de IA (nunca en el código).
3. Vuelve a desplegar. Sin clave, el chat muestra “Caser-IA se está alistando 🛠️” y todo lo demás funciona.

| Variable | Para qué |
|---|---|
| `ANTHROPIC_API_KEY` | Clave de Claude (proveedor por defecto) |
| `CASERIA_MODEL` / `CASERIA_VOICE_MODEL` | Modelos de Claude opcionales (por defecto `claude-sonnet-5-5` para texto y `claude-haiku-5-5` para voz) |
| `NVIDIA_API_KEY` | Clave de NVIDIA NIM (alternativa) |
| `CASERIA_NVIDIA_MODEL` | Modelo NIM opcional (debe soportar tool calling; por defecto `nvidia/nemotron-3-ultra-550b-a55b`) |
| `CASERIA_PROVIDER` | Opcional: fuerza `anthropic` o `nvidia` |

Si hay `NVIDIA_API_KEY` se usa NVIDIA; si no, Anthropic. Con Claude Sonnet 5.5 se activa el respaldo
automático del servidor (`fallbacks: "default"`) por si el modelo rechaza una respuesta.

## Cómo funciona Caser-IA

- El modelo **solo propone** llamadas a herramientas. Precios, totales, combos, horarios y pedidos los calcula
  `api/_tools.js` a partir de `js/data.js`.
- La confirmación la controla el servidor: el pedido solo se crea cuando el cliente responde un “sí” claro a un
  resumen mostrado en un turno anterior, con el mismo carrito. Un segundo “sí” no crea otro pedido.
- Los links (WhatsApp, estado, derivación) viajan como botones, nunca como texto.
- **Mi Pedido** (últimos 3 pedidos en este dispositivo), **Entrega con Pin** (ubicación compartida) y
  **Sigue tu Wistu** (botón a la sucursal para consultar el estado; no hay seguimiento en vivo).
- Voz con Web Speech API (`es-BO`): pulsar para hablar, manos libres, interrumpir tocando el micrófono.

## Fuentes de datos

- Instagram [@wistupiku](https://www.instagram.com/wistupiku/) (bio, publicaciones y reels: fotos, videos, combo, historia).
- [linktr.ee/wistupiku](https://linktr.ee/wistupiku) y [linktr.ee/wistupiku.scz](https://linktr.ee/wistupiku.scz) (WhatsApp por ciudad y por sucursal de Santa Cruz, horarios SCZ 2026).
- [wistupiku.com/nuestras-tiendas](https://www.wistupiku.com/nuestras-tiendas/) y [/nuestro-menu](https://www.wistupiku.com/nuestro-menu/) (direcciones, teléfonos, horarios, productos).
- Listado de delivery de la sucursal Sucre en [pedidosdeuna.com](https://pedidosdeuna.com/5870610-wistupikus.html) (**precios**, ver abajo).

## Necesita confirmación del dueño

| Dato | Dónde cambiarlo |
|---|---|
| **Precios**: vienen de un listado de delivery de terceros (sucursal Sucre). Confirmar la lista oficial y si varían por ciudad. | `js/data.js` → `menu[].items[].price` |
| Precios no publicados: Wistu de carne, fritas de queso/pollo/carne, arroz con leche, jugos de papaya y plátano (se muestran como “Consulta” y no se pueden pedir en línea). | `js/data.js` → `price: null` |
| Horario regular de **Sucre (Calle Calvo #70)**. | `branches[id=calvo].hours` |
| Horarios de Cochabamba y La Paz vienen de wistupiku.com (puede estar desactualizado); los de Santa Cruz son de 2026. | `branches[].hours` |
| ¿Siguen abiertas Esteban Arce, Quillacollo, Simón López (Cbba)? No figuran en el post de horarios 2026, por eso no están en el sitio. | `branches` |
| Direcciones de **Santos Dumont** y **Virgen de Cotoca** (SCZ). | `branches[].address` |
| WhatsApp por sucursal en Cochabamba y La Paz (hoy todo Cochabamba va a la línea de pedidos +591 72228172 y La Paz a +591 68215526). | `branches[].wa` |
| Costo y zonas de delivery, medios de pago, alérgenos. | no publicados: Caser-IA dice que no tiene el dato |
| Logo en alta resolución (el público más grande es de 150 px; los íconos están escalados). | `assets/img/logo.png`, `assets/brand/*` |
| Dominio final (los metadatos usan `wistupiku.vercel.app`). | `index.html` (canonical, og:url, og:image) |

## Promos con fecha

- **Combo Tradición** Bs 15 (empanada de queso al horno + helado simple): publicado el 1 y 22 de septiembre de 2026
  como “todos los días”, sin fecha de fin. No válido en aeropuertos. Si termina, editar `combos` en `js/data.js`
  y el banner 1 del carrusel en `index.html`.
- Combo de Invierno (julio 2026) y la promo con Yape (10–11 de octubre de 2026) ya terminaron y no se muestran.
