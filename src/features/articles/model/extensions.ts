import { Extension, type CommandProps } from '@tiptap/core';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';

export const INDENT_STEP_CM = 1.25;
const MAX_INDENT = 8;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
      setLineSpacing: (value: string | null) => ReturnType;
    };
  }
}

/** Recuo (passos de 1,25 cm) e espaçamento entre linhas por bloco, como no Word. */
const Indent = Extension.create({
  name: 'indent',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => Math.round((parseFloat(el.style.marginLeft) || 0) / INDENT_STEP_CM),
            renderHTML: (attrs) =>
              attrs.indent ? { style: `margin-left: ${attrs.indent * INDENT_STEP_CM}cm` } : {},
          },
          lineSpacing: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) =>
              attrs.lineSpacing ? { style: `line-height: ${attrs.lineSpacing}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    const change = (delta: number) => () => (props: CommandProps) => {
      const { state, tr, dispatch } = props;
      const { from, to } = state.selection;
      let changed = false;
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return;
        const next = Math.min(MAX_INDENT, Math.max(0, (node.attrs.indent ?? 0) + delta));
        if (next !== node.attrs.indent) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
          changed = true;
        }
      });
      if (changed && dispatch) dispatch(tr);
      return changed;
    };

    return {
      increaseIndent: change(1),
      decreaseIndent: change(-1),
      setLineSpacing:
        (value: string | null) =>
        ({ commands }) =>
          commands.updateAttributes('paragraph', { lineSpacing: value }) &&
          commands.updateAttributes('heading', { lineSpacing: value }),
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) =>
        editor.isActive('listItem')
          ? editor.commands.sinkListItem('listItem')
          : editor.isActive('table')
            ? false
            : editor.commands.increaseIndent(),
      'Shift-Tab': ({ editor }) =>
        editor.isActive('listItem')
          ? editor.commands.liftListItem('listItem')
          : editor.isActive('table')
            ? false
            : editor.commands.decreaseIndent(),
    };
  },
});

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } },
  }),
  TextStyleKit.configure({ lineHeight: false }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Highlight,
  Subscript,
  Superscript,
  Image.configure({ allowBase64: true }),
  TableKit.configure({ table: { resizable: true } }),
  Placeholder.configure({ placeholder: 'Comece a escrever…' }),
  CharacterCount,
  Indent,
];
