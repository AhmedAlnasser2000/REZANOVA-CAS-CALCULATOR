import type { NotebookWorkspaceTarget } from '../types';

export const NOTEBOOK_RICH_DOCUMENT_VERSION = 10 as const;
export const NOTEBOOK_FONT_SIZE_MIN = 50;
export const NOTEBOOK_FONT_SIZE_MAX = 249;

export const NOTEBOOK_TEXT_ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const;
export const NOTEBOOK_LINE_SPACINGS = [1, 1.15, 1.5, 2] as const;
export const NOTEBOOK_PARAGRAPH_SPACES_PT = [0, 6, 12, 18, 24] as const;
export const NOTEBOOK_PARAGRAPH_LEFT_INDENTS_PT = [0, 36, 72, 108, 144, 180, 216, 252, 288] as const;
export const NOTEBOOK_BULLET_STYLES = ['disc', 'circle', 'square', 'dash'] as const;
export const NOTEBOOK_ORDERED_STYLES = ['decimal', 'lower-alpha', 'lower-roman'] as const;
export const NOTEBOOK_IMAGE_ALIGNMENTS = ['left', 'center', 'right'] as const;
export const NOTEBOOK_IMAGE_PLACEMENTS = [
  'normal',
  'top-and-bottom',
  'square-left',
  'square-right',
] as const;
export const NOTEBOOK_IMAGE_ROTATION_PRESETS = [0, 90, 180, 270] as const;
export const NOTEBOOK_VIDEO_TRACK_KINDS = ['captions', 'subtitles'] as const;
export const NOTEBOOK_PAPER_SIZES = ['a4', 'letter', 'legal'] as const;
export const NOTEBOOK_PAGE_ORIENTATIONS = ['portrait', 'landscape'] as const;
export const NOTEBOOK_PAGE_NUMBER_POSITIONS = ['left', 'center', 'right'] as const;

export function isNotebookFontSize(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= NOTEBOOK_FONT_SIZE_MIN
    && value <= NOTEBOOK_FONT_SIZE_MAX;
}

export function isNotebookParagraphLeftIndentPt(value: unknown): value is NotebookParagraphLeftIndentPt {
  return typeof value === 'number'
    && NOTEBOOK_PARAGRAPH_LEFT_INDENTS_PT.includes(value as NotebookParagraphLeftIndentPt);
}

export function isNotebookDisplayAspectRatio(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0.1
    && value <= 10;
}

export function isNotebookImageRotation(value: unknown): value is NotebookImageRotation {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= 0
    && value <= 359;
}

export type NotebookRichDocumentVersion = typeof NOTEBOOK_RICH_DOCUMENT_VERSION;
export type NotebookTextAlignment = typeof NOTEBOOK_TEXT_ALIGNMENTS[number];
export type NotebookLineSpacing = typeof NOTEBOOK_LINE_SPACINGS[number];
export type NotebookParagraphSpacePt = typeof NOTEBOOK_PARAGRAPH_SPACES_PT[number];
export type NotebookParagraphLeftIndentPt = typeof NOTEBOOK_PARAGRAPH_LEFT_INDENTS_PT[number];
export type NotebookBulletStyle = typeof NOTEBOOK_BULLET_STYLES[number];
export type NotebookOrderedStyle = typeof NOTEBOOK_ORDERED_STYLES[number];
export type NotebookImageAlignment = typeof NOTEBOOK_IMAGE_ALIGNMENTS[number];
export type NotebookImagePlacement = typeof NOTEBOOK_IMAGE_PLACEMENTS[number];
export type NotebookImageRotation = number;
export type NotebookVideoAlignment = NotebookImageAlignment;
export type NotebookVideoPlacement = NotebookImagePlacement;
export type NotebookVideoTrackKind = typeof NOTEBOOK_VIDEO_TRACK_KINDS[number];
export type NotebookPaperSize = typeof NOTEBOOK_PAPER_SIZES[number];
export type NotebookPageOrientation = typeof NOTEBOOK_PAGE_ORIENTATIONS[number];
export type NotebookPageNumberPosition = typeof NOTEBOOK_PAGE_NUMBER_POSITIONS[number];
export type NotebookPageMarginsPt = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};
export type NotebookPageSetup = {
  paperSize: NotebookPaperSize;
  orientation: NotebookPageOrientation;
  marginsPt: NotebookPageMarginsPt;
};
export type NotebookHeaderFooterSettings = {
  headerText: string;
  footerText: string;
  differentFirstPage: boolean;
  pageNumbering: {
    enabled: boolean;
    position: NotebookPageNumberPosition;
    startAt: number;
  };
};
export type NotebookParagraphFormat = {
  alignment?: NotebookTextAlignment;
  lineSpacing?: NotebookLineSpacing;
  spaceBeforePt?: NotebookParagraphSpacePt;
  spaceAfterPt?: NotebookParagraphSpacePt;
  leftIndentPt?: NotebookParagraphLeftIndentPt;
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

export type NotebookPageBreakNode = {
  type: 'pageBreak';
  id: string;
};

export type NotebookImageCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type NotebookImageNode = {
  type: 'imageFigure';
  id: string;
  assetId: string;
  altText?: string;
  decorative?: boolean;
  caption?: string;
  numbered?: boolean;
  widthPercent?: number;
  alignment?: NotebookImageAlignment;
  placement?: NotebookImagePlacement;
  displayAspectRatio?: number;
  rotation?: NotebookImageRotation;
  crop?: NotebookImageCrop;
};

export type NotebookVideoTrack = {
  id: string;
  assetId: string;
  kind: NotebookVideoTrackKind;
  label: string;
  language: string;
  default?: boolean;
};

export type NotebookVideoNode = {
  type: 'videoFigure';
  id: string;
  assetId: string;
  title: string;
  description: string;
  caption?: string;
  numbered?: boolean;
  posterAssetId?: string;
  tracks?: NotebookVideoTrack[];
  widthPercent?: number;
  alignment?: NotebookVideoAlignment;
  placement?: NotebookVideoPlacement;
  displayAspectRatio?: number;
  loop?: boolean;
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
  | NotebookPageBreakNode
  | NotebookImageNode
  | NotebookVideoNode
  | NotebookListNode
  | NotebookSemanticNode
  | NotebookSectionNode;

type NotebookRichDocumentBase = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  selectedNodeId: string | null;
  content: NotebookRichBlockNode[];
};

export type NotebookRichDocument = NotebookRichDocumentBase & {
  version: NotebookRichDocumentVersion;
  pageSetup: NotebookPageSetup;
  headerFooter: NotebookHeaderFooterSettings;
};

export type NotebookRichDocumentV2 = NotebookRichDocumentBase & {
  version: 2;
};

export type NotebookRichDocumentV3 = NotebookRichDocumentBase & {
  version: 3;
};

export type NotebookRichDocumentV4 = NotebookRichDocumentBase & {
  version: 4;
};

export type NotebookRichDocumentV5 = NotebookRichDocumentBase & {
  version: 5;
};

export type NotebookRichDocumentV6 = NotebookRichDocumentBase & {
  version: 6;
};

export type NotebookRichDocumentV7 = NotebookRichDocumentBase & {
  version: 7;
};

export type NotebookRichDocumentV8 = NotebookRichDocumentBase & {
  version: 8;
  pageSetup: NotebookPageSetup;
  headerFooter: NotebookHeaderFooterSettings;
};

export type NotebookRichDocumentV9 = NotebookRichDocumentBase & {
  version: 9;
  pageSetup: NotebookPageSetup;
  headerFooter: NotebookHeaderFooterSettings;
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
