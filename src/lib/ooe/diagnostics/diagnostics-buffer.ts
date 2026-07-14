import type {
  OoeCommitAssessment,
  OoeJobIdentity,
  OoeTraceEvent,
} from '../bridge-schema/ooe-bridge';
import type { OoeHostAdapterDiagnostics } from '../runtime-control/host-adapter';
import type { OoeRuntimeShellEvidence } from '../runtime-control/runtime-shell-contract';
import type {
  CanonicalResultDetailPartV1,
  CanonicalResultDocumentV1,
  CanonicalRuntimeOutcome,
} from '../../../types/calculator';
import {
  collectCanonicalResultMathValues,
  resolveCanonicalResultForConsumer,
} from '../../result-contract';

export const DEFAULT_OOE_DIAGNOSTICS_LIMIT = 100;

export type OoeDiagnosticsTerminalStatus =
  | 'completed'
  | 'staleDropped'
  | 'skipped'
  | 'cancelled'
  | 'failed';

export type OoeDiagnosticsOutputSummary = {
  kind: string;
  title?: string;
  warningsCount?: number;
  answerDomain?: string;
  solutionKind?: string;
  resultOrigin?: string;
  calculusStrategy?: string;
  calculusDerivativeStrategies?: string[];
  plannerBadges?: string[];
  solveBadges?: string[];
  transformBadges?: string[];
  hasExactLatex?: boolean;
  exactLatexLength?: number;
  exactSupplementCount?: number;
  hasPeriodicFamily?: boolean;
  hasApproxText?: boolean;
  approxTextLength?: number;
  detailSectionTitles?: string[];
  summaryText?: string;
  errorSummary?: string;
  unsafeReadbackMarkers?: string[];
};

export type OoeDiagnosticsProvenance = {
  depth: 'coarse' | 'rich';
  mode: string;
  route: string;
  screen?: string;
  action?: string;
  inputSummary?: Record<string, unknown>;
  outputSummary?: OoeDiagnosticsOutputSummary;
  runtimeHost?: string;
  runtimeShell?: OoeRuntimeShellEvidence;
  commitDecision?: string;
  equation?: Record<string, unknown>;
  table?: Record<string, unknown>;
  editor?: Record<string, unknown>;
  notes?: string[];
};

export type OoeDiagnosticsRecord = {
  diagnosticsId: string;
  sequence: number;
  job: OoeJobIdentity;
  jobId: string;
  inputRevisionId: string;
  routeLabel: string;
  planId: string;
  capabilityId: string;
  hostId: string;
  nodeId: string | null;
  phaseId: string | null;
  workspaceInstanceId?: string;
  workspaceInstanceLabel?: string;
  terminalStatus: OoeDiagnosticsTerminalStatus;
  commitAssessment?: OoeCommitAssessment;
  hostAdapter?: OoeHostAdapterDiagnostics;
  traceEvents: OoeTraceEvent[];
  provenance?: OoeDiagnosticsProvenance;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  errorMessage?: string;
};

type RecordOoeDiagnosticsInput = {
  job: OoeJobIdentity;
  routeLabel: string;
  terminalStatus: OoeDiagnosticsTerminalStatus;
  commitAssessment?: OoeCommitAssessment;
  hostAdapter?: OoeHostAdapterDiagnostics;
  traceEvents?: readonly OoeTraceEvent[];
  provenance?: OoeDiagnosticsProvenance;
  startedAt: number;
  finishedAt?: number;
  errorMessage?: string;
};

const diagnosticsRecords: OoeDiagnosticsRecord[] = [];
let diagnosticsLimit = DEFAULT_OOE_DIAGNOSTICS_LIMIT;
let nextDiagnosticsSequence = 1;

function cloneRecord(record: OoeDiagnosticsRecord): OoeDiagnosticsRecord {
  return {
    ...record,
    commitAssessment: record.commitAssessment
      ? { ...record.commitAssessment }
      : undefined,
    traceEvents: record.traceEvents.map((event) => ({ ...event })),
    hostAdapter: record.hostAdapter
      ? {
          ...record.hostAdapter,
          supportedTaskClasses: record.hostAdapter.supportedTaskClasses
            ? [...record.hostAdapter.supportedTaskClasses]
            : undefined,
          unsupportedTaskClasses: record.hostAdapter.unsupportedTaskClasses
            ? [...record.hostAdapter.unsupportedTaskClasses]
            : undefined,
        }
      : undefined,
    provenance: record.provenance
      ? {
          ...record.provenance,
          inputSummary: record.provenance.inputSummary
            ? { ...record.provenance.inputSummary }
            : undefined,
          outputSummary: record.provenance.outputSummary
            ? {
                ...record.provenance.outputSummary,
                plannerBadges: record.provenance.outputSummary.plannerBadges
                  ? [...record.provenance.outputSummary.plannerBadges]
                  : undefined,
                solveBadges: record.provenance.outputSummary.solveBadges
                  ? [...record.provenance.outputSummary.solveBadges]
                  : undefined,
                transformBadges: record.provenance.outputSummary.transformBadges
                  ? [...record.provenance.outputSummary.transformBadges]
                  : undefined,
                detailSectionTitles: record.provenance.outputSummary.detailSectionTitles
                  ? [...record.provenance.outputSummary.detailSectionTitles]
                  : undefined,
                unsafeReadbackMarkers: record.provenance.outputSummary.unsafeReadbackMarkers
                  ? [...record.provenance.outputSummary.unsafeReadbackMarkers]
                  : undefined,
              }
            : undefined,
          equation: record.provenance.equation
            ? { ...record.provenance.equation }
            : undefined,
          table: record.provenance.table
            ? { ...record.provenance.table }
            : undefined,
          editor: record.provenance.editor
            ? { ...record.provenance.editor }
            : undefined,
          notes: record.provenance.notes ? [...record.provenance.notes] : undefined,
        }
      : undefined,
  };
}

function compactText(value: unknown, maxLength = 120) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const singleLine = value.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLength) {
    return singleLine;
  }

  return `${singleLine.slice(0, maxLength - 1)}…`;
}

function badgeSummaries(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.flatMap((entry) => {
    if (typeof entry === 'string') {
      return [entry];
    }
    if (entry && typeof entry === 'object') {
      const candidate = 'label' in entry ? entry.label : 'id' in entry ? entry.id : undefined;
      return typeof candidate === 'string' ? [candidate] : [];
    }
    return [];
  });
}

function collectUnsafeMarkersFromString(value: unknown, target: Set<string>) {
  if (typeof value !== 'string') {
    return;
  }

  for (const marker of ['\\error', '\\blacksquare', '\\mathtip', 'tuple<']) {
    if (value.includes(marker)) {
      target.add(marker);
    }
  }
}

function unsafeMarkersFromDocument(document: CanonicalResultDocumentV1) {
  const markers = new Set<string>();
  for (const reference of collectCanonicalResultMathValues(document)) {
    collectUnsafeMarkersFromString(reference.value.canonicalLatex, markers);
  }
  collectUnsafeMarkersFromString(document.approximations?.primary, markers);
  collectUnsafeMarkersFromString(document.error, markers);
  return markers.size > 0 ? Array.from(markers).sort() : undefined;
}

function detailPartsText(parts: CanonicalResultDetailPartV1[]) {
  return parts.map((part) => part.kind === 'math' ? part.math.canonicalLatex : part.text).join('');
}

function canonicalSummaryText(document: CanonicalResultDocumentV1) {
  const solve = document.summaries?.solve
    ?.map(detailPartsText)
    .filter(Boolean)
    .join(' ');
  const transform = document.summaries?.transform;
  return compactText(
    solve
    ?? transform?.text
    ?? transform?.math?.canonicalLatex,
  );
}

export function summarizeCanonicalRuntimeOutcome(outcome: unknown): OoeDiagnosticsOutputSummary {
  if (!outcome || typeof outcome !== 'object' || !('kind' in outcome)) {
    return { kind: 'unknown' };
  }

  const record = outcome as Record<string, unknown>;
  const kind = record.kind;
  if (kind === 'prompt') {
    return { kind: 'prompt' };
  }
  if (kind !== 'success' && kind !== 'error') {
    return { kind: 'unknown' };
  }
  const resolution = resolveCanonicalResultForConsumer(outcome as CanonicalRuntimeOutcome);
  if (!resolution.ok) {
    return { kind, errorSummary: `Canonical result unavailable: ${resolution.failure.reason}` };
  }

  const document = resolution.document;
  const metadata = document.metadata;
  const exactLatex = document.primaryMath?.canonicalLatex;
  const approxText = document.approximations?.primary;

  return {
    kind: document.outcomeKind,
    title: document.title,
    warningsCount: document.warnings.length,
    answerDomain: metadata?.answerDomain,
    solutionKind: metadata?.solutionKind,
    resultOrigin: metadata?.resultOrigin,
    calculusStrategy: metadata?.calculusStrategy,
    calculusDerivativeStrategies: metadata?.calculusDerivativeStrategies,
    plannerBadges: badgeSummaries(metadata?.plannerBadges),
    solveBadges: badgeSummaries(metadata?.solveBadges),
    transformBadges: badgeSummaries(metadata?.transformBadges),
    hasExactLatex: Boolean(exactLatex),
    exactLatexLength: exactLatex?.length,
    exactSupplementCount: document.supplements?.length ?? 0,
    hasPeriodicFamily: Boolean(document.periodicFamily),
    hasApproxText: Boolean(approxText),
    approxTextLength: approxText?.length,
    detailSectionTitles: document.details?.map((section) => section.title),
    summaryText: canonicalSummaryText(document),
    errorSummary: compactText(document.error),
    unsafeReadbackMarkers: unsafeMarkersFromDocument(document),
  };
}

export function recordOoeDiagnostics(
  input: RecordOoeDiagnosticsInput,
): OoeDiagnosticsRecord {
  const sequence = nextDiagnosticsSequence;
  nextDiagnosticsSequence += 1;
  const finishedAt = input.finishedAt ?? Date.now();
  const record: OoeDiagnosticsRecord = {
    diagnosticsId: `ooe-diagnostics-${sequence}`,
    sequence,
    job: input.job,
    jobId: input.job.jobId,
    inputRevisionId: input.job.inputRevisionId,
    routeLabel: input.routeLabel,
    planId: input.job.planId,
    capabilityId: input.job.capabilityId,
    hostId: input.job.hostId,
    nodeId: input.job.nodeId ?? null,
    phaseId: input.job.phaseId ?? null,
    ...(input.job.workspaceInstanceId
      ? {
          workspaceInstanceId: input.job.workspaceInstanceId,
          workspaceInstanceLabel: input.job.workspaceInstanceLabel ?? undefined,
        }
      : {}),
    terminalStatus: input.terminalStatus,
    commitAssessment: input.commitAssessment,
    hostAdapter: input.hostAdapter,
    traceEvents: input.traceEvents ? [...input.traceEvents] : [],
    provenance: input.provenance,
    startedAt: input.startedAt,
    finishedAt,
    durationMs: Math.max(0, finishedAt - input.startedAt),
    errorMessage: input.errorMessage,
  };

  diagnosticsRecords.unshift(cloneRecord(record));
  if (diagnosticsRecords.length > diagnosticsLimit) {
    diagnosticsRecords.length = diagnosticsLimit;
  }

  return cloneRecord(record);
}

export function listOoeDiagnostics(): OoeDiagnosticsRecord[] {
  return diagnosticsRecords.map(cloneRecord);
}

export function getLatestOoeDiagnostics(
  predicate?: (record: OoeDiagnosticsRecord) => boolean,
): OoeDiagnosticsRecord | null {
  const record = predicate
    ? diagnosticsRecords.find((candidate) => predicate(cloneRecord(candidate)))
    : diagnosticsRecords[0];

  return record ? cloneRecord(record) : null;
}

export function clearOoeDiagnostics(options?: { limit?: number }) {
  diagnosticsRecords.length = 0;
  diagnosticsLimit = options?.limit ?? DEFAULT_OOE_DIAGNOSTICS_LIMIT;
  nextDiagnosticsSequence = 1;
}
