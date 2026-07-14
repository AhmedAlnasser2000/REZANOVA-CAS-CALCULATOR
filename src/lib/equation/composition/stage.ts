import { ComputeEngine } from '@cortex-js/compute-engine';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber, solutionsToLatex } from '../../display/format';
import {
  mergeExactSupplementLatex,
} from '../../algebra/exact-supplements';
import {
  mergeBranchConstraints as mergeSharedBranchConstraints,
} from '../../algebra/branch-core';
import { dedupe, extractExactSolutions, mergeEquationStageCarriers } from '../guarded/merge';
import {
  appendExtraneousSolutionsDetailSection,
  extraneousEvidenceFromRejectedCandidates,
} from '../candidate/extraneous';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
} from '../guarded/outcome';
import { equationStateKey } from '../guarded/state-key';
import {
  buildSharedCompositionBranchSet,
  resolveCompositionRecursionDepth,
} from './core';
import {
  buildPeriodicOutcomeSupplements,
  buildPeriodicSolveSummary,
  buildReducedCarrierSawtoothSummary,
  isReducedCarrierExactFamily,
  mergePeriodicFamilyExtras,
  periodicFamilyBadges,
  periodicFamilyToExactLatex,
} from './periodic-family';
export {
  buildParameterizedPowerBranches,
  buildQuadraticBranches,
  buildShiftedCarrierBranches,
  buildSymbolicFamilyBranchFromNode,
  dedupeSymbolicFamilyBranches,
  matchParameterizedPowerCarrier,
  matchQuadraticCarrier,
  matchShiftedSupportedCarrier,
  numericAffineCarrier,
  transformAffineBranches,
  type SymbolicFamilyBranch,
} from './carriers';
import { isNodeArray } from '../../symbolic-engine/patterns';
import { normalizeAst } from '../../symbolic-engine/normalize';
import {
  collectOutcomeCandidates,
  compositionRejectionMessage,
  isApproximateOnlySolutionLatex,
  matchAcceptedExactSolutions,
  validateCompositionCandidates,
} from './validation';
import { mergeDetailSections, parseNumericTarget } from './targets';
import { matchNonPeriodicTransform } from './non-periodic-transform';
import { matchTrigBranches } from './trig-carrier';
import { solveTrigPeriodicFamily } from './periodic-resolution';
import type {
  DisplayDetailSection,
  ResultProducerDraft,
  DisplaySolveSummary,
  EquationExecutionBudget,
  GuardedSolveRequest,
  PeriodicFamilyInfo,
  SolveBadge,
  SolveDomainConstraint,
} from '../../../types/calculator';
import { profileEquationResult } from '../../display/printer';
import {
  mergeSolveSummaries,
  proseSolveSummary,
  solveSummaryFromDisplayFields,
} from '../../display/result-detail-lines';
import { createEquationResultOutcome } from '../solve-result/producer';
import {
  readEquationStageResultCarrier,
  type EquationStageResultCarrierV1,
} from '../solve-result/stage-carrier';

const ce = new ComputeEngine();
type GuardedSolveRunner = (
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
) => EquationStageResultCarrierV1;

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function mergeConstraints(
  left: SolveDomainConstraint[] = [],
  right: SolveDomainConstraint[] = [],
) {
  return mergeSharedBranchConstraints(left, right);
}

function buildCompositionBranchSet(
  equations: string[],
  constraints?: SolveDomainConstraint[],
) {
  return buildSharedCompositionBranchSet(equations, constraints);
}

function appendSolveMetadata(
  outcome: ResultProducerDraft,
  badges: SolveBadge[],
  summary: DisplaySolveSummary,
): ResultProducerDraft {
  if (outcome.kind === 'prompt') {
    return outcome;
  }

  const solveSummary = mergeSolveSummaries(
    summary,
    solveSummaryFromDisplayFields(outcome),
  ) ?? summary;
  return createEquationResultOutcome({
    ...outcome,
    solveBadges: dedupe([...(outcome.solveBadges ?? []), ...badges]),
    ...solveSummary,
  });
}

function withNestedRecursionBadges(badges: SolveBadge[] = []) {
  return dedupe<SolveBadge>([...badges, 'Nested Recursion']);
}

function compositionDepthLimitError(
  badges: SolveBadge[],
  solveSummary: DisplaySolveSummary,
) {
  return errorOutcome(
    'Solve',
    'This recognized composition family exceeds the current bounded three-step outer-inversion limit. Use Numeric Solve with a chosen interval in Equation mode.',
    [],
    [],
    withNestedRecursionBadges(badges),
    solveSummary,
  );
}


function recurseComposition(
  request: GuardedSolveRequest,
  equations: string[],
  depth: number,
  trail: Set<string>,
  executionBudget: EquationExecutionBudget,
  runGuardedEquationSolve: GuardedSolveRunner,
  badges: SolveBadge[],
  solveSummary: DisplaySolveSummary,
  domainConstraints: SolveDomainConstraint[] = [],
  unresolvedError?: string,
  extraSupplementLatex: string[] = [],
  extraDetailSections: DisplayDetailSection[] = [],
  periodicFamilyExtras?: Partial<PeriodicFamilyInfo>,
): ResultProducerDraft | null {
  const depthPolicy = resolveCompositionRecursionDepth(
    request.compositionInversionDepth ?? 0,
    executionBudget,
  );
  if (depthPolicy.kind === 'blocked') {
    return compositionDepthLimitError(badges, solveSummary);
  }
  const nextCompositionDepth = depthPolicy.nextDepth;

  const effectiveBadges = withNestedRecursionBadges(badges);
  if (depth >= executionBudget.maxRecursionDepth) {
    return errorOutcome(
      'Solve',
      'This equation exceeded the supported guarded-solve recursion depth for this milestone.',
      [],
      [],
      effectiveBadges,
      solveSummary,
    );
  }

  const parentKey = equationStateKey(request.resolvedLatex);
  const branchEquations = dedupe(equations).filter(
    (equationLatex) => equationStateKey(equationLatex) !== parentKey,
  );
  if (branchEquations.length === 0) {
    return null;
  }

  const recursiveCarriers = branchEquations.map((equationLatex) =>
    runGuardedEquationSolve(
      {
        ...request,
        originalLatex: equationLatex,
        resolvedLatex: equationLatex,
        validationLatex: request.validationLatex ?? request.resolvedLatex,
        compositionInversionDepth: nextCompositionDepth,
        numericInterval: undefined,
        domainConstraints: mergeConstraints(request.domainConstraints, domainConstraints),
      },
      depth + 1,
      new Set(trail),
    ));

  const mergedCarrier = recursiveCarriers.length === 1
    ? recursiveCarriers[0]
    : mergeEquationStageCarriers(recursiveCarriers, effectiveBadges, solveSummary);
  const merged = readEquationStageResultCarrier(mergedCarrier);

  const mergedPeriodicFamilyWithStructuredStop = (() => {
    const mergedFamily = mergePeriodicFamilyExtras(merged.periodicFamily, periodicFamilyExtras);
    if (
      merged.kind === 'error'
      && mergedFamily
      && !mergedFamily.structuredStopReason
      && periodicFamilyExtras?.piecewiseBranches?.length
    ) {
      return {
        ...mergedFamily,
        structuredStopReason: 'unsupported-sawtooth-closure',
      } satisfies PeriodicFamilyInfo;
    }
    return mergedFamily;
  })();

  if (merged.kind === 'error' && merged.error === UNSUPPORTED_FAMILY_ERROR && unresolvedError) {
    return errorOutcome(
      'Solve',
      unresolvedError,
      merged.warnings,
      merged.plannerBadges ?? [],
      dedupe<SolveBadge>([...(merged.solveBadges ?? []), ...effectiveBadges]),
      solveSummary,
      merged.rejectedCandidateCount,
      merged.substitutionDiagnostics,
      merged.numericMethod,
    );
  }

  if (merged.kind === 'error') {
    const supplements = mergeExactSupplementLatex(
      { latex: merged.exactSupplementLatex, source: 'legacy' },
      { latex: extraSupplementLatex, source: 'legacy' },
      { constraints: domainConstraints, source: 'transform' },
    );
    const detailSections = mergeDetailSections(merged.detailSections, extraDetailSections);
    return appendSolveMetadata(createEquationResultOutcome({
      ...merged,
      periodicFamily: mergedPeriodicFamilyWithStructuredStop,
      exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
      detailSections: detailSections.length > 0 ? detailSections : undefined,
    }), effectiveBadges, solveSummary);
  }

  const validationCandidates = collectOutcomeCandidates(merged);
  if (validationCandidates.length === 0) {
    const supplements = mergeExactSupplementLatex(
      { latex: merged.exactSupplementLatex, source: 'legacy' },
      { latex: extraSupplementLatex, source: 'legacy' },
      { constraints: domainConstraints, source: 'transform' },
    );
    const detailSections = mergeDetailSections(merged.detailSections, extraDetailSections);
    const mergedPeriodicFamily = mergePeriodicFamilyExtras(merged.periodicFamily, periodicFamilyExtras);
    if (
      mergedPeriodicFamily
      && isReducedCarrierExactFamily(mergedPeriodicFamily)
      && (mergedPeriodicFamily.piecewiseBranches?.length ?? 0) > 0
      && periodicFamilyExtras?.piecewiseBranches?.length
    ) {
      return createEquationResultOutcome({
        ...merged,
        periodicFamily: mergedPeriodicFamily,
        exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
        detailSections: detailSections.length > 0 ? detailSections : undefined,
        solveBadges: dedupe<SolveBadge>([...(merged.solveBadges ?? []), ...effectiveBadges]),
        ...proseSolveSummary(
          buildReducedCarrierSawtoothSummary(request.resolvedLatex, mergedPeriodicFamily),
        ),
      });
    }

    return appendSolveMetadata(createEquationResultOutcome({
      ...merged,
      periodicFamily: mergedPeriodicFamily,
      exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
      detailSections: detailSections.length > 0 ? detailSections : undefined,
    }), effectiveBadges, solveSummary);
  }

  const validation = validateCompositionCandidates(
    request.validationLatex ?? request.resolvedLatex,
    validationCandidates,
    mergeConstraints(request.domainConstraints, domainConstraints),
    request.angleUnit,
  );

  if (validation.accepted.length === 0) {
    const supplements = mergeExactSupplementLatex(
      { latex: merged.exactSupplementLatex, source: 'legacy' },
      { latex: extraSupplementLatex, source: 'legacy' },
      { constraints: domainConstraints, source: 'transform' },
    );
    const detailSections = mergeDetailSections(merged.detailSections, extraDetailSections);
    const extraneousEvidence = extraneousEvidenceFromRejectedCandidates(validation.rejected, {
      exactCandidatesLatex: extractExactSolutions(merged.exactLatex),
    });
    return createEquationResultOutcome({
      kind: 'error',
      title: 'Solve',
      error: compositionRejectionMessage(validation.rejected, domainConstraints),
      exactLatex: merged.exactLatex,
      periodicFamily: mergedPeriodicFamilyWithStructuredStop,
      exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
      approxText: merged.approxText,
      detailSections: appendExtraneousSolutionsDetailSection(
        detailSections.length > 0 ? detailSections : undefined,
        extraneousEvidence,
      ),
      warnings: merged.warnings,
      plannerBadges: merged.plannerBadges ?? [],
      solveBadges: dedupe<SolveBadge>([...(merged.solveBadges ?? []), ...effectiveBadges, 'Candidate Checked']),
      ...solveSummary,
      rejectedCandidateCount: validation.rejected.length,
      substitutionDiagnostics: merged.substitutionDiagnostics,
      numericMethod: merged.numericMethod,
    });
  }

  const acceptedExactLatex = matchAcceptedExactSolutions(merged.exactLatex, validation.accepted);
  const exactLatex = acceptedExactLatex.length === validation.accepted.length
    && acceptedExactLatex.length > 0
    && acceptedExactLatex.every((value) => !isApproximateOnlySolutionLatex(value))
      ? solutionsToLatex('x', acceptedExactLatex)
      : undefined;
  const branchReadback = exactLatex && acceptedExactLatex.length >= 2
    ? finiteBranchReadbackMetadata({
      targetLatex: 'x',
      relationLatex: '\\in',
      branchesLatex: acceptedExactLatex,
      source: 'equation-composition-candidate-validation',
    })
    : finiteBranchReadbackMetadata({
      targetLatex: 'x',
      relationLatex: '\\approx',
      branchesLatex: validation.accepted.map((value) => formatApproxNumber(value)),
      source: 'equation-composition-candidate-validation',
    });

  const supplements = mergeExactSupplementLatex(
    { latex: merged.exactSupplementLatex, source: 'legacy' },
    { latex: extraSupplementLatex, source: 'legacy' },
    { constraints: domainConstraints, source: 'transform' },
  );
  const detailSections = mergeDetailSections(merged.detailSections, extraDetailSections);
  const extraneousEvidence = extraneousEvidenceFromRejectedCandidates(validation.rejected, {
    exactCandidatesLatex: extractExactSolutions(merged.exactLatex),
  });

  return createEquationResultOutcome({
    kind: 'success',
    title: 'Solve',
    exactLatex,
    branchReadback,
    periodicFamily: mergePeriodicFamilyExtras(merged.periodicFamily, periodicFamilyExtras),
    exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
    approxText: `x ~= ${validation.accepted.map((value) => formatApproxNumber(value)).join(', ')}`,
    detailSections: appendExtraneousSolutionsDetailSection(
      detailSections.length > 0 ? detailSections : undefined,
      extraneousEvidence,
    ),
    warnings: merged.warnings,
    resultOrigin: 'symbolic',
    plannerBadges: merged.plannerBadges ?? [],
    solveBadges: dedupe<SolveBadge>([...(merged.solveBadges ?? []), ...effectiveBadges, 'Candidate Checked']),
    ...(mergeSolveSummaries(solveSummary, solveSummaryFromDisplayFields(merged)) ?? solveSummary),
    candidateValues: validation.accepted,
    rejectedCandidateCount: validation.rejected.length > 0 ? validation.rejected.length : merged.rejectedCandidateCount,
    substitutionDiagnostics: merged.substitutionDiagnostics,
    numericMethod: merged.numericMethod,
  });
}

function compositionSolve(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  executionBudget: EquationExecutionBudget,
  runGuardedEquationSolve: GuardedSolveRunner,
): ResultProducerDraft | null {
  const nestedContextBadges = (request.compositionInversionDepth ?? 0) > 0
    ? ['Nested Recursion'] as SolveBadge[]
    : [];
  let parsed: unknown;
  try {
    parsed = normalizeAst(ce.parse(request.resolvedLatex).json);
  } catch {
    return null;
  }

  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const attempts: Array<{ composite: unknown; target: unknown }> = [
    { composite: parsed[1], target: parsed[2] },
    { composite: parsed[2], target: parsed[1] },
  ];

  for (const attempt of attempts) {
    const target = parseNumericTarget(attempt.target);
    if (!target) {
      continue;
    }

    const trigBranches = matchTrigBranches(attempt.composite, target, request.angleUnit);
    if (trigBranches?.kind === 'impossible') {
      return errorOutcome(
        'Solve',
        trigBranches.error,
        [],
        [],
        dedupe<SolveBadge>(['Range Guard', ...(trigBranches.solveBadges ?? []), ...nestedContextBadges]),
        trigBranches,
      );
    }
    if (trigBranches?.kind === 'unresolved') {
      const periodic = solveTrigPeriodicFamily(attempt.composite, target, request, executionBudget);
      if (periodic?.kind === 'solved') {
        const badges = periodicFamilyBadges(attempt.composite, nestedContextBadges, periodic.solveBadges);
        const supplements = buildPeriodicOutcomeSupplements(periodic);
        return profileEquationResult(createEquationResultOutcome({
          kind: 'success',
          title: 'Solve',
          exactLatex: periodicFamilyToExactLatex(periodic.family),
          periodicFamily: periodic.family,
          exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
          warnings: [],
          resultOrigin: 'symbolic',
          plannerBadges: [],
          solveBadges: badges,
          ...proseSolveSummary(buildPeriodicSolveSummary(
            boxLatex(normalizeAst(attempt.composite)),
            target.latex,
            periodic,
            'yields',
          )),
        }));
      }
      if (periodic?.kind === 'guided') {
        const badges = periodicFamilyBadges(attempt.composite, nestedContextBadges, periodic.solveBadges);
        const supplements = buildPeriodicOutcomeSupplements(periodic);
        return profileEquationResult(createEquationResultOutcome({
          kind: 'error',
          title: 'Solve',
          error: periodic.error,
          exactLatex: periodicFamilyToExactLatex(periodic.family),
          periodicFamily: periodic.family,
          exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
          warnings: [],
          plannerBadges: [],
          solveBadges: badges,
          ...proseSolveSummary(buildPeriodicSolveSummary(
            boxLatex(normalizeAst(attempt.composite)),
            target.latex,
            periodic,
            'reduces to',
          )),
        }));
      }

      return errorOutcome(
        'Solve',
        trigBranches.error,
        [],
        [],
        dedupe<SolveBadge>(['Composition Branch', ...(trigBranches.solveBadges ?? []), ...nestedContextBadges]),
        trigBranches,
      );
    }
    if (trigBranches?.kind === 'branches') {
      const branchSet = buildCompositionBranchSet(trigBranches.equations);
      const discoveredFamilies = dedupe(branchSet.equations);
      const recursive = recurseComposition(
        request,
        branchSet.equations,
        depth,
        trail,
        executionBudget,
        runGuardedEquationSolve,
        dedupe<SolveBadge>(['Composition Branch', ...(trigBranches.solveBadges ?? [])]),
        trigBranches,
        [],
        'This recognized composition family leaves infinitely many or currently unsupported inverse branches. Use Numeric Solve with a chosen interval.',
        [],
        [],
        { discoveredFamilies },
      );
      if (recursive) {
        return recursive;
      }
    }

    const periodic = solveTrigPeriodicFamily(attempt.composite, target, request, executionBudget);
    if (periodic?.kind === 'solved') {
      const badges = periodicFamilyBadges(attempt.composite, nestedContextBadges, periodic.solveBadges);
      const supplements = buildPeriodicOutcomeSupplements(periodic);
      return profileEquationResult(createEquationResultOutcome({
        kind: 'success',
        title: 'Solve',
        exactLatex: periodicFamilyToExactLatex(periodic.family),
        periodicFamily: periodic.family,
        exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
        warnings: [],
        resultOrigin: 'symbolic',
        plannerBadges: [],
        solveBadges: badges,
        ...proseSolveSummary(buildPeriodicSolveSummary(
          boxLatex(normalizeAst(attempt.composite)),
          target.latex,
          periodic,
          'yields',
        )),
      }));
    }
    if (periodic?.kind === 'guided') {
      const badges = periodicFamilyBadges(attempt.composite, nestedContextBadges, periodic.solveBadges);
      const supplements = buildPeriodicOutcomeSupplements(periodic);
      return profileEquationResult(createEquationResultOutcome({
        kind: 'error',
        title: 'Solve',
        error: periodic.error,
        exactLatex: periodicFamilyToExactLatex(periodic.family),
        periodicFamily: periodic.family,
        exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
        warnings: [],
        plannerBadges: [],
        solveBadges: badges,
        ...proseSolveSummary(buildPeriodicSolveSummary(
          boxLatex(normalizeAst(attempt.composite)),
          target.latex,
          periodic,
          'reduces to',
        )),
      }));
    }

    const transform = matchNonPeriodicTransform(attempt.composite, target, request.angleUnit);
    if (!transform) {
      continue;
    }

    if (transform.equations.length === 0) {
      const blocked = errorOutcome(
        'Solve',
        transform.unresolvedError,
        [],
        [],
        dedupe<SolveBadge>([...transform.solveBadges, ...nestedContextBadges]),
        solveSummaryFromDisplayFields(transform),
      );
      if (blocked.kind !== 'error') {
        return blocked;
      }
      const supplements = mergeExactSupplementLatex(
        { latex: transform.exactSupplementLatex, source: 'transform' },
        { constraints: transform.domainConstraints, source: 'transform' },
      );
      return createEquationResultOutcome({
        ...blocked,
        periodicFamily: mergePeriodicFamilyExtras(undefined, transform.periodicFamilyExtras),
        exactSupplementLatex: supplements.length > 0 ? supplements : undefined,
        detailSections: transform.detailSections?.length ? transform.detailSections : undefined,
      });
    }

    const transformSummary = solveSummaryFromDisplayFields(transform);
    if (!transformSummary) {
      throw new Error('Non-periodic transform with branches must declare solve-summary intent.');
    }

    const recursive = recurseComposition(
      request,
      transform.equations,
      depth,
      trail,
      executionBudget,
      runGuardedEquationSolve,
      transform.solveBadges,
      transformSummary,
      transform.domainConstraints,
      transform.unresolvedError,
      transform.exactSupplementLatex,
      transform.detailSections,
      transform.periodicFamilyExtras,
    );
    if (recursive) {
      return recursive;
    }
  }

  return null;
}

export { compositionSolve };
