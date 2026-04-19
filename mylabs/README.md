# Laboratorios · Personal lab-results visualizer

A private, single-page web app that visualizes your lab results over time and
generates PDF reports to share with doctors.

- **Data source of truth:** `lab_data.xlsx` in the project root
- **Rendered at build time** into a small JSON file bundled with the site
- **Deployed to GitHub Pages** via the included GitHub Actions workflow
- **Local-first**: once deployed, the site runs entirely in the browser with
  no backend or server calls

## Stack

- React 18 + TypeScript + Vite
- Recharts for line charts (smooth monotone curves + reference bands)
- Framer Motion for page transitions
- `goey-toast` for notifications
- `@react-pdf/renderer` for client-side PDF export
- Ysabeau + Space Grotesk (Google Fonts)

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
```

`npm run dev` auto-runs `scripts/build-data.mjs`, which reads `lab_data.xlsx`
and produces `src/data/lab-data.json`.

## Adding new lab data

1. Run the parser (`parse_labs.py` from the earlier phase of this project)
   against your new PDFs to produce an updated `lab_data.xlsx`.
2. Copy the new xlsx to the project root, overwriting the old one.
3. Commit and push — the GitHub Actions workflow rebuilds and redeploys.

For local iteration:

```bash
npm run prebuild:data   # rebuild src/data/lab-data.json
npm run dev             # picks up changes
```

## Deploying to GitHub Pages

1. Create a new public repository on GitHub (e.g. `lab-viz`).
2. Push this project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
3. Go to **Settings → Pages** and set **Source: GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` runs on every push to
   `main` and publishes to `https://<you>.github.io/<repo>/`.

If your repo is *not* named `<you>.github.io` (i.e. not a user/org page),
you may need to change `base` in `vite.config.ts` from `'./'` to
`'/<repo>/'` — but `'./'` works for both cases in most setups.

### Custom domain

Create a `public/CNAME` file with your domain (one line, no scheme).

## Project structure

```
lab-viz/
├── lab_data.xlsx              ← source of truth (from parse_labs.py)
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── scripts/
│   └── build-data.mjs         ← reads xlsx → JSON at build time
├── src/
│   ├── main.tsx               ← mounts React + GoeyToaster
│   ├── App.tsx                ← routing, header, layout
│   ├── data/
│   │   └── lab-data.json      ← generated (gitignored)
│   ├── lib/
│   │   ├── types.ts
│   │   ├── data.ts            ← selectors, formatters, isOutOfRange
│   │   └── pdf.tsx            ← PDF report component
│   ├── pages/
│   │   ├── Dashboard.tsx      ← 3 latest dates side by side
│   │   ├── Browse.tsx         ← searchable category-grouped list
│   │   ├── ParameterDetail.tsx ← chart + table + summary
│   │   └── ReportBuilder.tsx  ← date picker → PDF download
│   └── styles/
│       └── tokens.css         ← design system
└── .github/workflows/
    └── deploy.yml
```

## Design notes

- **Colors:** `#f6f7fc` (background), `#062540` (ink), `#FF1D58` (abnormal).
  The palette is applied via CSS custom properties; search the codebase for
  `--bg`, `--ink`, `--alarm` to modify.
- **Fonts:** Ysabeau for UI, Space Grotesk for numeric values. Both loaded
  from Google Fonts in `index.html`.
- **Reference bands:** charts show the Mexican-lab consensus range by default.
  A toggle above each chart switches to the per-visit lab range (if the PDF
  reported one) or to international guideline targets (ESC/EAS for lipids,
  ADA for diabetes, KDIGO for kidney, etc.).
- **Abnormal detection:** a result is flagged either because the lab marked
  it (`abnormal_flag=true`) or because `value_numeric` falls outside the ref
  band from the result itself, then the parameter's lab ref, then the
  guideline target — in that priority order.

## Privacy

This site is served as static files. No analytics, no backend, no third-party
calls beyond the Google Fonts CDN and the jsDelivr CDN for fonts used in the
PDF. If you want to block even those, self-host the fonts and replace the
CDN URLs in `index.html` and `src/lib/pdf.tsx`.

## License

Personal project. No warranty. Not medical advice.
