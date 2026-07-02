import type { DisplayOutcome, NumericSolveInterval } from '../../types/calculator';
import {
  numericIntervalEvidence,
  type EquationAnalysisEvidence,
  type EquationAnalysisEvidenceConfidence,
} from './analysis-evidence';

function evidenceHasClassification(
  evidence: readonly EquationAnalysisEvidence[],
  classification: string,
) {
  return evidence.some((entry) => entry.classification === classification);
}

function intervalTrustLabel(interval?: NumericSolveInterval) {
  return interval ? `Local numeric roots in [${interval.start}, ${interval.end}]` : 'Local numeric roots';
}

function trustEvidenceEntry(input: {
  target: string;
  sourceRoute: string;
  classification: string;
  text: string;
  confidence?: EquationAnalysisEvidenceConfidence;
  interval?: NumericSolveInterval;
}): EquationAnalysisEvidence {
  return {
    id: ['trust', input.sourceRoute, input.target, input.classification, input.text].join(':'),
    target: input.target,
    sourceRoute: input.sourceRoute,
    category: 'trust',
    classification: input.classification,
    confidence: input.confidence ?? 'reported',
    text: input.text,
    interval: numericIntervalEvidence(input.interval),
  };
}

export function buildEquationTrustEvidence(input: {
  outcome: DisplayOutcome;
  target: string;
  sourceRoute: string;
  evidence: readonly EquationAnalysisEvidence[];
  numericInterval?: NumericSolveInterval;
}): EquationAnalysisEvidence[] {
  if (input.outcome.kind !== 'success') {
    return [];
  }
  if (
    evidenceHasClassification(input.evidence, 'sturm-certified-root')
    || evidenceHasClassification(input.evidence, 'sturm-certified-intervals')
  ) {
    return [trustEvidenceEntry({
      target: input.target,
      sourceRoute: input.sourceRoute,
      classification: 'certified-polynomial-roots',
      confidence: 'certified',
      text: 'Certified polynomial roots',
    })];
  }
  if (evidenceHasClassification(input.evidence, 'interval-local-root')) {
    return [trustEvidenceEntry({
      target: input.target,
      sourceRoute: input.sourceRoute,
      classification: 'local-numeric-roots',
      text: intervalTrustLabel(input.numericInterval),
      interval: input.numericInterval,
    })];
  }
  if (evidenceHasClassification(input.evidence, 'bounded-search-root')) {
    return [trustEvidenceEntry({
      target: input.target,
      sourceRoute: input.sourceRoute,
      classification: 'bounded-search-approximate-roots',
      text: 'Validated approximate roots from bounded search',
    })];
  }
  if (evidenceHasClassification(input.evidence, 'region-local-complex-root')) {
    return [trustEvidenceEntry({
      target: input.target,
      sourceRoute: input.sourceRoute,
      classification: 'region-local-complex-roots',
      text: 'Region-local complex roots',
    })];
  }
  if (
    input.outcome.resultOrigin === 'symbolic'
    || input.outcome.branchReadback
    || (input.outcome.exactLatex && !input.outcome.solutionKind && input.outcome.title === 'Symbolic')
  ) {
    return [trustEvidenceEntry({
      target: input.target,
      sourceRoute: input.sourceRoute,
      classification: 'exact-roots',
      confidence: 'proven',
      text: 'Exact roots',
    })];
  }
  return [];
}
