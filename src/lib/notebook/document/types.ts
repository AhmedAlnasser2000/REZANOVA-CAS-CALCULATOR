import type { NotebookWorkspaceTarget } from '../types';

export const NOTEBOOK_RICH_DOCUMENT_VERSION = 4 as const;
export const NOTEBOOK_FONT_SIZE_MIN = 50;
export const NOTEBOOK_FONT_SIZE_MAX = 249;

export function isNotebookFontSize(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= NOTEBOOK_FONT_SIZE_MIN
    && value <= NOTEBOOK_FONT_SIZE_MAX;
}

export type NotebookRichDocumentVersion = typeof NOTEBOOK_RICH_DOCUMENT_VERSION;
export type NotebookSemanticKind =
  | 'theorem'
  | 'definition'
  | 'lemma'
  | 'corollary'
  | 'proof'
  | 'example'
  | 'solution'
  | 'exercise'
  | 'hint'
  | 'answer'
  | 'note'
  | 'warning';

export type NotebookRichMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'strike' }
  | { type: 'highlight'; color?: string }
  | { type: 'textStyle'; color?: string; fontSize?: number };

export type NotebookRichTextNode = {
  type: 'text';
  text: string;
  marks?: NotebookRichMark[];
};

export type NotebookInlineMathNode = {
  type: 'inlineMath';
  id: string;
  sourceText: string;
  latex: string;
  workspaceTarget: NotebookWorkspaceTarget;
};

export type NotebookInlineNode = NotebookRichTextNode | NotebookInlineMathNode;

export type NotebookParagraphNode = {
  type: 'paragraph';
  id: string;
  content?: NotebookInlineNode[];
};

export type NotebookHeadingNode = {
  type: 'heading';
  id: string;
  level: 1 | 2 | 3;
  content?: NotebookInlineNode[];
};

export type NotebookDisplayMathNode = {
  type: 'displayMath';
  id: string;
  label?: string;
  sourceText: string;
  latex: string;
  workspaceTarget: NotebookWorkspaceTarget;
};

export type NotebookEvidenceNode = {
  type: 'evidenceSnapshot';
  id: string;
  source: 'future-current-result' | 'future-history-entry' | 'manual-placeholder';
  title: string;
  inputLatex?: string;
  resultLatex?: string;
  facts: string[];
  warnings: string[];
};

export type NotebookDividerNode = {
  type: 'horizontalRule';
  id: string;
};

export type NotebookListItemNode = {
  type: 'listItem';
  id: string;
  content: NotebookRichBlockNode[];
};

export type NotebookListNode = {
  type: 'bulletList' | 'orderedList';
  id: string;
  content: NotebookListItemNode[];
};

export type NotebookSemanticNode = {
  type: 'semanticBlock';
  id: string;
  variant: NotebookSemanticKind;
  label?: string;
  number?: string;
  collapsed?: boolean;
  content: NotebookRichBlockNode[];
};

export type NotebookSectionNode = {
  type: 'section';
  id: string;
  title: string;
  collapsed?: boolean;
  content: NotebookRichBlockNode[];
};

export type NotebookRichBlockNode =
  | NotebookParagraphNode
  | NotebookHeadingNode
  | NotebookDisplayMathNode
  | NotebookEvidenceNode
  | NotebookDividerNode
  | NotebookListNode
  | NotebookSemanticNode
  | NotebookSectionNode;

export type NotebookRichDocument = {
  version: NotebookRichDocumentVersion;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  selectedNodeId: string | null;
  content: NotebookRichBlockNode[];
};

export type NotebookRichDocumentV2 = Omit<NotebookRichDocument, 'version'> & {
  version: 2;
};

export type NotebookRichDocumentV3 = Omit<NotebookRichDocument, 'version'> & {
  version: 3;
};

export type NotebookDocumentSummary = {
  id: string;
  title: string;
  updatedAt: string;
  blockCount: number;
};

export type NotebookStarterTemplateId =
  | 'lecture-notes'
  | 'worked-example'
  | 'theorem-sheet'
  | 'exercise-set';
