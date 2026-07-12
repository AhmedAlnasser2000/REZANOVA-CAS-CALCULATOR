import type { Editor } from '@tiptap/core';
import {
  BookMarked,
  BookOpen,
  ChevronRight,
  FileCheck2,
  Heading2,
  ListTree,
  Sigma,
  Type,
  X,
} from 'lucide-react';
import { useState } from 'react';

import {
  buildNotebookOutline,
  countNotebookBlocks,
  notebookSemanticDefinition,
  type NotebookRichDocument,
} from '../../../lib/notebook';
import {
  insertNotebookDisplayMath,
  moveNotebookTopLevelNode,
  selectNotebookEditorNode,
} from './canvas';

type NotebookOutlineProps = {
  className?: string;
  document: NotebookRichDocument;
  editor: Editor | null;
  onClose: () => void;
  selectedNodeId: string | null;
};

export function NotebookOutline({
  className,
  document,
  editor,
  onClose,
  selectedNodeId,
}: NotebookOutlineProps) {
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const outline = buildNotebookOutline(document.content);
  const headingNumbers = new Map<string, number>();
  let headingCount = 0;
  outline.forEach((entry) => {
    if (entry.nodeType === 'heading') {
      headingCount += 1;
      headingNumbers.set(entry.id, headingCount);
    }
  });

  function addParagraph() {
    editor?.chain().focus('end').insertContent({
      type: 'paragraph',
      attrs: { id: null },
    }).run();
  }

  function addEvidence() {
    editor?.chain().focus('end').insertContent({
      type: 'evidenceSnapshot',
      attrs: {
        id: null,
        source: 'manual-placeholder',
        title: 'Evidence snapshot',
        facts: [],
        warnings: [],
      },
    }).run();
  }

  return (
    <aside className={`notebook-outline${className ? ` ${className}` : ''}`} aria-label="Notebook outline">
      <div className="notebook-title">
        <div className="notebook-title-row">
          <span>Notebook</span>
          <button
            type="button"
            className="notebook-drawer-close"
            aria-label="Close Notebook outline"
            title="Close outline"
            onClick={onClose}
          ><X aria-hidden="true" size={17} /></button>
        </div>
        <h1>{document.title}</h1>
        <p>Author explanations around live, verifiable math.</p>
      </div>
      <div className="notebook-outline-heading">
        <span><ListTree aria-hidden="true" size={15} /> Outline</span>
        <small title={`${countNotebookBlocks(document.content)} total blocks`}>
          {outline.length} anchors
        </small>
      </div>
      <div className="notebook-outline-list">
        {outline.length > 0 ? outline.map((entry) => {
          const kindLabel = entry.nodeType === 'heading'
            ? `Section ${headingNumbers.get(entry.id) ?? ''}`.trim()
            : notebookSemanticDefinition(entry.semanticKind ?? 'note').label;
          const detailLabel = entry.nodeType === 'heading'
            ? entry.label
            : entry.label.replace(new RegExp(`^${kindLabel}\\s*`, 'i'), '') || kindLabel;
          return (
          <button
            key={entry.id}
            type="button"
            draggable
            data-testid="notebook-outline-entry"
            data-node-id={entry.id}
            data-outline-kind={entry.nodeType}
            className={[
              entry.nodeType === 'heading' ? 'is-heading' : 'is-semantic',
              entry.id === selectedNodeId ? 'is-active' : '',
            ].filter(Boolean).join(' ')}
            title={entry.label}
            onClick={() => editor && selectNotebookEditorNode(editor, entry.id)}
            onDragStart={(event) => {
              setDraggedNodeId(entry.id);
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', entry.id);
            }}
            onDragEnd={() => setDraggedNodeId(null)}
            onDragOver={(event) => {
              if (draggedNodeId && draggedNodeId !== entry.id) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              const sourceId = draggedNodeId || event.dataTransfer.getData('text/plain');
              if (!editor || !sourceId || sourceId === entry.id) {
                return;
              }
              const bounds = event.currentTarget.getBoundingClientRect();
              const placement = event.clientY > bounds.top + bounds.height / 2
                ? 'after'
                : 'before';
              moveNotebookTopLevelNode(editor, sourceId, entry.id, placement);
              setDraggedNodeId(null);
            }}
          >
            {entry.nodeType === 'heading'
              ? <Heading2 aria-hidden="true" size={15} />
              : <BookMarked aria-hidden="true" size={15} />}
            <span className="notebook-outline-entry-copy">
              <small>{kindLabel}</small>
              <strong>{detailLabel}</strong>
            </span>
            <ChevronRight aria-hidden="true" size={14} />
          </button>
          );
        }) : (
          <div className="notebook-outline-empty">No headings or academic containers yet.</div>
        )}
      </div>
      <div className="notebook-add-actions" aria-label="Add Notebook block">
        <button type="button" title="Add text" onClick={addParagraph}><Type size={15} /> Text</button>
        <button type="button" title="Add display math" onClick={() => editor && insertNotebookDisplayMath(editor)}><Sigma size={15} /> Math</button>
        <button type="button" title="Add evidence placeholder" onClick={addEvidence}><FileCheck2 size={15} /> Evidence</button>
      </div>
      <div className="notebook-brand">
        <BookOpen aria-hidden="true" size={18} />
        <div>
          <strong>REZANOVA</strong>
          <span>CLASSWIZ NOTEBOOK</span>
        </div>
      </div>
    </aside>
  );
}
