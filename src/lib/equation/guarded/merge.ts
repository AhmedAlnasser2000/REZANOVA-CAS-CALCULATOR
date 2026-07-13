import { solutionsToLatex } from '../../display/format';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import type {
  DisplayOutcome,
  DisplaySolveSummary,
  PeriodicFamilyInfo,
  SerializableMathJson,
  SolveBadge,
  SubstitutionSolveDiagnostics,
} from '../../../types/calculator';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
} from './outcome';
import { mergeBranchFamilies } from '../../algebra/branch-core';
import { profileEquationResult } from '../../display/printer';
import { createEquationResultOutcome } from '../solve-result/producer';
import {
  equationMathValuesFromOwnedLeaves,
  equationOwnedMathJsonLeavesFromDocument,
  inferEquationMathJsonRoute,
  type EquationMathJsonRouteId,
} from '../solve-result/math-values';

function extractExactSolutions(exactLatex?: string) {
  if (!exactLatex) {
    return [];
  }

  if (exactLatex.startsWith('x=')) {
    return [exactLatex.slice(2)];
  }

  const prefix = 'x\\in\\left\\{';
  const suffix = '\\right\\}';
  if (exactLatex.startsWith(prefix) && exactLatex.endsWith(suffix)) {
    return exactLatex
      .slice(prefix.length, -suffix.length)
      .split(/,\s*/)
      .filter(Boolean);
  }

  return [exactLatex];
}

function extractApproxSolutions(approxText?: string) {
  if (!approxText) {
    return [];
  }

  const prefix = 'x ~= ';
  if (approxText.startsWith(prefix)) {
    return approxText.slice(prefix.length).split(/,\s*/).filter(Boolean);
  }

  return [approxText];
}

function dedupe<T>(values: T[]) {
  return [...new Set(values)];
}

function mergeDetailSections(outcomes: DisplayOutcome[]) {
  const encoded = dedupe(
    outcomes
      .flatMap((outcome) => outcome.kind === 'prompt' ? [] : outcome.detailSections ?? [])
      .map((section) => JSON.stringify(section)),
  );
  return encoded.map((entry) => JSON.parse(entry));
}

function mergeDisplayOutcomes(
  outcomes: DisplayOutcome[],
  solveBadges: SolveBadge[],
  solveSummary: DisplaySolveSummary,
  substitutionDiagnostics?: SubstitutionSolveDiagnostics,
  mathJsonOptions?: { routeId: EquationMathJsonRouteId; source: string },
): DisplayOutcome {
  const successes = outcomes.filter((outcome) => outcome.kind === 'success');
  if (successes.length === 0) {
    const firstError = outcomes.find((outcome) => outcome.kind === 'error');
    if (firstError?.kind === 'error') {
      const outcome = errorOutcome(
        'Solve',
        firstError.error,
        firstError.warnings,
        firstError.plannerBadges ?? [],
        dedupe([...(firstError.solveBadges ?? []), ...solveBadges]),
        solveSummary,
        firstError.rejectedCandidateCount,
        substitutionDiagnostics ?? firstError.substitutionDiagnostics,
        firstError.numericMethod,
      );
      return createEquationResultOutcome({
        ...outcome,
        detailSections: firstError.detailSections,
      });
    }

    return errorOutcome(
      'Solve',
      UNSUPPORTED_FAMILY_ERROR,
      [],
      [],
      solveBadges,
      solveSummary,
      undefined,
      substitutionDiagnostics,
    );
  }

  const exactValues = dedupe(successes.flatMap((outcome) => extractExactSolutions(outcome.exactLatex)));
  const approxValues = dedupe(successes.flatMap((outcome) => extractApproxSolutions(outcome.approxText)));
  const warnings = dedupe(successes.flatMap((outcome) => outcome.warnings));
  const plannerBadges = dedupe(successes.flatMap((outcome) => outcome.plannerBadges ?? []));
  const badgeSet = dedupe(successes.flatMap((outcome) => outcome.solveBadges ?? []).concat(solveBadges));
  const exactSupplementLatex = mergeExactSupplementLatex(
    ...successes.map((outcome) => ({ latex: outcome.exactSupplementLatex, source: 'legacy' as const })),
  );
  const detailSections = mergeDetailSections(successes);
  const candidateValues = dedupe(successes.flatMap((outcome) => outcome.candidateValues ?? []));
  const rejectedCandidateCount = successes.reduce((total, outcome) => total + (outcome.rejectedCandidateCount ?? 0), 0);
  const numericMethod = dedupe(successes.map((outcome) => outcome.numericMethod).filter((method): method is string => Boolean(method))).join('; ');
  const periodicFamily = mergeBranchFamilies(
    successes
      .map((outcome) => outcome.periodicFamily)
      .filter((family): family is PeriodicFamilyInfo => Boolean(family)),
  );

  const exactLatex = exactValues.length > 0 ? solutionsToLatex('x', exactValues) : undefined;
  const rootsByLatex = new Map<string, SerializableMathJson>();
  for (const outcome of successes) {
    const mathJson = outcome.canonicalResult?.primaryMath?.mathJson;
    const root = Array.isArray(mathJson) ? mathJson : undefined;
    const nodes = root?.[0] === 'Equal' && root.length === 3
      ? [root[2]]
      : root?.[0] === 'Element'
        && Array.isArray(root[2])
        && root[2][0] === 'Set'
          ? root[2].slice(1)
          : [];
    const latex = extractExactSolutions(outcome.canonicalResult?.primaryMath?.canonicalLatex);
    if (nodes.length !== latex.length) continue;
    latex.forEach((value, index) => rootsByLatex.set(value, nodes[index]));
  }
  const aggregateMathJson: SerializableMathJson | undefined = exactLatex
    && exactValues.every((value) => rootsByLatex.has(value))
    ? exactValues.length === 1
      ? ['Equal', 'x', rootsByLatex.get(exactValues[0])!]
      : ['Element', 'x', ['Set', ...exactValues.map((value) => rootsByLatex.get(value)! )]]
    : undefined;

  const producerInput = {
    kind: 'success' as const,
    title: 'Solve',
    exactLatex,
    ...(aggregateMathJson
      ? { canonicalMath: { version: 1 as const, canonicalLatex: exactLatex!, mathJson: aggregateMathJson } }
      : {}),
    periodicFamily,
    exactSupplementLatex: exactSupplementLatex.length > 0 ? exactSupplementLatex : undefined,
    approxText: approxValues.length > 0 ? `x ~= ${approxValues.join(', ')}` : undefined,
    detailSections: detailSections.length > 0 ? detailSections : undefined,
    warnings,
    resultOrigin: approxValues.length > 0 && exactValues.length === 0
      ? 'numeric-fallback' as const
      : 'symbolic' as const,
    plannerBadges,
    solveBadges: badgeSet,
    solveSummaryText: solveSummary.solveSummaryText,
    solveSummaryParts: solveSummary.solveSummaryParts,
    candidateValues: candidateValues.length > 0 ? candidateValues : undefined,
    rejectedCandidateCount: rejectedCandidateCount > 0 ? rejectedCandidateCount : undefined,
    substitutionDiagnostics: substitutionDiagnostics ?? successes.find((outcome) => outcome.substitutionDiagnostics)?.substitutionDiagnostics,
    numericMethod: numericMethod || undefined,
  };
  const candidateLeaves = successes.flatMap((outcome, index) =>
    equationOwnedMathJsonLeavesFromDocument(
      outcome.canonicalResult,
      `equation-merge-input:${index}`,
    ));
  const ambiguousLatex = new Set<string>();
  const nativeByLatex = new Map<string, typeof candidateLeaves[number]>();
  for (const leaf of candidateLeaves) {
    const existing = nativeByLatex.get(leaf.canonicalLatex);
    if (!existing) {
      nativeByLatex.set(leaf.canonicalLatex, leaf);
    } else if (JSON.stringify(existing.mathJson) !== JSON.stringify(leaf.mathJson)) {
      ambiguousLatex.add(leaf.canonicalLatex);
    }
  }
  const nativeLeaves = [...nativeByLatex.values()].filter((leaf) =>
    !ambiguousLatex.has(leaf.canonicalLatex));
  if (aggregateMathJson && exactLatex) {
    nativeLeaves.push({
      canonicalLatex: exactLatex,
      mathJson: aggregateMathJson,
      source: mathJsonOptions?.source ?? 'equation-merge-native-roots',
    });
  }
  const mergedMathValues = equationMathValuesFromOwnedLeaves({
      outcome: producerInput,
      routeId: mathJsonOptions?.routeId ?? inferEquationMathJsonRoute(producerInput),
      leaves: nativeLeaves,
    });
  const supplementalMathValues = { ...mergedMathValues };
  delete supplementalMathValues.primaryMath;
  delete supplementalMathValues.branchReadback;
  return profileEquationResult(createEquationResultOutcome(producerInput, {
    mathValues: supplementalMathValues,
  }));
}

export {
  dedupe,
  extractApproxSolutions,
  extractExactSolutions,
  mergeDisplayOutcomes,
};
