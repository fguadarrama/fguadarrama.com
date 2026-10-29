import { PDFDocument, PDFName, PDFRawStream, PDFHexString, beginText, endText, setFontAndSize, setTextMatrix, showText, setFillingRgbColor, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export async function createPDF(layout, fonts, title) {
  const pdf = await PDFDocument.create();
  // pdf-lib expects the old `cff` flag; current fontkit exposes the CFF table.
  // Embed the original OpenType font, with the correct PDF stream subtype.
  // CFF subsetting in this combination creates invalid fonts in some PDF readers.
  pdf.registerFontkit({ create(bytes) {
    const face = fontkit.create(bytes);
    if (face.directory.tables['CFF ']) face.cff = face['CFF '];
    return face;
  } });
  pdf.setTitle(title || 'Documento sin título');
  pdf.setCreator('lecturi · Justif');
  pdf.setProducer('lecturi — composición con Justif');
  pdf.setLanguage('es-MX');
  const used = new Set(layout.pages.flatMap(page => page.lines.flatMap(line => line.tokens.map(token => token.font))));
  const embedded = Object.fromEntries(await Promise.all([...used].map(async key => [key, await pdf.embedFont(fonts[key].bytes, { subset: false })])));
  const unicode = Object.fromEntries([...used].map(key => [key, new Map()]));
  const glyphWidths = Object.fromEntries([...used].map(key => [key, new Map()]));
  for (const composed of layout.pages) {
    const page = pdf.addPage([layout.width, layout.height]);
    const resources = Object.fromEntries([...used].map(key => [key, page.node.newFontDictionary(embedded[key].name, embedded[key].ref)]));
    for (const line of composed.lines) {
      for (const token of line.tokens) {
        const fontSize = token.size || line.size;
        const match = token.color.match(/[\d.]+/g) || ['28', '30', '30'];
        const color = match.slice(0, 3).map(channel => Math.max(0, Math.min(255, Number(channel))) / 255);
        const face = fonts[token.font].face;
        const shaped = face.layout(token.text);
        // Alternate glyphs may have misleading cmap aliases (notably Ysabeau).
        // Preserve the actual characters that produced each shaped glyph.
        shaped.glyphs.forEach(glyph => {
          if (glyph.codePoints.length) unicode[token.font].set(glyph.id, String.fromCodePoint(...glyph.codePoints));
          glyphWidths[token.font].set(glyph.id, glyph.advanceWidth * 1000 / face.unitsPerEm);
        });
        const encoded = embedded[token.font].encodeText(token.text).asString();
        const scale = fontSize / face.unitsPerEm;
        let x = token.x, y = layout.height - line.baseline;
        const operators = [beginText(), setFontAndSize(resources[token.font], fontSize), setFillingRgbColor(...color)];
        // drawText discards GPOS kerning. Place the shaped glyphs explicitly so
        // PDF advances match the measurements passed into Justif, including ligatures.
        shaped.positions.forEach((position, index) => {
          operators.push(setTextMatrix(1, 0, 0, 1, x + position.xOffset * scale, y + position.yOffset * scale),
            showText(PDFHexString.of(encoded.slice(index * 4, index * 4 + 4))));
          x += position.xAdvance * scale;
          y += position.yAdvance * scale;
        });
        page.pushOperators(...operators, endText());
      }
    }
    for (const rule of composed.rules || []) {
      const channels = rule.color.match(/[\d.]+/g).slice(0, 3).map(Number);
      page.drawLine({ start: { x: rule.x1, y: layout.height - rule.y1 }, end: { x: rule.x2, y: layout.height - rule.y2 },
        thickness: rule.thickness, color: rgb(...channels.map(value => value / 255)) });
    }
  }
  await pdf.flush();
  for (const key of used) {
    const entries = [...unicode[key]].map(([id, text]) => {
      const utf16 = Array.from({ length: text.length }, (_, i) => text.charCodeAt(i).toString(16).padStart(4, '0')).join('');
      return `<${id.toString(16).padStart(4, '0')}> <${utf16}>`;
    });
    const chunks = [];
    for (let i = 0; i < entries.length; i += 100) {
      const chunk = entries.slice(i, i + 100);
      chunks.push(`${chunk.length} beginbfchar\n${chunk.join('\n')}\nendbfchar`);
    }
    const cmap = `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /LecturiUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <ffff>\nendcodespacerange\n${chunks.join('\n')}\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`;
    const stream = pdf.context.register(pdf.context.flateStream(cmap));
    const dictionary = pdf.context.lookup(embedded[key].ref);
    dictionary.set(PDFName.of('ToUnicode'), stream);
    // GSUB alternates are absent from pdf-lib's cmap-based width collection.
    // Include the actual glyph IDs, otherwise copy/search invents word spaces.
    const widths = [...glyphWidths[key]].sort((a, b) => a[0] - b[0]).flatMap(([id, width]) => [id, [width]]);
    dictionary.lookup(PDFName.of('DescendantFonts')).lookup(0).set(PDFName.of('W'), pdf.context.obj(widths));
  }
  for (const [, object] of pdf.context.enumerateIndirectObjects()) {
    if (object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype')) === PDFName.of('CIDFontType0C')) {
      object.dict.set(PDFName.of('Subtype'), PDFName.of('OpenType'));
    }
  }
  return pdf.save();
}
