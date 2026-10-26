// Copia a public/vendor/ los archivos que deben servirse tal cual (sin empaquetar):
//  - justif/dist completo: se carga DENTRO del iframe de cada capítulo.
//  - patrones .wasm de Hyphenopoly: se descargan bajo demanda según el idioma del libro.
// Se ejecuta solo antes de `npm run dev` y `npm run build`.
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";

const out = "public/vendor";
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

cpSync("node_modules/justif/dist", `${out}/justif`, {
  recursive: true,
  filter: (src) => !src.endsWith(".map") && !src.endsWith(".d.ts"),
});


cpSync("node_modules/hyphenopoly/patterns", `${out}/hyphenopoly/patterns`, { recursive: true });

// Lista de idiomas disponibles, para elegir el patrón correcto en el navegador.
const hyphenopolyLangs = readdirSync(`${out}/hyphenopoly/patterns`)
  .filter((f) => f.endsWith(".wasm"))
  .map((f) => f.replace(".wasm", ""));
const justifLangs = readdirSync(`${out}/justif/hyphenate`)
  .filter((f) => f.endsWith(".js") && f !== "liang.js")
  .map((f) => f.replace(".js", ""));
writeFileSync(`${out}/languages.json`, JSON.stringify({ hyphenopoly: hyphenopolyLangs, justif: justifLangs }));

console.log(`vendor: justif + ${hyphenopolyLangs.length} patrones Hyphenopoly copiados a ${out}/`);
