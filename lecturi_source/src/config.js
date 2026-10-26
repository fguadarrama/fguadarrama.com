// Catálogo de fuentes, temas y valores por defecto.
const BASE = import.meta.env.BASE_URL;
const ABS = new URL(BASE, location.href).href;

export const FONTS = [
  { id: "coelacanth", name: "Coelacanth", stack: "'Coelacanth', Georgia, serif" },
  { id: "latin-modern", name: "Latin Modern", stack: "'Latin Modern Roman', serif" },
  { id: "eb-garamond", name: "EB Garamond", stack: "'EB Garamond', Garamond, serif" },
  { id: "cormorant", name: "Cormorant Garamond", stack: "'Cormorant Garamond', Garamond, serif" },
  { id: "space-grotesk", name: "Space Grotesk", stack: "'Space Grotesk', system-ui, sans-serif" },
  { id: "instrument-serif", name: "Instrument Serif", stack: "'Instrument Serif', Georgia, serif" },
  { id: "junicode", name: "Junicode", stack: "'Junicode', Georgia, serif" },
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
  { id: "oscuro", name: "Yo-nezumi", bg: "rgb(27, 28, 29)", fg: "rgb(206, 202, 194)" },
];

export const ACCENT = "rgb(235, 21, 92)";

export const DEFAULTS = {
  font: "coelacanth",
  theme: "shironeri",
  fontSize: 20, // px
  lineHeight: 1.5,
  sound: true,
  margin: 8, // % del ancho, por lado
};

export const LIMITS = {
  fontSize: { min: 14, max: 30, step: 1 },
  lineHeight: { min: 1.2, max: 2.0, step: 0.05 },
  margin: { min: 0, max: 24, step: 1 },
};

export const fontById = (id) => FONTS.find((f) => f.id === id) || FONTS[0];
export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

// Un único catálogo de fuentes locales para la página y los documentos EPUB.
const face = (family, file, style = "normal", weight = "400") =>
  `@font-face { font-family: '${family}'; font-style: ${style}; font-weight: ${weight}; font-display: block; src: url('${ABS}fonts/${file}'); }`;
export const LOCAL_FONTS_CSS = JUNICODE_CSS + [
  face("Albert Sans", "AlbertSans-Variable.ttf", "normal", "100 900"),
  face("Coelacanth", "Coelacanth.otf"),
  face("Coelacanth", "Coelacanth-It.otf", "italic"),
  face("Coelacanth", "Coelacanth-Bold.otf", "normal", "700"),
  face("Coelacanth", "Coelacanth-BoldIt.otf", "italic", "700"),
  face("Latin Modern Roman", "LatinModernRoman-Regular.woff2"),
  face("Latin Modern Roman", "LatinModernRoman-Italic.woff2", "italic"),
  face("Latin Modern Roman Caps", "LatinModernRomanCaps-Regular.woff2"),
].join("\n");

// Rosa exacto en claro y azul exacto en oscuro, incluidas selección y marcas.
export const accentColor = prefs => prefs?.theme === "oscuro" ? "rgb(67, 146, 186)" : ACCENT;
export const FONT_SAMPLE = "Cuius rei demonstrationem mirabilem";
