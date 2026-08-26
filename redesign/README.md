# Francisco Guadarrama — redesign build v9

GitHub Pages-ready static build. Open `index.html`; append `?debug=1` to expose the live debugger.

## This revision

- Replaces the fully-open goo blob with five independent, identical circular radial controls so the fan cannot merge into a caterpillar shape.
- Repositions the mobile fan into the blank upper band, adds page-background label chips on mobile, and separates the section back control from the global radial trigger.
- Keeps the portrait minimize control transparent and renders its SVG in `#fdfdfc` in both light and dark themes, including the smoky-dissolve snapshot.
- Routes every procedural interface sound through a 0.65 master gain.
- Hardens the contact form with a real Formspree `action`, named form fields, stricter local e-mail validation, JSON error handling, and native-POST progressive enhancement if JavaScript submission is unavailable.
- Adds GitHub Pages-compatible discoverability files: `robots.txt`, `sitemap.xml`, `llms.txt`, JSON Feed, RSS Feed, and an agent-friendly `404.html`.
- Expands Open Graph/Twitter metadata and JSON-LD with `Person`, `WebSite`, and `ProfilePage`, including `dateModified`.
- Does not change the visible body text of the website.

## GitHub Pages limitations

Response-header features such as HTTP `Link` headers and content negotiation by `Accept: text/markdown` cannot be configured from a plain GitHub Pages repository. DNS-level discovery likewise has to be configured at the DNS provider rather than in this ZIP.
