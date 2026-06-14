import type { PlannerStep } from '../../../types/calculator';

export function attachCanonicalizationSteps(canonicalLatex: string, steps: PlannerStep[], originalLatex: string) {
  if (canonicalLatex !== originalLatex) {
    steps.unshift({
      kind: 'canonicalize-token',
      before: originalLatex,
      after: canonicalLatex,
    });
  }
}

export function plannerBadgesFromSteps(
  originalLatex: string,
  canonicalLatex: string,
  steps: PlannerStep[],
) {
  return [
    ...(canonicalLatex !== originalLatex.trim() ? ['Canonicalized' as const] : []),
    ...(steps.some((step) => step.kind === 'reduce-derivative') ? ['Reduced Derivative' as const] : []),
    ...(steps.some((step) => step.kind === 'reduce-partial') ? ['Reduced Partial' as const] : []),
    ...(steps.some((step) => step.kind === 'reduce-numeric-operator') ? ['Reduced Numeric Operator' as const] : []),
    ...(steps.some((step) => step.kind === 'compact-identical-product') ? ['Compacted Repeated Factors' as const] : []),
  ];
}
