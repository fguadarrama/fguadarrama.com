# fguadarrama.com redesign

Static, GitHub Pages-ready website. No build step is required.

## Files
- `index.html` — semantic content and UI structure.
- `assets/site.css` — typography, radial menu, responsive layout, dialogs, annotations.
- `assets/site.js` — navigation, transitions, language switching, contact form, protected CV and debug palette.
- `THIRD_PARTY_NOTICES.md` — license notice for the adapted AnnotatedText component.
- `CNAME` — custom domain.

## Debug palette
Open the site with `?debug=1`. The panel exposes exactly the three palette variables:
`--bg`, `--text`, and `--accent`.

## Existing services/assets
The contact form continues to post to the Formspree endpoint from the previous website.
The protected CV links point to the existing English and Spanish CV PDFs under `/assets/`.
