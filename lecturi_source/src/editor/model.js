import { allowedColor, TEXT_COLOR } from './palette.js';

export const UNDERLINE_COLOR = 'rgb(235, 21, 92)';
const headingScale = { 1: 1.8, 2: 1.45, 3: 1.2, 4: 1.1, 5: 1, 6: 1 };
export function documentBlocks(document, baseSize = 12) {
  const result = [];
  let listSerial = 0;
  function paragraph(node, extra = {}) {
    const blocks = [];
    let runs = [];
    const flush = () => { blocks.push({ kind: 'paragraph', align: node.attrs?.textAlign || (node.type === 'heading' || extra.list ? 'left' : 'justify'), explicitAlign: Boolean(node.attrs?.textAlign), heading: node.type === 'heading', runs, ...extra }); runs = []; };
    function inline(child) {
      if (child.type === 'hardBreak') { flush(); return; }
      if (child.type !== 'text') { child.content?.forEach(inline); return; }
      const marks = child.marks || [];
      const bold = marks.some(mark => mark.type === 'bold') || node.type === 'heading';
      const italic = marks.some(mark => mark.type === 'italic');
      const style = marks.find(mark => mark.type === 'textStyle')?.attrs || {};
      const parsed = parseFloat(style.fontSize);
      const size = Number.isFinite(parsed) ? Math.max(8, Math.min(72, parsed * (String(style.fontSize).endsWith('px') ? .75 : 1))) : node.type === 'heading' ? baseSize * headingScale[node.attrs?.level || 1] : undefined;
      runs.push({ text: child.text, font: bold && italic ? 'boldItalic' : bold ? 'bold' : italic ? 'italic' : 'regular',
        color: allowedColor(style.color), size, underline: marks.some(mark => mark.type === 'underline') });
    }
    node.content?.forEach(inline); flush();
    return blocks;
  }
  function visit(nodes, depth = 0, target = result) {
    for (const node of nodes || []) {
      if (node.type === 'table') {
        target.push({ kind: 'table', rows: (node.content || []).map(row => ({ cells: (row.content || []).map(cell => {
          const blocks = []; visit(cell.content, 0, blocks);
          blocks.forEach(block => { if (!block.explicitAlign) block.align = 'left'; });
          return { header: cell.type === 'tableHeader', blocks };
        }) })) });
      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        const ordered = node.type === 'orderedList';
        const listId = ++listSerial;
        let number = Number(node.attrs?.start) || 1;
        for (const item of node.content || []) {
          let first = true;
          for (const child of item.content || []) {
            if (child.type.endsWith('List')) visit([child], depth + 1, target);
            else {
              const parts = paragraph(child, { listDepth: depth, listId, marker: first ? ordered ? `${number}.` : '•' : null, list: true });
              parts.forEach((part, index) => { if (index) part.marker = null; });
              target.push(...parts); first = false;
            }
          }
          number++;
        }
      } else if (node.type === 'blockquote') visit(node.content, depth, target);
      else if (node.type === 'horizontalRule') target.push({ kind: 'rule' });
      else if (node.type === 'codeBlock') {
        const text = (node.content || []).map(part => part.text || '').join('');
        for (const line of text.split('\n')) target.push({ kind: 'paragraph', align: 'left', runs: [{ text: line, font: 'regular', color: TEXT_COLOR }] });
      } else target.push(...paragraph(node));
    }
  }
  visit(document.content);
  return result;
}

export function blockText(blocks) {
  return blocks.map(block => block.kind === 'table' ? block.rows.map(row => row.cells.map(cell => blockText(cell.blocks)).join(' ')).join('\n') : (block.runs || []).map(run => run.text).join('')).join('\n');
}
