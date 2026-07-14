import type { Editor } from '@tiptap/core';
import {
  Bold,
  BookOpenCheck,
  Braces,
  Captions,
  ChevronDown,
  FileCheck2,
  FolderPlus,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Minus,
  Palette,
  Redo2,
  Sigma,
  Strikethrough,
  Underline,
  Undo2,
  Video,
} from 'lucide-react';
import { useRef, type ReactNode } from 'react';

import {
  NOTEBOOK_SEMANTIC_DEFINITIONS,
  type NotebookHeaderFooterSettings,
  type NotebookPageSetup,
} from '../../../../lib/notebook';

import {
  insertNotebookSemanticBlock,
  insertNotebookDivider,
  insertNotebookEvidence,
  insertNotebookSection,
} from './selection';
import { useNotebookTransientLayer } from '../transient-ui';
import type { NotebookPaletteMode } from './NotebookSelectionToolbar';
import { NotebookFontSizeControl } from './NotebookFontSizeControl';
import {
  NotebookParagraphControls,
} from './NotebookParagraphControls';
import {
  captureNotebookToolbarSelection,
  restoreNotebookToolbarSelection,
  type NotebookToolbarSelection,
} from './notebookToolbarSelection';
import type { NotebookRibbonTab } from './ribbon-types';
import {
  NotebookLayoutControls,
  type NotebookViewMode,
} from './NotebookLayoutControls';
import { NotebookPictureFormatControls } from './NotebookPictureFormatControls';
import { NotebookVideoFormatControls } from './NotebookVideoFormatControls';

type NotebookParagraphStyle = 'normal' | 'heading-1' | 'heading-2' | 'heading-3' | 'mixed';

const PARAGRAPH_STYLE_LABELS: Record<NotebookParagraphStyle, string> = {
  normal: 'Normal',
  'heading-1': 'Heading 1',
  'heading-2': 'Heading 2',
  'heading-3': 'Heading 3',
  mixed: 'Mixed',
};

const PARAGRAPH_STYLE_OPTIONS = [
  { style: 'normal', description: 'Body text', glyph: 'P' },
  { style: 'heading-1', description: 'Main topic', glyph: 'H1' },
  { style: 'heading-2', description: 'Section', glyph: 'H2' },
  { style: 'heading-3', description: 'Subsection', glyph: 'H3' },
] as const;

function paragraphStyleForNode(node: { type: { name: string }; attrs: Record<string, unknown> }) {
  if (node.type.name !== 'heading') {
    return node.type.name === 'paragraph' ? 'normal' : null;
  }
  const level = node.attrs.level;
  return level === 2 || level === 3 ? `heading-${level}` as const : 'heading-1';
}

function activeParagraphStyle(editor: Editor): NotebookParagraphStyle {
  const { doc, selection } = editor.state;
  const styles = new Set<Exclude<NotebookParagraphStyle, 'mixed'>>();
  if (selection.empty) {
    const style = paragraphStyleForNode(selection.$from.parent);
    return style ?? 'normal';
  }
  doc.nodesBetween(selection.from, selection.to, (node) => {
    const style = paragraphStyleForNode(node);
    if (style) {
      styles.add(style);
    }
  });
  if (styles.size === 0) {
    return 'normal';
  }
  return styles.size === 1 ? [...styles][0]! : 'mixed';
}

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
  activeTab,
  editor,
  fileControl,
  hasProseSelection,
  contextualTab = null,
  onSelectTab,
  onInsertDisplayMath,
  onInsertInlineMath,
  onInsertImage,
  onInsertVideo,
  onEditImageDetails,
  onEditVideoDetails,
  onChooseVideoPoster,
  onRemoveVideoPoster,
  onChooseVideoTrack,
  onRemoveVideoTrack,
  headerFooter,
  pageSetup,
  viewMode,
  onChangeHeaderFooter,
  onChangePageSetup,
  onInsertPageBreak,
  onViewModeChange,
  onRequestPalette,
}: {
  activeTab: NotebookRibbonTab;
  editor: Editor;
  fileControl: ReactNode;
  hasProseSelection: boolean;
  contextualTab?: Extract<NotebookRibbonTab, 'picture-format' | 'video-format'> | null;
  onSelectTab: (tab: NotebookRibbonTab) => void;
  onInsertDisplayMath: () => void;
  onInsertInlineMath: () => void;
  onInsertImage: () => void;
  onInsertVideo: () => void;
  onEditImageDetails: () => void;
  onEditVideoDetails: () => void;
  onChooseVideoPoster: () => void;
  onRemoveVideoPoster: () => void;
  onChooseVideoTrack: () => void;
  onRemoveVideoTrack: (trackId: string) => void;
  headerFooter: NotebookHeaderFooterSettings;
  pageSetup: NotebookPageSetup;
  viewMode: NotebookViewMode;
  onChangeHeaderFooter: (next: NotebookHeaderFooterSettings) => void;
  onChangePageSetup: (next: NotebookPageSetup) => void;
  onInsertPageBreak: () => void;
  onViewModeChange: (mode: NotebookViewMode) => void;
  onRequestPalette: (mode: NotebookPaletteMode) => void;
}) {
  const semanticMenu = useNotebookTransientLayer({ id: 'notebook-academic-container-menu' });
  const paragraphStyleMenu = useNotebookTransientLayer({ id: 'notebook-paragraph-style-menu' });
  const paragraphStyleSelectionRef = useRef<NotebookToolbarSelection | null>(null);
  const paragraphStyle = activeParagraphStyle(editor);

  function applyParagraphStyle(style: Exclude<NotebookParagraphStyle, 'mixed'>) {
    const chain = restoreNotebookToolbarSelection(editor, paragraphStyleSelectionRef.current);
    if (style === 'normal') {
      chain.setParagraph().run();
    } else {
      const level = Number(style.at(-1)) as 1 | 2 | 3;
      chain.setHeading({ level }).run();
    }
    paragraphStyleMenu.close(false);
  }

  function toggleParagraphStyleMenu() {
    if (!paragraphStyleMenu.isOpen) {
      paragraphStyleSelectionRef.current = captureNotebookToolbarSelection(editor);
    }
    paragraphStyleMenu.toggle();
  }

  function selectRibbonTab(tab: NotebookRibbonTab) {
    semanticMenu.close(false);
    paragraphStyleMenu.close(false);
    onSelectTab(tab);
  }

  const tabLabel = activeTab === 'picture-format'
    ? 'Picture Format'
    : activeTab === 'video-format'
      ? 'Video Format'
      : activeTab === 'insert' ? 'Insert' : activeTab === 'layout' ? 'Layout' : 'Home';

  return (
    <div className="notebook-rich-ribbon">
      <div className="notebook-ribbon-tabs">
        {fileControl}
        <div className="notebook-ribbon-tablist" role="tablist" aria-label="Notebook ribbon tabs">
          <button
            id="notebook-ribbon-tab-home"
            type="button"
            role="tab"
            aria-controls="notebook-ribbon-panel"
            aria-selected={activeTab === 'home'}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => selectRibbonTab('home')}
          >Home</button>
          <button
            id="notebook-ribbon-tab-insert"
            type="button"
            role="tab"
            aria-controls="notebook-ribbon-panel"
            aria-selected={activeTab === 'insert'}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => selectRibbonTab('insert')}
          >Insert</button>
          <button
            id="notebook-ribbon-tab-layout"
            type="button"
            role="tab"
            aria-controls="notebook-ribbon-panel"
            aria-selected={activeTab === 'layout'}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => selectRibbonTab('layout')}
          >Layout</button>
          {contextualTab === 'picture-format' ? (
            <button
              id="notebook-ribbon-tab-picture-format"
              type="button"
              role="tab"
              className="is-contextual"
              aria-controls="notebook-ribbon-panel"
              aria-selected={activeTab === 'picture-format'}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectRibbonTab('picture-format')}
            >Picture Format</button>
          ) : null}
          {contextualTab === 'video-format' ? (
            <button
              id="notebook-ribbon-tab-video-format"
              type="button"
              role="tab"
              className="is-contextual"
              aria-controls="notebook-ribbon-panel"
              aria-selected={activeTab === 'video-format'}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectRibbonTab('video-format')}
            >Video Format</button>
          ) : null}
        </div>
      </div>
      <div
        id="notebook-ribbon-panel"
        className="notebook-rich-toolbar"
        aria-label="Notebook formatting toolbar"
        data-ribbon-tab={activeTab}
        role="tabpanel"
      >
        <span className="sr-only">{tabLabel} tools</span>
        {activeTab === 'home' ? <>
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
          active={editor.isActive('underline')}
          label="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        ><Underline size={16} /></ToolButton>
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
            <NotebookParagraphControls editor={editor} />
          </RibbonGroup>
          <RibbonGroup label="Styles">
            <div className="notebook-paragraph-style">
          <button
            data-notebook-transient-trigger={paragraphStyleMenu.id}
            type="button"
            className={paragraphStyle.startsWith('heading') ? 'is-active' : undefined}
            aria-label={`Paragraph style: ${PARAGRAPH_STYLE_LABELS[paragraphStyle]}`}
            aria-haspopup="menu"
            aria-expanded={paragraphStyleMenu.isOpen}
            title="Paragraph style"
            onMouseDown={(event) => event.preventDefault()}
            onClick={toggleParagraphStyleMenu}
          >
            <span className="notebook-paragraph-style-glyph" aria-hidden="true">
              {paragraphStyle === 'mixed'
                ? '—'
                : PARAGRAPH_STYLE_OPTIONS.find((option) => option.style === paragraphStyle)?.glyph}
            </span>
            <span>{PARAGRAPH_STYLE_LABELS[paragraphStyle]}</span>
            <ChevronDown aria-hidden="true" size={12} />
          </button>
          {paragraphStyleMenu.isOpen ? (
            <div
              data-notebook-transient-layer={paragraphStyleMenu.id}
              className="notebook-paragraph-style-menu"
              role="menu"
              aria-label="Paragraph styles"
            >
              {PARAGRAPH_STYLE_OPTIONS.map((option) => (
                <button
                  key={option.style}
                  type="button"
                  role="menuitemradio"
                  aria-label={PARAGRAPH_STYLE_LABELS[option.style]}
                  aria-checked={paragraphStyle === option.style}
                  className={`is-${option.style}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyParagraphStyle(option.style)}
                >
                  <span className="notebook-paragraph-style-preview">
                    {PARAGRAPH_STYLE_LABELS[option.style]}
                  </span>
                  <small>{option.description}</small>
                </button>
              ))}
            </div>
          ) : null}
            </div>
          </RibbonGroup>
          <RibbonGroup label="Edit" className="is-history">
            <ToolButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
              <Undo2 size={16} />
            </ToolButton>
            <ToolButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
              <Redo2 size={16} />
            </ToolButton>
          </RibbonGroup>
        </> : null}
        {activeTab === 'insert' ? <>
          <RibbonGroup label="Structure">
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
          <RibbonGroup label="Media">
            <ToolButton
              label="Image"
              onClick={onInsertImage}
              transientTriggerId="notebook-image-details"
            >
              <ImageIcon size={16} />
            </ToolButton>
            <ToolButton
              label="Video"
              onClick={onInsertVideo}
              transientTriggerId="notebook-video-details"
            >
              <Video size={16} />
            </ToolButton>
          </RibbonGroup>
          <RibbonGroup label="Document">
            <ToolButton label="Insert evidence" onClick={() => insertNotebookEvidence(editor)}>
              <FileCheck2 size={16} />
            </ToolButton>
            <ToolButton label="Insert divider" onClick={() => insertNotebookDivider(editor)}>
              <Minus size={16} />
            </ToolButton>
          </RibbonGroup>
        </> : null}
        {activeTab === 'layout' ? (
          <>
            <RibbonGroup label="Page setup" className="is-page-setup">
              <NotebookLayoutControls
                editor={editor}
                headerFooter={headerFooter}
                pageSetup={pageSetup}
                viewMode={viewMode}
                onChangeHeaderFooter={onChangeHeaderFooter}
                onChangePageSetup={onChangePageSetup}
                onInsertPageBreak={onInsertPageBreak}
                onViewModeChange={onViewModeChange}
              />
            </RibbonGroup>
          </>
        ) : null}
        {activeTab === 'picture-format' ? (
          <>
            <RibbonGroup label="Accessibility">
              <ToolButton
                label="Edit image alternative text and decorative state"
                onClick={onEditImageDetails}
                transientTriggerId="notebook-image-details"
              ><ImageIcon size={16} /></ToolButton>
            </RibbonGroup>
            <RibbonGroup label="Caption">
              <ToolButton
                label="Edit image caption and Figure numbering"
                onClick={onEditImageDetails}
                transientTriggerId="notebook-image-details"
              ><Captions size={16} /></ToolButton>
            </RibbonGroup>
            <NotebookPictureFormatControls editor={editor} pageSetup={pageSetup} />
          </>
        ) : null}
        {activeTab === 'video-format' ? (
          <NotebookVideoFormatControls
            editor={editor}
            onChoosePoster={onChooseVideoPoster}
            onChooseTrack={onChooseVideoTrack}
            onEditDetails={onEditVideoDetails}
            onRemovePoster={onRemoveVideoPoster}
            onRemoveTrack={onRemoveVideoTrack}
          />
        ) : null}
      </div>
    </div>
  );
}
