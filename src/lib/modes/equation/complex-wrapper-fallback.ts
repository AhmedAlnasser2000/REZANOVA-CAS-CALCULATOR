import type { DisplayDetailSection, DisplayOutcome } from '../../../types/calculator';

export function isDeferredComplexWrapperBoundary(outcome: DisplayOutcome) {
  return outcome.kind === 'error'
    && /outside the supported guarded complex (?:wrapper|preimage) families/u.test(outcome.error);
}

function complexWrapperFallbackSections(
  deferredOutcome: DisplayOutcome | undefined,
): DisplayDetailSection[] {
  if (!deferredOutcome || deferredOutcome.kind !== 'error') {
    return [];
  }

  return [
    {
      title: 'Complex Extension Boundary',
      lines: [
        'Domain intent: Complex.',
        'The complex exact wrapper route could not close this family, so Equation is showing the validated real solution family instead of failing the answer card.',
        `Complex route boundary: ${deferredOutcome.error}`,
      ],
    },
  ];
}

function hasIntegerPeriodicEvidence(outcome: DisplayOutcome) {
  if (outcome.kind !== 'success') {
    return false;
  }
  return /\\mathbb\{Z\}|\\pi\s*n|\\pi n|\\frac\{\\pi n\}/u.test([
    outcome.exactLatex,
    ...(outcome.exactSupplementLatex ?? []),
    ...(outcome.branchReadback?.branchesLatex ?? []),
  ].filter(Boolean).join(' '));
}

export function withDeferredComplexWrapperBoundary(
  outcome: DisplayOutcome,
  deferredOutcome: DisplayOutcome | undefined,
): DisplayOutcome {
  const fallbackSections = complexWrapperFallbackSections(deferredOutcome);
  if (outcome.kind !== 'success' || fallbackSections.length === 0) {
    return outcome;
  }
  if (!hasIntegerPeriodicEvidence(outcome)) {
    return deferredOutcome ?? outcome;
  }

  return {
    ...outcome,
    answerDomain: outcome.answerDomain ?? 'real',
    detailSections: [
      ...(outcome.detailSections ?? []),
      ...fallbackSections,
    ],
  };
}
