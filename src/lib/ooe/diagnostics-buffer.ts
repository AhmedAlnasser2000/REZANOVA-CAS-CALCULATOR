import type {
  OoeCommitAssessment,
  OoeJobIdentity,
  OoeTraceEvent,
} from './ooe-bridge';
import type { OoeHostAdapterDiagnostics } from './host-adapter';

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

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : undefined;
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

function detailSectionTitles(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || !('title' in entry)) {
      return [];
    }

    return typeof entry.title === 'string' ? [entry.title] : [];
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

function unsafeMarkersFromOutcome(outcome: Record<string, unknown>) {
  const markers = new Set<string>();
  collectUnsafeMarkersFromString(outcome.exactLatex, markers);
  collectUnsafeMarkersFromString(outcome.approxText, markers);
  collectUnsafeMarkersFromString(outcome.error, markers);
  for (const entry of stringArray(outcome.exactSupplementLatex) ?? []) {
    collectUnsafeMarkersFromString(entry, markers);
  }
  return markers.size > 0 ? Array.from(markers).sort() : undefined;
}

export function summarizeDisplayOutcome(outcome: unknown): OoeDiagnosticsOutputSummary {
  if (!outcome || typeof outcome !== 'object' || !('kind' in outcome)) {
    return { kind: 'unknown' };
  }

  const record = outcome as Record<string, unknown>;
  const exactLatex = typeof record.exactLatex === 'string' ? record.exactLatex : undefined;
  const approxText = typeof record.approxText === 'string' ? record.approxText : undefined;
  const error = typeof record.error === 'string' ? record.error : undefined;
  const warningValues = stringArray(record.warnings);
  const exactSupplement = stringArray(record.exactSupplementLatex);

  return {
    kind: String(record.kind),
    title: typeof record.title === 'string' ? record.title : undefined,
    warningsCount: warningValues?.length ?? 0,
    resultOrigin: typeof record.resultOrigin === 'string' ? record.resultOrigin : undefined,
    calculusStrategy: typeof record.calculusStrategy === 'string'
      ? record.calculusStrategy
      : undefined,
    calculusDerivativeStrategies: stringArray(record.calculusDerivativeStrategies),
    plannerBadges: badgeSummaries(record.plannerBadges),
    solveBadges: badgeSummaries(record.solveBadges),
    transformBadges: badgeSummaries(record.transformBadges),
    hasExactLatex: Boolean(exactLatex),
    exactLatexLength: exactLatex?.length,
    exactSupplementCount: exactSupplement?.length ?? 0,
    hasPeriodicFamily: Boolean(record.periodicFamily),
    hasApproxText: Boolean(approxText),
    approxTextLength: approxText?.length,
    detailSectionTitles: detailSectionTitles(record.detailSections),
    summaryText: compactText(record.solveSummaryText ?? record.transformSummaryText),
    errorSummary: compactText(error),
    unsafeReadbackMarkers: unsafeMarkersFromOutcome(record),
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
