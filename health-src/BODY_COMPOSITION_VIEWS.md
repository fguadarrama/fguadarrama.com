# Body-composition review build

Reviewed locally; publication approved by the owner on 2026-09-27 after smoothing the weight trend.

## Visual encoding

- **Landing view:** smooth monotone-X curves through the original weight and fat-free-mass points, with identical interpolation on both edges of the fat-mass band. Preserves local extrema without spline overshoot. Weight trend beside the latest complete body-composition Big Slice. On narrow screens the panels stack.
- **Big Slice:** the angle encodes each fraction's mass divided by the recorded total weight. All sectors have a common outer radius: no second independent intensity metric exists in these data. The unassigned residual is a separate white outlined slice. Adapted from Lieflat G13 with its 900 ms cubicOut radial expansion and 130 ms stagger, not a scale/fade substitute. Available in the gallery as well; Petal Rose is retained.
- **Petal Rose:** four equal-angle annular sectors. Squared radius minus the squared inner radius is proportional to mass, so the visible sector area encodes kg, not radius. No invented components or redistribution of unassigned mass.
- **Temporal Sankey comparison:** connect like components between two selected dates. Each endpoint uses the same kg-to-thickness scale. Taper shows the measured difference, not an inferred transfer between tissues. This is a comparison/alluvial diagram, not a mass-conserving physiological flow model.
- **Mass series:** common zero-based kg axis, actual timestamps, straight segments, measured points only. Useful for comparing absolute change.
- **Percentage series:** original device percentages on one axis. Useful alongside kg because a percentage can rise while mass falls. No forced normalization to 100%.
- **Stacked bars:** each dated bar sums to recorded weight. The unassigned residual is retained as a white outlined segment. Useful for total change and the contribution of each measured fraction; not as precise as aligned lines for individual trends.
- **Nested Treemap:** actual areas, a parent bracket for fat-free mass, numeric labels on all measured rectangles and a connected label for the narrow residual. No minimum-area inflation to fit labels.
- Existing Dot Cascade, Tick Gauge and single-date Aggregate Sankey remain available.

Muscle, skeletal muscle and fat-free mass are overlapping device metrics, not extra additive fractions. The four-fraction composition graphs use only the four reported breakdowns. The landing trend additionally shows fat-free mass: reported values take precedence; otherwise it is calculated as weight × (1 − body-fat percentage / 100). Missing percentages produce gaps, not invented data. Tooltips distinguish reported and calculated masses. The pink band is total weight minus fat-free mass; source records are never modified.

## Report and validation

The download includes every weight record, all available composition metrics, original percentages, explicit missing readings, a weight trend, a latest-composition Big Slice and a composition trend. Additional records paginate without being truncated. Times remain stored but are not shown. The requested explanatory paragraphs have been removed; the comparison table is titled “Composición corporal”.

Albert Sans is embedded with its Latin glyph subset (the Latin-ext-only subset silently fell back to Helvetica for ordinary text). All graph labels use the same font. The report is generated locally in the browser; it is not uploaded.

Validation: TypeScript/build, source inventory and mass-balance tests, rose-area proportionality tests, cache-merge preservation, PDF generation/font fallback regression, rendered PDF inspection, desktop/mobile browser checks, data-entry field alignment and Git privacy audit. Private data and generated PDFs remain ignored by Git.

Lieflat's animation timing/stagger takes precedence over general Emil recommendations, as requested. The user's reduced-motion preference remains supported.

## Color and favicon verification

The approved visual target is the vivid Pika “Sizzling Watermelon” swatch. Canonical data color remains #eb155c; display-capable browsers use color(display-p3 0.9215686275 0.0823529412 0.3607843137), a deliberate wide-gamut reinterpretation requested after visual review. Standard-gamut screens and the PDF use the vivid sRGB approximation #ff0059, not a promise of identical out-of-gamut reproduction. Lean-mass line: #5e33fe. Text stays opaque #2d2930; only the explicitly requested band uses a translucent fill.

Lab accents follow the new six-color palette. The existing section order is preserved, alternating cool and warm hues. Light orange, yellow, green, cyan and pink accents have darker same-hue text/control variants checked at >=4.5:1 against both white and the page background. Source of truth: src/lib/palette.ts and CSS category tokens, checked by scripts/test-palette.mjs.

The scan-heart icon has a rgb(246,247,252) background, the vivid pink heart and #3A2EB4 contour. The header and encrypted wrapper reuse the same self-contained favicon URI. No release has been generated or published during local review.

Big Slice sectors are separated by an 8-unit radial translation, without reducing their data-encoded angles. The PDF uses a compact circle with a five-row aligned mass legend below it, avoiding label collisions. The weight table heading no longer includes a record count.
