# fguadarrama.com redesign

Static, GitHub Pages-ready website. No build step is required.

## Files
- `index.html` — semantic content and UI structure.
- `assets/site.css` — typography, radial navigation, responsive layout, settings, dialogs, annotations and motion.
- `assets/site.js` — navigation, browser-history return-to-home behavior, theme/language settings, contact form, protected CV and debug controls.
- `assets/sounds.js` — standalone procedural sound player plus only the interface-sound recipes selected by the site owner.
- `THIRD_PARTY_NOTICES.md` — MIT notices for Opensource UI AnnotatedText and Procedural Sounds.
- `CNAME` — custom domain.

## Settings
The gear in the radial menu opens a compact preferences panel for light/dark theme, English/Spanish, and interface sounds. Preferences persist locally in the browser.

## Returning home
The radial menu always exposes Home when another section is active, the name in the upper-left is a Home control, and browser Back also restores the previous section/home state.

## Debug panel
Open the site with `?debug=1`.

The live debugger supports:
- color pickers and direct HEX entry for background, text and accent;
- free-text selection of the intro phrase used by each annotation style;
- intro font weight, size, line height, letter spacing, word spacing, paragraph spacing and max width;
- reset and copy-CSS controls.

Debug changes are stored in `localStorage` for that browser only; they do not rewrite the source files.

## Existing services/assets
The contact form continues to post to the Formspree endpoint from the previous website.
The protected CV links point to the existing English and Spanish CV PDFs under `/assets/`.
