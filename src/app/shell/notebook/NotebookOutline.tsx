import type { Editor } from '@tiptap/core';
import {
  BookMarked,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  Folder,
  FolderPlus,
  Heading2,
  IndentIncrease,
  ListTree,
  MoreHorizontal,
  Outdent,
  Pencil,
  Search,
  Sigma,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';

import {
  buildNotebookOutline,
  countNotebookBlocks,
  notebookSemanticDefinition,
  type NotebookOutlineEntry,
  type NotebookRichDocument,
} from '../../../lib/notebook';
import {
  indentNotebookNode,
  insertNotebookDisplayMath,
  insertNotebookSection,
  moveNotebookNode,
  moveNotebookNodeInParent,
  outdentNotebookNode,
  removeNotebookSection,
  selectNotebookEditorNode,
  updateNotebookSection,
  type NotebookMovePlacement,
} from './canvas';

type NotebookOutlineProps = {
  className?: string;
  document: NotebookRichDocument;
  editor: Editor | null;
  onClose: () => void;
  selectedNodeId: string | null;
};

type DropTarget = { id: string; placement: NotebookMovePlacement } | null;

function entryKindLabel(entry: NotebookOutlineEntry) {
  if (entry.nodeType === 'section') {
    return entry.depth === 0 ? 'Section' : 'Subsection';
  }
  if (entry.nodeType === 'heading') {
    return `H${Math.min(3, entry.depth + 1)}`;
  }
  return notebookSemanticDefinition(entry.semanticKind ?? 'note').label;
}

function matchingEntryIds(entries: readonly NotebookOutlineEntry[], query: string) {
  if (!query.trim()) {
    return null;
  }
  const normalized = query.trim().toLowerCase();
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const matches = new Set<string>();
  entries.forEach((entry) => {
    if (![entry.label, ...entry.path].some((value) => value.toLowerCase().includes(normalized))) {
      return;
    }
    matches.add(entry.id);
    let parentId = entry.parentId;
    while (parentId) {
      matches.add(parentId);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
  });
  return matches;
}

function visibleOutlineEntries(entries: readonly NotebookOutlineEntry[], query: string) {
  const matches = matchingEntryIds(entries, query);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return entries.filter((entry) => {
    if (matches && !matches.has(entry.id)) {
      return false;
    }
    if (matches) {
      return true;
    }
    let parentId = entry.parentId;
    while (parentId) {
      const parent = byId.get(parentId);
      if (parent?.nodeType === 'section' && parent.collapsed) {
        return false;
      }
      parentId = parent?.parentId ?? null;
    }
    return true;
  });
}

export function NotebookOutline({
  className,
  document,
  editor,
  onClose,
  selectedNodeId,
}: NotebookOutlineProps) {
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [query, setQuery] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [menuSectionId, setMenuSectionId] = useState<string | null>(null);
  const outline = useMemo(() => buildNotebookOutline(document.content), [document.content]);
  const visibleEntries = useMemo(() => visibleOutlineEntries(outline, query), [outline, query]);

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

  function sectionActions(entry: NotebookOutlineEntry) {
    if (entry.nodeType !== 'section' || menuSectionId !== entry.id) {
      return null;
    }
    return (
      <div className="notebook-outline-menu" role="menu" aria-label={`${entry.label} actions`}>
        <button type="button" role="menuitem" onClick={() => {
          setEditingSectionId(entry.id);
          setMenuSectionId(null);
        }}><Pencil aria-hidden="true" size={14} /> Rename</button>
        <button type="button" role="menuitem" onClick={() => {
          editor && insertNotebookSection(editor, { parentId: entry.id });
          setMenuSectionId(null);
        }}><FolderPlus aria-hidden="true" size={14} /> Add subsection</button>
        <button type="button" role="menuitem" onClick={() => {
          editor && indentNotebookNode(editor, entry.id);
          setMenuSectionId(null);
        }}><IndentIncrease aria-hidden="true" size={14} /> Indent</button>
        <button type="button" role="menuitem" onClick={() => {
          editor && outdentNotebookNode(editor, entry.id);
          setMenuSectionId(null);
        }}><Outdent aria-hidden="true" size={14} /> Outdent</button>
        <button type="button" role="menuitem" onClick={() => {
          editor && removeNotebookSection(editor, entry.id, { keepContents: true });
          setMenuSectionId(null);
        }}><Folder aria-hidden="true" size={14} /> Remove section, keep contents</button>
        <button className="is-danger" type="button" role="menuitem" onClick={() => {
          if (editor && window.confirm(`Delete "${entry.label}" and everything inside it?`)) {
            removeNotebookSection(editor, entry.id, { keepContents: false });
          }
          setMenuSectionId(null);
        }}><Trash2 aria-hidden="true" size={14} /> Delete section and contents</button>
      </div>
    );
  }

  return (
    <aside className={`notebook-outline${className ? ` ${className}` : ''}`} aria-label="Notebook outline">
      <div className="notebook-title">
        <div className="notebook-title-row">
          <span>Notebook</span>
          <button type="button" className="notebook-drawer-close" aria-label="Close Notebook outline" title="Close outline" onClick={onClose}>
            <X aria-hidden="true" size={17} />
          </button>
        </div>
        <h1>{document.title}</h1>
        <p>Author explanations around live, verifiable math.</p>
      </div>
      <div className="notebook-outline-heading">
        <span><ListTree aria-hidden="true" size={15} /> Outline</span>
        <button type="button" aria-label="Add top-level section" title="Add section" onClick={() => editor && insertNotebookSection(editor)}>
          <FolderPlus aria-hidden="true" size={15} />
        </button>
        <small title={`${countNotebookBlocks(document.content)} total blocks`}>{outline.length} anchors</small>
      </div>
      <label className="notebook-outline-search">
        <Search aria-hidden="true" size={14} />
        <span className="sr-only">Find in document</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find in document" />
      </label>
      <div className="notebook-outline-list" onDragLeave={() => setDropTarget(null)}>
        {visibleEntries.length > 0 ? visibleEntries.map((entry) => {
          const kindLabel = entryKindLabel(entry);
          const detailLabel = entry.nodeType === 'semanticBlock'
            ? entry.label.replace(new RegExp(`^${kindLabel}\\s*`, 'i'), '') || kindLabel
            : entry.label;
          const depth = Math.min(entry.depth, 4);
          const rowStyle = { '--notebook-outline-depth': depth } as CSSProperties;
          const isDropTarget = dropTarget?.id === entry.id;
          return (
            <div
              key={entry.id}
              draggable
              data-testid="notebook-outline-entry"
              data-node-id={entry.id}
              data-outline-kind={entry.nodeType}
              data-outline-depth={entry.depth}
              className={[
                'notebook-outline-entry',
                `is-${entry.nodeType}`,
                entry.id === selectedNodeId ? 'is-active' : '',
                isDropTarget ? `is-drop-${dropTarget.placement}` : '',
              ].filter(Boolean).join(' ')}
              style={rowStyle}
              title={entry.path.join(' / ')}
              onClick={(event) => {
                if (event.target === event.currentTarget && editor) {
                  selectNotebookEditorNode(editor, entry.id);
                }
              }}
              onDragStart={(event) => {
                setDraggedNodeId(entry.id);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', entry.id);
              }}
              onDragEnd={() => {
                setDraggedNodeId(null);
                setDropTarget(null);
              }}
              onDragOver={(event) => {
                if (!draggedNodeId || draggedNodeId === entry.id) {
                  return;
                }
                event.preventDefault();
                const bounds = event.currentTarget.getBoundingClientRect();
                const placement: NotebookMovePlacement = entry.nodeType === 'section'
                  && event.clientX > bounds.left + 68
                  ? 'inside'
                  : event.clientY > bounds.top + bounds.height / 2 ? 'after' : 'before';
                setDropTarget({ id: entry.id, placement });
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId = draggedNodeId || event.dataTransfer.getData('text/plain');
                if (editor && sourceId && dropTarget?.id === entry.id) {
                  moveNotebookNode(editor, sourceId, entry.id, dropTarget.placement);
                }
                setDraggedNodeId(null);
                setDropTarget(null);
              }}
            >
              {entry.nodeType === 'section' ? (
                <button
                  type="button"
                  className="notebook-outline-collapse"
                  aria-label={entry.collapsed ? `Expand ${entry.label}` : `Collapse ${entry.label}`}
                  aria-expanded={!entry.collapsed}
                  onClick={() => editor && updateNotebookSection(editor, entry.id, { collapsed: !entry.collapsed })}
                >
                  {entry.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
              ) : entry.nodeType === 'heading'
                ? <Heading2 aria-hidden="true" size={15} />
                : <BookMarked aria-hidden="true" size={15} />}
              <div className="notebook-outline-entry-main">
                <span className="notebook-outline-entry-copy">
                  <small>{kindLabel}{entry.depth > 4 ? ` · ${entry.depth + 1}` : ''}</small>
                  {editingSectionId === entry.id ? (
                    <input
                      aria-label="Rename section"
                      autoFocus
                      defaultValue={entry.label}
                      onBlur={(event) => {
                        editor && updateNotebookSection(editor, entry.id, {
                          title: event.currentTarget.value.trim() || 'Untitled section',
                        });
                        setEditingSectionId(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          event.stopPropagation();
                          editor && updateNotebookSection(editor, entry.id, {
                            title: event.currentTarget.value.trim() || 'Untitled section',
                          });
                          setEditingSectionId(null);
                        } else if (event.key === 'Escape') {
                          event.preventDefault();
                          event.stopPropagation();
                          setEditingSectionId(null);
                        }
                      }}
                    />
                  ) : (
                    <button type="button" onClick={() => editor && selectNotebookEditorNode(editor, entry.id)}>
                      <strong>{detailLabel}</strong>
                    </button>
                  )}
                </span>
                {entry.nodeType === 'section' ? <small className="notebook-outline-count">{entry.childCount}</small> : null}
              </div>
              {entry.nodeType === 'section' ? (
                <div className="notebook-outline-entry-actions">
                  <button type="button" aria-label={`Move ${entry.label} up`} title="Move up" onClick={() => editor && moveNotebookNodeInParent(editor, entry.id, 'up')}>↑</button>
                  <button type="button" aria-label={`Move ${entry.label} down`} title="Move down" onClick={() => editor && moveNotebookNodeInParent(editor, entry.id, 'down')}>↓</button>
                  <button type="button" aria-label={`${entry.label} actions`} aria-expanded={menuSectionId === entry.id} onClick={() => setMenuSectionId((current) => current === entry.id ? null : entry.id)}>
                    <MoreHorizontal aria-hidden="true" size={14} />
                  </button>
                  {sectionActions(entry)}
                </div>
              ) : <ChevronRight aria-hidden="true" size={14} />}
            </div>
          );
        }) : (
          <div className="notebook-outline-empty">
            {query ? 'No matching headings or academic containers.' : 'No headings or academic containers yet.'}
          </div>
        )}
      </div>
      <div className="notebook-add-actions" aria-label="Add Notebook block">
        <button type="button" title="Add text" onClick={addParagraph}><Type size={15} /> Text</button>
        <button type="button" title="Add display math" onClick={() => editor && insertNotebookDisplayMath(editor)}><Sigma size={15} /> Math</button>
        <button type="button" title="Add evidence placeholder" onClick={addEvidence}><FileCheck2 size={15} /> Evidence</button>
      </div>
      <div className="notebook-brand">
        <BookOpen aria-hidden="true" size={18} />
        <div><strong>REZANOVA</strong><span>CLASSWIZ NOTEBOOK</span></div>
      </div>
    </aside>
  );
}
