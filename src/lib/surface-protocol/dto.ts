import type {
  AnswerDomain,
  DisplayOutcome,
  SolutionKind,
} from '../../types/calculator';

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

function primaryLatexFor(outcome: DisplayOutcome): string | undefined {
  if (outcome.kind === 'prompt') {
    return outcome.carryLatex.trim() || undefined;
  }
  return outcome.exactLatex?.trim() || outcome.branchReadback?.branchesLatex.join(', ');
}

function countDtosFor(outcome: DisplayOutcome, facts: readonly SurfaceFactDto[]) {
  const counts: SurfaceCountDto[] = [];
  if (outcome.kind !== 'prompt') {
    const branchCount = outcome.branchReadback?.branchesLatex.length ?? 0;
    if (branchCount > 0) {
      const kind = outcome.branchReadback?.countLabel ?? 'branches';
      counts.push({
        kind,
        count: branchCount,
        label: kind === 'candidateRoots' ? 'Candidate roots' : kind === 'roots' ? 'Roots' : 'Branches',
      });
    }
    if (typeof outcome.rejectedCandidateCount === 'number' && outcome.rejectedCandidateCount > 0) {
      counts.push({
        kind: 'rejectedCandidates',
        count: outcome.rejectedCandidateCount,
        label: 'Rejected candidates',
      });
    }
  }
  if (outcome.warnings.length > 0) {
    counts.push({
      kind: 'warnings',
      count: outcome.warnings.length,
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

export function displayOutcomeToSurfaceResultSummary(
  workspaceKind: SurfaceWorkspaceKind,
  outcome: DisplayOutcome,
): SurfaceResultSummaryDto {
  const status: SurfaceResultStatus = outcome.kind;
  const facts: SurfaceFactDto[] = [
    ...latexFacts('Valid when', outcome.kind === 'prompt' ? undefined : outcome.exactSupplementLatex),
    ...textFact('summary', 'Solve summary', outcome.kind === 'prompt' ? undefined : outcome.solveSummaryText),
    ...textFact('summary', 'Transform summary', outcome.kind === 'prompt' ? undefined : outcome.transformSummaryText),
    ...textFact('method', 'Numeric method', outcome.kind === 'prompt' ? undefined : outcome.numericMethod),
    ...textFact('domain', 'Answer domain', outcome.kind === 'prompt' ? undefined : outcome.answerDomain),
  ];
  const warnings = outcome.warnings.map((warning) => ({ text: warning }));
  return {
    protocolVersion: SURFACE_PROTOCOL_VERSION,
    workspaceKind,
    status,
    title: outcome.title,
    resultKind: solutionKindToResultKind(status, outcome.kind === 'prompt' ? undefined : outcome.solutionKind),
    ...(primaryLatexFor(outcome) ? { primaryLatex: primaryLatexFor(outcome) } : {}),
    ...(
      outcome.kind !== 'prompt' && outcome.approxText
        ? { approximateText: outcome.approxText }
        : {}
    ),
    ...(outcome.kind !== 'prompt' && outcome.answerDomain ? { answerDomain: outcome.answerDomain } : {}),
    ...(outcome.kind !== 'prompt' && outcome.solutionKind ? { solutionKind: outcome.solutionKind } : {}),
    facts,
    warnings,
    counts: countDtosFor(outcome, facts),
  };
}
