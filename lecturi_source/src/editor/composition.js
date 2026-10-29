// Shared, point-based layout: preview and PDF consume this exact output.
// No browser justification and no second line-breaking pass during export.
import { buildItems, breakParagraph, layoutLines, defaultBuildOptions, defaultBreakOptions, ItemType, latinProtrusion } from 'justif/core';
import { hyphenateEs } from 'justif/hyphenate/es';
import fontkit from '@pdf-lib/fontkit';

export const FONT_FILES = {
  regular: 'Coelacanth.otf', bold: 'Coelacanth-Bold.otf',
  italic: 'Coelacanth-It.otf', boldItalic: 'Coelacanth-BoldIt.otf',
};
export const FONT_FAMILIES = {
  coelacanth: { name: 'Coelacanth', files: FONT_FILES },
  ysabeau: { name: 'Ysabeau', files: { regular: 'Ysabeau-Regular.ttf', bold: 'Ysabeau-Bold.ttf', italic: 'Ysabeau-Italic.ttf', boldItalic: 'Ysabeau-BoldItalic.ttf' } },
};
export const PAPER = { letter: [612, 792], a4: [595.276, 841.89] };
const fontPromises = new Map();
export function loadFonts(family = 'coelacanth') {
  if (!FONT_FAMILIES[family]) family = 'coelacanth';
  if (!fontPromises.has(family)) fontPromises.set(family, Promise.all(Object.entries(FONT_FAMILIES[family].files).map(async ([key, file]) => {
    const response = await fetch(`${import.meta.env.BASE_URL}fonts/${file}`);
    if (!response.ok) throw new Error(`No se pudo cargar la fuente ${file}.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    return [key, { bytes, face: fontkit.create(bytes) }];
  })).then(Object.fromEntries).catch(error => { fontPromises.delete(family); throw error; }));
  return fontPromises.get(family);
}

export function composeDocument(blocks, settings, fonts) {
  const [width, height] = PAPER[settings.paper] || PAPER.letter;
  const { size, leading, margin } = settings;
  const usableWidth = width - 2 * margin;
  const bottom = height - margin;
  const capacity = height - 2 * margin;
  const pages = [{ lines: [], rules: [] }];
  let page = pages[0], top = margin, composedParagraphs = 0, overfull = 0;
  const cache = new Map();
  const hyphenFor = key => fonts[key].face.hasGlyphForCodePoint(0x2010) ? '‐' : '-';
  const measure = (text, key, fontSize) => {
    const id = `${key}:${fontSize}:${text}`;
    if (!cache.has(id)) {
      const face = fonts[key].face;
      cache.set(id, face.layout(text).positions.reduce((sum, glyph) => sum + glyph.xAdvance, 0) * fontSize / face.unitsPerEm);
    }
    return cache.get(id);
  };
  const newPage = () => { page = { lines: [], rules: [] }; pages.push(page); top = margin; };
  const rule = (x1, y1, x2, y2, color = 'rgb(48, 56, 64)', thickness = .5) => page.rules.push({ x1, y1, x2, y2, color, thickness });
  function paragraphLines(block, availableWidth, inCell = false) {
    const source = (block.runs || []).map(run => ({ ...run, size: run.size || size }));
    if (!source.some(run => run.text.trim())) return [{ tokens: [], height: size * leading, baseline: size, size }];
    const maxSize = Math.max(...source.map(run => run.size));
    const justified = (block.align || 'justify') === 'justify';
    const indent = !inCell && settings.indent && !block.list && !block.heading ? size * 1.5 : 0;
    const widths = indent ? [availableWidth - indent, availableWidth] : availableWidth;
    const runs = source.map((run, i) => {
      const space = measure(' ', run.font, run.size);
      return { fontKey: String(i), familyKey: settings.family || 'coelacanth',
        noHyphens: !justified || block.heading || run.size > size * 1.25,
        space: { width: space, stretch: space * .5, shrink: justified ? space / 3 : 0 },
        hyphenWidth: measure(hyphenFor(run.font), run.font, run.size), ratioAtMax: 1, ratioAtMin: 1 };
    });
    const options = { ...defaultBuildOptions, hyphenate: hyphenateEs, expansion: false, tracking: false,
      protrusion: justified ? latinProtrusion : false, lastLineMinWidth: justified ? .33 : 0 };
    const para = buildItems(source.map((run, i) => ({ text: run.text.normalize('NFC'), run: i })), runs, options, {
      width: (text, metrics) => { const run = source[Number(metrics.fontKey)]; return measure(text, run.font, run.size); },
      charAdvance: (text, metrics) => { const run = source[Number(metrics.fontKey)]; return measure(text, run.font, run.size); },
    });
    const breaks = breakParagraph(para, widths, { ...defaultBreakOptions, lastLineMinWidth: options.lastLineMinWidth });
    const lines = layoutLines(para, breaks, widths, options);
    composedParagraphs++;
    return lines.map((line, lineIndex) => {
      const ratio = justified ? line.glueRatio : 0;
      let x = justified ? -line.leftHang : 0;
      const tokens = [];
      for (let i = line.start; i < line.end; i++) {
        const item = para.items[i], style = source[item.run] || source[0];
        if (item.type === ItemType.Box) {
          tokens.push({ ...style, text: item.text, x, width: item.width }); x += item.width;
        } else if (item.type === ItemType.Glue) {
          const advance = item.width + ratio * (ratio >= 0 ? item.stretch : item.shrink);
          if (!item.stretchFil) tokens.push({ ...style, text: ' ', x, width: advance });
          x += advance;
        }
      }
      if (line.hyphenated && tokens.length) {
        const last = tokens.at(-1), text = hyphenFor(last.font), advance = measure(text, last.font, last.size);
        tokens.push({ ...last, text, x, width: advance }); x += advance;
      }
      const offset = block.align === 'right' ? line.width - x : block.align === 'center' ? (line.width - x) / 2 : 0;
      const active = tokens.length ? tokens : source;
      const ascent = Math.max(...active.map(run => fonts[run.font].face.ascent / fonts[run.font].face.unitsPerEm * run.size));
      const descent = Math.max(...active.map(run => -fonts[run.font].face.descent / fonts[run.font].face.unitsPerEm * run.size));
      const lineSize = Math.max(...active.map(run => run.size));
      const lineHeight = Math.max(lineSize * leading, ascent + descent + lineSize * .1);
      if (line.overfull || x > line.width + line.rightHang + .1) overfull++;
      return { tokens: tokens.map(token => ({ ...token, x: token.x + offset + (lineIndex === 0 ? indent : 0) })),
        height: lineHeight, baseline: (lineHeight - ascent - descent) / 2 + ascent, size: lineSize };
    });
  }
  function placeLine(line, origin, y, marker) {
    const tokens = line.tokens.map(token => ({ ...token, x: token.x + origin }));
    if (marker) tokens.unshift(marker);
    const baseline = y + line.baseline;
    page.lines.push({ tokens, baseline, size: line.size });
    for (const token of tokens) if (token.underline && token.width > 0) {
      rule(token.x, baseline + token.size * .13, token.x + token.width, baseline + token.size * .13, 'rgb(235, 21, 92)', Math.max(.6, token.size * .045));
    }
  }
  const markerInsets = new Map();
  for (const block of blocks) if (block.list && block.marker) {
    const id = block.listId ?? `depth-${block.listDepth || 0}`;
    markerInsets.set(id, Math.max(markerInsets.get(id) || 0, measure(block.marker, 'regular', size) + size * .6));
  }
  function placeParagraph(block) {
    const depth = block.list ? (block.listDepth || 0) + 1 : 0;
    let inset = depth * size * 1.7;
    if (block.list) inset = Math.max(inset, (block.listDepth || 0) * size * 1.7 + (markerInsets.get(block.listId ?? `depth-${block.listDepth || 0}`) || 0));
    const available = Math.max(size * 3, usableWidth - inset);
    const lines = paragraphLines(block, available);
    if (lines.length > 1 && top + lines[0].height + lines[1].height > bottom && page.lines.length) newPage();
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (top + line.height > bottom) newPage();
      if (lines.length - i === 2 && top + line.height + lines[i + 1].height > bottom && page.lines.length) newPage();
      const marker = !i && block.marker ? { text: block.marker, listMarker: true, x: margin + inset - size * .5 - measure(block.marker, 'regular', size), font: 'regular', color: 'rgb(48, 56, 64)', size } : null;
      placeLine(line, margin + inset, top, marker);
      top += line.height;
    }
    top += size * (block.list ? .3 : .7);
  }
  function placeTable(table) {
    const columns = Math.max(1, ...table.rows.map(row => row.cells.length));
    if (columns > 8) throw new Error('La tabla admite hasta 8 columnas.');
    const cellWidth = usableWidth / columns, padding = 7;
    const prepared = table.rows.map(row => {
      const cells = row.cells.map(cell => {
        const result = [];
        for (const block of cell.blocks || []) {
          if (block.kind === 'table') throw new Error('No se admiten tablas dentro de otras tablas.');
          const styled = cell.header ? { ...block, runs: block.runs.map(run => ({ ...run, font: run.font.includes('Italic') || run.font === 'italic' ? 'boldItalic' : 'bold' })) } : block;
          result.push(...paragraphLines(styled, cellWidth - 2 * padding, true));
        }
        return result.length ? result : paragraphLines({ runs: [] }, cellWidth - 2 * padding, true);
      });
      // A shared row grid keeps all cell fragments aligned when a tall row splits.
      const slot = Math.max(size * leading, ...cells.flat().map(line => line.height));
      return { cells, slot, count: Math.max(...cells.map(lines => lines.length)), header: row.cells.every(cell => cell.header) };
    });
    const header = prepared[0]?.header ? prepared[0] : null;
    function drawRow(row, start, count) {
      const rowHeight = count * row.slot + 2 * padding;
      for (let column = 0; column < columns; column++) {
        const lines = row.cells[column] || [];
        for (let i = start; i < Math.min(lines.length, start + count); i++) {
          const line = lines[i];
          placeLine(line, margin + column * cellWidth + padding, top + padding + (i - start) * row.slot + (row.slot - line.height) / 2);
        }
      }
      rule(margin, top, width - margin, top);
      rule(margin, top + rowHeight, width - margin, top + rowHeight);
      for (let column = 0; column <= columns; column++) rule(margin + column * cellWidth, top, margin + column * cellWidth, top + rowHeight);
      top += rowHeight;
    }
    function turnPage(repeatHeader = true) {
      newPage();
      if (repeatHeader && header && header.count * header.slot + 2 * padding < capacity / 3) drawRow(header, 0, header.count);
    }
    for (let rowIndex = 0; rowIndex < prepared.length; rowIndex++) {
      const row = prepared[rowIndex], total = row.count * row.slot + 2 * padding;
      const headerHeight = header && rowIndex > 0 ? header.count * header.slot + 2 * padding : 0;
      if (total <= capacity - Math.min(headerHeight, capacity / 3)) {
        const nextHeight = rowIndex === 0 && header && prepared[1] ? Math.min(prepared[1].slot + 2 * padding, capacity / 3) : 0;
        if (top + total + nextHeight > bottom) turnPage(rowIndex > 0);
        drawRow(row, 0, row.count);
      } else {
        let start = 0;
        while (start < row.count) {
          let count = Math.floor((bottom - top - 2 * padding) / row.slot);
          if (count < 1) { turnPage(rowIndex > 0); count = Math.floor((bottom - top - 2 * padding) / row.slot); }
          if (count < 1) throw new Error('Reduce el tamaño del texto de la tabla para que quepa en la página.');
          count = Math.min(count, row.count - start);
          drawRow(row, start, count); start += count;
          if (start < row.count) turnPage(rowIndex > 0);
        }
      }
    }
    top += size * .8;
  }
  for (const block of blocks) {
    if (block.kind === 'table') placeTable(block);
    else if (block.kind === 'rule') { if (top + 14 > bottom) newPage(); rule(margin, top + 7, width - margin, top + 7); top += 20; }
    else placeParagraph(block);
  }
  while (pages.length > 1 && !pages.at(-1).lines.length && !pages.at(-1).rules.length) pages.pop();
  return { width, height, pages, composedParagraphs, overfull };
}
