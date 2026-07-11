import type {
  DisplayOutcome,
  HistoryReplaySnapshotV1,
  TableResponse,
} from '../../types/calculator';
import {
  collectDisplayOutcomeMathFragments,
  collectTableResponseMathFragments,
  normalizePrintHygieneValue,
} from '../display/print-hygiene';

export const HISTORY_REPLAY_WORKSPACES = [
  'calculate',
  'equation',
  'calculus',
  'matrix',
  'vector',
  'table',
  'trigonometry',
  'statistics',
  'geometry',
] as const;

export type HistoryReplayWorkspace = typeof HISTORY_REPLAY_WORKSPACES[number];

export type HistoryReplayIdentity = {
  kind: DisplayOutcome['kind'];
  title: string;
  resultOrigin?: string;
  answerDomain?: string;
  solutionKind?: string;
  calculusStrategy?: string;
  runtimeStopReasonKind?: string;
};

export type HistoryReplayCardinalities = {
  warnings: number;
  supplements: number;
  answerRows: number;
  branchRows: number;
  systemRows: number;
  periodicBranches: number;
  detailSections: number;
  actions: number;
  tableRows: number;
};

export type HistoryReplayFixture = {
  id: string;
  workspace: HistoryReplayWorkspace;
  family: string;
  latexComparison?: 'hard' | 'report-only';
  snapshot: HistoryReplaySnapshotV1;
  request: Record<string, unknown>;
  expected: {
    identity: HistoryReplayIdentity;
    cardinalities: HistoryReplayCardinalities;
    normalizedLatex: string;
  };
};

export type HistoryReplayFixtureFile = {
  version: 1;
  workspace: HistoryReplayWorkspace;
  latexComparison?: 'hard' | 'report-only';
  fixtures: HistoryReplayFixture[];
};

export type HistoryReplayExecution = {
  outcome: DisplayOutcome;
  tableResponse?: TableResponse;
};

export function historyReplayIdentity(outcome: DisplayOutcome): HistoryReplayIdentity {
  const extended = outcome as DisplayOutcome & {
    resultOrigin?: string;
    answerDomain?: string;
    solutionKind?: string;
    calculusStrategy?: string;
    runtimeStopReason?: { kind?: string };
  };
  return {
    kind: outcome.kind,
    title: outcome.title,
    ...(extended.resultOrigin ? { resultOrigin: extended.resultOrigin } : {}),
    ...(extended.answerDomain ? { answerDomain: extended.answerDomain } : {}),
    ...(extended.solutionKind ? { solutionKind: extended.solutionKind } : {}),
    ...(extended.calculusStrategy ? { calculusStrategy: extended.calculusStrategy } : {}),
    ...(extended.runtimeStopReason?.kind
      ? { runtimeStopReasonKind: extended.runtimeStopReason.kind }
      : {}),
  };
}

export function historyReplayCardinalities(
  execution: HistoryReplayExecution,
): HistoryReplayCardinalities {
  const outcome = execution.outcome;
  const extended = outcome as DisplayOutcome & {
    answerRows?: { rows?: unknown[] };
    branchReadback?: { branchesLatex?: unknown[] };
    systemReadback?: { rows?: unknown[] };
    periodicFamily?: { branchesLatex?: unknown[] };
    exactSupplementLatex?: unknown[];
    detailSections?: unknown[];
    actions?: unknown[];
  };
  return {
    warnings: outcome.warnings.length,
    supplements: extended.exactSupplementLatex?.length ?? 0,
    answerRows: extended.answerRows?.rows?.length ?? 0,
    branchRows: extended.branchReadback?.branchesLatex?.length ?? 0,
    systemRows: extended.systemReadback?.rows?.length ?? 0,
    periodicBranches: extended.periodicFamily?.branchesLatex?.length ?? 0,
    detailSections: extended.detailSections?.length ?? 0,
    actions: extended.actions?.length ?? 0,
    tableRows: execution.tableResponse?.rows.length ?? 0,
  };
}

export function normalizedHistoryReplayLatex(execution: HistoryReplayExecution) {
  return [
    ...collectDisplayOutcomeMathFragments(execution.outcome),
    ...collectTableResponseMathFragments(execution.tableResponse),
  ]
    .map((fragment) => `${fragment.path}=${normalizePrintHygieneValue(fragment.value)}`)
    .join('\n');
}
