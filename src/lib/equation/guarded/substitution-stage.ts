import { ComputeEngine } from '@cortex-js/compute-engine';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber, solutionsToLatex } from '../../display/format';
import { buildConstraintSupplementLatex, mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import { matchSubstitutionSolve } from '../substitution-solve';
import { validateCandidateRoots } from '../candidate-validation';
import {
  buildEquationCandidateRejectionMessage,
  classifyCandidateRejections,
} from '../candidate-rejection';
import {
  appendExtraneousSolutionsDetailSection,
  extraneousEvidenceFromRejectedCandidates,
} from '../candidate/extraneous';
import { createBranchSet } from '../../algebra/branch-core';
import type {
  DisplayOutcome,
  EquationExecutionBudget,
  GuardedSolveRequest,
  SerializableMathJson,
} from '../../../types/calculator';
import type {
  GuardedEquationCooperativeCheckpoint,
} from './run';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
} from './outcome';
import {
  dedupe,
  extractApproxSolutions,
  extractExactSolutions,
  mergeEquationStageCarriers,
} from './merge';
import { equationStateKey } from './state-key';
import { solveSummaryFromDisplayFields } from '../../display/result-detail-lines';
import {
  createEquationResultOutcome,
  type EquationResultProducerInput,
} from '../solve-result/producer';
import {
  equationMathValuesFromOwnedLeaves,
  equationOwnedMathJsonLeavesFromDocument,
  inferEquationMathJsonRoute,
  type EquationOwnedMathJsonLeaf,
} from '../solve-result/math-values';
import {
  buildEquationStageResultCarrier,
  readEquationStageResultCarrier,
  type EquationStageResultCarrierV1,
} from '../solve-result/stage-carrier';

const ce = new ComputeEngine();
const EXACT_MATCH_TOLERANCE = 1e-6;

function rebuildSubstitutionOutcome(
  input: EquationResultProducerInput,
  source: EquationStageResultCarrierV1,
  additionalLeaves: readonly EquationOwnedMathJsonLeaf[] = [],
) {
  const leaves = [
    ...equationOwnedMathJsonLeavesFromDocument(
      source.document,
      'equation-substitution-validation-input',
    ),
    ...additionalLeaves,
  ];
  return buildEquationStageResultCarrier(createEquationResultOutcome(input, {
    mathValues: equationMathValuesFromOwnedLeaves({
      outcome: input,
      routeId: inferEquationMathJsonRoute(input),
      leaves,
    }),
  }));
}

function acceptedCanonicalEvidence(
  source: EquationStageResultCarrierV1,
  exactLatex: string | undefined,
  acceptedLatex: readonly string[],
) {
  if (!exactLatex) return undefined;
  const sourceLeaves = equationOwnedMathJsonLeavesFromDocument(
    source.document,
    'equation-substitution-accepted-input',
  );
  const nodes = acceptedLatex.map((latex) =>
    sourceLeaves.find((leaf) => leaf.canonicalLatex === latex)?.mathJson);
  if (nodes.some((node) => node === undefined)) return undefined;
  const mathJson: SerializableMathJson = nodes.length === 1
    ? ['Equal', 'x', nodes[0] as SerializableMathJson]
    : ['Element', 'x', ['Set', ...nodes] as SerializableMathJson];
  return {
    canonicalMath: { version: 1 as const, canonicalLatex: exactLatex, mathJson },
    leaves: [{
      canonicalLatex: exactLatex,
      mathJson,
      source: 'equation-substitution-accepted-result',
    }],
  };
}

function rejectedCandidateEvidence(
  sources: readonly EquationStageResultCarrierV1[],
  rejected: ReturnType<typeof validateCandidateRoots>['rejected'],
  exactCandidatesLatex: readonly string[],
) {
  const evidence = extraneousEvidenceFromRejectedCandidates(rejected, { exactCandidatesLatex });
  const nativeCandidates = sources.flatMap((source, sourceIndex) => {
    const sourceLeaves = equationOwnedMathJsonLeavesFromDocument(
      source.document,
      `equation-substitution-rejected-input:${sourceIndex}`,
    );
    const answerRoot = source.document.primaryMath?.mathJson;
    const answerNodes: unknown[] = Array.isArray(answerRoot)
      && answerRoot[0] === 'Equal'
      && answerRoot.length === 3
        ? [answerRoot[2]]
        : Array.isArray(answerRoot)
          && answerRoot[0] === 'Element'
          && Array.isArray(answerRoot[2])
          && answerRoot[2][0] === 'Set'
            ? answerRoot[2].slice(1)
            : [];
    return [
      ...sourceLeaves.map((leaf) => ({ mathJson: leaf.mathJson, source: leaf.source })),
      ...answerNodes.map((mathJson, index) => ({
        mathJson,
        source: `equation-substitution-rejected-answer:${sourceIndex}:${index}`,
      })),
    ];
  });
  const leaves = evidence.flatMap((entry): EquationOwnedMathJsonLeaf[] => {
    if (!entry.candidateLatex || entry.approxValue === undefined) return [];
    const native = nativeCandidates.find((leaf) => {
      try {
        const numeric = ce.box(leaf.mathJson as Parameters<typeof ce.box>[0]).N?.().json;
        const value = typeof numeric === 'number'
          ? numeric
          : numeric && typeof numeric === 'object' && 'num' in numeric
            ? Number((numeric as { num: string }).num)
            : Number.NaN;
        return Number.isFinite(value)
          && Math.abs(value - entry.approxValue!) <= EXACT_MATCH_TOLERANCE;
      } catch {
        return false;
      }
    });
    return native
      ? [{
          canonicalLatex: entry.candidateLatex,
          mathJson: native.mathJson,
          source: `${native.source}:rejected-candidate`,
        }]
      : [];
  });
  return { evidence, leaves };
}

type GuardedSolveRunner = (
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
) => DisplayOutcome;

type AsyncGuardedSolveRunner = (
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
) => Promise<DisplayOutcome>;

function parseFiniteNumericValue(latex: string) {
  try {
    const numeric = ce.parse(latex).N?.().json;
    if (typeof numeric === 'number' && Number.isFinite(numeric)) {
      return numeric;
    }
    if (numeric && typeof numeric === 'object' && 'num' in numeric) {
      const parsed = Number((numeric as { num: string }).num);
      return Number.isFinite(parsed) ? parsed : null;
    }
  } catch {
    return null;
  }

  return null;
}

function matchAcceptedExactSolutions(exactLatex: string | undefined, accepted: number[]) {
  if (!exactLatex || accepted.length === 0) {
    return [] as string[];
  }

  const exactCandidates = dedupe(extractExactSolutions(exactLatex))
    .map((latex) => ({
      latex,
      numeric: parseFiniteNumericValue(latex),
    }))
    .filter((candidate): candidate is { latex: string; numeric: number } => candidate.numeric !== null);

  if (exactCandidates.length === 0) {
    return [] as string[];
  }

  const used = new Set<number>();
  const matched: string[] = [];

  for (const acceptedValue of accepted) {
    const candidateIndex = exactCandidates.findIndex((candidate, index) =>
      !used.has(index)
      && Math.abs(candidate.numeric - acceptedValue) <= EXACT_MATCH_TOLERANCE);
    if (candidateIndex < 0) {
      return [] as string[];
    }
    used.add(candidateIndex);
    matched.push(exactCandidates[candidateIndex].latex);
  }

  return matched;
}

function isApproximateOnlySolutionLatex(latex: string) {
  const normalized = latex.replaceAll('\\,', '').replaceAll(' ', '').trim();
  return /^[+-]?(?:\d+\.\d*|\d*\.\d+|\d+e[+-]?\d+)$/i.test(normalized);
}

function branchReadbackForValidatedCandidates(
  acceptedLatex: string[],
  acceptedValues: number[],
  exactLatex: string | undefined,
  source: string,
) {
  if (exactLatex && acceptedLatex.length >= 2) {
    return finiteBranchReadbackMetadata({
      targetLatex: 'x',
      relationLatex: '\\in',
      branchesLatex: acceptedLatex,
      source,
    });
  }

  const approximateBranches = acceptedValues.map((value) => formatApproxNumber(value));
  return finiteBranchReadbackMetadata({
    targetLatex: 'x',
    relationLatex: '\\approx',
    branchesLatex: approximateBranches,
    source,
  });
}

function substitutionSolve(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  executionBudget: EquationExecutionBudget,
  runGuardedEquationSolve: GuardedSolveRunner,
): DisplayOutcome | null {
  const substitution = matchSubstitutionSolve(request.resolvedLatex, request.angleUnit);
  if (substitution.kind === 'none') {
    return null;
  }

  if (substitution.kind === 'blocked') {
    return errorOutcome('Solve', substitution.error);
  }

  if (depth >= executionBudget.maxRecursionDepth) {
    return errorOutcome(
      'Solve',
      'This equation exceeded the supported guarded-solve recursion depth for this milestone.',
      [],
      [],
      substitution.solveBadges,
      substitution,
      undefined,
      substitution.diagnostics,
    );
  }

  const parentKey = equationStateKey(request.resolvedLatex);
  const branchEquations = createBranchSet({
    equations: substitution.equations,
    constraints: substitution.domainConstraints,
    provenance: 'guarded-substitution-stage',
  }).equations.filter(
    (equationLatex) => equationStateKey(equationLatex) !== parentKey,
  );

  if (branchEquations.length === 0) {
    return null;
  }

  const carriers = branchEquations.map((equationLatex) =>
    buildEquationStageResultCarrier(runGuardedEquationSolve({
      ...request,
      originalLatex: equationLatex,
      resolvedLatex: equationLatex,
      numericInterval: undefined,
    }, depth + 1, new Set(trail))));

  const mergedCarrier = mergeEquationStageCarriers(
    carriers,
    substitution.solveBadges,
    substitution,
    substitution.diagnostics,
  );
  const merged = readEquationStageResultCarrier(mergedCarrier);
  const substitutionSupplementLatex = buildConstraintSupplementLatex(
    substitution.domainConstraints,
    'transform',
  );

  const isSubstitutionUnsupported =
    merged.kind === 'error'
    && merged.error === UNSUPPORTED_FAMILY_ERROR;

  if (isSubstitutionUnsupported && substitution.diagnostics?.family === 'log-mixed-base') {
    return errorOutcome(
      'Solve',
      'This recognized mixed-base log family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
      merged.warnings,
      merged.plannerBadges ?? [],
      dedupe([...(merged.solveBadges ?? []), 'Log Base Normalize']),
      substitution,
      merged.rejectedCandidateCount,
      substitution.diagnostics,
      merged.numericMethod,
    );
  }

  if (isSubstitutionUnsupported && substitution.diagnostics?.family === 'trig-sum-product') {
    return errorOutcome(
      'Solve',
      'This recognized trig sum-to-product family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
      merged.warnings,
      merged.plannerBadges ?? [],
      dedupe([...(merged.solveBadges ?? []), 'Trig Sum-Product']),
      substitution,
      merged.rejectedCandidateCount,
      substitution.diagnostics,
      merged.numericMethod,
    );
  }

  if (merged.kind !== 'success' || !substitution.domainConstraints || substitution.domainConstraints.length === 0) {
    return merged;
  }

  const exactCandidates = dedupe([
    ...extractExactSolutions(merged.exactLatex),
  ])
    .map((value) => parseFiniteNumericValue(value))
    .filter((value): value is number => value !== null);

  const candidateValues = dedupe(merged.candidateValues ?? []);

  const approxCandidates = exactCandidates.length === 0 && candidateValues.length === 0
    ? dedupe(extractApproxSolutions(merged.approxText))
      .map((value) => parseFiniteNumericValue(value))
      .filter((value): value is number => value !== null)
    : [];

  const validationCandidates = exactCandidates.length > 0
    ? exactCandidates
    : (candidateValues.length > 0 ? candidateValues : approxCandidates);

  if (validationCandidates.length === 0) {
    return merged;
  }

  const validation = validateCandidateRoots(
    request.resolvedLatex,
    validationCandidates,
    substitution.domainConstraints,
    'symbolic-substitution',
    request.angleUnit,
  );

  if (validation.accepted.length === 0) {
    const rejectedEvidence = rejectedCandidateEvidence(
      carriers,
      validation.rejected,
      extractExactSolutions(merged.exactLatex),
    );
    const outcome = errorOutcome(
      'Solve',
      buildEquationCandidateRejectionMessage(
        classifyCandidateRejections(validation.rejected, substitution.domainConstraints),
      ),
      merged.warnings,
      merged.plannerBadges ?? [],
      dedupe([...(merged.solveBadges ?? []), 'Candidate Checked']),
      solveSummaryFromDisplayFields(merged) ?? substitution,
      validation.rejected.length,
      substitution.diagnostics,
      merged.numericMethod,
    );
    const producerInput: EquationResultProducerInput = {
      ...outcome,
      detailSections: appendExtraneousSolutionsDetailSection(
        outcome.detailSections,
        rejectedEvidence.evidence,
      ),
    };
    const carrier = rebuildSubstitutionOutcome(
      producerInput,
      mergedCarrier,
      rejectedEvidence.leaves,
    );
    return readEquationStageResultCarrier(carrier);
  }

  const acceptedExactLatex = matchAcceptedExactSolutions(merged.exactLatex, validation.accepted);
  const acceptedLatex = acceptedExactLatex.length === validation.accepted.length
    ? acceptedExactLatex
    : [];
  const exactLatex = acceptedLatex.length > 0 && acceptedLatex.every((value) => !isApproximateOnlySolutionLatex(value))
    ? solutionsToLatex('x', acceptedLatex)
    : undefined;
  const formattedAccepted = validation.accepted.map((value) => formatApproxNumber(value));
  const rejectedEvidence = rejectedCandidateEvidence(
    carriers,
    validation.rejected,
    extractExactSolutions(merged.exactLatex),
  );

  const acceptedEvidence = acceptedCanonicalEvidence(mergedCarrier, exactLatex, acceptedLatex);
  const producerInput: EquationResultProducerInput = {
    kind: 'success',
    title: 'Solve',
    exactLatex,
    ...(acceptedEvidence ? { canonicalMath: acceptedEvidence.canonicalMath } : {}),
    branchReadback: branchReadbackForValidatedCandidates(
      acceptedLatex,
      validation.accepted,
      exactLatex,
      'equation-substitution-candidate-validation',
    ),
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: merged.exactSupplementLatex, source: 'legacy' },
      { latex: substitutionSupplementLatex, source: 'transform' },
    ),
    approxText: `x ~= ${formattedAccepted.join(', ')}`,
    warnings: merged.warnings,
    resultOrigin: 'symbolic',
    plannerBadges: merged.plannerBadges ?? [],
    solveBadges: dedupe([...(merged.solveBadges ?? []), 'Candidate Checked']),
    ...(solveSummaryFromDisplayFields(merged) ?? substitution),
    candidateValues: validation.accepted,
    rejectedCandidateCount: validation.rejected.length > 0 ? validation.rejected.length : merged.rejectedCandidateCount,
    detailSections: appendExtraneousSolutionsDetailSection(
      merged.detailSections,
      rejectedEvidence.evidence,
    ),
    substitutionDiagnostics: substitution.diagnostics,
    numericMethod: merged.numericMethod,
  };
  const resultCarrier = rebuildSubstitutionOutcome(
    producerInput,
    mergedCarrier,
    [...(acceptedEvidence?.leaves ?? []), ...rejectedEvidence.leaves],
  );
  return readEquationStageResultCarrier(resultCarrier);
}

async function substitutionSolveAsync(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  executionBudget: EquationExecutionBudget,
  runGuardedEquationSolve: AsyncGuardedSolveRunner,
  checkpoint: GuardedEquationCooperativeCheckpoint,
): Promise<DisplayOutcome | null> {
  const substitution = matchSubstitutionSolve(request.resolvedLatex, request.angleUnit);
  if (substitution.kind === 'none') {
    return null;
  }

  if (substitution.kind === 'blocked') {
    return errorOutcome('Solve', substitution.error);
  }

  if (depth >= executionBudget.maxRecursionDepth) {
    return errorOutcome(
      'Solve',
      'This equation exceeded the supported guarded-solve recursion depth for this milestone.',
      [],
      [],
      substitution.solveBadges,
      substitution,
      undefined,
      substitution.diagnostics,
    );
  }

  const parentKey = equationStateKey(request.resolvedLatex);
  const branchEquations = createBranchSet({
    equations: substitution.equations,
    constraints: substitution.domainConstraints,
    provenance: 'guarded-substitution-stage',
  }).equations.filter(
    (equationLatex) => equationStateKey(equationLatex) !== parentKey,
  );

  if (branchEquations.length === 0) {
    return null;
  }

  const carriers: EquationStageResultCarrierV1[] = [];
  for (const [branchIndex, equationLatex] of branchEquations.entries()) {
    const cancellation = await checkpoint({
      helperId: 'substitution',
      family: substitution.diagnostics?.family,
      branchIndex,
      message: `Preparing substitution branch ${branchIndex + 1} of ${branchEquations.length}.`,
    });
    if (cancellation) {
      return cancellation;
    }

    carriers.push(buildEquationStageResultCarrier(await runGuardedEquationSolve({
      ...request,
      originalLatex: equationLatex,
      resolvedLatex: equationLatex,
      numericInterval: undefined,
    }, depth + 1, new Set(trail))));
  }

  const mergedCarrier = mergeEquationStageCarriers(
    carriers,
    substitution.solveBadges,
    substitution,
    substitution.diagnostics,
  );
  const merged = readEquationStageResultCarrier(mergedCarrier);
  const substitutionSupplementLatex = buildConstraintSupplementLatex(
    substitution.domainConstraints,
    'transform',
  );

  const isSubstitutionUnsupported =
    merged.kind === 'error'
    && merged.error === UNSUPPORTED_FAMILY_ERROR;

  if (isSubstitutionUnsupported && substitution.diagnostics?.family === 'log-mixed-base') {
    return errorOutcome(
      'Solve',
      'This recognized mixed-base log family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
      merged.warnings,
      merged.plannerBadges ?? [],
      dedupe([...(merged.solveBadges ?? []), 'Log Base Normalize']),
      substitution,
      merged.rejectedCandidateCount,
      substitution.diagnostics,
      merged.numericMethod,
    );
  }

  if (isSubstitutionUnsupported && substitution.diagnostics?.family === 'trig-sum-product') {
    return errorOutcome(
      'Solve',
      'This recognized trig sum-to-product family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
      merged.warnings,
      merged.plannerBadges ?? [],
      dedupe([...(merged.solveBadges ?? []), 'Trig Sum-Product']),
      substitution,
      merged.rejectedCandidateCount,
      substitution.diagnostics,
      merged.numericMethod,
    );
  }

  if (merged.kind !== 'success' || !substitution.domainConstraints || substitution.domainConstraints.length === 0) {
    return merged;
  }

  const exactCandidates = dedupe([
    ...extractExactSolutions(merged.exactLatex),
  ])
    .map((value) => parseFiniteNumericValue(value))
    .filter((value): value is number => value !== null);

  const candidateValues = dedupe(merged.candidateValues ?? []);

  const approxCandidates = exactCandidates.length === 0 && candidateValues.length === 0
    ? dedupe(extractApproxSolutions(merged.approxText))
      .map((value) => parseFiniteNumericValue(value))
      .filter((value): value is number => value !== null)
    : [];

  const validationCandidates = exactCandidates.length > 0
    ? exactCandidates
    : (candidateValues.length > 0 ? candidateValues : approxCandidates);

  if (validationCandidates.length === 0) {
    return merged;
  }

  for (const [candidateIndex] of validationCandidates.entries()) {
    const cancellation = await checkpoint({
      helperId: 'candidate-validation',
      family: substitution.diagnostics?.family,
      candidateIndex,
      message: `Preparing substitution candidate ${candidateIndex + 1} of ${validationCandidates.length}.`,
    });
    if (cancellation) {
      return cancellation;
    }
  }

  const validation = validateCandidateRoots(
    request.resolvedLatex,
    validationCandidates,
    substitution.domainConstraints,
    'symbolic-substitution',
    request.angleUnit,
  );

  if (validation.accepted.length === 0) {
    const rejectedEvidence = rejectedCandidateEvidence(
      carriers,
      validation.rejected,
      extractExactSolutions(merged.exactLatex),
    );
    const outcome = errorOutcome(
      'Solve',
      buildEquationCandidateRejectionMessage(
        classifyCandidateRejections(validation.rejected, substitution.domainConstraints),
      ),
      merged.warnings,
      merged.plannerBadges ?? [],
      dedupe([...(merged.solveBadges ?? []), 'Candidate Checked']),
      solveSummaryFromDisplayFields(merged) ?? substitution,
      validation.rejected.length,
      substitution.diagnostics,
      merged.numericMethod,
    );
    const producerInput: EquationResultProducerInput = {
      ...outcome,
      detailSections: appendExtraneousSolutionsDetailSection(
        outcome.detailSections,
        rejectedEvidence.evidence,
      ),
    };
    const carrier = rebuildSubstitutionOutcome(
      producerInput,
      mergedCarrier,
      rejectedEvidence.leaves,
    );
    return readEquationStageResultCarrier(carrier);
  }

  const acceptedExactLatex = matchAcceptedExactSolutions(merged.exactLatex, validation.accepted);
  const acceptedLatex = acceptedExactLatex.length === validation.accepted.length
    ? acceptedExactLatex
    : [];
  const exactLatex = acceptedLatex.length > 0 && acceptedLatex.every((value) => !isApproximateOnlySolutionLatex(value))
    ? solutionsToLatex('x', acceptedLatex)
    : undefined;
  const formattedAccepted = validation.accepted.map((value) => formatApproxNumber(value));
  const rejectedEvidence = rejectedCandidateEvidence(
    carriers,
    validation.rejected,
    extractExactSolutions(merged.exactLatex),
  );

  const acceptedEvidence = acceptedCanonicalEvidence(mergedCarrier, exactLatex, acceptedLatex);
  const producerInput: EquationResultProducerInput = {
    kind: 'success',
    title: 'Solve',
    exactLatex,
    ...(acceptedEvidence ? { canonicalMath: acceptedEvidence.canonicalMath } : {}),
    branchReadback: branchReadbackForValidatedCandidates(
      acceptedLatex,
      validation.accepted,
      exactLatex,
      'equation-substitution-candidate-validation',
    ),
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: merged.exactSupplementLatex, source: 'legacy' },
      { latex: substitutionSupplementLatex, source: 'transform' },
    ),
    approxText: `x ~= ${formattedAccepted.join(', ')}`,
    warnings: merged.warnings,
    resultOrigin: 'symbolic',
    plannerBadges: merged.plannerBadges ?? [],
    solveBadges: dedupe([...(merged.solveBadges ?? []), 'Candidate Checked']),
    ...(solveSummaryFromDisplayFields(merged) ?? substitution),
    candidateValues: validation.accepted,
    rejectedCandidateCount: validation.rejected.length > 0 ? validation.rejected.length : merged.rejectedCandidateCount,
    detailSections: appendExtraneousSolutionsDetailSection(
      merged.detailSections,
      rejectedEvidence.evidence,
    ),
    substitutionDiagnostics: substitution.diagnostics,
    numericMethod: merged.numericMethod,
  };
  const resultCarrier = rebuildSubstitutionOutcome(
    producerInput,
    mergedCarrier,
    [...(acceptedEvidence?.leaves ?? []), ...rejectedEvidence.leaves],
  );
  return readEquationStageResultCarrier(resultCarrier);
}

export { substitutionSolve, substitutionSolveAsync };
