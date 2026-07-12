import type { Editor } from '@tiptap/core';
import {
  Bold,
  BookOpenCheck,
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
import { type ReactNode } from 'react';

import { NOTEBOOK_SEMANTIC_DEFINITIONS } from '../../../../lib/notebook';

import {
  insertNotebookDisplayMath,
  insertNotebookInlineMath,
  insertNotebookSemanticBlock,
} from './selection';
import { useNotebookTransientLayer } from '../transient-ui';

function ToolButton({
  active = false,
  label,
  onClick,
  transientTriggerId,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  transientTriggerId?: string;
  children: ReactNode;
}) {
  return (
    <button
      data-notebook-transient-trigger={transientTriggerId}
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
  const semanticMenu = useNotebookTransientLayer({ id: 'notebook-academic-container-menu' });

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
        <div className="notebook-semantic-insert">
          <ToolButton
            active={semanticMenu.isOpen}
            label="Insert academic container"
            onClick={semanticMenu.toggle}
            transientTriggerId={semanticMenu.id}
          >
            <BookOpenCheck size={16} />
          </ToolButton>
          {semanticMenu.isOpen ? (
            <div data-notebook-transient-layer={semanticMenu.id} className="notebook-semantic-menu" role="menu" aria-label="Academic containers">
              {NOTEBOOK_SEMANTIC_DEFINITIONS.map((definition) => (
                <button
                  key={definition.kind}
                  type="button"
                  role="menuitem"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    insertNotebookSemanticBlock(editor, definition.kind);
                    semanticMenu.close(false);
                  }}
                >
                  <span>{definition.label}</span>
                  <small>{definition.tone}</small>
                </button>
              ))}
            </div>
          ) : null}
        </div>
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
