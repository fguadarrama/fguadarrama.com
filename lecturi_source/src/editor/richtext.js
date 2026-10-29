import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style';
import { Markdown } from '@tiptap/markdown';

const Alignment = Extension.create({
  name: 'paragraphAlignment',
  addGlobalAttributes() {
    return [{ types: ['paragraph', 'heading'], attributes: {
      textAlign: { default: null, parseHTML: element => element.style.textAlign || null,
        renderHTML: attributes => attributes.textAlign ? { style: `text-align:${attributes.textAlign}` } : {} },
    } }];
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.isActive('listItem') ? this.editor.commands.sinkListItem('listItem') : false,
      'Shift-Tab': () => this.editor.isActive('listItem') ? this.editor.commands.liftListItem('listItem') : false,
    };
  },
});

export function createTextEditor(element, content, handlers = {}) {
  return new Editor({
    element,
    extensions: [StarterKit.configure({ link: { openOnClick: false }, heading: { levels: [1, 2, 3] } }),
      TextStyle, Color, FontSize, TableKit.configure({ table: { resizable: false } }), Alignment, Markdown],
    content,
    editorProps: {
      attributes: { role: 'textbox', 'aria-label': 'Texto del documento', 'aria-multiline': 'true', spellcheck: 'true', lang: 'es' },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain');
        // HTML paste is parsed by the editor's schema; Markdown paste is explicit
        // or recognized only when block syntax is present.
        if (!event.clipboardData?.getData('text/html') && text && (/(^|\n)(#{1,3} |[-*+] |\d+\. |\|.*\|)/m.test(text) || /(^|\s)(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)(?=\s|[.,;:!?]|$)/m.test(text))) {
          handlers.pasteMarkdown?.(text); return true;
        }
        return false;
      },
    },
    onUpdate: handlers.update,
    onSelectionUpdate: handlers.selection,
    onTransaction: handlers.transaction,
  });
}
