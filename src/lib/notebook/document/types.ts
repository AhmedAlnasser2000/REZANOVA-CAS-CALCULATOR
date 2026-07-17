import type { NotebookWorkspaceTarget } from '../types';

export const NOTEBOOK_RICH_DOCUMENT_VERSION = 14 as const;
export const NOTEBOOK_MEDIA_WIDTH_PERCENT_MIN = 10;
export const NOTEBOOK_MEDIA_WIDTH_PERCENT_MAX = 100;
export const NOTEBOOK_MEDIA_WIDTH_PERCENT_PRECISION = 3;
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
export const NOTEBOOK_PAPER_SIZES = ['a4', 'letter', 'legal'] as const;
export const NOTEBOOK_PAGE_ORIENTATIONS = ['portrait', 'landscape'] as const;
export const NOTEBOOK_PAGE_NUMBER_POSITIONS = ['left', 'center', 'right'] as const;
export const NOTEBOOK_OBJECT_REFERENCES = ['page', 'margins'] as const;
export const NOTEBOOK_OBJECT_WRAPS = [
  'square',
  'top-and-bottom',
  'in-front',
  'behind',
] as const;
export const NOTEBOOK_FLOATING_OBJECT_MIN_WIDTH_PT = 36;
export const NOTEBOOK_FLOATING_PAGE_NUMBER_MAX = 9999;

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

export function normalizeNotebookMediaWidthPercent(value: number): number {
  const bounded = Math.min(
    NOTEBOOK_MEDIA_WIDTH_PERCENT_MAX,
    Math.max(NOTEBOOK_MEDIA_WIDTH_PERCENT_MIN, value),
  );
  const multiplier = 10 ** NOTEBOOK_MEDIA_WIDTH_PERCENT_PRECISION;
  return Math.round(bounded * multiplier) / multiplier;
}

export function isNotebookMediaWidthPercent(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= NOTEBOOK_MEDIA_WIDTH_PERCENT_MIN
    && value <= NOTEBOOK_MEDIA_WIDTH_PERCENT_MAX
    && Math.abs(value - normalizeNotebookMediaWidthPercent(value)) <= 1e-9;
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
export type NotebookPaperSize = typeof NOTEBOOK_PAPER_SIZES[number];
export type NotebookPageOrientation = typeof NOTEBOOK_PAGE_ORIENTATIONS[number];
export type NotebookPageNumberPosition = typeof NOTEBOOK_PAGE_NUMBER_POSITIONS[number];
export type NotebookObjectReference = typeof NOTEBOOK_OBJECT_REFERENCES[number];
export type NotebookObjectWrap = typeof NOTEBOOK_OBJECT_WRAPS[number];
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
export type NotebookLegacyHeaderFooterSettings = {
  headerText: string;
  footerText: string;
  differentFirstPage: boolean;
  pageNumbering: {
    enabled: boolean;
    position: NotebookPageNumberPosition;
    startAt: number;
  };
};
export type NotebookPageNumberNode = {
  type: 'pageNumber';
  marks?: NotebookRichMark[];
};
export type NotebookRunningMatterInlineNode = NotebookRichTextNode | NotebookPageNumberNode;
export type NotebookRunningMatterParagraph = {
  type: 'paragraph';
  content?: NotebookRunningMatterInlineNode[];
};
export type NotebookRunningMatterContent = NotebookRunningMatterParagraph[];
export type NotebookRunningMatterRegions = {
  left: NotebookRunningMatterContent;
  center: NotebookRunningMatterContent;
  right: NotebookRunningMatterContent;
};
export type NotebookHeaderFooterSettings = {
  defaultHeader: NotebookRunningMatterRegions;
  defaultFooter: NotebookRunningMatterRegions;
  firstPageHeader: NotebookRunningMatterRegions;
  firstPageFooter: NotebookRunningMatterRegions;
  differentFirstPage: boolean;
  pageNumberStart: number;
};
export type NotebookParagraphFormat = {
  alignment?: NotebookTextAlignment;
  lineSpacing?: NotebookLineSpacing;
  spaceBeforePt?: NotebookParagraphSpacePt;
  spaceAfterPt?: NotebookParagraphSpacePt;
  leftIndentPt?: NotebookParagraphLeftIndentPt;
};
export type NotebookObjectTextDistancePt = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};
export type NotebookObjectPlacement =
  | { mode: 'flow' }
  | {
      mode: 'floating';
      anchor:
        | { kind: 'paragraph'; nodeId: string }
        | { kind: 'page'; pageNumber: number };
      horizontalReference: NotebookObjectReference;
      verticalReference: NotebookObjectReference;
      xPt: number;
      yPt: number;
      widthPt: number;
      wrap: NotebookObjectWrap;
      textDistancePt: NotebookObjectTextDistancePt;
      zOrder: number;
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
  objectPlacement?: NotebookObjectPlacement;
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
  objectPlacement?: NotebookObjectPlacement;
};

export type NotebookDividerNode = {
  type: 'horizontalRule';
  id: string;
  objectPlacement?: NotebookObjectPlacement;
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
  displayWidthPt?: number;
  displayHeightPt?: number;
  alignment?: NotebookImageAlignment;
  placement?: NotebookImagePlacement;
  displayAspectRatio?: number;
  rotation?: NotebookImageRotation;
  crop?: NotebookImageCrop;
  objectPlacement?: NotebookObjectPlacement;
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
  objectPlacement?: NotebookObjectPlacement;
  content: NotebookRichBlockNode[];
};

export type NotebookSectionNode = {
  type: 'section';
  id: string;
  title: string;
  accentColor?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  objectPlacement?: NotebookObjectPlacement;
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
