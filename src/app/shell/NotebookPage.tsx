import {
  BookOpen,
  Braces,
  Check,
  ChevronRight,
  FileJson,
  Highlighter,
  Italic,
  Palette,
  Plus,
  Send,
  Sigma,
  Type,
  Undo2,
} from 'lucide-react';
import type {
  CSSProperties,
  ReactNode,
  SyntheticEvent,
} from 'react';
import { useState } from 'react';
import { MathEditor } from '../../components/MathEditor';
import { MathStatic } from '../../components/MathStatic';
import {
  NOTEBOOK_PACKAGE_BOUNDARY,
  acceptNotebookMathCandidate,
  applyNotebookTextMark,
  availableNotebookMathCandidates,
  createNotebookEvidencePlaceholderBlock,
  createNotebookMathEditorBlock,
  createNotebookTextBlock,
  insertNotebookBlockAfter,
  notebookSurfaceStateFromSlot,
  revertNotebookMathSpan,
  selectNotebookBlock,
  updateNotebookBlock,
  updateNotebookMathSpanLatex,
  type NotebookBlock,
  type NotebookDocument,
  type NotebookInlineMathSpan,
  type NotebookMathEditorBlock,
  type NotebookSurfaceState,
  type NotebookTextBlock,
  type NotebookTextMark,
  type NotebookWorkspaceTarget,
} from '../../lib/notebook';
import type { WorkspaceInstanceStateSlot } from '../runtime/workspace-instances';

type NotebookPageProps = {
  instanceId: string;
  onOpenMathInTool: (target: NotebookWorkspaceTarget, latex: string) => void;
  onUpdateSurfaceState: (instanceId: string, state: NotebookSurfaceState) => void;
  surfaceState: WorkspaceInstanceStateSlot;
};

type NotebookToolTarget = {
  id: NotebookWorkspaceTarget;
  label: string;
  live: boolean;
};

type NotebookTextSelection = {
  start: number;
  end: number;
};

const NOTEBOOK_TOOL_TARGETS: readonly NotebookToolTarget[] = [
  { id: 'calculate', label: 'Calculate', live: true },
  { id: 'equation', label: 'Equation', live: true },
  { id: 'calculus', label: 'Calculus', live: false },
  { id: 'trigonometry', label: 'Trigonometry', live: false },
  { id: 'statistics', label: 'Statistics', live: false },
  { id: 'geometry', label: 'Geometry', live: false },
  { id: 'matrix', label: 'Matrix', live: false },
  { id: 'vector', label: 'Vector', live: false },
  { id: 'table', label: 'Table', live: false },
];

function blockLabel(block: NotebookBlock) {
  if (block.kind === 'heading') {
    return block.text || 'Heading';
  }
  if (block.kind === 'text') {
    return block.text.trim().slice(0, 42) || 'Text note';
  }
  if (block.kind === 'math-editor') {
    return block.label || 'Math input';
  }
  if (block.kind === 'evidence-snapshot') {
    return block.snapshot.title;
  }
  return 'Divider';
}

function targetLabel(target: NotebookWorkspaceTarget) {
  return NOTEBOOK_TOOL_TARGETS.find((item) => item.id === target)?.label ?? target;
}

function canOpenTarget(target: NotebookWorkspaceTarget) {
  return NOTEBOOK_TOOL_TARGETS.some((item) => item.id === target && item.live);
}

function selectedBlockFor(document: NotebookDocument) {
  return document.blocks.find((block) => block.id === document.selectedBlockId)
    ?? document.blocks[0]
    ?? null;
}

function textMarkStyle(marks: readonly NotebookTextMark[]): CSSProperties {
  const style: CSSProperties = {};
  if (marks.some((mark) => mark.kind === 'bold')) {
    style.fontWeight = 800;
  }
  if (marks.some((mark) => mark.kind === 'italic')) {
    style.fontStyle = 'italic';
  }
  const highlight = marks.find((mark) => mark.kind === 'highlight');
  if (highlight) {
    style.backgroundColor = highlight.color ?? 'rgba(215, 223, 171, 0.22)';
  }
  const color = marks.find((mark) => mark.kind === 'color');
  if (color?.color) {
    style.color = color.color;
  }
  return style;
}

function marksForRange(block: NotebookTextBlock, start: number, end: number) {
  return block.marks.filter((mark) => mark.start < end && start < mark.end);
}

function renderMarkedText(block: NotebookTextBlock, start: number, end: number) {
  const breakpoints = new Set([start, end]);
  block.marks.forEach((mark) => {
    if (mark.start > start && mark.start < end) {
      breakpoints.add(mark.start);
    }
    if (mark.end > start && mark.end < end) {
      breakpoints.add(mark.end);
    }
  });

  const points = [...breakpoints].sort((left, right) => left - right);
  const fragments: ReactNode[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const segmentStart = points[index];
    const segmentEnd = points[index + 1];
    const text = block.text.slice(segmentStart, segmentEnd);
    if (!text) {
      continue;
    }
    fragments.push(
      <span
        key={`text-${segmentStart}-${segmentEnd}`}
        style={textMarkStyle(marksForRange(block, segmentStart, segmentEnd))}
      >
        {text}
      </span>,
    );
  }
  return fragments;
}

function renderInlineMathPreview(
  block: NotebookTextBlock,
  onUpdateSpan: (spanId: string, latex: string) => void,
) {
  const spans = block.mathSpans
    .filter((span) =>
      span.status === 'accepted'
        && block.text.slice(span.start, span.end) === span.sourceText)
    .sort((left, right) => left.start - right.start);
  if (spans.length === 0) {
    return <p>{renderMarkedText(block, 0, block.text.length)}</p>;
  }

  const fragments: ReactNode[] = [];
  let cursor = 0;
  spans.forEach((span, index) => {
    if (span.start > cursor) {
      fragments.push(...renderMarkedText(block, cursor, span.start));
    }
    fragments.push(
      <span className="notebook-inline-math" key={span.id}>
        <MathEditor
          className="notebook-inline-math-editor"
          dataTestId={`notebook-inline-math-${index}`}
          modeId={span.mode}
          value={span.normalizedLatex}
          onChange={(latex) => onUpdateSpan(span.id, latex)}
        />
      </span>,
    );
    cursor = span.end;
  });

  if (cursor < block.text.length) {
    fragments.push(...renderMarkedText(block, cursor, block.text.length));
  }

  return <p>{fragments}</p>;
}

function NotebookTextBlockView({
  block,
  isSelected,
  onAcceptCandidate,
  onChangeText,
  onRevertSpan,
  onSelect,
  onSelectTextRange,
  onUpdateSpan,
}: {
  block: NotebookTextBlock;
  isSelected: boolean;
  onAcceptCandidate: (candidate: NotebookInlineMathSpan) => void;
  onChangeText: (text: string) => void;
  onRevertSpan: (spanId: string) => void;
  onSelect: () => void;
  onSelectTextRange: (range: NotebookTextSelection) => void;
  onUpdateSpan: (spanId: string, latex: string) => void;
}) {
  const candidates = availableNotebookMathCandidates(block, { mode: 'calculate' });
  function updateTextRange(event: SyntheticEvent<HTMLTextAreaElement>) {
    onSelectTextRange({
      start: event.currentTarget.selectionStart,
      end: event.currentTarget.selectionEnd,
    });
  }

  return (
    <article
      className={`notebook-block notebook-block--text${isSelected ? ' is-selected' : ''}`}
      data-testid="notebook-text-block"
      onClick={onSelect}
    >
      <header className="notebook-block-header">
        <span><Type aria-hidden="true" size={15} /> Text</span>
        <small>{block.mathSpans.length} math spans</small>
      </header>
      <textarea
        aria-label="Notebook text"
        value={block.text}
        onClick={(event) => {
          event.stopPropagation();
          updateTextRange(event);
        }}
        onChange={(event) => onChangeText(event.target.value)}
        onKeyUp={updateTextRange}
        onMouseUp={updateTextRange}
        onSelect={updateTextRange}
      />
      <div className="notebook-rich-preview" data-testid="notebook-rich-preview">
        {renderInlineMathPreview(block, onUpdateSpan)}
      </div>
      {candidates.length > 0 ? (
        <div className="notebook-math-candidates" data-testid="notebook-math-candidates">
          {candidates.slice(0, 4).map((candidate) => (
            <div className="notebook-math-candidate" key={candidate.id}>
              <span>{candidate.sourceText}</span>
              <MathStatic
                block={false}
                className="notebook-candidate-math"
                latex={candidate.normalizedLatex}
              />
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onAcceptCandidate(candidate);
                }}
              >
                <Check aria-hidden="true" size={14} />
                Accept
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {block.mathSpans.length > 0 ? (
        <div className="notebook-accepted-spans">
          {block.mathSpans.map((span) => (
            <button
              key={span.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRevertSpan(span.id);
              }}
            >
              <Undo2 aria-hidden="true" size={13} />
              {span.sourceText}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function NotebookMathBlockView({
  block,
  isSelected,
  onChange,
  onOpenMathInTool,
  onSelect,
}: {
  block: NotebookMathEditorBlock;
  isSelected: boolean;
  onChange: (block: NotebookMathEditorBlock) => void;
  onOpenMathInTool: (target: NotebookWorkspaceTarget, latex: string) => void;
  onSelect: () => void;
}) {
  const canOpen = block.latex.trim() && canOpenTarget(block.workspaceTarget);

  return (
    <article
      className={`notebook-block notebook-block--math${isSelected ? ' is-selected' : ''}`}
      data-testid="notebook-math-editor-block"
      onClick={onSelect}
    >
      <header className="notebook-block-header">
        <span><Sigma aria-hidden="true" size={15} /> {block.label}</span>
        <small>{targetLabel(block.workspaceTarget)}</small>
      </header>
      <div className="notebook-math-editor-row">
        <MathEditor
          className="notebook-math-editor"
          dataTestId="notebook-math-editor"
          modeId={block.workspaceTarget}
          placeholder="Enter math"
          value={block.latex}
          onChange={(latex) => onChange({ ...block, latex })}
          onSubmit={() => {
            if (canOpen) {
              onOpenMathInTool(block.workspaceTarget, block.latex);
            }
          }}
        />
        <button
          type="button"
          disabled={!canOpen}
          onClick={(event) => {
            event.stopPropagation();
            onOpenMathInTool(block.workspaceTarget, block.latex);
          }}
        >
          <Send aria-hidden="true" size={15} />
          Open in Tool
        </button>
      </div>
    </article>
  );
}

function NotebookBlockView({
  block,
  isSelected,
  onChangeBlock,
  onOpenMathInTool,
  onSelect,
  onSelectTextRange,
}: {
  block: NotebookBlock;
  isSelected: boolean;
  onChangeBlock: (block: NotebookBlock) => void;
  onOpenMathInTool: (target: NotebookWorkspaceTarget, latex: string) => void;
  onSelect: () => void;
  onSelectTextRange: (blockId: string, range: NotebookTextSelection) => void;
}) {
  if (block.kind === 'text') {
    return (
      <NotebookTextBlockView
        block={block}
        isSelected={isSelected}
        onSelect={onSelect}
        onChangeText={(text) => onChangeBlock({ ...block, text })}
        onAcceptCandidate={(candidate) => onChangeBlock(acceptNotebookMathCandidate(block, candidate))}
        onRevertSpan={(spanId) => onChangeBlock(revertNotebookMathSpan(block, spanId))}
        onSelectTextRange={(range) => onSelectTextRange(block.id, range)}
        onUpdateSpan={(spanId, latex) => onChangeBlock(updateNotebookMathSpanLatex(block, spanId, latex))}
      />
    );
  }

  if (block.kind === 'math-editor') {
    return (
      <NotebookMathBlockView
        block={block}
        isSelected={isSelected}
        onSelect={onSelect}
        onChange={onChangeBlock}
        onOpenMathInTool={onOpenMathInTool}
      />
    );
  }

  if (block.kind === 'evidence-snapshot') {
    return (
      <article
        className={`notebook-block notebook-block--evidence${isSelected ? ' is-selected' : ''}`}
        data-testid="notebook-evidence-block"
        onClick={onSelect}
      >
        <header className="notebook-block-header">
          <span><FileJson aria-hidden="true" size={15} /> {block.snapshot.title}</span>
          <small>{block.snapshot.source}</small>
        </header>
        <div className="notebook-evidence-placeholder">
          <Braces aria-hidden="true" size={18} />
          <span>Compact evidence snapshot contract</span>
        </div>
      </article>
    );
  }

  if (block.kind === 'heading') {
    return (
      <article
        className={`notebook-block notebook-block--heading${isSelected ? ' is-selected' : ''}`}
        data-testid="notebook-heading-block"
        onClick={onSelect}
      >
        <input
          aria-label="Notebook heading"
          value={block.text}
          onChange={(event) => onChangeBlock({ ...block, text: event.target.value })}
        />
      </article>
    );
  }

  return <hr className="notebook-divider" data-testid="notebook-divider" />;
}

function NotebookInspector({
  block,
  onApplyMark,
  onChangeMathTarget,
}: {
  block: NotebookBlock | null;
  onApplyMark: (kind: 'bold' | 'italic' | 'highlight' | 'color') => void;
  onChangeMathTarget: (target: NotebookWorkspaceTarget) => void;
}) {
  if (!block) {
    return null;
  }

  return (
    <aside className="notebook-inspector" data-testid="notebook-inspector">
      <div className="notebook-inspector-heading">
        <span>Selected block</span>
        <strong>{blockLabel(block)}</strong>
      </div>
      {block.kind === 'text' ? (
        <div className="notebook-inspector-section">
          <span>Text treatment</span>
          <div className="notebook-inspector-actions">
            <button type="button" onClick={() => onApplyMark('bold')}><Type size={15} /> Bold</button>
            <button type="button" onClick={() => onApplyMark('italic')}><Italic size={15} /> Italic</button>
            <button type="button" onClick={() => onApplyMark('highlight')}><Highlighter size={15} /> Highlight</button>
            <button type="button" onClick={() => onApplyMark('color')}><Palette size={15} /> Color</button>
          </div>
        </div>
      ) : null}
      {block.kind === 'math-editor' ? (
        <div className="notebook-inspector-section">
          <label htmlFor="notebook-workspace-target">Workspace</label>
          <select
            id="notebook-workspace-target"
            value={block.workspaceTarget}
            onChange={(event) => onChangeMathTarget(event.target.value as NotebookWorkspaceTarget)}
          >
            {NOTEBOOK_TOOL_TARGETS.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="notebook-inspector-section">
        <span>Evidence package boundary</span>
        <div className="notebook-forbidden-fields">
          {NOTEBOOK_PACKAGE_BOUNDARY.forbiddenFields.slice(0, 6).map((field) => (
            <code key={field}>{field}</code>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function NotebookPage({
  instanceId,
  onOpenMathInTool,
  onUpdateSurfaceState,
  surfaceState,
}: NotebookPageProps) {
  const [textSelections, setTextSelections] = useState<Record<string, NotebookTextSelection>>({});
  const notebookState = notebookSurfaceStateFromSlot(surfaceState, {
    idPrefix: instanceId,
  });
  const { document } = notebookState;
  const selectedBlock = selectedBlockFor(document);

  function commitDocument(nextDocument: NotebookDocument) {
    onUpdateSurfaceState(instanceId, {
      kind: 'notebook-surface-state',
      document: nextDocument,
    });
  }

  function updateBlock(blockId: string, nextBlock: NotebookBlock) {
    commitDocument(updateNotebookBlock(document, blockId, () => nextBlock));
  }

  function addTextBlock() {
    const anchor = selectedBlock?.id ?? document.blocks.at(-1)?.id ?? '';
    commitDocument(insertNotebookBlockAfter(document, anchor, createNotebookTextBlock('', {
      idPrefix: instanceId,
    })));
  }

  function addMathBlock() {
    const anchor = selectedBlock?.id ?? document.blocks.at(-1)?.id ?? '';
    commitDocument(insertNotebookBlockAfter(document, anchor, createNotebookMathEditorBlock({
      idPrefix: instanceId,
    })));
  }

  function addEvidenceBlock() {
    const anchor = selectedBlock?.id ?? document.blocks.at(-1)?.id ?? '';
    commitDocument(insertNotebookBlockAfter(document, anchor, createNotebookEvidencePlaceholderBlock({
      idPrefix: instanceId,
    })));
  }

  function applyTextMark(kind: 'bold' | 'italic' | 'highlight' | 'color') {
    if (!selectedBlock || selectedBlock.kind !== 'text') {
      return;
    }
    const selection = textSelections[selectedBlock.id];
    const hasSelection = Boolean(selection && selection.end > selection.start);

    updateBlock(selectedBlock.id, applyNotebookTextMark(selectedBlock, kind, {
      color: kind === 'color' ? '#b8d49c' : undefined,
      end: hasSelection ? selection?.end : undefined,
      start: hasSelection ? selection?.start : undefined,
    }));
  }

  function changeMathTarget(target: NotebookWorkspaceTarget) {
    if (!selectedBlock || selectedBlock.kind !== 'math-editor') {
      return;
    }

    updateBlock(selectedBlock.id, {
      ...selectedBlock,
      workspaceTarget: target,
    });
  }

  return (
    <section className="app-page app-page--notebook" data-testid="notebook-page">
      <header className="app-page-shell-header">REZANOVA CLASSWIZ CALCULATOR</header>
      <div className="notebook-page-workbench">
        <aside className="notebook-outline" aria-label="Notebook outline">
          <div className="notebook-title">
            <span>NOTEBOOK</span>
            <h1>{document.title}</h1>
            <p>Author explanations around live, verifiable math.</p>
          </div>
          <div className="notebook-outline-list">
            {document.blocks.map((block) => (
              <button
                key={block.id}
                type="button"
                className={block.id === document.selectedBlockId ? 'is-active' : undefined}
                onClick={() => commitDocument(selectNotebookBlock(document, block.id))}
              >
                <ChevronRight aria-hidden="true" size={15} />
                <span>{blockLabel(block)}</span>
              </button>
            ))}
          </div>
          <div className="notebook-add-actions">
            <button type="button" onClick={addTextBlock}><Plus size={15} /> Text</button>
            <button type="button" onClick={addMathBlock}><Plus size={15} /> Math</button>
            <button type="button" onClick={addEvidenceBlock}><Plus size={15} /> Evidence</button>
          </div>
          <div className="notebook-brand">
            <BookOpen aria-hidden="true" size={18} />
            <div>
              <strong>REZANOVA</strong>
              <span>CLASSWIZ NOTEBOOK</span>
            </div>
          </div>
        </aside>
        <main className="notebook-canvas" data-testid="notebook-canvas">
          <div className="notebook-canvas-header">
            <span>MATH-AWARE DOCUMENT</span>
            <h2>{document.title}</h2>
            <div className="notebook-canvas-meta">
              <span>{document.blocks.length} blocks</span>
              <span>Session draft</span>
            </div>
          </div>
          <div className="notebook-block-stack">
            {document.blocks.map((block) => (
              <NotebookBlockView
                key={block.id}
                block={block}
                isSelected={block.id === document.selectedBlockId}
                onSelect={() => commitDocument(selectNotebookBlock(document, block.id))}
                onChangeBlock={(nextBlock) => updateBlock(block.id, nextBlock)}
                onOpenMathInTool={onOpenMathInTool}
                onSelectTextRange={(blockId, range) =>
                  setTextSelections((current) => ({
                    ...current,
                    [blockId]: range,
                  }))}
              />
            ))}
          </div>
        </main>
        <NotebookInspector
          block={selectedBlock}
          onApplyMark={applyTextMark}
          onChangeMathTarget={changeMathTarget}
        />
      </div>
      <footer className="app-page-shell-footer">
        <span>Ready</span>
        <span>Workspace: Notebook</span>
        <span>Mode: N/A (Page Surface)</span>
      </footer>
    </section>
  );
}
