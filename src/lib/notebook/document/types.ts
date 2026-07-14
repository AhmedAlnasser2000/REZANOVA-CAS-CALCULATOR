import type { NotebookWorkspaceTarget } from '../types';

export const NOTEBOOK_RICH_DOCUMENT_VERSION = 6 as const;
export const NOTEBOOK_FONT_SIZE_MIN = 50;
export const NOTEBOOK_FONT_SIZE_MAX = 249;

export const NOTEBOOK_TEXT_ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const;
export const NOTEBOOK_LINE_SPACINGS = [1, 1.15, 1.5, 2] as const;
export const NOTEBOOK_PARAGRAPH_SPACES_PT = [0, 6, 12, 18, 24] as const;
export const NOTEBOOK_BULLET_STYLES = ['disc', 'circle', 'square', 'dash'] as const;
export const NOTEBOOK_ORDERED_STYLES = ['decimal', 'lower-alpha', 'lower-roman'] as const;

export function isNotebookFontSize(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= NOTEBOOK_FONT_SIZE_MIN
    && value <= NOTEBOOK_FONT_SIZE_MAX;
}

export type NotebookRichDocumentVersion = typeof NOTEBOOK_RICH_DOCUMENT_VERSION;
export type NotebookTextAlignment = typeof NOTEBOOK_TEXT_ALIGNMENTS[number];
export type NotebookLineSpacing = typeof NOTEBOOK_LINE_SPACINGS[number];
export type NotebookParagraphSpacePt = typeof NOTEBOOK_PARAGRAPH_SPACES_PT[number];
export type NotebookBulletStyle = typeof NOTEBOOK_BULLET_STYLES[number];
export type NotebookOrderedStyle = typeof NOTEBOOK_ORDERED_STYLES[number];
export type NotebookParagraphFormat = {
  alignment?: NotebookTextAlignment;
  lineSpacing?: NotebookLineSpacing;
  spaceBeforePt?: NotebookParagraphSpacePt;
  spaceAfterPt?: NotebookParagraphSpacePt;
};
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
  | { type: 'underline' }
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
  format?: NotebookParagraphFormat;
  content?: NotebookInlineNode[];
};

export type NotebookHeadingNode = {
  type: 'heading';
  id: string;
  level: 1 | 2 | 3;
  format?: NotebookParagraphFormat;
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

export type NotebookBulletListNode = {
  type: 'bulletList';
  id: string;
  style?: NotebookBulletStyle;
  content: NotebookListItemNode[];
};

export type NotebookOrderedListNode = {
  type: 'orderedList';
  id: string;
  style?: NotebookOrderedStyle;
  content: NotebookListItemNode[];
};

export type NotebookListNode = NotebookBulletListNode | NotebookOrderedListNode;

export type NotebookSemanticNode = {
  type: 'semanticBlock';
  id: string;
  variant: NotebookSemanticKind;
  label?: string;
  number?: string;
  accentColor?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  content: NotebookRichBlockNode[];
};

export type NotebookSectionNode = {
  type: 'section';
  id: string;
  title: string;
  accentColor?: string;
  collapsible?: boolean;
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

export type NotebookRichDocumentV4 = Omit<NotebookRichDocument, 'version'> & {
  version: 4;
};

export type NotebookRichDocumentV5 = Omit<NotebookRichDocument, 'version'> & {
  version: 5;
};

export type NotebookDocumentSummary = {
  id: string;
  title: string;
  updatedAt: string;
  blockCount: number;
  wordCount: number;
};

export type NotebookStarterTemplateId =
  | 'lecture-notes'
  | 'worked-example'
  | 'theorem-sheet'
  | 'exercise-set';
