# Deploy guide — fguadarrama.com/mylabs/ (v3)

Changes in this version:

- Site renamed: **Historial médico | FGC**
- Hero section ("Resultados consolidados / 637 resultados / …") removed
- **Patient strip** (name · DOB · edad · CURP) always visible in the header
- Dashboard table dates are now **horizontal** (`18.abr.26` format), no more diagonal text
- Category panels redesigned: **white body**, thin colored top stripe + left border, accent-colored title — much quieter than before
- **Diabetes merged into Química sanguínea** (HbA1c sits right below glucose)
- **Removed**: grupo sanguíneo, Widal, Weil-Felix, Brucella (obsolete febrile agglutinations)
- **New category**: Panel infeccioso (HIV, PPD readings)
- **Orina + LCR** render as collapsed panels at the bottom under "Secciones secundarias"
- **Chart export**: small download icon in the drawer generates a landscape PDF with the chart + full data table (dates, lab, value, reference)
- **PDF reference column** widened and right-padded to prevent the "d100 / a00 / d30" clipping from the previous version
- **Report builder** simplified: checkbox per category, no explanatory paragraph, generates a PDF with only the categories you pick
- **Mobile layout** tightened: more breathing room, no squished tables, legible dates
- New xlsx (through 2026-04-18) integrated: 650 results, 138 parameters, 14 dates

## Deploy in 3 commands

```bash
# 1. Unzip this package
unzip lab-viz-deploy.zip

# 2. Clean old app files in mylabs/ (try.txt and other files stay)
rm -f /path/to/fguadarrama.com/mylabs/index.html
rm -rf /path/to/fguadarrama.com/mylabs/assets

# 3. Drop new files in, commit, push
cp -r lab-viz-dist/* /path/to/fguadarrama.com/mylabs/
cd /path/to/fguadarrama.com
git add mylabs/
git commit -m "Lab visualizer v3"
git push
```

Updates at https://fguadarrama.com/mylabs/ in 30-60 seconds.

## Update data later

```bash
unzip lab-viz-source.zip
cd lab-viz
cp /path/to/new/lab_data.xlsx .
npm install          # first time only
npm run build
rm -f /path/to/fguadarrama.com/mylabs/index.html
rm -rf /path/to/fguadarrama.com/mylabs/assets
cp -r dist/* /path/to/fguadarrama.com/mylabs/
cd /path/to/fguadarrama.com && git add mylabs/ && git commit -m "Update labs" && git push
```

## Customizing

- **Category colors**: `src/styles/tokens.css`, search `--cat-`. sRGB in `:root`, P3 variants inside the `@supports` block.
- **Hide more parameters**: `scripts/build-data.mjs`, add canonicals to `HIDDEN_CANONICALS`.
- **Reorder parameters in a category**: `scripts/build-data.mjs`, `CUSTOM_SORT_WEIGHTS`. Lower number = earlier.
- **Remap categories**: same file, `CATEGORY_REMAP`.
- **Collapsible categories**: `src/lib/data.ts`, `COLLAPSIBLE_CATEGORIES`.

## Known limitations

- Landscape single-parameter PDF uses vector SVG (react-pdf's `<Svg>` primitives). If it renders blank for some reason, tell me and I'll switch to a raster-based approach.
- PDF fonts come from jsDelivr CDN; fall back to Helvetica silently if blocked.
- Visual QA still happens on your devices — if anything looks off, screenshot it.
