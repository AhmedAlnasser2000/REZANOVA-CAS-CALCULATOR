import { ComputeEngine } from '@cortex-js/compute-engine';
import { readExactScalarNode } from '../../algebra/polynomial-core';
import { recognizeBoundedPolynomialEquationAst, solveBoundedPolynomialEquationAst } from '../../algebra/polynomial-factor-solve';
import { factorMixedCarrierAst } from '../../symbolic-engine/mixed-factor';
import { dependsOnVariable, flattenMultiply, isNodeArray as isPatternNodeArray } from '../../symbolic-engine/patterns';
import { solveBoundedPolynomialCarrierEquationAst } from '../polynomial-carrier-follow-on';
import { validateCandidateRoots } from '../candidate-validation';
import {
  buildEquationCandidateRejectionMessage,
  classifyCandidateRejections,
} from '../candidate-rejection';
import {
  appendExtraneousSolutionsDetailSection,
  extraneousEvidenceFromRejectedCandidates,
} from '../candidate/extraneous';
import {
  adaptBoundedPolynomialSolveResultToRootSet,
  createExactFiniteRoot,
  createRootSet,
  rootSetToBranchReadback,
  rootSetToCanonicalMath,
  rootSetToExactLatex,
} from '../roots/representation';
import { solutionsToLatex } from '../../display/format';
import type {
  ResultProducerDraft,
  GuardedSolveRequest,
} from '../../../types/calculator';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
} from './outcome';
import { mergeEquationStageCarriers } from './merge';
import { proseSolveSummary } from '../../display/result-detail-lines';
import type { GuardedSolveRunner } from './types';
import {
  NUMERIC_MATCH_TOLERANCE,
  branchReadbackForAcceptedCandidates,
  formatAcceptedApproximations,
  isApproximateOnlySolutionLatex,
  isMathJsonArray,
} from './request-prep';
import { profileEquationResult } from '../../display/printer';
import {
  createEquationResultOutcome,
  type EquationResultProducerInput,
} from '../solve-result/producer';
import {
  readEquationStageResultCarrier,
  type EquationStageResultCarrierV1,
} from '../solve-result/stage-carrier';
import {
  equationMathValuesWithOwnedReadback,
  inferEquationMathJsonRoute,
} from '../solve-result/owned-readback-math';
import { tryProvenCanonicalMathValue } from '../../result-contract';

const ce = new ComputeEngine();

function provenCarrierRootLeaves(
  roots: Array<{ latex: string; node?: unknown }>,
  source: string,
) {
  return roots.flatMap((root, index) => {
    if (root.node === undefined) return [];
    const leafSource = `${source}:${index}`;
    const proof = tryProvenCanonicalMathValue({
      canonicalLatex: root.latex,
      mathJson: root.node,
      owner: 'equation',
      routeId: 'equation.polynomial',
      source: leafSource,
    });
    return proof
      ? [{ canonicalLatex: root.latex, mathJson: root.node, source: leafSource }]
      : [];
  });
}

function provenCarrierCanonicalMath(
  primaryMath: ReturnType<typeof rootSetToCanonicalMath>,
  canonicalLatex: string | undefined,
  source: string,
) {
  if (!primaryMath || !canonicalLatex || primaryMath.mathJson === undefined) return undefined;
  return tryProvenCanonicalMathValue({
    canonicalLatex,
    mathJson: primaryMath.mathJson,
    owner: 'equation',
    routeId: 'equation.polynomial',
    source,
  })
    ? { ...primaryMath, canonicalLatex }
    : undefined;
}

function shouldAttemptPolynomialCarrierFollowOn(request: GuardedSolveRequest) {
  return (request.radicalTransformDepth ?? 0) > 0
    || (request.compositionInversionDepth ?? 0) > 0
    || (request.repeatedClearingDepth ?? 0) > 0
    || (request.polynomialCarrierHints?.length ?? 0) > 0;
}

function unwrapFactorNode(node: unknown): unknown {
  if (
    isPatternNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
  ) {
    const exponent = readExactScalarNode(node[2]);
    if (exponent && exponent.denominator === 1 && exponent.numerator > 0) {
      return node[1];
    }
  }

  return node;
}

function collectMixedFactorTargets(node: unknown) {
  const deduped = new Map<string, unknown>();

  for (const factor of flattenMultiply(node).map(unwrapFactorNode)) {
    if (!dependsOnVariable(factor, 'x')) {
      continue;
    }
    const key = JSON.stringify(factor);
    if (!deduped.has(key)) {
      deduped.set(key, factor);
    }
  }

  return [...deduped.values()];
}

function runMixedFactorEquationSolve(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  runner: GuardedSolveRunner,
) {
  try {
    const parsed = ce.parse(request.resolvedLatex).json;
    if (!isMathJsonArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
      return null;
    }

    const zeroForm = ce.box(['Subtract', parsed[1], parsed[2]] as Parameters<typeof ce.box>[0]).simplify().json;
    const factorized = factorMixedCarrierAst(zeroForm);
    if (!factorized) {
      return null;
    }

    const factors = collectMixedFactorTargets(factorized.node);
    if (factors.length === 0) {
      return null;
    }

    const carriers: EquationStageResultCarrierV1[] = [];
    const baseValidationLatex = request.validationLatex ?? request.resolvedLatex;

    for (const factor of factors) {
      const factorLatex = ce.box(factor as Parameters<typeof ce.box>[0]).latex;
      const factorEquationLatex = `${factorLatex}=0`;
      const nextRequest = {
        ...request,
        resolvedLatex: factorEquationLatex,
        validationLatex: baseValidationLatex,
      };
      const carrier = runner(nextRequest, depth + 1, new Set(trail));
      const outcome = readEquationStageResultCarrier(carrier);

      if (outcome.kind === 'success') {
        carriers.push(carrier);
      }
    }

    if (carriers.length === 0) {
      return null;
    }

    return readEquationStageResultCarrier(
      mergeEquationStageCarriers(
        carriers,
        [],
        proseSolveSummary('Factored the mixed carrier expression into bounded exact factors.'),
      ),
    );
  } catch {
    return null;
  }
}

function matchAcceptedSolvedRoots(
  roots: Array<{ latex: string; numeric: number; node?: unknown }>,
  acceptedValues: number[],
) {
  const used = new Set<number>();
  const matched: Array<{ latex: string; numeric: number; node?: unknown }> = [];

  for (const acceptedValue of acceptedValues) {
    const matchIndex = roots.findIndex((root, index) =>
      !used.has(index)
      && Math.abs(root.numeric - acceptedValue) <= NUMERIC_MATCH_TOLERANCE);
    if (matchIndex < 0) {
      continue;
    }
    used.add(matchIndex);
    matched.push(roots[matchIndex]);
  }

  return matched;
}

function runBoundedPolynomialSolve(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  runner: GuardedSolveRunner,
): ResultProducerDraft | null {
  try {
    const parsed = ce.parse(request.resolvedLatex).json;
    let recognizedDirectPolynomial = false;

    const recognized = recognizeBoundedPolynomialEquationAst(parsed, 'x');
    if (recognized) {
      recognizedDirectPolynomial = true;
      const solved = solveBoundedPolynomialEquationAst(parsed, 'x');
      if (solved) {
        const rootSet = adaptBoundedPolynomialSolveResultToRootSet(solved, {
          source: 'equation-guarded-bounded-polynomial',
        });
        const exactLatex = rootSetToExactLatex(rootSet);
        const primaryMath = provenCarrierCanonicalMath(
          rootSetToCanonicalMath(rootSet),
          exactLatex,
          'equation-guarded-bounded-polynomial',
        );
        return profileEquationResult(createEquationResultOutcome({
          kind: 'success',
          title: 'Solve',
          exactLatex,
          ...(primaryMath ? { primaryMath } : {}),
          branchReadback: rootSetToBranchReadback(rootSet, {
            source: 'equation-guarded-bounded-polynomial',
          }),
          approxText: solved.approxText,
          warnings: [],
          resultOrigin: 'symbolic',
          plannerBadges: [],
          solveBadges: [],
          candidateValues: solved.approxSolutions,
        }));
      }
    }

    const carrierAttempt = shouldAttemptPolynomialCarrierFollowOn(request)
      ? solveBoundedPolynomialCarrierEquationAst(parsed, request.polynomialCarrierHints)
      : { kind: 'none' as const };

    if (carrierAttempt.kind === 'solved') {
      const candidateValues = carrierAttempt.roots.map((root) => root.numeric);
      const needsValidation =
        (request.domainConstraints?.length ?? 0) > 0
        || Boolean(request.validationLatex && request.validationLatex !== request.resolvedLatex);

      if (!needsValidation) {
        const exactSolutions = carrierAttempt.roots.map((root) => root.latex);
        const exactLatex = exactSolutions.length > 0 && exactSolutions.every((value) => !isApproximateOnlySolutionLatex(value))
          ? solutionsToLatex('x', exactSolutions)
          : undefined;
        const rootSet = createRootSet({
          target: 'x',
          source: 'equation-polynomial-carrier',
          entries: carrierAttempt.roots.map((root) => createExactFiniteRoot(root.latex, {
            source: 'equation-polynomial-carrier',
            ...(root.node !== undefined ? { node: root.node } : {}),
          })),
        });
        const renderedCanonicalMath = rootSetToCanonicalMath(rootSet);
        const provenRoots = provenCarrierRootLeaves(
          carrierAttempt.roots,
          'equation-polynomial-carrier',
        );
        const primaryMath = provenRoots.length === carrierAttempt.roots.length
          ? provenCarrierCanonicalMath(
              renderedCanonicalMath,
              exactLatex,
              'equation-polynomial-carrier',
            )
          : undefined;
        return createEquationResultOutcome({
          kind: 'success',
          title: 'Solve',
          exactLatex,
          ...(primaryMath ? { primaryMath } : {}),
          exactSupplementLatex:
            carrierAttempt.exactSupplementLatex && carrierAttempt.exactSupplementLatex.length > 0
              ? carrierAttempt.exactSupplementLatex
              : undefined,
          approxText: formatAcceptedApproximations(candidateValues),
          warnings: [],
          resultOrigin: 'symbolic',
          plannerBadges: [],
          solveBadges: [],
          candidateValues,
        });
      }

      const validation = validateCandidateRoots(
        request.validationLatex ?? request.resolvedLatex,
        candidateValues,
        request.domainConstraints,
        'symbolic-direct',
        request.angleUnit,
      );

      if (validation.accepted.length === 0) {
        const producerInput: EquationResultProducerInput = {
          kind: 'error',
          title: 'Solve',
          error: buildEquationCandidateRejectionMessage(
            classifyCandidateRejections(validation.rejected, request.domainConstraints),
          ),
          exactSupplementLatex:
            carrierAttempt.exactSupplementLatex && carrierAttempt.exactSupplementLatex.length > 0
              ? carrierAttempt.exactSupplementLatex
              : undefined,
          warnings: [],
          plannerBadges: [],
          solveBadges: ['Candidate Checked'],
          rejectedCandidateCount: validation.rejected.length,
          detailSections: appendExtraneousSolutionsDetailSection(
            undefined,
            extraneousEvidenceFromRejectedCandidates(validation.rejected, {
              exactCandidatesLatex: carrierAttempt.roots.map((root) => root.latex),
            }),
          ),
        };
        return createEquationResultOutcome(producerInput, {
          mathValues: equationMathValuesWithOwnedReadback({
            outcome: producerInput,
            routeId: inferEquationMathJsonRoute(producerInput),
            leaves: provenCarrierRootLeaves(
              carrierAttempt.roots,
              'equation-polynomial-carrier-rejected-root',
            ),
          }),
        });
      }

      const acceptedRoots = matchAcceptedSolvedRoots(carrierAttempt.roots, validation.accepted);
      const acceptedLatex = acceptedRoots.map((root) => root.latex);
      const exactLatex = acceptedLatex.length > 0 && acceptedLatex.every((value) => !isApproximateOnlySolutionLatex(value))
        ? solutionsToLatex('x', acceptedLatex)
        : undefined;
      const rootSet = createRootSet({
        target: 'x',
        source: 'equation-polynomial-carrier-candidate-validation',
        entries: acceptedRoots.map((root) => createExactFiniteRoot(root.latex, {
          source: 'equation-polynomial-carrier-candidate-validation',
          ...(root.node !== undefined ? { node: root.node } : {}),
        })),
      });
      const renderedCanonicalMath = rootSetToCanonicalMath(rootSet);
      const provenAcceptedRoots = provenCarrierRootLeaves(
        acceptedRoots,
        'equation-polynomial-carrier-candidate-validation',
      );
      const primaryMath = provenAcceptedRoots.length === acceptedRoots.length
        ? provenCarrierCanonicalMath(
            renderedCanonicalMath,
            exactLatex,
            'equation-polynomial-carrier-candidate-validation',
          )
        : undefined;

      const producerInput: EquationResultProducerInput = {
        kind: 'success',
        title: 'Solve',
        exactLatex,
        ...(primaryMath ? { primaryMath } : {}),
        branchReadback: branchReadbackForAcceptedCandidates(
          acceptedLatex,
          validation.accepted,
          exactLatex,
          'equation-polynomial-carrier-candidate-validation',
        ),
        exactSupplementLatex:
          carrierAttempt.exactSupplementLatex && carrierAttempt.exactSupplementLatex.length > 0
            ? carrierAttempt.exactSupplementLatex
            : undefined,
        approxText: formatAcceptedApproximations(validation.accepted),
        warnings: [],
        resultOrigin: 'symbolic',
        plannerBadges: [],
        solveBadges: ['Candidate Checked'],
        candidateValues: validation.accepted,
        rejectedCandidateCount: validation.rejected.length > 0 ? validation.rejected.length : undefined,
        detailSections: appendExtraneousSolutionsDetailSection(
          undefined,
          extraneousEvidenceFromRejectedCandidates(validation.rejected, {
            exactCandidatesLatex: carrierAttempt.roots.map((root) => root.latex),
          }),
        ),
      };
      const allRootValues = equationMathValuesWithOwnedReadback({
        outcome: producerInput,
        routeId: inferEquationMathJsonRoute(producerInput),
        leaves: provenCarrierRootLeaves(
          carrierAttempt.roots,
          'equation-polynomial-carrier-root',
        ),
      });
      const supplementalMathValues = { ...allRootValues };
      delete supplementalMathValues.primaryMath;
      delete supplementalMathValues.branchReadback;
      return createEquationResultOutcome(producerInput, {
        mathValues: supplementalMathValues,
      });
    }

    if (carrierAttempt.kind === 'empty') {
      return errorOutcome(
        'Solve',
        'No real solutions remain after resolving the bounded carrier roots.',
      );
    }

    if (recognizedDirectPolynomial || carrierAttempt.kind === 'recognized') {
      return errorOutcome(
        'Solve',
        UNSUPPORTED_FAMILY_ERROR,
      );
    }

    const mixedFactorSolve = runMixedFactorEquationSolve(request, depth, trail, runner);
    if (mixedFactorSolve) {
      return mixedFactorSolve;
    }

    return null;
  } catch {
    return null;
  }
}

export { runBoundedPolynomialSolve };
