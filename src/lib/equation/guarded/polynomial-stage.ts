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
  SerializableMathJson,
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
import { printValidatedBoxedMathJson } from '../../display/printer/printer';
import { compareFormalMathJson } from '../../result-contract/formal-mathjson-comparison';
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
const CARRIER_PROOF_ERROR =
  'Exact carrier roots were found, but their producer-owned proof was incomplete. The result was not committed.';

function normalizedCarrierRootNode(node: unknown): SerializableMathJson {
  if (
    Array.isArray(node)
    && node[0] === 'Divide'
    && node.length === 3
    && typeof node[2] === 'number'
    && Number.isInteger(node[2])
    && node[2] !== 0
    && Array.isArray(node[1])
    && node[1][0] === 'Subtract'
    && node[1].length === 3
    && typeof node[1][2] === 'number'
    && Number.isInteger(node[1][2])
    && Array.isArray(node[1][1])
    && node[1][1][0] === 'Add'
    && node[1][1].length === 3
    && typeof node[1][1][1] === 'number'
    && Number.isInteger(node[1][1][1])
  ) {
    return [
      'Multiply',
      ['Rational', 1, node[2]],
      ['Add', node[1][1][1] - node[1][2], node[1][1][2]],
    ] as SerializableMathJson;
  }
  return node as SerializableMathJson;
}

function carrierRootNodeForProof(root: { latex: string; node?: unknown }): SerializableMathJson | undefined {
  if (root.node === undefined) return undefined;
  try {
    const boxed = ce.box(root.node as Parameters<typeof ce.box>[0], { form: 'structural' });
    const parsed = ce.parse(root.latex, { form: 'structural' });
    if (compareFormalMathJson(root.node, parsed.json, root.latex).equal) {
      return root.node as SerializableMathJson;
    }
    const printed = printValidatedBoxedMathJson({
      boxedExpression: boxed,
      profile: 'pedagogical-v1',
      target: 'canonical-latex',
    });
    if (
      (printed.ok && printed.canonicalLatex === root.latex)
      || boxed.latex === root.latex
      || boxed.canonical.latex === root.latex
    ) {
      return root.node as SerializableMathJson;
    }
  } catch {
    return undefined;
  }
  return normalizedCarrierRootNode(root.node);
}

function provenCarrierRootLeaves(
  roots: Array<{ latex: string; node?: unknown }>,
  source: string,
) {
  return roots.flatMap((root, index) => {
    const mathJson = carrierRootNodeForProof(root);
    if (mathJson === undefined) return [];
    const leafSource = `${source}:${index}`;
    const proof = tryProvenCanonicalMathValue({
      canonicalLatex: root.latex,
      mathJson,
      owner: 'equation',
      routeId: 'equation.polynomial',
      source: leafSource,
    });
    return proof
      ? [{ canonicalLatex: root.latex, mathJson, source: leafSource }]
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

export function provenAcceptedCarrierCanonicalMath(
  roots: Array<{ latex: string; node?: unknown }>,
  canonicalLatex: string | undefined,
  source: string,
) {
  if (!canonicalLatex || roots.length === 0) {
    return undefined;
  }
  const seen = new Map<string, string>();
  for (const root of roots) {
    const node = carrierRootNodeForProof(root);
    if (node === undefined) return undefined;
    const serialized = JSON.stringify(node);
    const existing = seen.get(root.latex);
    if (existing !== undefined && existing !== serialized) return undefined;
    seen.set(root.latex, serialized);
  }
  const provenRoots = provenCarrierRootLeaves(roots, `${source}:accepted-root`);
  if (provenRoots.length !== roots.length) return undefined;
  const nodes = provenRoots.map((root) => root.mathJson);
  const mathJson: SerializableMathJson = roots.length === 1
    ? ['Equal', 'x', nodes[0]]
    : ['Element', 'x', ['Set', ...nodes] as SerializableMathJson];
  return tryProvenCanonicalMathValue({
    canonicalLatex,
    mathJson,
    owner: 'equation',
    routeId: 'equation.polynomial',
    source,
  })
    ? { canonicalLatex, mathJson }
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

function usesQuadraticFormulaScaffolding(root: { node?: unknown }) {
  if (!Array.isArray(root.node) || root.node[0] !== 'Divide') return false;
  const numerator = root.node[1];
  return Array.isArray(numerator)
    && (numerator[0] === 'Add' || numerator[0] === 'Subtract')
    && numerator.slice(1).some((term) => Array.isArray(term) && term[0] === 'Sqrt');
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
        const rootSet = createRootSet({
          target: 'x',
          source: 'equation-polynomial-carrier',
          entries: carrierAttempt.roots.map((root) => createExactFiniteRoot(root.latex, {
            source: 'equation-polynomial-carrier',
            ...(root.node !== undefined ? { node: root.node } : {}),
          })),
        });
        const renderedCanonicalMath = rootSetToCanonicalMath(rootSet);
        const normalizePresentation = carrierAttempt.roots.some(usesQuadraticFormulaScaffolding);
        const exactLatex = exactSolutions.length > 0 && exactSolutions.every((value) => !isApproximateOnlySolutionLatex(value))
          ? normalizePresentation
            ? renderedCanonicalMath?.canonicalLatex
            : solutionsToLatex('x', exactSolutions)
          : undefined;
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
        if (!primaryMath) {
          return errorOutcome('Solve', CARRIER_PROOF_ERROR);
        }
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
      if (acceptedRoots.length !== validation.accepted.length) {
        return errorOutcome('Solve', CARRIER_PROOF_ERROR);
      }
      const acceptedRootLatex = acceptedRoots.map((root) => root.latex);
      const acceptedRootSet = createRootSet({
        target: 'x',
        source: 'equation-polynomial-carrier-candidate-validation',
        entries: acceptedRoots.map((root) => createExactFiniteRoot(root.latex, {
          source: 'equation-polynomial-carrier-candidate-validation',
          ...(root.node !== undefined ? { node: root.node } : {}),
        })),
      });
      const normalizePresentation = acceptedRoots.some(usesQuadraticFormulaScaffolding);
      const renderedCanonicalMath = normalizePresentation
        ? rootSetToCanonicalMath(acceptedRootSet)
        : undefined;
      const acceptedLatex = normalizePresentation
        ? rootSetToBranchReadback(acceptedRootSet, {
            source: 'equation-polynomial-carrier-candidate-validation',
          })?.branchesLatex ?? acceptedRootLatex
        : acceptedRootLatex;
      const exactLatex = acceptedLatex.length > 0 && acceptedLatex.every((value) => !isApproximateOnlySolutionLatex(value))
        ? normalizePresentation
          ? renderedCanonicalMath?.canonicalLatex
          : solutionsToLatex('x', acceptedLatex)
        : undefined;
      const primaryMath = normalizePresentation
        ? provenCarrierCanonicalMath(
            renderedCanonicalMath,
            exactLatex,
            'equation-polynomial-carrier-candidate-validation',
          )
        : provenAcceptedCarrierCanonicalMath(
            acceptedRoots,
            exactLatex,
            'equation-polynomial-carrier-candidate-validation',
          );
      if (!primaryMath) {
        return errorOutcome('Solve', CARRIER_PROOF_ERROR);
      }

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
