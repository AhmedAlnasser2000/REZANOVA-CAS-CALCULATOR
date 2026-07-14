import type { ModeId } from '../../types/calculator';
import type { NotebookRichDocument } from './document/types';

export const NOTEBOOK_DTO_VERSION = 1 as const;
export const NOTEBOOK_SURFACE_STATE_KIND = 'notebook-surface-state' as const;

export type NotebookDtoVersion = typeof NOTEBOOK_DTO_VERSION;
export type NotebookBlockKind =
  | 'heading'
  | 'text'
  | 'math-editor'
  | 'evidence-snapshot'
  | 'divider';
export type NotebookTextMarkKind = 'bold' | 'italic' | 'highlight' | 'color';
export type NotebookMathSpanStatus = 'pending' | 'accepted';
export type NotebookWorkspaceTarget = Exclude<ModeId, 'guide' | 'labs'>;

export type NotebookTextMark = {
  id: string;
  kind: NotebookTextMarkKind;
  start: number;
  end: number;
  color?: string;
};

export type NotebookInlineMathSpan = {
  id: string;
  status: NotebookMathSpanStatus;
  start: number;
  end: number;
  sourceText: string;
  normalizedLatex: string;
  parser: 'canonicalizeMathInput';
  mode: NotebookWorkspaceTarget;
  confidence: 'high' | 'medium';
};

export type NotebookBaseBlock = {
  id: string;
  kind: NotebookBlockKind;
  createdAt: string;
  updatedAt: string;
};

export type NotebookHeadingBlock = NotebookBaseBlock & {
  kind: 'heading';
  level: 1 | 2 | 3;
  text: string;
};

export type NotebookTextBlock = NotebookBaseBlock & {
  kind: 'text';
  text: string;
  marks: NotebookTextMark[];
  mathSpans: NotebookInlineMathSpan[];
};

export type NotebookMathEditorBlock = NotebookBaseBlock & {
  kind: 'math-editor';
  label: string;
  latex: string;
  workspaceTarget: NotebookWorkspaceTarget;
};

export type NotebookEvidenceSnapshot = {
  id: string;
  source: 'future-current-result' | 'future-history-entry' | 'manual-placeholder';
  title: string;
  inputLatex?: string;
  resultLatex?: string;
  facts: string[];
  warnings: string[];
};

export type NotebookEvidenceSnapshotBlock = NotebookBaseBlock & {
  kind: 'evidence-snapshot';
  snapshot: NotebookEvidenceSnapshot;
};

export type NotebookDividerBlock = NotebookBaseBlock & {
  kind: 'divider';
};

export type NotebookBlock =
  | NotebookHeadingBlock
  | NotebookTextBlock
  | NotebookMathEditorBlock
  | NotebookEvidenceSnapshotBlock
  | NotebookDividerBlock;

export type NotebookDocument = {
  version: NotebookDtoVersion;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  selectedBlockId: string;
  blocks: NotebookBlock[];
};

export type NotebookLegacySurfaceState = {
  kind: typeof NOTEBOOK_SURFACE_STATE_KIND;
  document: NotebookDocument;
};

export type NotebookRichSurfaceState = {
  kind: typeof NOTEBOOK_SURFACE_STATE_KIND;
  document: NotebookRichDocument;
};

export type NotebookLibrarySurfaceState = {
  kind: typeof NOTEBOOK_SURFACE_STATE_KIND;
  libraryId: string;
  revision: number;
  title: string;
};

export type NotebookSurfaceState =
  | NotebookLegacySurfaceState
  | NotebookRichSurfaceState
  | NotebookLibrarySurfaceState;

export type NotebookPackageBoundary = {
  version: NotebookDtoVersion;
  forbiddenFields: readonly string[];
  futurePackageKinds: readonly ['notebook', 'guidance-pack', 'learner-copy'];
};
