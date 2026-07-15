import type { Editor } from '@tiptap/core';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useMemo, type CSSProperties } from 'react';

import type {
  NotebookRichMark,
  NotebookRunningMatterContent,
} from '../../../../lib/notebook';
import { NotebookFontSize } from './NotebookFontSizeExtension';
import {
  NotebookPageNumber,
  notebookRunningMatterFromTiptap,
  notebookRunningMatterToTiptap,
} from './notebook-running-matter';

function markStyle(marks: readonly NotebookRichMark[] | undefined): CSSProperties {
  const style: CSSProperties = {};
  marks?.forEach((mark) => {
    if (mark.type === 'bold') style.fontWeight = 700;
    if (mark.type === 'italic') style.fontStyle = 'italic';
    if (mark.type === 'underline') style.textDecoration = `${style.textDecoration ?? ''} underline`.trim();
    if (mark.type === 'strike') style.textDecoration = `${style.textDecoration ?? ''} line-through`.trim();
    if (mark.type === 'highlight') style.backgroundColor = mark.color ?? '#b8d49c';
    if (mark.type === 'textStyle') {
      if (mark.color) style.color = mark.color;
      if (mark.fontSize) style.fontSize = `${mark.fontSize}%`;
    }
  });
  return style;
}

export function NotebookRunningMatterView({
  content,
  pageNumber,
}: {
  content: NotebookRunningMatterContent;
  pageNumber: number;
}) {
  return <>{content.map((paragraph, paragraphIndex) => (
    <span className="notebook-running-matter-line" key={paragraphIndex}>
      {paragraph.content?.map((inline, inlineIndex) => (
        <span
          className={inline.type === 'pageNumber' ? 'notebook-running-page-number' : undefined}
          key={inlineIndex}
          style={markStyle(inline.marks)}
        >
          {inline.type === 'pageNumber' ? pageNumber : inline.text}
        </span>
      ))}
    </span>
  ))}</>;
}

export function NotebookRunningMatterEditor({
  content,
  onChange,
  onEditor,
  onOverflowChange,
  onRequestClose,
}: {
  content: NotebookRunningMatterContent;
  onChange: (content: NotebookRunningMatterContent) => void;
  onEditor: (editor: Editor | null) => void;
  onOverflowChange: (overflowing: boolean) => void;
  onRequestClose: () => void;
}) {
  const extensions = useMemo(() => [
    StarterKit.configure({
      blockquote: false,
      bulletList: false,
      code: false,
      codeBlock: false,
      heading: false,
      horizontalRule: false,
      listItem: false,
      orderedList: false,
    }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    NotebookFontSize,
    NotebookPageNumber,
  ], []);
  const editor = useEditor({
    extensions,
    content: notebookRunningMatterToTiptap(content),
    editorProps: {
      attributes: {
        class: 'notebook-running-matter-editor',
        'aria-label': 'Running matter editor',
        'data-app-keyboard-input': 'true',
      },
      handleKeyDown: (_view, event) => {
        if (event.key !== 'Escape') return false;
        event.preventDefault();
        onRequestClose();
        return true;
      },
    },
    onCreate: ({ editor: current }) => requestAnimationFrame(() => {
      current.chain().focus('end').run();
      const region = current.view.dom.closest<HTMLElement>('.notebook-running-matter-region');
      onOverflowChange(Boolean(region && current.view.dom.scrollHeight > region.clientHeight));
    }),
    onUpdate: ({ editor: current }) => {
      onChange(notebookRunningMatterFromTiptap(current.getJSON()));
      requestAnimationFrame(() => {
        const region = current.view.dom.closest<HTMLElement>('.notebook-running-matter-region');
        onOverflowChange(Boolean(region && current.view.dom.scrollHeight > region.clientHeight));
      });
    },
  });

  useEffect(() => {
    onEditor(editor);
    return () => onEditor(null);
  }, [editor, onEditor]);

  return <EditorContent editor={editor} />;
}
