// Catálogo de fuentes, temas y valores por defecto.
const BASE = import.meta.env.BASE_URL;
const ABS = new URL(BASE, location.href).href;

export const FONTS = [
  { id: "eb-garamond", name: "EB Garamond", note: "Clásica y limpia", stack: "'EB Garamond', Garamond, serif" },
  { id: "cormorant", name: "Cormorant Garamond", note: "Elegante, literaria", stack: "'Cormorant Garamond', Garamond, serif" },
  { id: "space-grotesk", name: "Space Grotesk", note: "Moderna, geométrica", stack: "'Space Grotesk', system-ui, sans-serif" },
  { id: "instrument-serif", name: "Instrument Serif", note: "Alta editorial", stack: "'Instrument Serif', Georgia, serif" },
  { id: "junicode", name: "Junicode", note: "Académica, medieval-moderna", stack: "'Junicode', Georgia, serif" },
];

// Rangos verificados contra fonts.googleapis.com (respuesta 200).
export const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2" +
  "?family=EB+Garamond:ital,wght@0,400..800;1,400..800" +
  "&family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700" +
  "&family=Space+Grotesk:wght@300..700" +
  "&family=Instrument+Serif:ital@0;1" +
  "&display=swap";

// Junicode no existe en Google Fonts: se aloja en /public/fonts (licencia OFL, v2.003).
// Es variable (wght 300–700, wdth 75–125): Justif puede usar su eje de anchura.
export const JUNICODE_CSS = `
@font-face { font-family: 'Junicode'; font-style: normal; font-weight: 300 700; font-stretch: 75% 125%;
  font-display: swap; src: url('${ABS}fonts/JunicodeVF-Roman.woff2') format('woff2'); }
@font-face { font-family: 'Junicode'; font-style: italic; font-weight: 300 700; font-stretch: 75% 125%;
  font-display: swap; src: url('${ABS}fonts/JunicodeVF-Italic.woff2') format('woff2'); }`;

export const THEMES = [
  { id: "nyuhaku", name: "Nyūhaku-iro", bg: "#F3F3F3", fg: "rgb(28, 30, 30)" },
  { id: "shironeri", name: "Shironeri", bg: "#FDFBF6", fg: "rgb(28, 30, 30)" },
  { id: "oscuro", name: "Oscuro", bg: "rgb(27, 28, 29)", fg: "rgb(206, 202, 194)" },
];

export const ACCENT = "rgb(67, 146, 186)";
export const ACCENT_2 = "rgb(235, 21, 92)";

export const DEFAULTS = {
  font: "eb-garamond",
  theme: "nyuhaku",
  fontSize: 20, // px
  lineHeight: 1.5,
  margin: 8, // % del ancho, por lado
};

export const LIMITS = {
  fontSize: { min: 14, max: 30, step: 1 },
  lineHeight: { min: 1.2, max: 2.0, step: 0.05 },
  margin: { min: 0, max: 24, step: 1 },
};

export const fontById = (id) => FONTS.find((f) => f.id === id) || FONTS[0];
export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
