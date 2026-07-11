import type {
  NotebookBlock,
  NotebookDocument,
  NotebookInlineMathSpan,
  NotebookTextBlock,
  NotebookTextMark,
} from '../types';
import { NOTEBOOK_RICH_DOCUMENT_VERSION } from './types';
import type {
  NotebookInlineNode,
  NotebookRichBlockNode,
  NotebookRichDocument,
  NotebookRichMark,
} from './types';

function richMark(mark: NotebookTextMark): NotebookRichMark {
  if (mark.kind === 'highlight') {
    return { type: 'highlight', color: mark.color };
  }
  if (mark.kind === 'color') {
    return { type: 'textStyle', color: mark.color };
  }
  return { type: mark.kind };
}

function validAcceptedSpans(block: NotebookTextBlock) {
  const accepted = block.mathSpans
    .filter((span) =>
      span.status === 'accepted'
      && span.start >= 0
      && span.end <= block.text.length
      && span.end > span.start
      && block.text.slice(span.start, span.end) === span.sourceText)
    .sort((left, right) => left.start - right.start);

  return accepted.filter((span, index) =>
    index === 0 || accepted[index - 1].end <= span.start);
}

function marksAt(block: NotebookTextBlock, start: number, end: number) {
  return block.marks
    .filter((mark) => mark.start < end && start < mark.end)
    .map(richMark);
}

function textNode(
  block: NotebookTextBlock,
  start: number,
  end: number,
): NotebookInlineNode | null {
  const text = block.text.slice(start, end);
  if (!text) {
    return null;
  }
  const marks = marksAt(block, start, end);
  return { type: 'text', text, ...(marks.length > 0 ? { marks } : {}) };
}

function mathNode(span: NotebookInlineMathSpan): NotebookInlineNode {
  return {
    type: 'inlineMath',
    id: span.id,
    sourceText: span.sourceText,
    latex: span.normalizedLatex,
    workspaceTarget: span.mode,
  };
}

function migrateTextBlock(block: NotebookTextBlock): NotebookRichBlockNode {
  const spans = validAcceptedSpans(block);
  const breakpoints = new Set([0, block.text.length]);
  block.marks.forEach((mark) => {
    breakpoints.add(Math.max(0, Math.min(block.text.length, mark.start)));
    breakpoints.add(Math.max(0, Math.min(block.text.length, mark.end)));
  });
  spans.forEach((span) => {
    breakpoints.add(span.start);
    breakpoints.add(span.end);
  });
  const points = [...breakpoints].sort((left, right) => left - right);
  const content: NotebookInlineNode[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const span = spans.find((candidate) => candidate.start === start && candidate.end === end);
    const node = span ? mathNode(span) : textNode(block, start, end);
    if (node) {
      content.push(node);
    }
  }

  return { type: 'paragraph', id: block.id, ...(content.length > 0 ? { content } : {}) };
}

function migrateBlock(block: NotebookBlock): NotebookRichBlockNode {
  if (block.kind === 'text') {
    return migrateTextBlock(block);
  }
  if (block.kind === 'heading') {
    return {
      type: 'heading',
      id: block.id,
      level: block.level,
      content: block.text ? [{ type: 'text', text: block.text }] : undefined,
    };
  }
  if (block.kind === 'math-editor') {
    return {
      type: 'displayMath',
      id: block.id,
      label: block.label,
      sourceText: block.latex,
      latex: block.latex,
      workspaceTarget: block.workspaceTarget,
    };
  }
  if (block.kind === 'evidence-snapshot') {
    return {
      type: 'evidenceSnapshot',
      id: block.id,
      source: block.snapshot.source,
      title: block.snapshot.title,
      inputLatex: block.snapshot.inputLatex,
      resultLatex: block.snapshot.resultLatex,
      facts: [...block.snapshot.facts],
      warnings: [...block.snapshot.warnings],
    };
  }
  return { type: 'horizontalRule', id: block.id };
}

export function migrateNotebookDocumentV1(
  document: NotebookDocument,
): NotebookRichDocument {
  const content = document.blocks.map(migrateBlock);
  const selectedNodeId = content.some((node) => node.id === document.selectedBlockId)
    ? document.selectedBlockId
    : content[0]?.id ?? null;

  return {
    version: NOTEBOOK_RICH_DOCUMENT_VERSION,
    id: document.id,
    title: document.title,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    selectedNodeId,
    content,
  };
}
