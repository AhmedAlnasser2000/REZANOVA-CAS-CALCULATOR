import type { CanonicalRuntimeOutcome } from '../../../types/calculator';
import {
  resolveCanonicalResultForConsumer,
  type CanonicalResultPresentation,
} from '../../result-contract';

export const INTERNAL_SYMBOLIC_ERROR_LATEX =
  '\\text{Unsupported symbolic fragment. Re-run to refresh.}';

const INTERNAL_SYMBOLIC_ERROR_PATTERN =
  /\\(?:mathtip\{)?\\error\{\\blacksquare\}|\\blacksquare|\\mathtip|tuple</u;

export function hasInternalSymbolicErrorLatex(latex: string | null | undefined) {
  return typeof latex === 'string' && INTERNAL_SYMBOLIC_ERROR_PATTERN.test(latex);
}

function periodicFamilyLatexFragments(
  family: CanonicalResultPresentation['periodicFamily'],
) {
  if (!family) return [];
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

function detailFragments(presentation: CanonicalResultPresentation) {
  return presentation.details?.flatMap((section) =>
    section.lines.map((line) => line.map((part) =>
      part.kind === 'math' ? part.latex : part.text).join(''))) ?? [];
}

export function collectUnsafeSymbolicOutputFragments(
  outcome: CanonicalRuntimeOutcome | null | undefined,
) {
  if (!outcome || outcome.kind === 'prompt') return [];

  const resolution = resolveCanonicalResultForConsumer(outcome);
  if (!resolution.ok) return [INTERNAL_SYMBOLIC_ERROR_LATEX];
  const presentation = resolution.presentation;
  const fragments = [
    presentation.primaryLatex,
    ...(presentation.supplements ?? []),
    ...detailFragments(presentation),
    presentation.summaries?.transform?.mathLatex,
    ...periodicFamilyLatexFragments(presentation.periodicFamily),
  ];
  return fragments.filter(hasInternalSymbolicErrorLatex);
}

export function hasUnsafeSymbolicOutput(outcome: CanonicalRuntimeOutcome | null | undefined) {
  return collectUnsafeSymbolicOutputFragments(outcome).length > 0;
}
