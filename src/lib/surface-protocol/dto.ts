import type {
  AnswerDomain,
  CanonicalRuntimeOutcome,
  SolutionKind,
} from '../../types/calculator';
import {
  resolveCanonicalResultForConsumer,
  type CanonicalResultPresentation,
  type CanonicalResultPresentationDetailPart,
  type CanonicalResultSemantics,
} from '../result-contract/consumer';

export const SURFACE_PROTOCOL_VERSION = 1 as const;

export type SurfaceProtocolVersion = typeof SURFACE_PROTOCOL_VERSION;

export type SurfaceWorkspaceKind = 'calculate' | 'equation';

export type SurfaceResultStatus = 'success' | 'prompt' | 'error' | 'empty';

export type SurfaceResultKind =
  | 'exact'
  | 'numeric'
  | 'formula'
  | 'condition'
  | 'prompt'
  | 'error'
  | 'unknown';

export type SurfaceFactKind =
  | 'condition'
  | 'summary'
  | 'domain'
  | 'method'
  | 'warning';

export type SurfaceFactDto = {
  kind: SurfaceFactKind;
  label: string;
  text?: string;
  latex?: string;
};

export type SurfaceWarningDto = {
  text: string;
};

export type SurfaceCountKind =
  | 'roots'
  | 'candidateRoots'
  | 'branches'
  | 'warnings'
  | 'facts'
  | 'rejectedCandidates';

export type SurfaceCountDto = {
  kind: SurfaceCountKind;
  count: number;
  label: string;
};

export type SurfaceResultSummaryDto = {
  protocolVersion: SurfaceProtocolVersion;
  workspaceKind: SurfaceWorkspaceKind;
  status: SurfaceResultStatus;
  title: string;
  resultKind: SurfaceResultKind;
  primaryLatex?: string;
  approximateText?: string;
  answerDomain?: AnswerDomain;
  solutionKind?: SolutionKind;
  facts: SurfaceFactDto[];
  warnings: SurfaceWarningDto[];
  counts: SurfaceCountDto[];
};

export type SurfaceFailureDto = {
  protocolVersion: SurfaceProtocolVersion;
  code: string;
  message: string;
  field?: string;
};

export type SurfaceResultDto<TValue> =
  | {
      ok: true;
      protocolVersion: SurfaceProtocolVersion;
      value: TValue;
    }
  | {
      ok: false;
      protocolVersion: SurfaceProtocolVersion;
      error: SurfaceFailureDto;
    };

export function surfaceOk<TValue>(value: TValue): SurfaceResultDto<TValue> {
  return {
    ok: true,
    protocolVersion: SURFACE_PROTOCOL_VERSION,
    value,
  };
}

export function surfaceFailure(
  code: string,
  message: string,
  field?: string,
): SurfaceResultDto<never> {
  return {
    ok: false,
    protocolVersion: SURFACE_PROTOCOL_VERSION,
    error: {
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      code,
      message,
      ...(field ? { field } : {}),
    },
  };
}

function textFact(
  kind: SurfaceFactKind,
  label: string,
  text: string | undefined,
): SurfaceFactDto[] {
  const normalized = text?.trim();
  return normalized ? [{ kind, label, text: normalized }] : [];
}

function latexFacts(label: string, values: readonly string[] | undefined): SurfaceFactDto[] {
  return (values ?? [])
    .map((latex) => latex.trim())
    .filter(Boolean)
    .map((latex) => ({
      kind: 'condition' as const,
      label,
      latex,
    }));
}

function solutionKindToResultKind(
  status: SurfaceResultStatus,
  solutionKind: SolutionKind | undefined,
): SurfaceResultKind {
  if (status === 'prompt') {
    return 'prompt';
  }
  if (status === 'error') {
    return 'error';
  }
  switch (solutionKind) {
    case 'approximate-numeric':
      return 'numeric';
    case 'isolate-formula':
      return 'formula';
    case 'condition-fact-only-stop':
      return 'condition';
    case 'exact-symbolic':
    case 'inequality-solution-set':
      return 'exact';
    default:
      return 'unknown';
  }
}

function primaryLatexFor(presentation: CanonicalResultPresentation): string | undefined {
  return presentation.primaryLatex?.trim()
    || presentation.branchReadback?.branchesLatex.join(', ');
}

function countDtosFor(
  presentation: CanonicalResultPresentation,
  semantics: CanonicalResultSemantics,
  facts: readonly SurfaceFactDto[],
) {
  const counts: SurfaceCountDto[] = [];
  const branchCount = presentation.branchReadback?.branchesLatex.length ?? 0;
  if (branchCount > 0) {
    const kind = presentation.branchReadback?.countLabel ?? 'branches';
    counts.push({
      kind,
      count: branchCount,
      label: kind === 'candidateRoots' ? 'Candidate roots' : kind === 'roots' ? 'Roots' : 'Branches',
    });
  }
  const rejectedCandidateCount = semantics.metadata?.rejectedCandidateCount;
  if (typeof rejectedCandidateCount === 'number' && rejectedCandidateCount > 0) {
    counts.push({
      kind: 'rejectedCandidates',
      count: rejectedCandidateCount,
      label: 'Rejected candidates',
    });
  }
  if (presentation.warnings.length > 0) {
    counts.push({
      kind: 'warnings',
      count: presentation.warnings.length,
      label: 'Warnings',
    });
  }
  if (facts.length > 0) {
    counts.push({
      kind: 'facts',
      count: facts.length,
      label: 'Facts',
    });
  }
  return counts;
}

function detailPartsText(lines: CanonicalResultPresentationDetailPart[][] | undefined) {
  return lines?.map((line) => line.map((part) =>
    part.kind === 'math' ? part.latex : part.text).join('')).join('; ');
}

export function emptySurfaceResultSummary(
  workspaceKind: SurfaceWorkspaceKind,
): SurfaceResultSummaryDto {
  return {
    protocolVersion: SURFACE_PROTOCOL_VERSION,
    workspaceKind,
    status: 'empty',
    title: 'No committed result',
    resultKind: 'unknown',
    facts: [],
    warnings: [],
    counts: [],
  };
}

export function canonicalOutcomeToSurfaceResultSummary(
  workspaceKind: SurfaceWorkspaceKind,
  outcome: CanonicalRuntimeOutcome,
): SurfaceResultSummaryDto {
  if (outcome.kind === 'prompt') {
    const primaryLatex = outcome.carryLatex.trim() || undefined;
    return {
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      workspaceKind,
      status: 'prompt',
      title: outcome.title,
      resultKind: 'prompt',
      ...(primaryLatex ? { primaryLatex } : {}),
      facts: [],
      warnings: outcome.warnings.map((warning) => ({ text: warning })),
      counts: outcome.warnings.length > 0
        ? [{ kind: 'warnings', count: outcome.warnings.length, label: 'Warnings' }]
        : [],
    };
  }
  const resolution = resolveCanonicalResultForConsumer(outcome);
  if (!resolution.ok) {
    throw new Error(`Surface result canonical resolution failed: ${resolution.failure.message}`);
  }
  const { presentation, semantics } = resolution;
  const metadata = semantics.metadata;
  const status: SurfaceResultStatus = presentation.outcomeKind;
  const facts: SurfaceFactDto[] = [
    ...latexFacts('Valid when', presentation.supplements),
    ...textFact('summary', 'Solve summary', detailPartsText(presentation.summaries?.solve)),
    ...textFact('summary', 'Transform summary', presentation.summaries?.transform?.text),
    ...textFact('method', 'Numeric method', metadata?.numericMethod),
    ...textFact('domain', 'Answer domain', metadata?.answerDomain),
  ];
  const warnings = presentation.warnings.map((warning) => ({ text: warning }));
  const primaryLatex = primaryLatexFor(presentation);
  return {
    protocolVersion: SURFACE_PROTOCOL_VERSION,
    workspaceKind,
    status,
    title: presentation.title,
    resultKind: solutionKindToResultKind(status, metadata?.solutionKind),
    ...(primaryLatex ? { primaryLatex } : {}),
    ...(presentation.approximations?.primary
      ? { approximateText: presentation.approximations.primary }
      : {}),
    ...(metadata?.answerDomain ? { answerDomain: metadata.answerDomain } : {}),
    ...(metadata?.solutionKind ? { solutionKind: metadata.solutionKind } : {}),
    facts,
    warnings,
    counts: countDtosFor(presentation, semantics, facts),
  };
}
