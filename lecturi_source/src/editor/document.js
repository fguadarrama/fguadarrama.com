import { allowedColor } from './palette.js';
// Read a safe text model from the editing surface; never compose contenteditable itself.
export function readDocument(editor) {
  const blocks = [];
  let current = null;
  const flush = () => { if (current) blocks.push(current); current = null; };
  const ensure = (element) => current ||= { align: getComputedStyle(element).textAlign.replace('start', 'left').replace('end', 'right'), runs: [] };
  const visit = node => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent) return;
      const element = node.parentElement;
      const computed = getComputedStyle(element);
      const block = ensure(element);
      const bold = Number(computed.fontWeight) >= 600 || computed.fontWeight === 'bold';
      const italic = computed.fontStyle === 'italic';
      const font = bold && italic ? 'boldItalic' : bold ? 'bold' : italic ? 'italic' : 'regular';
      const previous = block.runs.at(-1);
      const color = allowedColor(computed.color);
      if (previous?.font === font && previous.color === color) previous.text += node.textContent;
      else block.runs.push({ text: node.textContent, font, color });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (['SCRIPT', 'STYLE', 'IMG', 'IFRAME', 'OBJECT'].includes(node.tagName)) return;
    if (node.tagName === 'BR') { ensure(node); flush(); return; }
    const isBlock = node !== editor && ['P', 'DIV', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'LI'].includes(node.tagName);
    if (isBlock) { flush(); ensure(node); }
    node.childNodes.forEach(visit);
    if (isBlock) flush();
  };
  visit(editor); flush();
  return blocks;
}

export function restoreDocument(editor, blocks) {
  const fragment = document.createDocumentFragment();
  for (const block of blocks) {
    const paragraph = document.createElement('p');
    paragraph.style.textAlign = ['left', 'right', 'center', 'justify'].includes(block.align) ? block.align : 'justify';
    for (const run of block.runs || []) {
      const span = document.createElement('span');
      span.textContent = String(run.text || '');
      if (['bold', 'boldItalic'].includes(run.font)) span.style.fontWeight = '700';
      if (['italic', 'boldItalic'].includes(run.font)) span.style.fontStyle = 'italic';
      span.style.color = allowedColor(run.color);
      paragraph.append(span);
    }
    if (!paragraph.textContent) paragraph.append(document.createElement('br'));
    fragment.append(paragraph);
  }
  editor.replaceChildren(fragment);
}
