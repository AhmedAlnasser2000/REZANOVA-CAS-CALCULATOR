import type {
  CanonicalResultDocumentV1,
  CanonicalResultPeriodicFamilyV1,
  CanonicalRuntimeOutcome,
} from '../../../types/calculator';
import { resolveCanonicalResultForConsumer } from '../../result-contract';

export const INTERNAL_SYMBOLIC_ERROR_LATEX =
  '\\text{Unsupported symbolic fragment. Re-run to refresh.}';

const INTERNAL_SYMBOLIC_ERROR_PATTERN =
  /\\(?:mathtip\{)?\\error\{\\blacksquare\}|\\blacksquare|\\mathtip|tuple</u;

export function hasInternalSymbolicErrorLatex(latex: string | null | undefined) {
  return typeof latex === 'string' && INTERNAL_SYMBOLIC_ERROR_PATTERN.test(latex);
}

function periodicFamilyLatexFragments(family: CanonicalResultPeriodicFamilyV1 | undefined) {
  if (!family) {
    return [];
  }

  return [
    family.carrier.canonicalLatex,
    family.parameter.canonicalLatex,
    ...(family.parameterConstraints?.map((value) => value.canonicalLatex) ?? []),
    ...family.branches.map((value) => value.canonicalLatex),
    ...(family.discoveredFamilies?.map((value) => value.canonicalLatex) ?? []),
    ...(family.representatives?.flatMap((entry) => [
      entry.exact?.canonicalLatex,
      entry.approxText,
    ]) ?? []),
    ...(family.piecewiseBranches?.flatMap((entry) => [
      entry.condition.canonicalLatex,
      entry.result.canonicalLatex,
    ]) ?? []),
    family.principalRange?.canonicalLatex,
    family.reducedCarrier?.canonicalLatex,
  ];
}

function detailFragments(document: CanonicalResultDocumentV1) {
  return document.details?.flatMap((section) =>
    section.lines.map((line) => line.map((part) =>
      part.kind === 'math' ? part.math.canonicalLatex : part.text).join(''))) ?? [];
}

export function collectUnsafeSymbolicOutputFragments(outcome: CanonicalRuntimeOutcome | null | undefined) {
  if (!outcome || outcome.kind === 'prompt') {
    return [];
  }

  const resolution = resolveCanonicalResultForConsumer(outcome);
  if (!resolution.ok) return [INTERNAL_SYMBOLIC_ERROR_LATEX];
  const document = resolution.document;
  const fragments = [
    document.primaryMath?.canonicalLatex,
    ...(document.supplements?.map((value) => value.canonicalLatex) ?? []),
    ...detailFragments(document),
    document.summaries?.transform?.math?.canonicalLatex,
    ...periodicFamilyLatexFragments(document.periodicFamily),
  ];

  return fragments.filter(hasInternalSymbolicErrorLatex);
}

export function hasUnsafeSymbolicOutput(outcome: CanonicalRuntimeOutcome | null | undefined) {
  return collectUnsafeSymbolicOutputFragments(outcome).length > 0;
}
