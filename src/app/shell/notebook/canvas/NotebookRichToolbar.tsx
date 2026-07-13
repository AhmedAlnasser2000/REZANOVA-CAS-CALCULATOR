import type { Editor } from '@tiptap/core';
import {
  Bold,
  BookOpenCheck,
  Braces,
  ChevronDown,
  FolderPlus,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Palette,
  Redo2,
  Sigma,
  Strikethrough,
  Undo2,
} from 'lucide-react';
import { type ReactNode } from 'react';

import { NOTEBOOK_SEMANTIC_DEFINITIONS } from '../../../../lib/notebook';

import {
  insertNotebookSemanticBlock,
  insertNotebookSection,
} from './selection';
import { useNotebookTransientLayer } from '../transient-ui';
import type { NotebookPaletteMode } from './NotebookSelectionToolbar';
import { NotebookFontSizeControl } from './NotebookFontSizeControl';

function activeFontSize(editor: Editor) {
  const value = editor.getAttributes('textStyle').fontSize;
  return typeof value === 'number' ? value : null;
}

function ToolButton({
  active = false,
  disabled = false,
  label,
  onClick,
  transientTriggerId,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  transientTriggerId?: string;
  children: ReactNode;
}) {
  return (
    <button
      data-notebook-transient-trigger={transientTriggerId}
      type="button"
      disabled={disabled}
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

function RibbonGroup({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`notebook-ribbon-group ${className}`.trim()} aria-label={label}>
      <div className="notebook-ribbon-group-tools">{children}</div>
      <span className="notebook-ribbon-group-label">{label}</span>
    </section>
  );
}

export function NotebookRichToolbar({
  editor,
  hasProseSelection,
  onInsertDisplayMath,
  onInsertInlineMath,
  onRequestPalette,
}: {
  editor: Editor;
  hasProseSelection: boolean;
  onInsertDisplayMath: () => void;
  onInsertInlineMath: () => void;
  onRequestPalette: (mode: NotebookPaletteMode) => void;
}) {
  const semanticMenu = useNotebookTransientLayer({ id: 'notebook-academic-container-menu' });

  return (
    <div className="notebook-rich-toolbar" aria-label="Notebook formatting toolbar">
      <RibbonGroup label="Font">
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
          active={editor.isActive('strike')}
          label="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        ><Strikethrough size={16} /></ToolButton>
        <ToolButton
          disabled={!hasProseSelection}
          active={editor.isActive('highlight')}
          label="Highlight"
          onClick={() => onRequestPalette('highlight')}
        ><Highlighter size={16} /></ToolButton>
        <ToolButton
          disabled={!hasProseSelection}
          label="Text color"
          onClick={() => onRequestPalette('text-color')}
        ><Palette size={16} /></ToolButton>
        <NotebookFontSizeControl
          label="Selected text font size"
          value={activeFontSize(editor)}
          onApply={(fontSize) => editor.chain().focus().setMark('textStyle', { fontSize }).run()}
          onReset={() => editor.chain().focus().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()}
        />
      </RibbonGroup>
      <RibbonGroup label="Paragraph">
        <div className="notebook-ribbon-split-control">
          <ToolButton
            active={editor.isActive('bulletList')}
            label="Bullet list"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          ><List size={16} /></ToolButton>
          <span aria-hidden="true"><ChevronDown size={12} /></span>
        </div>
        <div className="notebook-ribbon-split-control">
          <ToolButton
            active={editor.isActive('orderedList')}
            label="Numbered list"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          ><ListOrdered size={16} /></ToolButton>
          <span aria-hidden="true"><ChevronDown size={12} /></span>
        </div>
      </RibbonGroup>
      <RibbonGroup label="Structure">
        <ToolButton
          active={editor.isActive('heading', { level: 1 })}
          label="Heading 1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        ><Heading1 size={17} /></ToolButton>
        <ToolButton
          active={editor.isActive('heading', { level: 2 })}
          label="Heading 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        ><Heading2 size={17} /></ToolButton>
        <ToolButton
          active={editor.isActive('heading', { level: 3 })}
          label="Heading 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        ><Heading3 size={17} /></ToolButton>
        <ToolButton
          label="Add section"
          onClick={() => insertNotebookSection(editor)}
        ><FolderPlus size={16} /></ToolButton>
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
      </RibbonGroup>
      <RibbonGroup label="Math" className="is-math">
        <ToolButton label="In text" onClick={onInsertInlineMath}>
          <Braces size={16} /> <span>In text</span>
        </ToolButton>
        <ToolButton label="Separate equation" onClick={onInsertDisplayMath}>
          <Sigma size={16} /> <span>Separate equation</span>
        </ToolButton>
      </RibbonGroup>
      <RibbonGroup label="Edit" className="is-history">
        <ToolButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={16} />
        </ToolButton>
        <ToolButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={16} />
        </ToolButton>
      </RibbonGroup>
    </div>
  );
}
