# Francisco Guadarrama — redesign tuning build v8

GitHub Pages-ready build. Open `index.html`; append `?debug=1` to expose the live debugger.

## This revision

- Applies the supplied English and Spanish word-level tuning and the supplied light palette/typography defaults.
- Keeps the Spanish final statement as one line-aware underline stroke per rendered line.
- Reworks the Transitions.dev Gooey Plus Menu into a substantially wider five-action lower-left fan so labels and buttons no longer crowd each other.
- Optically aligns the radial trigger's right inset with the introduction's left inset on desktop; the same rule collapses to the mobile hero inset.
- Keeps the `+` surface on the page background and enlarges activated satellite icons to the same 20 px size as the `+`.
- Replaces the portrait close `X` with the requested 24 px Lucide minimize SVG, with no backing circle, and updates only the smoky-dissolve snapshot painter to match it.
- Adds a Transitions.dev-style 500 ms text reveal with 40 ms capped stagger on every section entry, a quiet 200 ms exit, and reduced-motion handling.
- Reduces footer contrast substantially.
- Preserves the generated `FG` SVG-data favicon, GitHub Pages files, portrait sizing, tilt behavior, and smoky-dissolve motion.

The debugger persists locally and `Copy tuning` exports the current settings.
