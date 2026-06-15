import {
  getCompartmentManifestEntry,
  type CompartmentId,
} from './manifest';

export const DEFAULT_COMPARTMENT_UI_BOUNDARY_RECORD_LIMIT = 50;

export type CompartmentUiBoundaryRecordSource = 'ui-boundary';

export type CompartmentUiBoundaryRecord = {
  recordId: string;
  sequence: number;
  compartmentId: CompartmentId;
  compartmentLabel: string;
  errorMessage: string;
  componentStack?: string;
  timestamp: number;
  source: CompartmentUiBoundaryRecordSource;
};

type RecordCompartmentUiBoundaryErrorInput = {
  compartmentId: CompartmentId;
  compartmentLabel?: string;
  error: unknown;
  componentStack?: string;
  timestamp?: number;
};

let nextSequence = 1;
const records: CompartmentUiBoundaryRecord[] = [];

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message || error.name || 'Unknown UI boundary error';
  }
  if (typeof error === 'string') {
    return error.trim() || 'Unknown UI boundary error';
  }
  return 'Unknown UI boundary error';
}

function compartmentLabel(compartmentId: CompartmentId, override: string | undefined) {
  return override
    ?? getCompartmentManifestEntry(compartmentId)?.diagnosticsLabel
    ?? compartmentId;
}

export function recordCompartmentUiBoundaryError({
  compartmentId,
  compartmentLabel: label,
  error,
  componentStack,
  timestamp = Date.now(),
}: RecordCompartmentUiBoundaryErrorInput): CompartmentUiBoundaryRecord {
  const sequence = nextSequence;
  nextSequence += 1;

  const record: CompartmentUiBoundaryRecord = {
    recordId: `compartment.ui.${sequence}`,
    sequence,
    compartmentId,
    compartmentLabel: compartmentLabel(compartmentId, label),
    errorMessage: normalizeErrorMessage(error),
    componentStack: componentStack?.trim() || undefined,
    timestamp,
    source: 'ui-boundary',
  };

  records.unshift(record);
  if (records.length > DEFAULT_COMPARTMENT_UI_BOUNDARY_RECORD_LIMIT) {
    records.length = DEFAULT_COMPARTMENT_UI_BOUNDARY_RECORD_LIMIT;
  }

  return { ...record };
}

export function listCompartmentUiBoundaryErrors(): CompartmentUiBoundaryRecord[] {
  return records.map((record) => ({ ...record }));
}

export function clearCompartmentUiBoundaryErrors() {
  records.length = 0;
}

export function resetCompartmentUiBoundaryRecordsForTests() {
  clearCompartmentUiBoundaryErrors();
  nextSequence = 1;
}
