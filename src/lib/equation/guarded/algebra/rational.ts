import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  buildSquareRootConjugateProfile,
  isSupportedRadicand,
  mergeSolveDomainConstraints as mergeConstraints,
} from '../../../algebra/radical-core';
import { normalizeAst } from '../../../symbolic-engine/normalize';
import { boxLatex, dependsOnVariable, isNodeArray } from '../../../symbolic-engine/patterns';
import { buildRationalizedSquareRootQuotient } from '../../../symbolic-engine/radical';
import { normalizeExactRationalNode } from '../../../symbolic-engine/rational';
import type {
  GuardedSolveRequest,
  SolveBadge,
  SolveDomainConstraint,
} from '../../../../types/calculator';
import { equationStateKey } from '../state-key';
import type { AlgebraTransform } from './types';
import {
  buildProductNode,
  buildScalarNode,
  getSolveVariable,
  readExactScalar,
} from './math-json';
import {
  isRecognizedPolynomialSink,
  isSupportedRightSideExpression,
} from './radicals';
import { countEquationRadicalTargets } from './repeated-clearing';

const ce = new ComputeEngine();

function matchTopLevelQuotientZeroTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const variable = getSolveVariable(leftNode, rightNode);
  const attempts: Array<{ quotient: unknown; zeroSide: unknown }> = [
    { quotient: leftNode, zeroSide: rightNode },
    { quotient: rightNode, zeroSide: leftNode },
  ];

  for (const attempt of attempts) {
    const quotient = normalizeAst(attempt.quotient);
    const zeroSide = normalizeAst(attempt.zeroSide);
    if (
      !isNodeArray(quotient)
      || quotient[0] !== 'Divide'
      || quotient.length !== 3
      || readExactScalar(zeroSide)?.numerator !== 0
    ) {
      continue;
    }

    const numerator = normalizeAst(quotient[1]);
    const denominator = normalizeAst(quotient[2]);
    if (!dependsOnVariable(numerator, variable)) {
      continue;
    }

    const equationLatex = `${boxLatex(numerator)}=0`;
    if (equationStateKey(equationLatex) === equationStateKey(request.resolvedLatex)) {
      continue;
    }

    const denominatorLatex = boxLatex(denominator);
    return {
      equationLatex,
      domainConstraints: [{
        kind: 'nonzero',
        expressionLatex: denominatorLatex,
      }],
      solveBadges: ['LCD Clear'],
      solveSummaryText: 'Reduced a quotient equal to zero to its numerator equation and preserved the denominator exclusion',
      detailSections: [{
        title: 'Quotient Zero Reduction',
        lines: [
          `Reduced ${boxLatex(quotient)}=0 to ${equationLatex}.`,
          `Preserved denominator exclusion: ${denominatorLatex}\\ne0.`,
        ],
      }],
      unresolvedError: 'This recognized quotient-zero family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  return null;
}

function matchRationalTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const quotientZero = matchTopLevelQuotientZeroTransform(request);
  if (quotientZero) {
    return quotientZero;
  }

  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const zeroForm = normalizeAst(['Add', parsed[1], ['Negate', parsed[2]]]);
  const rational = normalizeExactRationalNode(zeroForm, 'simplify');
  if (!rational?.denominatorNode) {
    return null;
  }

  const equationLatex = `${rational.numeratorLatex}=0`;
  if (equationStateKey(equationLatex) === equationStateKey(request.resolvedLatex)) {
    return null;
  }

  return {
    equationLatex,
    domainConstraints: rational.exclusionConstraints,
    solveBadges: ['LCD Clear'],
    solveSummaryText: 'Cleared the LCD and reduced the equation to an exact solve-ready form',
    unresolvedError: 'This recognized rational family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
  };
}

function tryRationalizeSquareRootDenominatorSide(node: unknown, variable: string): AlgebraTransform | null {
  const normalized = normalizeAst(node);
  const quotient =
    isNodeArray(normalized) && normalized[0] === 'Divide' && normalized.length === 3
      ? { numerator: normalized[1], denominator: normalized[2] }
      : isNodeArray(normalized)
        && normalized[0] === 'Power'
        && normalized.length === 3
        && normalized[2] === -1
          ? { numerator: 1 as unknown, denominator: normalized[1] }
          : null;
  if (!quotient) {
    return null;
  }

  const rationalized = buildRationalizedSquareRootQuotient(
    quotient.numerator,
    quotient.denominator,
    variable,
  );
  if (!rationalized) {
    return null;
  }

  const constraints: SolveDomainConstraint[] = [{
    kind: 'nonzero',
    expressionLatex: boxLatex(quotient.denominator),
  }];

  return {
    equationLatex: boxLatex(rationalized.node),
    domainConstraints: mergeConstraints(constraints, rationalized.conditionConstraints),
    solveBadges: ['Conjugate Transform'],
    solveSummaryText: rationalized.usedResidualCleanup
      ? 'Applied bounded conjugates to remove the supported square-root denominator'
      : 'Applied a conjugate to remove a square-root denominator',
    unresolvedError: 'This recognized radical conjugate family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    radicalStepCost: 1,
  };
}

function extractReciprocalTargetNode(node: unknown): unknown | null {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized[0] === 'Divide' && normalized.length === 3 && normalized[1] === 1) {
    return normalized[2];
  }

  if (isNodeArray(normalized) && normalized[0] === 'Power' && normalized.length === 3 && normalized[2] === -1) {
    return normalized[1];
  }

  const scalar = readExactScalar(normalized);
  if (!scalar || scalar.numerator === 0) {
    return null;
  }

  return buildScalarNode({
    numerator: scalar.denominator,
    denominator: scalar.numerator,
  });
}

function matchThreeTermReciprocalEqualityTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const variable = getSolveVariable(leftNode, rightNode);
  const attempts: Array<{ reciprocalSide: unknown; otherSide: unknown }> = [
    { reciprocalSide: leftNode, otherSide: rightNode },
    { reciprocalSide: rightNode, otherSide: leftNode },
  ];

  for (const attempt of attempts) {
    const reciprocalDenominator = extractReciprocalTargetNode(attempt.reciprocalSide);
    if (!reciprocalDenominator) {
      continue;
    }

    const profile = buildSquareRootConjugateProfile(reciprocalDenominator, variable);
    if (!profile || profile.familyId !== 'three-term-scalar-double-radical') {
      continue;
    }

    const reciprocalTarget = extractReciprocalTargetNode(attempt.otherSide);
    if (!reciprocalTarget || !isSupportedRightSideExpression(reciprocalTarget, variable)) {
      continue;
    }

    const equationLatex = `${boxLatex(reciprocalDenominator)}=${boxLatex(reciprocalTarget)}`;
    if (equationStateKey(equationLatex) === equationStateKey(request.resolvedLatex)) {
      continue;
    }

    return {
      equationLatex,
      domainConstraints: mergeConstraints([{
        kind: 'nonzero',
        expressionLatex: boxLatex(reciprocalDenominator),
      }], profile.conditionConstraints),
      solveBadges: ['LCD Clear'],
      solveSummaryText: 'Cleared a bounded reciprocal equality into a supported denominator equation',
      unresolvedError: 'This recognized radical conjugate family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  return null;
}

function isSupportedClearableDenominator(node: unknown, variable: string) {
  return Boolean(readExactScalar(node) || isSupportedRadicand(node, variable));
}

function tryCrossMultiplySingleFractionEquation(equationLatex: string, variable: string) {
  const parsed = ce.parse(equationLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const attempts: Array<{ fractionSide: unknown; otherSide: unknown; fractionOnLeft: boolean }> = [
    { fractionSide: leftNode, otherSide: rightNode, fractionOnLeft: true },
    { fractionSide: rightNode, otherSide: leftNode, fractionOnLeft: false },
  ];

  for (const attempt of attempts) {
    if (
      !isNodeArray(attempt.fractionSide)
      || attempt.fractionSide[0] !== 'Divide'
      || attempt.fractionSide.length !== 3
    ) {
      continue;
    }

    const denominator = normalizeAst(attempt.fractionSide[2]);
    if (!isSupportedClearableDenominator(denominator, variable)) {
      continue;
    }

    const clearedLeft = attempt.fractionOnLeft
      ? normalizeAst(attempt.fractionSide[1])
      : buildProductNode(leftNode, denominator);
    const clearedRight = attempt.fractionOnLeft
      ? buildProductNode(rightNode, denominator)
      : normalizeAst(attempt.fractionSide[1]);

    return {
      equationLatex: `${boxLatex(clearedLeft)}=${boxLatex(clearedRight)}`,
      domainConstraints: [],
      solveBadges: ['Conjugate Transform', 'LCD Clear'] as SolveBadge[],
      solveSummaryText: 'Applied a conjugate and cleared the remaining supported denominator',
      unresolvedError: 'This recognized radical conjugate family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  return null;
}

function equationContainsDivision(node: unknown): boolean {
  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  if (node[0] === 'Divide') {
    return true;
  }

  return node.slice(1).some((child) => equationContainsDivision(child));
}

function canUseBoundedConjugateEquation(
  equationLatex: string,
  request: GuardedSolveRequest,
  variable: string,
  currentTargetCount: number,
) {
  const transformedParsed = ce.parse(equationLatex).json;
  if (!isNodeArray(transformedParsed) || transformedParsed[0] !== 'Equal' || transformedParsed.length !== 3) {
    return false;
  }

  if (isRecognizedPolynomialSink(transformedParsed, request.polynomialCarrierHints)) {
    return true;
  }

  const nextLeftNode = normalizeAst(transformedParsed[1]);
  const nextRightNode = normalizeAst(transformedParsed[2]);
  const nextTargetCount = countEquationRadicalTargets(nextLeftNode, nextRightNode, variable);

  if (
    !equationContainsDivision(nextLeftNode)
    && !equationContainsDivision(nextRightNode)
    && nextTargetCount > 0
    && nextTargetCount <= currentTargetCount
  ) {
    return true;
  }

  return nextTargetCount > 0 && nextTargetCount < currentTargetCount;
}

function matchConjugateTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }
  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const variable = getSolveVariable(leftNode, rightNode);
  const currentTargetCount = countEquationRadicalTargets(leftNode, rightNode, variable);

  const reciprocalEqualityTransform = matchThreeTermReciprocalEqualityTransform(request);
  if (reciprocalEqualityTransform) {
    return reciprocalEqualityTransform;
  }

  const leftTransform = tryRationalizeSquareRootDenominatorSide(leftNode, variable);
  if (leftTransform) {
    const equationLatex = `${leftTransform.equationLatex}=${boxLatex(rightNode)}`;
    const cleared = tryCrossMultiplySingleFractionEquation(equationLatex, variable);
    if (cleared && equationStateKey(cleared.equationLatex) !== equationStateKey(request.resolvedLatex)) {
      return {
        ...cleared,
        domainConstraints: mergeConstraints(leftTransform.domainConstraints, cleared.domainConstraints),
        radicalStepCost: leftTransform.radicalStepCost,
      };
    }
    if (
      equationStateKey(equationLatex) !== equationStateKey(request.resolvedLatex)
      && canUseBoundedConjugateEquation(equationLatex, request, variable, currentTargetCount)
    ) {
      return {
        ...leftTransform,
        equationLatex,
      };
    }
  }

  const rightTransform = tryRationalizeSquareRootDenominatorSide(rightNode, variable);
  if (rightTransform) {
    const equationLatex = `${boxLatex(leftNode)}=${rightTransform.equationLatex}`;
    const cleared = tryCrossMultiplySingleFractionEquation(equationLatex, variable);
    if (cleared && equationStateKey(cleared.equationLatex) !== equationStateKey(request.resolvedLatex)) {
      return {
        ...cleared,
        domainConstraints: mergeConstraints(rightTransform.domainConstraints, cleared.domainConstraints),
        radicalStepCost: rightTransform.radicalStepCost,
      };
    }
    if (
      equationStateKey(equationLatex) !== equationStateKey(request.resolvedLatex)
      && canUseBoundedConjugateEquation(equationLatex, request, variable, currentTargetCount)
    ) {
      return {
        ...rightTransform,
        equationLatex,
      };
    }
  }

  return null;
}

export {
  matchConjugateTransform,
  matchRationalTransform,
};
