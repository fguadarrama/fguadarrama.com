import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';
import { composeDocument, FONT_FILES, FONT_FAMILIES } from '../src/editor/composition.js';
import { PALETTE, allowedColor } from '../src/editor/palette.js';
import { documentBlocks, blockText } from '../src/editor/model.js';
import { createPDF } from '../src/editor/pdf.js';

const fonts = Object.fromEntries(Object.entries(FONT_FILES).map(([key, file]) => {
  const bytes = new Uint8Array(readFileSync(`public/fonts/${file}`));
  return [key, { bytes, face: fontkit.create(bytes) }];
}));
const settings = { paper: 'letter', size: 12, leading: 1.45, margin: 70.87 };
const text = '¡Qué alegría escribir en español! La composición tipográfica cuida la separación silábica, la puntuación y los márgenes. Árbol, corazón, acción, niñez y pingüino: áéíóú ÁÉÍÓÚ ü Ü ñ Ñ ¿Cómo estás?';
const block = (align = 'justify', font = 'regular') => ({ align, runs: [{ text, font, color: 'rgb(28, 30, 30)' }] });
const clean = text => text.replace(/[\s\u2010\u00ad]/gu, '');

test('Justif preserves accented text and shares the line model with export', () => {
  const layout = composeDocument([block()], settings, fonts);
  assert.equal(layout.composedParagraphs, 1);
  assert.equal(layout.overfull, 0);
  const recovered = layout.pages.flatMap(page => page.lines.flatMap(line => line.tokens.map(token => token.text))).join('');
  assert.equal(clean(recovered), clean(text));
  assert.ok(layout.pages[0].lines.length > 1);
  const first = layout.pages[0].lines[0];
  const last = first.tokens.at(-1);
  const face = fonts[last.font].face;
  const lastWidth = face.layout(last.text).positions.reduce((sum, p) => sum + p.xAdvance, 0) * settings.size / face.unitsPerEm;
  assert.ok(Math.abs(last.x + lastWidth - (layout.width - settings.margin)) < 5, 'Justif fills the line to the optical margin');
});

test('left, right and centered text fits without justification stretch', () => {
  for (const align of ['left', 'right', 'center']) {
    const layout = composeDocument([block(align)], settings, fonts);
    assert.equal(layout.overfull, 0, align);
    for (const line of layout.pages[0].lines) {
      assert.ok(line.tokens[0].x >= settings.margin - .01);
      const last = line.tokens.at(-1);
      const face = fonts[last.font].face;
      const width = face.layout(last.text).positions.reduce((sum, p) => sum + p.xAdvance, 0) * settings.size / face.unitsPerEm;
      const right = last.x + width;
      assert.ok(right <= layout.width - settings.margin + .01, align);
      if (align === 'right') assert.ok(Math.abs(right - (layout.width - settings.margin)) < .01);
    }
  }
});

test('long documents paginate within the page and export embedded Unicode fonts', async () => {
  const blocks = Array.from({ length: 40 }, (_, i) => block(i % 3 === 0 ? 'left' : 'justify', Object.keys(fonts)[i % 4]));
  blocks[0].runs[0].color = 'rgb(235, 21, 92)';
  const layout = composeDocument(blocks, { ...settings, paper: 'a4' }, fonts);
  assert.ok(layout.pages.length >= 3);
  assert.equal(layout.overfull, 0);
  for (const page of layout.pages) {
    assert.ok(page.lines.length);
    assert.ok(page.lines.every(line => line.baseline > settings.margin && line.baseline < layout.height - settings.margin));
  }
  const bytes = await createPDF(layout, fonts, 'Prueba de composición — español');
  const document = await PDFDocument.load(bytes);
  assert.equal(document.getPageCount(), layout.pages.length);
  assert.equal(document.getTitle(), 'Prueba de composición — español');
  mkdirSync('tmp/pdfs', { recursive: true });
  writeFileSync('tmp/pdfs/editor-multipagina.pdf', bytes);
});

test('Ysabeau composes with its own metrics and exports every style and allowed accent', async () => {
  const ysabeau = Object.fromEntries(Object.entries(FONT_FAMILIES.ysabeau.files).map(([key, file]) => {
    const bytes = new Uint8Array(readFileSync(`public/fonts/${file}`));
    return [key, { bytes, face: fontkit.create(bytes) }];
  }));
  const blocks = PALETTE.map((color, i) => ({ align: 'justify', runs: [{ text, font: Object.keys(ysabeau)[i % 4], color: color.rgb }] }));
  const layout = composeDocument(blocks, { ...settings, family: 'ysabeau' }, ysabeau);
  assert.equal(layout.overfull, 0);
  assert.equal(layout.composedParagraphs, PALETTE.length);
  for (const page of layout.pages) for (const line of page.lines) for (const token of line.tokens) {
    assert.ok(ysabeau[token.font].face.layout(token.text).glyphs.every(glyph => glyph.id !== 0), `Missing glyph: ${token.text}`);
  }
  const bytes = await createPDF(layout, ysabeau, 'Ysabeau · español');
  const document = await PDFDocument.load(bytes);
  assert.equal(document.getPageCount(), 1);
  writeFileSync('tmp/pdfs/editor-ysabeau.pdf', bytes);
  assert.equal(PALETTE.length, 5);
  assert.equal(allowedColor('rgb(255, 0, 0)'), 'rgb(48, 56, 64)');
  for (const color of PALETTE) assert.equal(allowedColor(color.hex), color.rgb);
});

test('word sizes, pink underlines and first-line indent survive the document model', () => {
  const doc = { type: 'doc', content: [{ type: 'paragraph', content: [
    { type: 'text', text: 'Texto normal y ' },
    { type: 'text', text: 'énfasis grande', marks: [{ type: 'bold' }, { type: 'underline' }, { type: 'textStyle', attrs: { fontSize: '24pt' } }] },
    { type: 'text', text: ' con una continuación que ocupa varias líneas. '.repeat(6) },
  ] }] };
  const blocks = documentBlocks(doc);
  assert.equal(blocks[0].runs[1].size, 24);
  const plain = composeDocument(blocks, settings, fonts);
  const indented = composeDocument(blocks, { ...settings, indent: true }, fonts);
  assert.equal(indented.pages[0].lines[0].tokens[0].x - plain.pages[0].lines[0].tokens[0].x, settings.size * 1.5);
  assert.ok(indented.pages[0].lines.flatMap(line => line.tokens).some(token => token.size === 24));
  assert.ok(indented.pages[0].rules.some(rule => rule.color === 'rgb(235, 21, 92)'));
  for (let i = 1; i < indented.pages[0].lines.length; i++) assert.ok(indented.pages[0].lines[i].tokens[0].x <= settings.margin + 1);
});

test('ordered and nested lists preserve numbering and hanging indents across pages', () => {
  const paragraph = text => ({ type: 'paragraph', content: [{ type: 'text', text }] });
  const doc = { type: 'doc', content: [{ type: 'orderedList', attrs: { start: 9 }, content: Array.from({ length: 45 }, (_, i) => ({ type: 'listItem', content: [paragraph(`Elemento ${i + 9}. ${text}`), ...(i === 1 ? [{ type: 'bulletList', content: [{ type: 'listItem', content: [paragraph('Detalle anidado.')] }] }] : [])] })) }] };
  const blocks = documentBlocks(doc);
  assert.deepEqual(blocks.slice(0, 4).map(block => block.marker), ['9.', '10.', '•', '11.']);
  assert.equal(blocks[2].listDepth, 1);
  const layout = composeDocument(blocks, settings, fonts);
  assert.ok(layout.pages.length > 1);
  const markers = layout.pages.flatMap(page => page.lines.flatMap(line => line.tokens.filter(token => token.listMarker && /^\d+\.$/.test(token.text)).map(token => token.text)));
  assert.equal(markers.length, 45);
  assert.equal(markers.at(-1), '53.');
  const first = layout.pages[0].lines[0];
  assert.ok(first.tokens[0].x < first.tokens[1].x);
  assert.equal(layout.overfull, 0);
});

test('tables paginate with repeated headers, intact cells and bounded vector rules', async () => {
  const paragraph = text => ({ kind: 'paragraph', align: 'left', runs: [{ text, font: 'regular', color: TEXT_COLOR_FOR_TEST }] });
  const table = { kind: 'table', rows: [
    { cells: ['Concepto', 'Detalle'].map(text => ({ header: true, blocks: [paragraph(text)] })) },
    ...Array.from({ length: 65 }, (_, i) => ({ cells: [`Fila ${i + 1}`, `Descripción ${i + 1}: español, niñez, pingüino y árboles.`].map(text => ({ header: false, blocks: [paragraph(text)] })) })),
    { cells: [{ blocks: [paragraph('Celda extensa. '.repeat(500))] }, { blocks: [paragraph('Final de la tabla.')] }] },
  ] };
  const layout = composeDocument([table], settings, fonts);
  assert.ok(layout.pages.length > 3);
  assert.equal(layout.overfull, 0);
  for (const page of layout.pages) {
    assert.ok(page.rules.length);
    assert.ok(page.rules.every(rule => Math.min(rule.y1, rule.y2) >= settings.margin - .01 && Math.max(rule.y1, rule.y2) <= layout.height - settings.margin + .01));
    assert.ok(page.lines.every(line => line.baseline < layout.height - settings.margin));
    assert.ok(page.lines.some(line => line.tokens.map(token => token.text).join('').includes('Concepto')));
  }
  const recovered = layout.pages.flatMap(page => page.lines.flatMap(line => line.tokens.map(token => token.text))).join('');
  assert.equal((recovered.match(/Celda/g) || []).length, 500);
  const pdf = await createPDF(layout, fonts, 'Listas y tablas · Justif');
  writeFileSync('tmp/pdfs/editor-tablas.pdf', pdf);
  assert.equal((await PDFDocument.load(pdf)).getPageCount(), layout.pages.length);
});
const TEXT_COLOR_FOR_TEST = 'rgb(48, 56, 64)';
