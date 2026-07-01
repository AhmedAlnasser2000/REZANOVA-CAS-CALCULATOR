import {
  displayBlockCountSummary,
  type DisplayBlock,
  type DisplayBlockCountSummary,
} from '../../lib/display/result/display-blocks';
import type { WorkspaceInstanceId } from '../../types/calculator/workspace-instance-types';

export const FORMULA_VIEWER_WORKSPACE_KIND = 'formula-viewer' as const;

export type FormulaViewerWorkspaceKind = typeof FORMULA_VIEWER_WORKSPACE_KIND;

export type FormulaViewerSourceContext = {
  sourceWorkspaceInstanceId?: WorkspaceInstanceId | string | null;
  sourceWorkspaceKind?: string | null;
  sourceWorkspaceTitle?: string | null;
  sourceExpressionLatex?: string | null;
  resolvedInputLatex?: string | null;
  resultTitle?: string | null;
  copyLatex?: string | null;
};

export type FormulaViewerArtifact = {
  kind: 'formula-viewer-artifact';
  id: string;
  resultSignature: string;
  sourceWorkspaceInstanceId: WorkspaceInstanceId | string | null;
  sourceWorkspaceKind: string | null;
  sourceWorkspaceTitle: string | null;
  sourceExpressionLatex: string;
  resolvedInputLatex: string;
  resultTitle: string;
  copyLatex: string;
  primaryBlock: DisplayBlock;
  globalFactBlocks: DisplayBlock[];
  detailBlocks: DisplayBlock[];
  rowCount: number;
  groupCount: number;
  countSummary?: DisplayBlockCountSummary;
  latexLength: number;
  createdAt: number;
  trustSummary?: string;
};

export type FormulaViewerSurfaceState = {
  kind: 'formula-viewer';
  artifact: FormulaViewerArtifact;
};

type BuildFormulaViewerArtifactOptions = {
  block: DisplayBlock;
  displayBlocks: readonly DisplayBlock[];
  now?: () => number;
  source?: FormulaViewerSourceContext;
};

function textHash(text: string) {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function blockLatexLength(block: DisplayBlock) {
  return [
    block.latex,
    block.text,
    ...block.rawContent,
    ...(block.lines ?? []).flatMap((line) => [
      line.branchLatex,
      line.branchPrefixLatex,
      line.conditionLatex,
      line.groupLatex,
      line.label,
      line.latex,
      line.text,
    ]),
  ]
    .filter((value): value is string => Boolean(value))
    .reduce((total, value) => total + value.length, 0);
}

function resultSignatureFor(block: DisplayBlock, source: FormulaViewerSourceContext | undefined) {
  return textHash(JSON.stringify({
    blockId: block.id,
    blockLatex: block.latex,
    blockText: block.text,
    copyLatex: source?.copyLatex ?? '',
    rawContent: block.rawContent,
    resolvedInputLatex: source?.resolvedInputLatex ?? '',
    sourceExpressionLatex: source?.sourceExpressionLatex ?? '',
  }));
}

export function formulaViewerSurfaceState(
  artifact: FormulaViewerArtifact,
): FormulaViewerSurfaceState {
  return {
    artifact,
    kind: 'formula-viewer',
  };
}

export function formulaViewerArtifactFromSurfaceState(
  state: unknown,
): FormulaViewerArtifact | null {
  if (!state || typeof state !== 'object') {
    return null;
  }
  const candidate = state as Partial<FormulaViewerSurfaceState>;
  return candidate.kind === 'formula-viewer'
    && candidate.artifact?.kind === 'formula-viewer-artifact'
    ? candidate.artifact
    : null;
}

export function buildFormulaViewerArtifact({
  block,
  displayBlocks,
  now = Date.now,
  source,
}: BuildFormulaViewerArtifactOptions): FormulaViewerArtifact {
  const resultSignature = resultSignatureFor(block, source);
  const globalFactBlocks = displayBlocks.filter((candidate) => candidate.kind === 'validWhen');
  const detailBlocks = displayBlocks.filter((candidate) =>
    candidate.kind === 'detail' || candidate.kind === 'periodicFamily');
  const groupCount = new Set((block.lines ?? [])
    .map((line) => line.groupLatex?.trim())
    .filter((latex): latex is string => Boolean(latex))).size;
  const latexLength = [
    block,
    ...globalFactBlocks,
    ...detailBlocks,
  ].reduce((total, candidate) => total + blockLatexLength(candidate), 0);

  return {
    copyLatex: source?.copyLatex ?? block.latex ?? block.rawContent.join('\n'),
    countSummary: displayBlockCountSummary(block),
    createdAt: now(),
    detailBlocks,
    globalFactBlocks,
    groupCount,
    id: `formula-viewer.${resultSignature}`,
    kind: 'formula-viewer-artifact',
    latexLength,
    primaryBlock: block,
    resolvedInputLatex: source?.resolvedInputLatex ?? '',
    resultSignature,
    resultTitle: source?.resultTitle ?? block.label,
    rowCount: block.lines?.length ?? 0,
    sourceExpressionLatex: source?.sourceExpressionLatex ?? '',
    sourceWorkspaceInstanceId: source?.sourceWorkspaceInstanceId ?? null,
    sourceWorkspaceKind: source?.sourceWorkspaceKind ?? null,
    sourceWorkspaceTitle: source?.sourceWorkspaceTitle ?? null,
    trustSummary: block.trustSummary,
  };
}
