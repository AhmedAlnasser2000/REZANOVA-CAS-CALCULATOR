import type { DisplayOutcome, PeriodicFamilyInfo } from '../../types/calculator';

export const INTERNAL_SYMBOLIC_ERROR_LATEX =
  '\\text{Unsupported symbolic fragment. Re-run to refresh.}';

const INTERNAL_SYMBOLIC_ERROR_PATTERN =
  /\\(?:mathtip\{)?\\error\{\\blacksquare\}|\\blacksquare|\\mathtip|tuple</u;

export function hasInternalSymbolicErrorLatex(latex: string | null | undefined) {
  return typeof latex === 'string' && INTERNAL_SYMBOLIC_ERROR_PATTERN.test(latex);
}

function periodicFamilyLatexFragments(family: PeriodicFamilyInfo | undefined) {
  if (!family) {
    return [];
  }

  return [
    family.carrierLatex,
    family.parameterLatex,
    ...(family.parameterConstraintLatex ?? []),
    ...family.branchesLatex,
    ...(family.discoveredFamilies ?? []),
    ...(family.representatives?.flatMap((entry) => [
      entry.exactLatex,
      entry.approxText,
    ]) ?? []),
    ...(family.piecewiseBranches?.flatMap((entry) => [
      entry.conditionLatex,
      entry.resultLatex,
    ]) ?? []),
    family.principalRangeLatex,
    family.reducedCarrierLatex,
  ];
}

export function collectUnsafeSymbolicOutputFragments(outcome: DisplayOutcome | null | undefined) {
  if (!outcome || outcome.kind === 'prompt') {
    return [];
  }

  const fragments = [
    outcome.exactLatex,
    ...(outcome.exactSupplementLatex ?? []),
    ...(outcome.detailSections?.flatMap((section) => section.lines) ?? []),
    outcome.transformSummaryLatex,
    ...periodicFamilyLatexFragments(outcome.periodicFamily),
  ];

  return fragments.filter(hasInternalSymbolicErrorLatex);
}

export function hasUnsafeSymbolicOutput(outcome: DisplayOutcome | null | undefined) {
  return collectUnsafeSymbolicOutputFragments(outcome).length > 0;
}
