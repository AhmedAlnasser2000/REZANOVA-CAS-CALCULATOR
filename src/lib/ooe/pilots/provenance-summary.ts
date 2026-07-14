import {
  summarizeCanonicalRuntimeOutcome,
  type OoeDiagnosticsOutputSummary,
} from '../diagnostics/diagnostics-buffer';

export type OoeProvenanceOutputSummary = OoeDiagnosticsOutputSummary;

export function summarizeOoeProvenanceCanonicalOutcome(
  outcome: unknown,
): OoeProvenanceOutputSummary {
  return summarizeCanonicalRuntimeOutcome(outcome);
}
