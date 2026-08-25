# Francisco Guadarrama — redesign tuning build v6

This is the current GitHub Pages tuning build. Open `index.html`; append `?debug=1` to expose the live debugger.

## This revision

- Applies the supplied English and Spanish word-level tuning.
- Replaces the previous radial trigger with the supplied Transitions.dev Gooey Plus Menu geometry/filter, adapted to five established destination icons. The main and satellite buttons remain 40 px; satellite icons are normalized to 16 px / 1.4 stroke.
- Removes the visible site name from the home screen.
- Vertically centers the introduction and adds desktop-left and mobile-side inset controls.
- Makes annotations line-aware so highlighted/underlined phrases wrap correctly on mobile instead of forcing horizontal overflow.
- Rebuilds double underline as two independently separated strokes.
- Adds size/weight controls for section headings, entry titles, body copy, dates, organization/type labels, contact actions and footer.
- Hides the fixed footer on mobile content sections to prevent it covering scrolling records.

The debugger persists locally and `Copy tuning` exports the current settings.
