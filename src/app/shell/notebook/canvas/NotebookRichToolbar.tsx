import type { Editor } from '@tiptap/core';
import {
  Bold,
  Braces,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Palette,
  Redo2,
  Sigma,
  Type,
  Undo2,
} from 'lucide-react';

import {
  insertNotebookDisplayMath,
  insertNotebookInlineMath,
} from './selection';

function ToolButton({
  active = false,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={active ? 'is-active' : undefined}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function NotebookRichToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="notebook-rich-toolbar" aria-label="Notebook formatting toolbar">
      <div className="notebook-rich-toolbar-group">
        <ToolButton
          active={editor.isActive('bold')}
          label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        ><Bold size={16} /></ToolButton>
        <ToolButton
          active={editor.isActive('italic')}
          label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        ><Italic size={16} /></ToolButton>
        <ToolButton
          active={editor.isActive('highlight')}
          label="Highlight"
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#48673f' }).run()}
        ><Highlighter size={16} /></ToolButton>
        <ToolButton
          label="Text color"
          onClick={() => editor.chain().focus().setColor('#b8d49c').run()}
        ><Palette size={16} /></ToolButton>
      </div>
      <div className="notebook-rich-toolbar-group">
        <ToolButton
          active={editor.isActive('heading', { level: 2 })}
          label="Heading"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        ><Type size={16} /></ToolButton>
        <ToolButton
          active={editor.isActive('bulletList')}
          label="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        ><List size={16} /></ToolButton>
        <ToolButton
          active={editor.isActive('orderedList')}
          label="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        ><ListOrdered size={16} /></ToolButton>
      </div>
      <div className="notebook-rich-toolbar-group">
        <ToolButton label="Insert inline math" onClick={() => insertNotebookInlineMath(editor)}>
          <Braces size={16} />
        </ToolButton>
        <ToolButton label="Insert display math" onClick={() => insertNotebookDisplayMath(editor)}>
          <Sigma size={16} />
        </ToolButton>
      </div>
      <div className="notebook-rich-toolbar-group is-history">
        <ToolButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={16} />
        </ToolButton>
        <ToolButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={16} />
        </ToolButton>
      </div>
    </div>
  );
}
