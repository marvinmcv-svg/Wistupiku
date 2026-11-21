/* Wistʼupiku — all site + assistant content. Shared by the browser (window.WISTU) and by
 * the assistant's deterministic tools in Node (module.exports). Every fact has its source.
 *
 * Sources used (S1…S9):
 *  S1  Instagram bio  https://www.instagram.com/wistupiku/  ("Elaborando empanadas y repostería
 *      tradicional de Bolivia 🇧🇴 Desde 1939 · CBBA - SCZ - LPZ - CH · #ElSaborDeLaTradicion")
 *  S2  Linktree       https://linktr.ee/wistupiku  (Pedidos Cochabamba → wa 59172228172,
 *      Pedidos Chuquisaca → wa 59169420733)
 *  S3  Linktree SCZ   https://linktr.ee/wistupiku.scz  (WhatsApp + hours per Santa Cruz branch, Apr–May 2026)
 *  S4  Their website  https://www.wistupiku.com/nuestras-tiendas/  (addresses, phones, hours;
 *      header: Santa Cruz wa 59169420491, La Paz wa 59168215526, Cochabamba tel 4 4257972 int 116)
 *  S5  Their website  https://www.wistupiku.com/nuestro-menu/  (product names and categories)
 *  S6  Delivery listing of the Sucre branch (Calle Calvo 70) on pedidosdeuna.com
 *      https://pedidosdeuna.com/5870610-wistupikus.html  → PRICES. Third-party listing: treat as
 *      reference prices until the owner confirms (see README "Needs owner input").
 *  S7  Combo Tradición  https://www.instagram.com/p/Dcvul85EQ1b/  (Bs 15, not valid at airports)
 *      and https://www.instagram.com/reel/DdmbwKvjcrD/ ("todos los días", all branches)
 *  S8  Holiday hours 2026  https://www.instagram.com/p/DXwi4NSoC8D/  (current Cochabamba branch list)
 *  S9  Story  https://www.instagram.com/p/CljwyPrOGaX/  (José Soliz Vaca, Guerra del Chaco, quechua meaning)
 */
(function (root) {
  "use strict";

  const WISTU = {
    config: {
      brand: "Wistʼupiku",
      slogan: "El sabor de la tradición",                 // S1 hashtag #ElSaborDeLaTradicion
      since: 1939,                                        // S1
      callCenter: "59172228172",                          // S2 "Pedidos Cochabamba"
      instagram: "https://www.instagram.com/wistupiku/",
      facebook: "https://www.facebook.com/wistupiku",     // S4 footer
      tiktok: "https://www.tiktok.com/@wistupiku",        // S2 (linked from linktree)
      pedidosya: "https://www.pedidosya.com.bo/cadenas/wistupiku",
      jobs: "https://www.wistupiku.com/formulario-solicitud-trabajo/",  // S4 "Crece con nosotros"
      timezone: "America/La_Paz",
      locale: "es-BO",
      currency: "Bs",
      country: "Bolivia",
    },

    // What every baked wistu has is not published; keep it neutral and factual.
    base: "Masa horneada o frita, hecha en casa desde 1939",

    // Menu: names from S5/S6, prices from S6 (reference). price:null = not public → "consultá en sucursal".
    menu: [
      { id: "horno", name: "Empanadas al horno", short: "Al horno", items: [
        { id: "wistu-queso", name: "Wistu de queso", price: 10, desc: "La clásica empanada blanca de queso, al horno. La de siempre.", star: true, veg: true },          // S6 "WISTU DE QUESO" · S5 "Empanada Blanca"
        { id: "wistu-picante", name: "Wistu picante", price: 10, desc: "La empanada roja: queso con su toque de ají, al horno.", veg: true, spicy: true },   // S6 "WISTU PICANTE" · S5 "Empanada Roja"
        { id: "wistu-pollo", name: "Wistu de pollo", price: 11, desc: "Empanada especial rellena de pollo jugoso.", img: "assets/img/especial-pollo.webp" }, // S6 · S5 · IG CkMBjgtu4eh
        { id: "wistu-charque", name: "Wistu de charque", price: 11, desc: "Empanada especial de charque, sabor de altura.", img: "assets/img/especial-charque.webp" }, // S6 · IG CkMBjgtu4eh
        { id: "wistu-carne", name: "Wistu de carne", price: null, desc: "Empanada especial de carne.", img: "assets/img/especial-carne.webp" },   // S5 · IG CkMBjgtu4eh (price not public)
        { id: "wistu-cunape", name: "Empanada de cuñapé", price: 8, desc: "Masa de cuñapé, quesuda y suavecita.", veg: true },          // S6 "EMPANADA DE CUÑAPE"
      ]},
      { id: "fritas", name: "Empanadas fritas", short: "Fritas", items: [
        { id: "jawita", name: "Jawita", price: 8, desc: "Empanada frita con relleno de queso y leche, una mezcla desde las alturas.", veg: true, hot: true, img: "assets/img/jawita.webp" }, // S6 "JAWITA" · IG CrJRbkfLNjw
        { id: "frita-queso", name: "Frita de queso", price: null, desc: "Empanada frita de queso.", veg: true },   // S5
        { id: "frita-pollo", name: "Frita de pollo", price: null, desc: "Empanada frita de pollo." },              // S5
        { id: "frita-carne", name: "Frita de carne", price: null, desc: "Empanada frita de carne." },              // S5
      ]},
      { id: "saltenas", name: "Salteñas, pasteles y humintas", short: "Salteñas", items: [
        { id: "saltena-carne", name: "Salteña de carne", price: 7, desc: "Jugosa, horneada, de carne." },                          // S6
        { id: "saltena-carne-semi", name: "Salteña de carne semipicante", price: 8, desc: "Salteña de carne con un toque de picante.", spicy: true }, // S6
        { id: "saltena-pollo", name: "Salteña de pollo", price: 7, desc: "Jugosa, horneada, de pollo." },                          // S6
        { id: "saltena-pollo-dulce", name: "Salteña de pollo dulce", price: 8, desc: "Salteña de pollo en su versión dulce." },    // S6
        { id: "pastel-queso", name: "Pastel de queso", price: 8, desc: "Masa frita con queso y azúcar flor. Pídelo con api.", veg: true, img: "assets/img/api-con-pastel.webp" }, // S6 (also listed at Bs 7) · IG Cmzl9DouoXf
        { id: "huminta", name: "Huminta a la olla", price: 11, desc: "Del quechua humintʼa, “bollo de maíz tierno”.", veg: true, img: "assets/img/huminta.webp" }, // S6 · IG CqDzUvAObwD
        { id: "pan-arani", name: "Pan de Arani", price: 2.5, desc: "El pan tradicional del valle cochabambino.", veg: true },   // S6 · S5
      ]},
      { id: "helados", name: "Helados batidos a mano", short: "Helados", items: [
        { id: "helado-porcion", name: "Helado · porción", price: 7, desc: "Batido a mano. Canela, leche o mixto.", veg: true },        // S6 "PORCION"
        { id: "helado-doble", name: "Helado · doble porción", price: 12, desc: "Batido a mano. Canela, leche o mixto.", veg: true },   // S6 "DOBLE PORCION"
        { id: "helado-medio-kilo", name: "Helado · ½ kilo", price: 26, desc: "Para llevar y compartir. Canela, leche o mixto.", veg: true }, // S6 "1/2 KILO"
      ]},
      { id: "calientes", name: "Bebidas calientes", short: "Calientes", items: [
        { id: "api", name: "Api", price: 8, desc: "Api morado o blanco, espeso y calientito.", veg: true },          // S6 "API" · S5 api blanco/morado
        { id: "tojori", name: "Tojorí", price: 8, desc: "Bebida caliente de maíz, la de las mañanas frías.", veg: true }, // S6 · S5
        { id: "te-mate", name: "Té / mate", price: 7, desc: "Té o mate de sobre.", veg: true },                     // S6
        { id: "americano", name: "Café americano", price: 12, desc: "", veg: true },                                 // S6
        { id: "espresso-doble", name: "Espresso doble", price: 11, desc: "", veg: true },                            // S6
        { id: "cafe-leche", name: "Café con leche", price: 13, desc: "", veg: true },                                // S6
        { id: "latte", name: "Café latte", price: 13, desc: "", veg: true },                                         // S6
        { id: "cappuccino", name: "Cappuccino", price: 13, desc: "", veg: true },                                    // S6
        { id: "arroz-leche", name: "Arroz con leche", price: null, desc: "", veg: true },                            // S5
      ]},
      { id: "refrescos", name: "Jugos y refrescos", short: "Refrescos", items: [
        { id: "tumbo-500", name: "Refresco de tumbo · 500 ml", price: 7, desc: "", veg: true },     // S6
        { id: "tumbo-1l", name: "Refresco de tumbo · 1 litro", price: 14, desc: "", veg: true },    // S6
        { id: "tostada-500", name: "Refresco de tostada · 500 ml", price: 7, desc: "", veg: true },  // S6
        { id: "tostada-1l", name: "Refresco de tostada · 1 litro", price: 14, desc: "", veg: true }, // S6
        { id: "pepa-500", name: "Refresco de pepa · 500 ml", price: 8, desc: "", veg: true },        // S6
        { id: "pepa-1l", name: "Refresco de pepa · 1 litro", price: 13, desc: "", veg: true },       // S6
        { id: "durazno-agua", name: "Jugo de durazno con agua", price: 11, desc: "", veg: true },    // S6
        { id: "durazno-leche", name: "Jugo de durazno con leche", price: 13, desc: "", veg: true },  // S6
        { id: "frutilla-agua", name: "Jugo de frutilla con agua", price: 11, desc: "", veg: true },  // S6
        { id: "frutilla-leche", name: "Jugo de frutilla con leche", price: 13, desc: "", veg: true },// S6
        { id: "papaya", name: "Jugo de papaya (agua o leche)", price: null, desc: "", veg: true },   // S5
        { id: "platano", name: "Jugo de plátano (agua o leche)", price: null, desc: "", veg: true }, // S5
      ]},
    ],

    combos: [
      { id: "combo-tradicion", name: "Combo Tradición", price: 15, img: "assets/img/combo-tradicion.webp",
        note: "1 empanada de queso al horno + 1 helado simple a elección", parts: ["wistu-queso", "helado-porcion"],
        rules: "Todos los días, en todas las sucursales. No válido en sucursales de aeropuerto.", star: true,
        src: "https://www.instagram.com/p/Dcvul85EQ1b/" },                                   // S7
    ],

    // Classic pairings they post about (hashtag #apiconpastel, IG Cmzl9DouoXf). NOT discounts: the
    // price shown is simply the sum of the items, computed by code.
    clasicos: [
      { id: "api-con-pastel", name: "Api con pastel", parts: ["api", "pastel-queso"], img: "assets/img/api-con-pastel.webp",
        desc: "El desayuno boliviano por excelencia: api calientito y pastel de queso.", src: "https://www.instagram.com/p/Cmzl9DouoXf/" },
      { id: "wistu-y-cafe", name: "Wistu y cafecito", parts: ["wistu-queso", "cafe-leche"], img: "assets/img/wistus-mesa.webp",
        desc: "Ideal para una pausa en medio de la rutina.", src: "https://www.instagram.com/p/CkMBjgtu4eh/" },
      { id: "jawita-tojori", name: "Jawita y tojorí", parts: ["jawita", "tojori"], img: "assets/img/jawita.webp",
        desc: "Una mezcla desde las alturas, con su bebida de maíz.", src: "https://www.instagram.com/reel/CrJRbkfLNjw/" },
    ],

    offers: [
      { img: "assets/img/combo-tradicion.webp", href: "https://www.instagram.com/p/Dcvul85EQ1b/", alt: "Combo Tradición: 1 empanada de queso + helado de canela simple, 15 Bs" },
      { img: "assets/img/especiales.webp", href: "https://www.instagram.com/p/CkMBjgtu4eh/", alt: "Empanadas especiales de pollo, carne o charque" },
      { img: "assets/img/jawita.webp", href: "https://www.instagram.com/reel/CrJRbkfLNjw/", alt: "¿Qué es una jawita?" },
      { img: "assets/img/huminta.webp", href: "https://www.instagram.com/p/CqDzUvAObwD/", alt: "Huminta a la olla" },
      { img: "assets/img/api-con-pastel.webp", href: "https://www.instagram.com/p/Cmzl9DouoXf/", alt: "Api morado con pastel de queso" },
      { img: "assets/img/sucre-calvo.webp", href: "https://www.instagram.com/p/CoajGVVur3e/", alt: "Wistupiku en Sucre, Calle Calvo #70" },
    ],

    featured: [
      { ref: "jawita", name: "Jawita", tag: "La de las alturas", img: "assets/img/jawita.webp", video: "assets/video/jawita", desc: "Empanada frita con relleno de queso y leche." },
      { ref: "wistu-charque", name: "Wistu de charque", tag: "Especial", img: "assets/img/especial-charque.webp", desc: "¿Ya probaste nuestras especiales de pollo, carne o charque?" },
      { ref: "huminta", name: "Huminta a la olla", tag: "Del quechua humintʼa", img: "assets/img/huminta.webp", desc: "Bollo de maíz tierno, como en casa." },
    ],

    // hours: list of [weekdays (0=Sun), open, close]; several ranges allowed (split shifts).
    // wa = WhatsApp that takes orders for this branch.
    branches: [
      // ---- Cochabamba: current list from S8; addresses, phones and regular hours from S4; orders via S2 central line.
      { id: "lanza", city: "Cochabamba", name: "Lanza", address: "Calle Lanza Nº 624", phone: "4503922", wa: "59172228172", hours: [[[0,1,2,3,4,5,6], "07:15", "19:30"]] },
      { id: "prado", city: "Cochabamba", name: "Prado", address: "Av. Ballivián Nº 642 casi calle La Paz", phone: "4519330", wa: "59172228172", hours: [[[0,1,2,3,4,5,6], "07:20", "19:20"]] },
      { id: "sucre-cbba", city: "Cochabamba", name: "Sucre", address: "Calle Sucre Nº 434 entre Av. San Martín y 25 de Mayo", phone: "4256813", wa: "59172228172", hours: [[[1,2,3,4,5,6], "07:15", "19:30"]] },
      { id: "recoleta", city: "Cochabamba", name: "Recoleta", address: "Av. Aniceto Padilla Nº 559", phone: "4401076", wa: "59172228172", hours: [[[0,1,2,3,4,5,6], "07:20", "19:20"]] },
      { id: "melchor", city: "Cochabamba", name: "Melchor Pérez", address: "Av. Melchor Pérez de Olguín Nº 1437", phone: "4405071", wa: "59172228172", hours: [[[0,1,2,3,4,5,6], "07:30", "19:00"]] },
      { id: "america", city: "Cochabamba", name: "América", address: "Av. América Nº 152 casi calle Adela Zamudio", phone: "4405127", wa: "59172228172", hours: [[[1,2,3,4,5,6], "07:30", "19:00"], [[0], "07:30", "18:00"]] },
      { id: "ayacucho", city: "Cochabamba", name: "Ayacucho", address: "Av. Ayacucho Nº 137, Edificio Los Andes", phone: "4582566", wa: "59172228172", hours: [[[1,2,3,4,5], "07:15", "20:00"], [[6], "07:15", "19:30"]] },
      { id: "sacaba", city: "Cochabamba", name: "Sacaba", address: "Plaza 6 de Agosto, acera este", phone: "4704257", wa: "59172228172", hours: [[[1,2,3,4,5,6], "07:20", "19:30"], [[0], "07:20", "18:30"]] },
      { id: "viedma", city: "Cochabamba", name: "Viedma", address: "Av. Aniceto Arce Nº 557", phone: "4531897", wa: "59172228172", hours: [[[1,2,3,4,5,6], "07:20", "19:30"]] },
      { id: "terminal", city: "Cochabamba", name: "Terminal", address: "Av. Ayacucho, Terminal de Buses", phone: "4581208", wa: "59172228172", hours: [[[1,2,3,4,5,6], "05:00", "22:00"], [[0], "06:00", "20:00"]] },
      { id: "aeropuerto-cbba", city: "Cochabamba", name: "Aeropuerto Jorge Wilstermann", address: "Av. Killman, patio de comidas, stand 1", phone: "4534367", wa: "59172228172", airport: true, hours: [[[1,2,3,4,5,6], "04:30", "21:30"], [[0], "05:00", "20:00"]] },
      // ---- Santa Cruz: WhatsApp + hours from S3 (2026); addresses from S4.
      { id: "irala", city: "Santa Cruz", name: "Irala", address: "Av. Irala esq. calle Independencia Nº 530", wa: "59167702714", hours: [[[0,1,2,3,4,5,6], "07:00", "20:30"]] },
      { id: "monsenor", city: "Santa Cruz", name: "Monseñor", address: "Final 24 de Septiembre, entre Celso Castedo y Av. Uruguay Nº 21", wa: "59171621877", hours: [[[0,1,2,3,4,5,6], "07:00", "19:30"]] },
      { id: "doble-via", city: "Santa Cruz", name: "Doble Vía", address: "Av. Grigotá Nº 805 entre Av. Ibérica y calle San Miguel", wa: "59167702713", hours: [[[0,1,2,3,4,5,6], "07:00", "19:30"]] },
      { id: "remanso", city: "Santa Cruz", name: "Remanso", address: "Av. El Remanso (8vo anillo) Nº 9005", wa: "59167702712", hours: [[[0,1,2,3,4,5,6], "07:00", "20:00"]] },
      { id: "beni", city: "Santa Cruz", name: "Beni", address: "Av. Beni Nº 3240 esq. Los Limos, antes del 3er anillo interno", wa: "59171654470", hours: [[[0,1,2,3,4,5,6], "07:00", "20:30"]] },
      { id: "pirai", city: "Santa Cruz", name: "Piraí", address: "Av. Piraí 278, Urbarí", wa: "59167709661", hours: [[[0,1,2,3,4,5,6], "07:00", "19:30"]] },
      { id: "banzer", city: "Santa Cruz", name: "Banzer", address: "Av. Cristo Redentor, entre 5to y 6to anillo", wa: "59172193391", hours: [[[0,1,2,3,4,5,6], "07:00", "20:00"]] },
      { id: "equipetrol", city: "Santa Cruz", name: "Equipetrol", address: "Av. San Martín esq. 4to anillo", wa: "59175675790", hours: [[[0,1,2,3,4,5,6], "07:00", "20:30"]] },
      { id: "santos-dumont", city: "Santa Cruz", name: "Santos Dumont", address: null, wa: "59169961176", hours: [[[0,1,2,3,4,5,6], "07:00", "20:30"]] },
      { id: "virgen-cotoca", city: "Santa Cruz", name: "Virgen de Cotoca", address: null, wa: "59177601055", hours: [[[0,1,2,3,4,5,6], "07:00", "20:30"]] },
      { id: "viru-viru", city: "Santa Cruz", name: "Aeropuerto Viru Viru", address: "Aeropuerto Viru Viru, ala nueva", wa: "59177381969", airport: true, hours: [[[0,1,2,3,4,5,6], "05:00", "22:00"]] },
      // ---- La Paz: addresses, phones and hours from S4; orders via the La Paz WhatsApp in S4 header.
      { id: "saavedra", city: "La Paz", name: "Saavedra", address: "Av. Saavedra Nº 2202, frente a la iglesia Los Remedios", phone: "2220224", wa: "59168215526", hours: [[[1,2,3,4,5,6], "07:00", "22:00"], [[0], "08:00", "20:30"]] },
      { id: "comercio", city: "La Paz", name: "Comercio", address: "Pasaje peatonal Comercio Nº 1057 entre Socabaya y Yanacocha", phone: "2408563", wa: "59168215526", hours: [[[1,2,3,4,5,6], "07:00", "22:30"], [[0], "08:30", "20:30"]] },
      { id: "20-octubre", city: "La Paz", name: "20 de Octubre", address: "Av. 20 de Octubre Nº 2463 entre Belisario Salinas y Pedro Salazar", phone: "2433092", wa: "59168215526", hours: [[[1,2,3,4,5,6], "07:00", "22:00"], [[0], "08:30", "20:30"]] },
      { id: "san-miguel", city: "La Paz", name: "San Miguel", address: "Calacoto, calle 21 entre Cordero y Achá Nº 8475", phone: "2795799", wa: "59168215526", hours: [[[1,2,3,4,5,6], "07:30", "12:30"], [[1,2,3,4,5,6], "15:00", "20:00"], [[0], "08:30", "20:30"]] },
      { id: "satelite", city: "La Paz", name: "Satélite", address: "Av. Satélite esq. Diego de Portugal Nº 724", phone: "2810188", wa: "59168215526", hours: [[[1,2,3,4,5,6], "07:00", "22:00"]] },
      { id: "aeropuerto-lpz", city: "La Paz", name: "Aeropuerto El Alto", address: "Aeropuerto Internacional de El Alto, patio de comidas", phone: "2821268", wa: "59168215526", airport: true, hours: [[[1,2,3,4,5,6], "04:00", "22:00"], [[0], "06:00", "19:00"]] },
      // ---- Sucre (Chuquisaca): address from IG CoajGVVur3e; WhatsApp from S2. Regular hours not public.
      { id: "calvo", city: "Sucre", name: "Calvo", address: "Calle Calvo #70, entre Bolívar y España, media cuadra antes de la Plaza 25 de Mayo", wa: "59169420733", hours: null },
    ],

    facts: [
      "Wistʼupiku elabora empanadas y repostería tradicional de Bolivia desde 1939.",
      "Tiene sucursales en Cochabamba, Santa Cruz, La Paz y Sucre (Chuquisaca).",
      "La palabra wistʼupiku es quechua y significa “boca o pico chueco”: era el apodo cariñoso de José Soliz Vaca, que fue herido en la Guerra del Chaco.",
      "El Combo Tradición (1 empanada de queso al horno + 1 helado simple a elección) cuesta Bs 15, todos los días, y no es válido en sucursales de aeropuerto.",
      "Los helados son batidos a mano, en sabores canela, leche o mixto.",
      "Se puede pedir por WhatsApp a cada sucursal y también por PedidosYa.",
      "Hacen pedidos para eventos corporativos, cumpleaños y reuniones (cotización por WhatsApp).",
      "Los precios de la carta son referenciales y pueden variar por sucursal.",
    ],

    reels: [
      { src: "assets/video/combo-tradicion", caption: "Tu combo favorito vuelve: Combo Tradición", url: "https://www.instagram.com/reel/DdmbwKvjcrD/" },
      { src: "assets/video/jawita", caption: "¡Esto es una jawita! 🧡", url: "https://www.instagram.com/reel/CrJRbkfLNjw/" },
      { src: "assets/video/asi-no-se-juega", caption: "Así no se juega… difícil resistirse", url: "https://www.instagram.com/reel/ClRuHRcJN03/" },
      { src: "assets/video/la-paz", caption: "Reinauguramos en La Paz", url: "https://www.instagram.com/reel/DQ-FXI2idXE/" },
      { src: "assets/video/compadres", caption: "¡Oye! ¿Listo para compadres?", url: "https://www.instagram.com/reel/DUY9C9Vk3P7/" },
      { src: "assets/video/comadres", caption: "Jueves de comadres con sabor", url: "https://www.instagram.com/reel/DUqeMDekdLr/" },
      { src: "assets/video/remanso", caption: "Nos vemos en Remanso", url: "https://www.instagram.com/reel/DdmX3IQtMsg/" },
      { src: "assets/video/llajta", caption: "Nacidos en la Llajta", url: "https://www.instagram.com/reel/DdR_RkQpXDo/" },
    ],

    feed: [
      { img: "assets/img/wistus-mesa.webp", url: "https://www.instagram.com/p/ClEtWhOJxVT/", alt: "Wistus recién salidas" },
      { img: "assets/img/especial-carne.webp", url: "https://www.instagram.com/p/CkMBjgtu4eh/", alt: "Empanada especial de carne" },
      { img: "assets/img/letrero.webp", url: "https://www.instagram.com/p/CljwyPrOGaX/", alt: "El letrero de Wistupiku" },
      { img: "assets/img/vitrina.webp", url: "https://www.instagram.com/p/Cj3ffD0JYCF/", alt: "La vitrina de una nueva sucursal" },
      { img: "assets/img/wistu-mano.webp", url: "https://www.instagram.com/p/ClEtWhOJxVT/", alt: "Una wistu en la mano" },
      { img: "assets/img/sucre-bolsa.webp", url: "https://www.instagram.com/p/CoajGVVur3e/", alt: "Wistupiku en Sucre" },
      { img: "assets/img/dia-de-reyes.webp", url: "https://www.instagram.com/p/C12ojiVue5C/", alt: "Chocolatada del Día de Reyes con las familias del equipo" },
      { img: "assets/img/nueva-sucursal.webp", url: "https://www.instagram.com/p/Cj3ffD0JYCF/", alt: "Inauguración de una nueva sucursal" },
    ],
  };

  const CITIES = ["Cochabamba", "Santa Cruz", "La Paz", "Sucre"];
  WISTU.cities = CITIES;

  WISTU.catalog = function () {
    const out = {};
    for (const cat of WISTU.menu) {
      for (const it of cat.items) {
        out[it.id] = { id: it.id, name: it.name, price: it.price, kind: cat.id === "refrescos" || cat.id === "calientes" ? "drink" : cat.id === "helados" ? "helado" : "food",
          cat: cat.id, desc: it.desc || "", veg: !!it.veg, hot: !!it.hot, spicy: !!it.spicy };
      }
    }
    for (const c of WISTU.combos) {
      out[c.id] = { id: c.id, name: c.name, price: c.price, kind: "combo", cat: "combos", desc: c.note, parts: c.parts, rules: c.rules, veg: true };
    }
    return out;
  };

  // ---- Time helpers (Bolivia is UTC−4 all year, no DST) ----
  const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  const fmt = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  WISTU.local = function (date) {
    const d = new Date((date ? date.getTime() : Date.now()) - 4 * 3600e3);
    return { day: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes(), hhmm: fmt(d.getUTCHours() * 60 + d.getUTCMinutes()),
      ymd: d.toISOString().slice(0, 10) };
  };
  WISTU.toMin = toMin;
  WISTU.fmtMin = fmt;
  WISTU.rangesFor = function (b, day) {
    if (!b.hours) return null;
    return b.hours.filter((h) => h[0].includes(day)).map((h) => [toMin(h[1]), toMin(h[2])]).sort((a, c) => a[0] - c[0]);
  };
  /** status: open | closing | opens | closed | unknown, with a human label */
  WISTU.branchStatus = function (b, date) {
    const t = WISTU.local(date);
    const ranges = WISTU.rangesFor(b, t.day);
    if (!ranges) return { state: "unknown", open: false, label: "Horario por confirmar" };
    for (const [o, c] of ranges) {
      if (t.min >= o && t.min < c) {
        return c - t.min <= 45 ? { state: "closing", open: true, label: `Cierra a las ${fmt(c)}`, closes: fmt(c) }
          : { state: "open", open: true, label: `Abierto hasta ${fmt(c)}`, closes: fmt(c) };
      }
    }
    const next = ranges.find(([o]) => o > t.min);
    if (next) return { state: "opens", open: false, label: `Abre a las ${fmt(next[0])}`, opens: fmt(next[0]) };
    for (let i = 1; i <= 7; i++) {
      const r = WISTU.rangesFor(b, (t.day + i) % 7);
      if (r && r.length) return { state: "closed", open: false, label: i === 1 ? `Cerrado · mañana desde ${fmt(r[0][0])}` : "Cerrado", opens: fmt(r[0][0]), tomorrow: i === 1 };
    }
    return { state: "closed", open: false, label: "Cerrado" };
  };
  /** Is the branch open at local HH:MM today? (null if hours unknown) */
  WISTU.openAt = function (b, hhmm, date) {
    const ranges = WISTU.rangesFor(b, WISTU.local(date).day);
    if (!ranges) return null;
    const m = toMin(hhmm);
    return ranges.some(([o, c]) => m >= o && m < c);
  };
  WISTU.hoursText = function (b) {
    if (!b.hours) return "Horario por confirmar";
    const names = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const label = (days) => {
      const s = [...days].sort((a, c) => ((a + 6) % 7) - ((c + 6) % 7));
      if (s.length === 7) return "Todos los días";
      if (s.length > 2) return `${names[s[0]]}–${names[s[s.length - 1]]}`;
      return s.map((d) => names[d]).join(", ");
    };
    const groups = {};
    for (const [days, o, c] of b.hours) { const k = label(days); (groups[k] = groups[k] || []).push(`${o}–${c}`); }
    return Object.entries(groups).map(([k, v]) => `${k} ${v.join(" y ")}`).join(" · ");
  };
  WISTU.mapsUrl = (b) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Wistupiku ${b.address || b.name} ${b.city} Bolivia`)}`;
  /** One WhatsApp message format for the funnel AND the assistant. */
  WISTU.orderMessage = function (o) {
    const L = [];
    L.push(`¡Hola Wistʼupiku! 🥟 Quiero hacer un pedido${o.orderId ? ` (${o.orderId})` : ""}.`);
    L.push("");
    L.push(`*Tipo:* ${o.service === "delivery" ? "Delivery" : o.service === "pickup" ? "Recojo en sucursal" : o.service || "-"}`);
    if (o.branch) L.push(`*Sucursal:* ${o.branch}`);
    if (o.lines && o.lines.length) {
      L.push("*Pedido:*");
      for (const l of o.lines) L.push(`• ${l.qty} × ${l.name}${l.price != null ? ` — ${WISTU.money(l.price * l.qty)}` : ""}`);
      if (o.total != null) L.push(`*Total referencial:* ${WISTU.money(o.total)}`);
    }
    if (o.extra) L.push(o.extra);
    if (o.service === "delivery") {
      if (o.address) L.push(`*Dirección:* ${o.address}`);
      if (o.reference) L.push(`*Referencia:* ${o.reference}`);
      if (o.pin) L.push(`*Ubicación:* ${o.pin}`);
    }
    if (o.when) L.push(`*Para:* ${o.when === "asap" ? "Lo antes posible" : o.when}`);
    if (o.name) L.push(`*Nombre:* ${o.name}`);
    if (o.payment) L.push(`*Pago:* ${o.payment}`);
    if (o.notes) L.push(`*Nota:* ${o.notes}`);
    return L.join("\n");
  };
  WISTU.waLink = (num, text) => `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  WISTU.money = (n) => `Bs ${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")}`;

  if (typeof module !== "undefined" && module.exports) module.exports = WISTU;
  else root.WISTU = WISTU;
})(typeof window !== "undefined" ? window : globalThis);
