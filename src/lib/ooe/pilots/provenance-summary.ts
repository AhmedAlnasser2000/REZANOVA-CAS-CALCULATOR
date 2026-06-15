import {
  summarizeDisplayOutcome,
  type OoeDiagnosticsOutputSummary,
} from '../diagnostics/diagnostics-buffer';

export type OoeProvenanceOutputSummary = OoeDiagnosticsOutputSummary;

export function summarizeOoeProvenanceDisplayOutcome(
  outcome: unknown,
): OoeProvenanceOutputSummary {
  return summarizeDisplayOutcome(outcome);
}
