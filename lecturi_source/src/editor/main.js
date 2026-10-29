import './styles.css';
import { composeDocument, loadFonts, FONT_FAMILIES } from './composition.js';
import { restoreDocument } from './document.js';
import { PALETTE, TEXT_COLOR, allowedColor } from './palette.js';
import { createTextEditor } from './richtext.js';
import { documentBlocks, blockText } from './model.js';

const $ = selector => document.querySelector(selector);
const host = $('#editor'), title = $('#document-title'), message = $('#message'), exportButton = $('#export');
const STORAGE_KEY = new URLSearchParams(location.search).get('draft') === 'qa' ? 'lecturi-editor-qa-v2' : 'lecturi-editor-draft-v1';
let rich, fonts, layout, timer, revision = 0, renderedRevision = -1, fontRequest = 0, exporting = false, initialMarkdown = '';
let indent = false;
const example = '<p style="text-align:right">Ciudad de México</p><p>Querida lectora, querido lector:</p><p>Hay ideas que merecen un poco de espacio. Una carta, una petición, unas palabras de agradecimiento. Lo que importa es poder escribirlas con calma y darles una forma que esté a la altura de lo que queremos decir.</p><p><em>Con afecto,</em></p><p>Tu nombre</p>';
const settings = () => ({ family: $('#font-family').value, paper: $('#paper').value, size: Number($('#font-size').value), leading: Number($('#line-height').value), margin: Number($('#margin').value), indent });
function save() {
  if (!rich) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, title: title.value, document: rich.getJSON(), settings: settings() }));
    $('#save-state').textContent = 'Borrador guardado en este dispositivo';
  } catch { $('#save-state').textContent = 'No se pudo guardar el borrador'; }
}
function fitPages() {
  if (!layout) return;
  const viewport = $('#page-viewport');
  // Fit the physical sheet, never the text bounds. Each page keeps its actual
  // Letter/A4 proportions; extra pages remain accessible by scrolling.
  const availableWidth = Math.max(1, viewport.clientWidth - 16);
  const availableHeight = Math.max(1, viewport.clientHeight - 16);
  const pageWidth = Math.min(720, availableWidth, availableHeight * layout.width / layout.height);
  $('#pages').style.setProperty('--fit-page-width', `${pageWidth}px`);
}
new ResizeObserver(fitPages).observe($('#page-viewport'));
function renderPreview() {
  const fragment = document.createDocumentFragment(), ns = 'http://www.w3.org/2000/svg';
  layout.pages.forEach((page, index) => {
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add('paper'); svg.style.fontFamily = FONT_FAMILIES[settings().family].name;
    svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
    svg.style.setProperty('--page-ratio', `${layout.width} / ${layout.height}`);
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `Página ${index + 1} del documento`);
    for (const line of page.lines) {
      const group = document.createElementNS(ns, 'g');
      for (const token of line.tokens) {
        const text = document.createElementNS(ns, 'text'); text.textContent = token.text;
        text.setAttribute('x', token.x); text.setAttribute('y', line.baseline);
        text.setAttribute('font-size', token.size || line.size); text.setAttribute('fill', token.color);
        if (['bold', 'boldItalic'].includes(token.font)) text.setAttribute('font-weight', '700');
        if (['italic', 'boldItalic'].includes(token.font)) text.setAttribute('font-style', 'italic');
        group.append(text);
      }
      svg.append(group);
    }
    for (const rule of page.rules || []) {
      const line = document.createElementNS(ns, 'line');
      for (const key of ['x1', 'x2', 'y1', 'y2']) line.setAttribute(key, rule[key]);
      line.setAttribute('stroke', rule.color); line.setAttribute('stroke-width', rule.thickness); svg.append(line);
    }
    fragment.append(svg);
  });
  $('#pages').replaceChildren(fragment); $('#pages').setAttribute('aria-busy', 'false');
  const count = layout.pages.length; $('#page-count').textContent = `${count} ${count === 1 ? 'página' : 'páginas'}`;
  message.textContent = layout.overfull ? 'Hay una palabra demasiado larga para el ancho elegido. Revisa la vista previa.' : '';
  message.dataset.error = String(Boolean(layout.overfull));
  fitPages();
}
function compose() {
  clearTimeout(timer); if (!fonts || !rich || rich.view.composing) return;
  try {
    const blocks = documentBlocks(rich.getJSON(), settings().size);
    layout = composeDocument(blocks, settings(), fonts); renderedRevision = revision; renderPreview();
    const text = blockText(blocks), count = text.match(/\S+/gu)?.length || 0;
    $('#word-count').textContent = `${count} ${count === 1 ? 'palabra' : 'palabras'}`;
    exportButton.disabled = !text.trim() || exporting; save();
  } catch (error) {
    renderedRevision = -1; exportButton.disabled = true;
    message.textContent = 'No se pudo componer el documento. ' + error.message; message.dataset.error = 'true';
    $('#pages').setAttribute('aria-busy', 'false'); console.error('[lecturi editor]', error);
  }
}
function changed() {
  revision++; exportButton.disabled = true; clearTimeout(timer); timer = setTimeout(compose, 180);
}
function updateToolbar() {
  if (!rich) return;
  for (const button of document.querySelectorAll('[data-command]')) {
    const command = button.dataset.command;
    const align = { justifyLeft: 'left', justifyCenter: 'center', justifyRight: 'right', justifyFull: 'justify' }[command];
    const effectiveAlign = rich.getAttributes('paragraph').textAlign || rich.getAttributes('heading').textAlign || (rich.isActive('listItem') || rich.isActive('table') || rich.isActive('heading') ? 'left' : 'justify');
    if (!['undo', 'redo', 'sinkListItem', 'liftListItem'].includes(command)) button.setAttribute('aria-pressed', String(align ? effectiveAlign === align : rich.isActive(command)));
    if (command === 'undo' || command === 'redo') button.disabled = !rich.can()[command]();
    if (command === 'sinkListItem' || command === 'liftListItem') button.disabled = !rich.can()[command]('listItem');
  }
  const color = allowedColor(rich.getAttributes('textStyle').color || TEXT_COLOR);
  $('.color-tool').style.setProperty('--chosen-color', color);
  document.querySelectorAll('.color-swatch').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color === color)));
  if (document.activeElement !== $('#selection-size')) $('#selection-size').value = parseFloat(rich.getAttributes('textStyle').fontSize) || settings().size;
  $('#table-tools').hidden = !rich.isActive('table');
  $('#insert-table').disabled = rich.isActive('table');
  document.querySelectorAll('[data-table]').forEach(button => {
    const command = button.dataset.table;
    button.disabled = command === 'addColumnAfter' && (rich.getAttributes('table').columns || 0) >= 8 ? true : !rich.can()[command]();
  });
}
let content = example;
try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (stored?.version === 2 && stored.document) content = stored.document;
  else if (stored?.version === 1 && Array.isArray(stored.blocks)) {
    localStorage.setItem('lecturi-editor-backup-v1', JSON.stringify(stored));
    const migration = document.createElement('div'); restoreDocument(migration, stored.blocks);
    migration.querySelectorAll('span').forEach(span => { if (allowedColor(span.style.color) === TEXT_COLOR) span.style.removeProperty('color'); });
    content = migration.innerHTML;
  }
  if (stored) {
    title.value = stored.title || '';
    const mapping = { family: 'font-family', paper: 'paper', size: 'font-size', leading: 'line-height', margin: 'margin' };
    for (const [key, id] of Object.entries(mapping)) {
      const select = $(`#${id}`), value = String(stored.settings?.[key]);
      if ([...select.options].some(option => option.value === value)) select.value = value;
    }
    indent = Boolean(stored.settings?.indent);
  }
} catch (error) { console.warn('[lecturi editor draft]', error); }
rich = createTextEditor(host, content, {
  update: () => { updateToolbar(); changed(); }, selection: updateToolbar, transaction: updateToolbar,
  pasteMarkdown: text => rich.chain().focus().insertContent(text, { contentType: 'markdown' }).run(),
});
function syncBase() {
  host.style.fontSize = `${settings().size * 4 / 3}px`;
  host.dataset.indent = String(indent);
  $('#paragraph-indent').setAttribute('aria-checked', String(indent));
}
syncBase(); updateToolbar();
for (const button of document.querySelectorAll('[data-command]')) {
  button.addEventListener('mousedown', event => event.preventDefault());
  button.addEventListener('click', () => {
    const command = button.dataset.command;
    const align = { justifyLeft: 'left', justifyCenter: 'center', justifyRight: 'right', justifyFull: 'justify' }[command];
    const chain = rich.chain().focus();
    if (align) { chain.updateAttributes('paragraph', { textAlign: align }).updateAttributes('heading', { textAlign: align }).run(); }
    else if (['bold', 'italic', 'underline', 'bulletList', 'orderedList'].includes(command)) chain[`toggle${command[0].toUpperCase()}${command.slice(1)}`]().run();
    else if (['sinkListItem', 'liftListItem'].includes(command)) chain[command]('listItem').run();
    else chain[command]().run();
    updateToolbar();
  });
}
function applySelectionSize(event) {
  const value = Number(event.target.value);
  if (!Number.isFinite(value) || value < 8 || value > 72) { updateToolbar(); return; }
  rich.commands.setFontSize(`${value}pt`);
}
$('#selection-size').addEventListener('input', applySelectionSize);
$('#selection-size').addEventListener('change', applySelectionSize);
$('#selection-size').addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); applySelectionSize(event); rich.commands.focus(); }
});
$('#reset-size').addEventListener('mousedown', event => event.preventDefault());
$('#reset-size').addEventListener('click', () => rich.chain().focus().unsetFontSize().run());
$('#paragraph-indent').addEventListener('click', () => { indent = !indent; syncBase(); changed(); });
const palette = $('#color-palette');
function closePalette() { palette.hidden = true; $('#text-color').setAttribute('aria-expanded', 'false'); }
for (const color of PALETTE) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'color-swatch';
  button.dataset.color = color.rgb; button.style.setProperty('--swatch', color.hex);
  button.setAttribute('aria-label', color.name); button.title = color.name; button.setAttribute('aria-pressed', 'false');
  button.addEventListener('mousedown', event => event.preventDefault());
  button.addEventListener('click', () => { rich.chain().focus().setColor(color.hex).run(); closePalette(); updateToolbar(); });
  palette.append(button);
}
$('#text-color').addEventListener('mousedown', event => event.preventDefault());
$('#text-color').addEventListener('click', () => {
  palette.hidden = !palette.hidden; $('#text-color').setAttribute('aria-expanded', String(!palette.hidden));
  if (!palette.hidden) palette.querySelector('button').focus({ preventScroll: true });
});
document.addEventListener('pointerdown', event => { if (!event.target.closest('.color-picker')) closePalette(); });
palette.addEventListener('keydown', event => {
  if (event.key === 'Escape') { closePalette(); $('#text-color').focus(); }
  if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
    event.preventDefault(); const buttons = [...palette.querySelectorAll('button')], index = buttons.indexOf(document.activeElement);
    buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length].focus();
  }
});
async function changeFamily() {
  const request = ++fontRequest, family = $('#font-family').value;
  fonts = null; revision++; renderedRevision = -1; exportButton.disabled = true;
  message.textContent = 'Preparando la tipografía…'; $('#pages').setAttribute('aria-busy', 'true');
  try {
    const loaded = await loadFonts(family);
    await Promise.all(['400', '700', 'italic 400', 'italic 700'].map(style => document.fonts.load(`${style} 12px ${FONT_FAMILIES[family].name}`)));
    if (request !== fontRequest) return;
    fonts = loaded; compose();
  } catch (error) {
    if (request !== fontRequest) return;
    message.textContent = 'No se pudo cargar la tipografía. Vuelve a seleccionarla para reintentar.'; message.dataset.error = 'true';
    $('#pages').setAttribute('aria-busy', 'false'); console.error('[lecturi editor fonts]', error);
  }
}
$('#font-family').addEventListener('change', changeFamily);
title.addEventListener('input', changed);
for (const id of ['paper', 'font-size', 'line-height', 'margin']) $(`#${id}`).addEventListener('change', () => { syncBase(); updateToolbar(); changed(); });
$('#toggle-settings').addEventListener('click', () => {
  $('#page-settings').hidden = !$('#page-settings').hidden; $('#toggle-settings').setAttribute('aria-expanded', String(!$('#page-settings').hidden));
});
$('#new-document').addEventListener('click', () => $('#new-dialog').showModal());
$('#new-dialog').addEventListener('close', () => {
  if ($('#new-dialog').returnValue === 'new') { title.value = 'Documento sin título'; rich.chain().focus().clearContent().run(); changed(); }
});
$('#insert-table').addEventListener('click', () => $('#table-dialog').showModal());
$('#table-form').addEventListener('submit', event => {
  event.preventDefault();
  const rows = Number($('#table-rows').value), cols = Number($('#table-columns').value);
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || rows > 30 || cols < 1 || cols > 8) return;
  $('#table-dialog').close(); rich.chain().focus().insertTable({ rows, cols, withHeaderRow: $('#table-header').checked }).run();
});
for (const button of document.querySelectorAll('[data-table]')) {
  button.addEventListener('mousedown', event => event.preventDefault());
  button.addEventListener('click', () => {
    if (button.dataset.table === 'addColumnAfter') {
      const { $from } = rich.state.selection;
      for (let depth = $from.depth; depth > 0; depth--) if ($from.node(depth).type.name === 'table' && $from.node(depth).firstChild.childCount >= 8) {
        message.textContent = 'La tabla admite hasta 8 columnas.'; return;
      }
    }
    rich.chain().focus()[button.dataset.table]().run(); updateToolbar();
  });
}
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => $(`#${button.dataset.close}`).close());
$('#markdown').addEventListener('click', () => {
  initialMarkdown = rich.getMarkdown(); $('#markdown-source').value = initialMarkdown; $('#markdown-dialog').showModal();
});
$('#apply-markdown').addEventListener('click', () => {
  const source = $('#markdown-source').value;
  if (source !== initialMarkdown) rich.commands.setContent(source, { contentType: 'markdown' });
  $('#markdown-dialog').close(); rich.commands.focus();
});
exportButton.addEventListener('click', async () => {
  const original = exportButton.innerHTML;
  try {
    compose(); if (!layout || renderedRevision !== revision) return;
    exporting = true; exportButton.disabled = true; exportButton.textContent = 'Preparando PDF…';
    const snapshot = layout, fontSnapshot = fonts, name = title.value.trim() || 'Documento sin título';
    const { createPDF } = await import('./pdf.js'); const bytes = await createPDF(snapshot, fontSnapshot, name);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 100) + '.pdf'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    message.textContent = 'PDF listo. Se ha iniciado la descarga.'; message.dataset.error = 'false';
  } catch (error) { message.textContent = 'No se pudo generar el PDF. ' + error.message; message.dataset.error = 'true'; console.error('[lecturi editor PDF]', error); }
  finally { exporting = false; exportButton.innerHTML = original; exportButton.disabled = !layout || renderedRevision !== revision || !rich.getText().trim(); }
});
window.addEventListener('beforeunload', save);
await changeFamily();
