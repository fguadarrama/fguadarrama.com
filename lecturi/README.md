# Lecturi

Lector de EPUB para el navegador con composición tipográfica **Knuth–Plass** (Justif),
separación silábica (Hyphenopoly) y protrusión de márgenes.
Se publica en **https://fguadarrama.com/lecturi/**.

---

## 1. Probarlo en tu computadora

Necesitas [Node.js](https://nodejs.org) 22 o superior. En una terminal, dentro de esta carpeta:

```bash
npm install      # solo la primera vez
npm run dev      # abre http://localhost:5173/lecturi/
```

Arrastra un `.epub` a la ventana.

## 2. Publicar en GitHub Pages (automático)

1. Crea en GitHub un repositorio llamado **`lecturi`**, en la misma cuenta cuyo sitio de usuario
   ya sirve `fguadarrama.com`. GitHub Pages sirve los repositorios de proyecto en
   `fguadarrama.com/<nombre-del-repo>/`, así que no hace falta otro CNAME.
2. Sube esta carpeta a la rama `main`.
3. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Listo. Cada `git push` a `main` ejecuta `.github/workflows/deploy.yml`, que compila y publica.

Alternativa manual (sin Actions): `npm run deploy` publica `dist/` en la rama `gh-pages`.
En ese caso elige *Source: Deploy from a branch → gh-pages*.

### Scripts de `package.json`

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor local con recarga automática |
| `npm run build` | Compila en `dist/` (con `base: '/lecturi/'`) |
| `npm run preview` | Sirve `dist/` para comprobar la versión final |
| `npm run deploy` | Compila y publica `dist/` en la rama `gh-pages` |
| `npm run vendor` | Copia Justif y los patrones de Hyphenopoly a `public/vendor/` (se ejecuta solo antes de `dev` y `build`) |

---

## 3. Cómo se integró Justif sobre epub.js

**Regla del proyecto: todo el texto lo compone Justif.** epub.js solo abre el archivo y reparte
en páginas el resultado. No existe un modo de «justificación nativa».

```
 .epub ──► epub.js abre el zip y prepara cada capítulo
            │
            ├─ (1) prepareChapter()  src/reader.js
            │      · elimina los <script> y atributos on* del EPUB
            │      · inyecta la hoja de estilo de Lecturi (fuente, tamaño, colores)
            │      · inyecta <script src="justif-frame.js">
            ▼
       iframe del capítulo  (oculto hasta que Justif termina)
            │
            ├─ (2) justif-frame.js   public/justif-frame.js
            │      · importa Justif dentro del propio iframe
            │      · agrupa los párrafos por idioma (atributo lang del EPUB)
            │      · pide a la página principal el silabeador de Hyphenopoly
            │      · justify(párrafos, { hyphenate, protrusion, hangingPunctuation, … })
            │      · espera a las fuentes definitivas → avisa a la página principal
            ▼
       página principal
            · (3) restaura la posición de lectura exacta (ancla) y muestra el capítulo
```

**Por qué Justif corre dentro del iframe.** Justif mide con `canvas` y `document.fonts`, y
comprueba `elemento instanceof HTMLElement`. Un párrafo del iframe pertenece a otro «mundo»
de JavaScript, así que, llamado desde la página principal, Justif lo ignoraría. Para que el
script pueda ejecutarse se activa `allowScriptedContent` en epub.js. A cambio, se borra todo
script que traiga el propio EPUB, de modo que solo se ejecuta código de Lecturi.

**Hyphenopoly + Justif, sin conflicto.** Hyphenopoly no toca el DOM: se usa como *motor*.
Su resultado («jus­ti­fi­ca­ción», con guiones blandos) se divide en fragmentos
`["jus","ti","fi","ca","ción"]`, que es exactamente lo que espera la opción `hyphenate` de
Justif (`src/hyphenation.js`). Los patrones `.wasm` (75 idiomas) se cargan bajo demanda. Si
Hyphenopoly fallara, se usan los patrones TeX que trae Justif.

**Ancla de lectura.** epub.js guarda la posición como un CFI (una ruta por el DOM). Justif
reescribe el interior de cada párrafo en líneas, y al cambiar el ancho epub.js recrea el
iframe. Un CFI antiguo deja entonces de apuntar a nada. Por eso la posición se guarda como
**párrafo + número de carácter**. Tras cada recomposición se vuelve a la página que contiene ese
carácter. Verificado al cambiar tamaño, fuente, interlineado, márgenes y ventana, al navegar
entre capítulos y al recargar.

**Caso límite resuelto.** Si un párrafo cabe en una línea comprimiendo espacios, Justif
normalmente lo deja al navegador, que no comprime y lo parte en dos líneas mal espaciadas.
`justif-frame.js` detecta esos párrafos y los recompone con Justif con una compresión más
estricta.

### Qué queda fuera de Justif (por diseño de Justif)

- Párrafos de **una sola línea** (p. ej., un elemento corto de una lista): no hay nada que
  justificar y el resultado es idéntico.
- Párrafos que el EPUB **centra** o alinea a un lado: Justif solo compone texto justificado.
- Elementos que Justif declara no compatibles (imágenes dentro del flujo de texto, texto mixto
  izquierda-derecha, etc.). Se listan en la consola del navegador y el panel *Tipografía*
  muestra el recuento del capítulo.
- **Limitación conocida:** Justif no corta dentro de URLs largas, de modo que una nota con una
  URL indivisible puede dejar una línea muy espaciada (con la maquetación nativa ocurre lo mismo).

---

## 4. Diseño

- **Fuentes:** EB Garamond, Cormorant Garamond, Space Grotesk e Instrument Serif (Google Fonts).
  **Junicode no está en Google Fonts** (verificado): se aloja en `public/fonts/` (v2.003,
  licencia OFL, del repositorio oficial `psb1558/Junicode-font`). Es variable con eje de
  anchura, que Justif aprovecha para ajustes microtipográficos de cada línea.
- **Colores:** Nyūhaku-iro `#F3F3F3` (por defecto), Shironeri `#FDFBF6`, Oscuro
  `rgb(27,28,29)`. Texto `rgb(28,30,30)`. Acentos `rgb(67,146,186)` y `rgb(235,21,92)`, siempre
  al 100 % (sin transparencias).
- **Animaciones** (View Transitions API): el nuevo color se revela en un círculo desde el botón
  pulsado y la nueva fuente con un barrido guiado por una línea azul. Sin fundidos: los colores
  nunca se mezclan. En navegadores sin esa API se usan transiciones CSS de color.
- **Teclado:** ← → (o Espacio) para pasar página, **T** abre el índice, **A** la tipografía,
  **Esc** cierra los paneles. En móvil: deslizar el dedo.
- **Persistencia:** preferencias y progreso en `localStorage`. El último libro se guarda en
  IndexedDB para «Continuar leyendo». Nada sale del navegador.

## 5. Estructura

```
index.html              estructura de la interfaz
src/main.js             interfaz: paneles, índice, progreso, animaciones, arrastrar y soltar
src/reader.js           epub.js + inyección por capítulo + ancla de lectura
src/hyphenation.js      Hyphenopoly como silabeador de Justif
src/config.js           fuentes, temas, valores por defecto
src/storage.js          localStorage + IndexedDB
src/styles.css          estilos de la interfaz
public/justif-frame.js  Justif dentro de cada capítulo
public/fonts/           Junicode (OFL)
scripts/copy-vendor.mjs copia Justif y Hyphenopoly a public/vendor/
.github/workflows/      despliegue automático en GitHub Pages
```

Versiones fijadas: epub.js 0.3.93 · Justif 0.9.2 · Hyphenopoly 6.1.0 · Vite 6.
