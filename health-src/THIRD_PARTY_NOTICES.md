# Lieflat Charts adaptations

The body-composition visualizer adapts Dot Cascade (templates/lupi-gallery.html),
Nested Treemap and Tick Gauge (templates/basics-gallery.html), and Aggregate
Sankey (templates/glance-gallery.html) from
https://github.com/larashero3-dotcom/lieflat-charts, commit eace082.

License: PolyForm Noncommercial 1.0.0
https://polyformproject.org/licenses/noncommercial/1.0.0/

This is a personal, noncommercial health visualizer. Keep these notices with
redistributions of the adapted code. Reassess licensing before commercial use.
The original project's example data is not included. Its animation timings,
stagger and curves are retained; typography, colors, labels and quantitative
encodings are adapted to the supplied measurements. Reduced motion is supported.

ECharts is licensed under Apache-2.0; its bundled license notices are retained.

# Bencho adaptations

Three components from Bencho (https://bencho.dev, license at
https://bencho.dev/licence) are adapted into this app:

- `src/components/MagnifyingDock.tsx` + `src/styles/dock.css` — Bencho's
  "Magnifying dock", driving the site header's navigation. The gesture,
  spring and tooltip code is kept close to the original; the generic
  five-item demo data is replaced with this site's six routes, wired to
  react-router, and the glass surface is swapped for this site's own flat,
  line-based one (see the adaptation comments in `dock.css`).
- `src/prototypes/weight/shared.tsx` (`WeightChart`) and
  `src/components/ParameterDrawer.tsx` (the parameter trend chart) —
  the "natural" (true cubic spline) curve interpolation and the
  one-tick-per-reading scrub sound are adapted from Bencho's "Pull to
  refresh" `Balance` component, reusing this site's own `lib/sounds`
  instead of new audio code.
- The password gate (`scripts/login-template.mjs`,
  `scripts/protect-index.mjs`) — the checking/success/failure
  choreography is adapted from Bencho's "One-time code": a breathing
  check, a merge into a confirmed pill with a checkmark on the right
  password, a shake-and-clear on the wrong one. The gate has one
  passphrase field, not digit cells, so the merge is between the
  password field and the submit button rather than Bencho's SVG goo
  filter across several cells — see the comment in `login-template.mjs`.

License: MIT (https://bencho.dev/licence). Keep these notices with
redistributions of the adapted code.

## Bencho One-time code — original seven-cell adaptation

The gate now uses the actual MIT One-time code source supplied by the owner,
including the goo filter, spring caret, digit swell, merge and rejection drain.
Original explanatory comments are retained in src/components/OneTimeCode.tsx
and src/styles/one-time-code.css. Adaptations: seven digits, corner 14, actual
AES-GCM verification, Albert Sans/local theme tokens, and Spanish labels.
Bencho deny and perk Web Audio presets use their original published values.
https://bencho.dev/licence

## Bencho Wake slider and Generate

MIT: https://bencho.dev/licence. Login entry uses the original notch preset
and positional pitch mapping from Wake slider. Generate's supplied source
is adapted to SVG charts: three-second reveal, ripple 50, PAPER 0.9, blur
20 to 1.6, three appearance windows, no percentage or decorative flower.
Comments and attribution are retained in src/lib/chart-reveal.ts.

## Bencho Pull — chart hover audio

MIT: https://bencho.dev/licence. Replaces the previously tested Generate
chart reveal. Uses Pull's exact drag preset, positional pitch scaling and
150ms rate limit. Rendered line height determines the pitch; no chart
loading filter, delay or animation is added.
