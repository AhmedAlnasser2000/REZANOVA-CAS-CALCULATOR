import { mergeAttributes, Node, type Editor, type JSONContent } from '@tiptap/core';

import type {
  NotebookHeaderFooterSettings,
  NotebookRichMark,
  NotebookRunningMatterContent,
  NotebookRunningMatterInlineNode,
} from '../../../../lib/notebook';

export type NotebookRunningMatterTarget = {
  pageIndex: number;
  kind: 'header' | 'footer';
  region: 'left' | 'center' | 'right';
  scope: 'default' | 'first';
};

export const NotebookPageNumber = Node.create({
  name: 'pageNumber',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: 'span[data-notebook-page-number]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, {
    'data-notebook-page-number': '',
  }), 'Page'],
});

function markToJson(mark: NotebookRichMark): { type: string; attrs?: Record<string, unknown> } {
  if (mark.type === 'highlight') return {
    type: mark.type,
    ...(mark.color ? { attrs: { color: mark.color } } : {}),
  };
  if (mark.type === 'textStyle') return {
    type: mark.type,
    attrs: { color: mark.color ?? null, fontSize: mark.fontSize ?? null },
  };
  return { type: mark.type };
}

function markFromJson(mark: JSONContent): NotebookRichMark | null {
  if (mark.type === 'bold' || mark.type === 'italic' || mark.type === 'underline'
    || mark.type === 'strike') return { type: mark.type };
  if (mark.type === 'highlight') {
    const color = typeof mark.attrs?.color === 'string' ? mark.attrs.color : undefined;
    return { type: 'highlight', ...(color ? { color } : {}) };
  }
  if (mark.type === 'textStyle') {
    const color = typeof mark.attrs?.color === 'string' ? mark.attrs.color : undefined;
    const fontSize = typeof mark.attrs?.fontSize === 'number' ? mark.attrs.fontSize : undefined;
    return { type: 'textStyle', ...(color ? { color } : {}), ...(fontSize ? { fontSize } : {}) };
  }
  return null;
}

export function notebookRunningMatterToTiptap(content: NotebookRunningMatterContent): JSONContent {
  return {
    type: 'doc',
    content: content.map((paragraph) => ({
      type: 'paragraph',
      ...(paragraph.content?.length ? {
        content: paragraph.content.map((inline) => inline.type === 'pageNumber'
          ? { type: 'pageNumber', ...(inline.marks?.length ? { marks: inline.marks.map(markToJson) } : {}) }
          : {
              type: 'text',
              text: inline.text,
              ...(inline.marks?.length ? { marks: inline.marks.map(markToJson) } : {}),
            }),
      } : {}),
    })),
  };
}

export function notebookRunningMatterFromTiptap(content: JSONContent): NotebookRunningMatterContent {
  const paragraphs = content.content?.filter((node) => node.type === 'paragraph').slice(0, 16);
  if (!paragraphs?.length) return [{ type: 'paragraph' }];
  let characters = 0;
  let inlineCount = 0;
  return paragraphs.map((paragraph) => {
    const inlines = paragraph.content?.flatMap((inline): NotebookRunningMatterInlineNode[] => {
      if (inlineCount >= 256) return [];
      const marks = inline.marks?.map(markFromJson).filter((mark): mark is NotebookRichMark => Boolean(mark));
      if (inline.type === 'pageNumber') {
        inlineCount += 1;
        return [{ type: 'pageNumber', ...(marks?.length ? { marks } : {}) }];
      }
      if (inline.type !== 'text' || typeof inline.text !== 'string') return [];
      const text = inline.text.slice(0, Math.max(0, 4096 - characters));
      if (!text) return [];
      characters += text.length;
      inlineCount += 1;
      return [{ type: 'text', text, ...(marks?.length ? { marks } : {}) }];
    });
    return { type: 'paragraph', ...(inlines?.length ? { content: inlines } : {}) };
  });
}

export function updateNotebookRunningMatter(
  settings: NotebookHeaderFooterSettings,
  target: NotebookRunningMatterTarget,
  content: NotebookRunningMatterContent,
): NotebookHeaderFooterSettings {
  const key = `${target.scope === 'first' ? 'firstPage' : 'default'}${target.kind === 'header' ? 'Header' : 'Footer'}` as const;
  return { ...settings, [key]: { ...settings[key], [target.region]: content } };
}

export function insertNotebookRunningPageNumber(editor: Editor) {
  return editor.chain().focus().insertContent({ type: 'pageNumber' }).run();
}
