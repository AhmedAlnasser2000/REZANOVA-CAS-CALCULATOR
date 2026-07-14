import type {
  CanonicalRuntimeOutcome,
  HistoryReplaySnapshotV1,
  TableResponse,
} from '../../types/calculator';
import {
  collectCanonicalRuntimeMathFragments,
  collectTableResponseMathFragments,
  normalizePrintHygieneValue,
} from '../display/print-hygiene';
import { resolveCanonicalResultForConsumer } from '../result-contract';

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
  kind: CanonicalRuntimeOutcome['kind'];
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
  outcome: CanonicalRuntimeOutcome;
  tableResponse?: TableResponse;
};

export function historyReplayIdentity(outcome: CanonicalRuntimeOutcome): HistoryReplayIdentity {
  const runtimeStopReasonKind = outcome.runtimeAdvisories?.stopReason?.kind;
  if (outcome.kind === 'prompt') {
    return {
      kind: outcome.kind,
      title: outcome.title,
      ...(runtimeStopReasonKind ? { runtimeStopReasonKind } : {}),
    };
  }
  const resolution = resolveCanonicalResultForConsumer(outcome);
  if (!resolution.ok) {
    throw new Error(`History replay canonical resolution failed: ${resolution.failure.message}`);
  }
  const document = resolution.document;
  const metadata = document.metadata;
  return {
    kind: document.outcomeKind,
    title: document.title,
    ...(metadata?.resultOrigin ? { resultOrigin: metadata.resultOrigin } : {}),
    ...(metadata?.answerDomain ? { answerDomain: metadata.answerDomain } : {}),
    ...(metadata?.solutionKind ? { solutionKind: metadata.solutionKind } : {}),
    ...(metadata?.calculusStrategy ? { calculusStrategy: metadata.calculusStrategy } : {}),
    ...(runtimeStopReasonKind ? { runtimeStopReasonKind } : {}),
  };
}

export function historyReplayCardinalities(
  execution: HistoryReplayExecution,
): HistoryReplayCardinalities {
  const outcome = execution.outcome;
  if (outcome.kind === 'prompt') {
    return {
      warnings: outcome.warnings.length,
      supplements: 0,
      answerRows: 0,
      branchRows: 0,
      systemRows: 0,
      periodicBranches: 0,
      detailSections: 0,
      actions: 0,
      tableRows: execution.tableResponse?.rows.length ?? 0,
    };
  }
  const resolution = resolveCanonicalResultForConsumer(outcome);
  if (!resolution.ok) {
    throw new Error(`History replay canonical resolution failed: ${resolution.failure.message}`);
  }
  const document = resolution.document;
  return {
    warnings: document.warnings.length,
    supplements: document.supplements?.length ?? 0,
    answerRows: document.answerRows?.rows.length ?? 0,
    branchRows: document.branchReadback?.branches.length ?? 0,
    systemRows: document.systemReadback?.rows.length ?? 0,
    periodicBranches: document.periodicFamily?.branches.length ?? 0,
    detailSections: document.details?.length ?? 0,
    actions: outcome.actions?.length ?? 0,
    tableRows: document.table?.rows.length ?? execution.tableResponse?.rows.length ?? 0,
  };
}

export function normalizedHistoryReplayLatex(execution: HistoryReplayExecution) {
  return [
    ...collectCanonicalRuntimeMathFragments(execution.outcome),
    ...collectTableResponseMathFragments(execution.tableResponse),
  ]
    .map((fragment) => `${fragment.path}=${normalizePrintHygieneValue(fragment.value)}`)
    .join('\n');
}
