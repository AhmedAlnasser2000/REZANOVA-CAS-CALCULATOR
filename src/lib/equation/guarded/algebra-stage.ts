import { createBranchSet } from '../../algebra/branch-core';
import { mergeSolveDomainConstraints as mergeConstraints } from '../../algebra/radical-core';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import type {
  DisplayDetailSection,
  DisplayOutcome,
  DisplaySolveSummary,
  EquationExecutionBudget,
  GuardedSolveRequest,
  SolveBadge,
} from '../../../types/calculator';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
} from './outcome';
import { dedupe, mergeEquationStageCarriers } from './merge';
import { equationStateKey } from './state-key';
import type { AlgebraTransform, GuardedSolveRunner } from './algebra/types';
import {
  getRadicalTransformDepth,
  getRepeatedClearingDepth,
  mergePolynomialCarrierHints,
  subtractConstraints,
} from './algebra/math-json';
import {
  buildBlockedAbsBranchOutcome,
  isGuidedUnsupportedAbsBranchOutcome,
  matchBoundedAbsoluteValueTransform,
  matchPerfectSquareAbsoluteValueTransform,
} from './algebra/absolute-value';
import {
  matchDirectRationalPowerTransform,
  matchRadicalIsolationTransform,
} from './algebra/radicals';
import { matchRepeatedClearingTransform } from './algebra/repeated-clearing';
import {
  matchConjugateTransform,
  matchRationalTransform,
} from './algebra/rational';
import {
  dedupeSolveSummaries,
  mergeSolveSummaries,
  solveSummaryFromDisplayFields,
} from '../../display/result-detail-lines';
import {
  createEquationResultOutcome,
  type EquationResultProducerInput,
} from '../solve-result/producer';
import {
  equationMathValuesFromOwnedLeaves,
  equationOwnedMathJsonLeavesFromDocument,
  inferEquationMathJsonRoute,
} from '../solve-result/math-values';
import {
  buildEquationStageResultCarrier,
  readEquationStageResultCarrier,
} from '../solve-result/stage-carrier';

const RADICAL_STEP_BUDGET_ERROR = 'This recognized radical family would require more than two bounded radical transform steps. Use Numeric Solve with an interval in Equation mode.';
const REPEATED_CLEARING_BUDGET_ERROR = 'This recognized repeated-clearing radical family would require more than one extra bounded radical clear. Use Numeric Solve with an interval in Equation mode.';

function rebuildEquationOutcome(
  input: EquationResultProducerInput,
  previous: Exclude<DisplayOutcome, { kind: 'prompt' }>,
) {
  return createEquationResultOutcome(input, {
    mathValues: equationMathValuesFromOwnedLeaves({
      outcome: input,
      routeId: inferEquationMathJsonRoute(input),
      leaves: equationOwnedMathJsonLeavesFromDocument(
        previous.canonicalResult,
        'equation-algebra-rebuild',
      ),
    }),
  });
}

function appendSolveMetadata(
  outcome: DisplayOutcome,
  badges: SolveBadge[],
  summary: DisplaySolveSummary,
  detailSections: DisplayDetailSection[] = [],
  summaryMergeMode: 'prepend' | 'replace' = 'prepend',
): DisplayOutcome {
  if (outcome.kind === 'prompt') {
    return outcome;
  }

  const solveBadges = dedupe([...(outcome.solveBadges ?? []), ...badges]);
  const declaredSummary = solveSummaryFromDisplayFields(summary);
  if (!declaredSummary) {
    throw new Error('Algebra transform must declare solve-summary intent.');
  }
  const solveSummary = summaryMergeMode === 'replace'
    ? declaredSummary
    : mergeSolveSummaries(declaredSummary, solveSummaryFromDisplayFields(outcome));
  const mergedDetailSections = dedupe([
    ...detailSections.map((section) => JSON.stringify(section)),
    ...(outcome.detailSections ?? []).map((section) => JSON.stringify(section)),
  ]).map((section) => JSON.parse(section) as DisplayDetailSection);

  return rebuildEquationOutcome({
    ...outcome,
    solveBadges,
    ...solveSummary,
    detailSections: mergedDetailSections.length > 0 ? mergedDetailSections : outcome.detailSections,
  }, outcome);
}

function recurseTransform(
  request: GuardedSolveRequest,
  transform: AlgebraTransform,
  depth: number,
  trail: Set<string>,
  executionBudget: EquationExecutionBudget,
  runGuardedEquationSolve: GuardedSolveRunner,
): DisplayOutcome | null {
  if (depth >= executionBudget.maxRecursionDepth) {
    return errorOutcome(
      'Solve',
      'This equation exceeded the supported guarded-solve recursion depth for this milestone.',
      [],
      [],
      transform.solveBadges,
      transform,
    );
  }

  const nextRadicalTransformDepth = getRadicalTransformDepth(request) + (transform.radicalStepCost ?? 0);
  const nextRepeatedClearingDepth = getRepeatedClearingDepth(request) + (transform.repeatedClearingStepCost ?? 0);
  if (nextRadicalTransformDepth > executionBudget.maxRadicalTransformSteps) {
    return errorOutcome(
      'Solve',
      RADICAL_STEP_BUDGET_ERROR,
      [],
      [],
      transform.solveBadges,
      transform,
    );
  }

  if (nextRepeatedClearingDepth > executionBudget.maxRepeatedClearingSteps) {
    return errorOutcome(
      'Solve',
      REPEATED_CLEARING_BUDGET_ERROR,
      [],
      [],
      transform.solveBadges,
      transform,
    );
  }

  const parentKey = equationStateKey(request.resolvedLatex);
  const branchEquations = createBranchSet({
    equations: transform.branchEquations ?? [transform.equationLatex],
    constraints: transform.domainConstraints,
    provenance: 'guarded-algebra-stage',
  }).equations.filter(
    (equationLatex) => equationStateKey(equationLatex) !== parentKey,
  );
  if (branchEquations.length === 0) {
    if (transform.emptyBranchError) {
      const outcome = errorOutcome(
        'Solve',
        transform.emptyBranchError,
        [],
        [],
        transform.solveBadges,
        transform,
      ) as Extract<DisplayOutcome, { kind: 'error' }>;
      if (transform.emptyDetailSections?.length) {
        return rebuildEquationOutcome({
          ...outcome,
          detailSections: transform.emptyDetailSections,
        }, outcome);
      }
      return outcome;
    }
    return null;
  }

  const recursiveCarriers = branchEquations.map((equationLatex) =>
    buildEquationStageResultCarrier(runGuardedEquationSolve(
      {
        ...request,
        originalLatex: equationLatex,
        resolvedLatex: equationLatex,
        validationLatex: request.validationLatex ?? request.resolvedLatex,
        numericInterval: undefined,
        domainConstraints: mergeConstraints(request.domainConstraints, transform.domainConstraints),
        radicalTransformDepth: nextRadicalTransformDepth,
        repeatedClearingDepth: nextRepeatedClearingDepth,
        polynomialCarrierHints: mergePolynomialCarrierHints(
          request.polynomialCarrierHints,
          transform.polynomialCarrierHints,
        ),
      },
      depth + 1,
      new Set(trail),
    )));
  const recursiveOutcomes = recursiveCarriers.map(readEquationStageResultCarrier);

  const recursiveCarrier = recursiveCarriers.length === 1
    ? recursiveCarriers[0]
    : mergeEquationStageCarriers(
        recursiveCarriers,
        transform.solveBadges,
        transform.summaryMergeMode === 'replace'
          ? transform
          : dedupeSolveSummaries(
            transform,
            ...recursiveOutcomes.flatMap((outcome) => {
              const summary = solveSummaryFromDisplayFields(outcome);
              return summary ? [summary] : [];
            }),
          ) ?? transform,
        undefined,
        transform.mathJsonRouteId
          ? {
              routeId: transform.mathJsonRouteId,
              source: 'equation-algebra-branch-merge',
            }
          : undefined,
      );
  const recursiveOutcome = readEquationStageResultCarrier(recursiveCarrier);

  if (
    transform.blockOnGuidedBranchError
    && recursiveOutcomes.some((outcome) => isGuidedUnsupportedAbsBranchOutcome(outcome))
  ) {
    if (request.numericInterval) {
      return null;
    }

    return buildBlockedAbsBranchOutcome(request, transform, recursiveOutcomes);
  }

  if (recursiveOutcome.kind === 'error' && recursiveOutcome.error === UNSUPPORTED_FAMILY_ERROR) {
    if (request.numericInterval) {
      return null;
    }

    const outcome = errorOutcome(
      'Solve',
      transform.unresolvedError,
      recursiveOutcome.warnings,
      recursiveOutcome.plannerBadges ?? [],
      dedupe([...(recursiveOutcome.solveBadges ?? []), ...transform.solveBadges]),
      transform,
      recursiveOutcome.rejectedCandidateCount,
      recursiveOutcome.substitutionDiagnostics,
      recursiveOutcome.numericMethod,
    ) as Extract<DisplayOutcome, { kind: 'error' }>;
    if (transform.unresolvedDetailSections?.length) {
      return rebuildEquationOutcome({
        ...outcome,
        detailSections: dedupe([
          ...transform.unresolvedDetailSections.map((section) => JSON.stringify(section)),
          ...(recursiveOutcome.detailSections ?? []).map((section) => JSON.stringify(section)),
        ]).map((section) => JSON.parse(section) as DisplayDetailSection),
      }, outcome);
    }
    return outcome;
  }

  const supplementedOutcome: DisplayOutcome =
    recursiveOutcome.kind === 'success'
      ? (() => {
          const newTransformConstraints = subtractConstraints(
            transform.domainConstraints,
            request.domainConstraints,
          );
          const supplements = mergeExactSupplementLatex(
            { latex: recursiveOutcome.exactSupplementLatex, source: 'legacy' },
            { constraints: newTransformConstraints, source: 'transform' },
          );
          return rebuildEquationOutcome({
            ...recursiveOutcome,
            exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
          }, recursiveOutcome);
        })()
      : recursiveOutcome;

  if (recursiveOutcomes.length > 1) {
    return appendSolveMetadata(
      supplementedOutcome,
      transform.solveBadges,
      transform,
      transform.detailSections,
      transform.summaryMergeMode,
    );
  }

  return appendSolveMetadata(
    supplementedOutcome,
    transform.solveBadges,
    transform,
    transform.detailSections,
    transform.summaryMergeMode,
  );
}

function algebraTransformSolve(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  executionBudget: EquationExecutionBudget,
  runGuardedEquationSolve: GuardedSolveRunner,
): DisplayOutcome | null {
  const rationalTransform = matchRationalTransform(request);
  if (rationalTransform) {
    const recursive = recurseTransform(
      request,
      rationalTransform,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    );
    if (recursive) {
      return recursive;
    }
  }

  const perfectSquareAbsTransform = matchPerfectSquareAbsoluteValueTransform(request);
  if (perfectSquareAbsTransform) {
    const recursive = recurseTransform(
      request,
      perfectSquareAbsTransform,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    );
    if (recursive) {
      return recursive;
    }
  }

  const directPowerTransform = matchDirectRationalPowerTransform(request);
  if (directPowerTransform) {
    const recursive = recurseTransform(
      request,
      directPowerTransform,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    );
    if (recursive) {
      return recursive;
    }
  }

  const radicalTransform = matchRadicalIsolationTransform(request);
  if (radicalTransform) {
    const recursive = recurseTransform(
      request,
      radicalTransform,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    );
    if (recursive) {
      return recursive;
    }
  }

  const repeatedClearingTransform = matchRepeatedClearingTransform(request);
  if (repeatedClearingTransform) {
    const recursive = recurseTransform(
      request,
      repeatedClearingTransform,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    );
    if (recursive) {
      return recursive;
    }
  }

  const absoluteValueTransform = matchBoundedAbsoluteValueTransform(request);
  if (absoluteValueTransform) {
    const recursive = recurseTransform(
      request,
      absoluteValueTransform,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    );
    if (recursive) {
      return recursive;
    }
  }

  const conjugateTransform = matchConjugateTransform(request);
  if (conjugateTransform) {
    const recursive = recurseTransform(
      request,
      conjugateTransform,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
    );
    if (recursive) {
      return recursive;
    }
  }

  return null;
}

export { algebraTransformSolve };
