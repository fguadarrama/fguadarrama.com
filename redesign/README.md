# fguadarrama.com redesign — tuning build

Static, GitHub Pages-ready website. No build step is required.

## Files
- `index.html` — semantic content and UI structure.
- `assets/site.css` — typography, radial navigation, responsive layout, settings, dialogs, annotations, tuner UI and motion.
- `assets/site.js` — navigation, browser-history behavior, theme/language settings, contact form, protected CV and live tuning controls.
- `assets/sounds.js` — standalone procedural sound player plus only the interface-sound recipes selected by the site owner.
- `THIRD_PARTY_NOTICES.md` — MIT notices for Opensource UI AnnotatedText and Procedural Sounds.
- `CNAME` — custom domain.

## Settings
The gear in the radial menu opens preferences for light/dark theme, English/Spanish and interface sounds. Preferences persist locally in the browser.

## Debug / text tuning
Open the site with `?debug=1`.

The live debugger supports:
- HEX and native color inputs for background, text and accent;
- global intro typography: weight, size, line height, letter spacing, word spacing, paragraph spacing and max width;
- word-by-word weight tuning directly on the homepage;
- continuous phrase selection with Shift-click;
- non-contiguous word selection with Command/Ctrl-click for weight changes;
- annotation style selection: highlight, underline, wavy underline, double underline, dotted underline, circle, arrow underline, bracket, box, strikethrough and cross-out;
- a separate HEX/color-picker value for each annotation when it is applied;
- reset controls and a **Copy tuning** button that copies the complete palette, typography and per-word tuning state as JSON.

### Word selection
1. Click a word in the homepage introduction.
2. Shift-click another word to select the continuous range between them.
3. Command/Ctrl-click individual words to add/remove them from a non-contiguous weight selection.
4. Change the weight control to update selected words live.
5. Annotations require a continuous selection contained within one paragraph.

Tuning changes are stored in `localStorage` for that browser. They are intentionally not written back to source files yet. Once the design is final, use **Copy tuning** and preserve that JSON so the selected values can be baked into the production build and the debugger can be removed.

## Existing services/assets
The contact form continues to post to the Formspree endpoint from the previous website.
The protected CV links point to the existing English and Spanish CV PDFs under `/assets/`.
