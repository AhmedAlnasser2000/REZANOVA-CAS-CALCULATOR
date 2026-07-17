import type { DisplayDetailSection } from '../../../../types/calculator';
import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import {
  addExactPolynomials,
  buildExactPolynomialFromCoefficients,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialGcd,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  multiplyExactPolynomials,
  multiplyExactScalars,
  normalizeExactPolynomial,
  parseExactPolynomial,
  scaleExactPolynomial,
  subtractExactScalars,
  type ExactPolynomial,
  type ExactScalar,
} from '../../../algebra/polynomial-core';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import {
  boxLatex,
  flattenMultiply,
  isNodeArray,
} from '../../patterns';

const ZERO: ExactScalar = { numerator: 0, denominator: 1 };
const ONE: ExactScalar = { numerator: 1, denominator: 1 };
const HALF: ExactScalar = { numerator: 1, denominator: 2 };
const CUBIC_HERMITE_NUMERATOR_DEGREE_CAP = 8;
const CUBIC_HERMITE_OPERATION_CAP = 32;

export type AlgebraicGenus1CubicHermitePreconditionerResult =
  | AlgebraicGenus1CubicHermitePreconditionerSuccess
  | {
      kind: 'stop';
      variable: string;
      reason:
        | 'unsupported-shape'
        | 'unsupported-radical-product'
        | 'radicand-not-exact-cubic'
        | 'numerator-not-exact-polynomial'
        | 'over-cap-numerator-degree'
        | 'repeated-root-degeneration'
        | 'coefficient-solve-stop'
        | 'residual-not-basis-ready';
      detail: string;
    };

export type AlgebraicGenus1CubicHermitePreconditionerSuccess = {
  kind: 'success';
  variable: string;
  status: 'cubic-hermite-preconditioner-ready';
  normalizedInputNode: unknown;
  radicandPolynomial: ExactPolynomial;
  numeratorPolynomial: ExactPolynomial;
  correctionPolynomial: ExactPolynomial;
  residualPolynomial: ExactPolynomial;
  correctionNode: unknown;
  residualIntegrandNode: unknown;
  radicandLatex: string;
  numeratorLatex: string;
  correctionLatex: string;
  residualLatex: string;
  normalizedInputLatex: string;
  residualBasisKinds: Array<'first-kind' | 'second-kind'>;
  exactSupplementEntries: ExactSupplementEntry[];
  detailSections: DisplayDetailSection[];
  canMapResidualLive: false;
  canAdoptLive: false;
};

type ParsedPolynomialOverRadical = {
  numerator: ExactPolynomial;
  radicand: ExactPolynomial;
  normalizedInputNode: unknown;
  exactSupplementEntries: ExactSupplementEntry[];
  normalizedFromLatex?: string;
};

function exactScalar(value: number): ExactScalar {
  return { numerator: value, denominator: 1 };
}

function exactScalarEquals(left: ExactScalar, right: ExactScalar) {
  const difference = subtractExactScalars(left, right);
  return exactScalarIsZero(difference);
}

function exactScalarPositive(value: ExactScalar) {
  return value.numerator * value.denominator > 0;
}

function zeroPolynomial(variable: string) {
  return buildExactPolynomialFromCoefficients(variable, [ZERO]);
}

function monomialPolynomial(variable: string, degree: number, coefficient: ExactScalar) {
  return buildExactPolynomialFromCoefficients(
    variable,
    [
      coefficient,
      ...Array.from({ length: degree }, () => ZERO),
    ],
  );
}

function derivativeExactPolynomial(polynomial: ExactPolynomial) {
  const result = new Map<number, ExactScalar>();
  for (const [degree, coefficient] of polynomial.terms.entries()) {
    if (degree === 0) {
      continue;
    }
    result.set(degree - 1, multiplyExactScalars(coefficient, exactScalar(degree)));
  }
  return normalizeExactPolynomial({
    variable: polynomial.variable,
    terms: result,
  });
}

function exactPolynomialCoefficientIs(
  polynomial: ExactPolynomial,
  degree: number,
  value: ExactScalar,
) {
  return exactScalarEquals(getExactPolynomialCoefficient(polynomial, degree), value);
}

function isExactPolynomialDegree(polynomial: ExactPolynomial, degree: number) {
  return exactPolynomialDegree(polynomial) === degree;
}

function sqrtBody(node: unknown) {
  return isNodeArray(node) && node[0] === 'Sqrt' && node.length === 2
    ? node[1]
    : undefined;
}

function divideParts(node: unknown) {
  return isNodeArray(node) && node[0] === 'Divide' && node.length === 3
    ? { numerator: node[1], denominator: node[2] }
    : undefined;
}

function parseExactPolynomialNode(node: unknown, variable: string, maxDegree: number) {
  return parseExactPolynomial(node, variable, maxDegree);
}

function parseCubicRadicand(node: unknown, variable: string) {
  const polynomial = parseExactPolynomialNode(node, variable, 3);
  return polynomial && isExactPolynomialDegree(polynomial, 3)
    ? normalizeExactPolynomial(polynomial)
    : undefined;
}

function parseNumeratorPolynomial(node: unknown, variable: string) {
  const polynomial = parseExactPolynomialNode(node, variable, CUBIC_HERMITE_NUMERATOR_DEGREE_CAP);
  return polynomial ? normalizeExactPolynomial(polynomial) : undefined;
}

function multiplyPolynomials(
  left: ExactPolynomial,
  right: ExactPolynomial,
  maxDegree: number,
) {
  return multiplyExactPolynomials(left, right, maxDegree);
}

function divideBySqrtShape(
  node: unknown,
  variable: string,
): ParsedPolynomialOverRadical | undefined {
  const fraction = divideParts(node);
  const radicandNode = fraction ? sqrtBody(fraction.denominator) : undefined;
  if (!fraction || !radicandNode) {
    return undefined;
  }

  const radicand = parseCubicRadicand(radicandNode, variable);
  const numerator = parseNumeratorPolynomial(fraction.numerator, variable);
  if (!radicand || !numerator) {
    return undefined;
  }

  return {
    numerator,
    radicand,
    normalizedInputNode: [
      'Divide',
      exactPolynomialToNode(numerator),
      ['Sqrt', exactPolynomialToNode(radicand)],
    ],
    exactSupplementEntries: [],
  };
}

function directRadicalShape(
  node: unknown,
  variable: string,
): ParsedPolynomialOverRadical | undefined {
  const body = sqrtBody(node);
  if (!body) {
    return undefined;
  }

  const radicand = parseCubicRadicand(body, variable);
  if (!radicand) {
    return undefined;
  }

  return {
    numerator: radicand,
    radicand,
    normalizedInputNode: ['Sqrt', exactPolynomialToNode(radicand)],
    exactSupplementEntries: [],
  };
}

function singleRadicalProductShape(
  node: unknown,
  variable: string,
): ParsedPolynomialOverRadical | undefined {
  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [];
  const radicalFactors = factors.filter((factor) => sqrtBody(factor) !== undefined);
  if (radicalFactors.length !== 1) {
    return undefined;
  }

  const radicand = parseCubicRadicand(sqrtBody(radicalFactors[0]), variable);
  if (!radicand) {
    return undefined;
  }

  const multiplierFactors = factors.filter((factor) => factor !== radicalFactors[0]);
  const multiplierNode = multiplierFactors.length === 0
    ? 1
    : ['Multiply', ...multiplierFactors];
  const multiplier = parseNumeratorPolynomial(multiplierNode, variable);
  if (!multiplier) {
    return undefined;
  }

  const numerator = multiplyPolynomials(
    multiplier,
    radicand,
    CUBIC_HERMITE_NUMERATOR_DEGREE_CAP,
  );
  if (!numerator) {
    return undefined;
  }

  return {
    numerator,
    radicand,
    normalizedInputNode: [
      'Multiply',
      exactPolynomialToNode(multiplier),
      ['Sqrt', exactPolynomialToNode(radicand)],
    ],
    exactSupplementEntries: [],
  };
}

function isVariableCube(polynomial: ExactPolynomial, variable: string) {
  return polynomial.variable === variable
    && isExactPolynomialDegree(polynomial, 3)
    && exactPolynomialCoefficientIs(polynomial, 3, ONE)
    && exactPolynomialCoefficientIs(polynomial, 2, ZERO)
    && exactPolynomialCoefficientIs(polynomial, 1, ZERO)
    && exactPolynomialCoefficientIs(polynomial, 0, ZERO);
}

function xSquaredPlusPositiveConstant(polynomial: ExactPolynomial, variable: string) {
  if (
    polynomial.variable !== variable
    || !isExactPolynomialDegree(polynomial, 2)
    || !exactPolynomialCoefficientIs(polynomial, 2, ONE)
    || !exactPolynomialCoefficientIs(polynomial, 1, ZERO)
  ) {
    return undefined;
  }

  const constant = getExactPolynomialCoefficient(polynomial, 0);
  return exactScalarPositive(constant) ? constant : undefined;
}

function tryNormalizeSqrtXCubeProduct(
  left: ExactPolynomial,
  right: ExactPolynomial,
  variable: string,
) {
  if (isVariableCube(left, variable)) {
    const constant = xSquaredPlusPositiveConstant(right, variable);
    return constant ? { constant, positiveQuadratic: right } : undefined;
  }
  if (isVariableCube(right, variable)) {
    const constant = xSquaredPlusPositiveConstant(left, variable);
    return constant ? { constant, positiveQuadratic: left } : undefined;
  }
  return undefined;
}

function doubleRadicalProductShape(
  node: unknown,
  variable: string,
): ParsedPolynomialOverRadical | undefined {
  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [];
  const radicalFactors = factors.filter((factor) => sqrtBody(factor) !== undefined);
  if (radicalFactors.length !== 2) {
    return undefined;
  }

  const otherFactors = factors.filter((factor) => !radicalFactors.includes(factor));
  const multiplierNode = otherFactors.length === 0 ? 1 : ['Multiply', ...otherFactors];
  const multiplier = parseNumeratorPolynomial(multiplierNode, variable);
  const left = parseCubicRadicand(sqrtBody(radicalFactors[0]), variable)
    ?? parseNumeratorPolynomial(sqrtBody(radicalFactors[0]), variable);
  const right = parseCubicRadicand(sqrtBody(radicalFactors[1]), variable)
    ?? parseNumeratorPolynomial(sqrtBody(radicalFactors[1]), variable);
  if (!multiplier || !left || !right) {
    return undefined;
  }

  const normalized = tryNormalizeSqrtXCubeProduct(left, right, variable);
  if (!normalized) {
    return undefined;
  }

  const radicand = normalizeExactPolynomial({
    variable,
    terms: new Map<number, ExactScalar>([
      [3, ONE],
      [1, normalized.constant],
    ]),
  });
  const branchMultiplier = monomialPolynomial(variable, 1, ONE);
  const combinedMultiplier = multiplyPolynomials(
    multiplier,
    branchMultiplier,
    CUBIC_HERMITE_NUMERATOR_DEGREE_CAP,
  );
  const numerator = combinedMultiplier
    ? multiplyPolynomials(combinedMultiplier, radicand, CUBIC_HERMITE_NUMERATOR_DEGREE_CAP)
    : null;
  if (!combinedMultiplier || !numerator) {
    return undefined;
  }

  const normalizedInputNode = [
    'Multiply',
    exactPolynomialToNode(combinedMultiplier),
    ['Sqrt', exactPolynomialToNode(radicand)],
  ];
  return {
    numerator,
    radicand,
    normalizedInputNode,
    normalizedFromLatex: boxLatex(node),
    exactSupplementEntries: [
      {
        kind: 'condition',
        expressionLatex: variable,
        relation: '\\ge0',
        source: 'radical-domain',
      },
      {
        kind: 'condition',
        expressionLatex: exactPolynomialToLatex(normalized.positiveQuadratic),
        relation: '>0',
        source: 'radical-domain',
      },
    ],
  };
}

function parsePolynomialOverCubicRadical(
  node: unknown,
  variable: string,
): ParsedPolynomialOverRadical | AlgebraicGenus1CubicHermitePreconditionerResult {
  const parsed = divideBySqrtShape(node, variable)
    ?? directRadicalShape(node, variable)
    ?? singleRadicalProductShape(node, variable)
    ?? doubleRadicalProductShape(node, variable);
  if (parsed) {
    return parsed;
  }

  if (isNodeArray(node) && node[0] === 'Multiply') {
    const radicalCount = flattenMultiply(node).filter((factor) => sqrtBody(factor) !== undefined).length;
    if (radicalCount >= 2) {
      return {
        kind: 'stop',
        variable,
        reason: 'unsupported-radical-product',
        detail: 'Radical products are normalized only when the required real-branch facts are proven by this bounded gate.',
      };
    }
  }

  return {
    kind: 'stop',
    variable,
    reason: 'unsupported-shape',
    detail: 'The cubic Hermite preconditioner needs a polynomial-over-square-root cubic differential.',
  };
}

function squarefreeCubicReady(radicand: ExactPolynomial) {
  const derivative = derivativeExactPolynomial(radicand);
  const gcd = exactPolynomialGcd(radicand, derivative);
  return Boolean(gcd && exactPolynomialDegree(gcd) === 0);
}

function contributionForCorrectionTerm(
  term: ExactPolynomial,
  radicand: ExactPolynomial,
  radicandDerivative: ExactPolynomial,
  maxDegree: number,
) {
  const derivative = derivativeExactPolynomial(term);
  const derivativeProduct = multiplyPolynomials(derivative, radicand, maxDegree);
  const radicalDerivativeProduct = multiplyPolynomials(term, radicandDerivative, maxDegree);
  if (!derivativeProduct || !radicalDerivativeProduct) {
    return undefined;
  }

  return addExactPolynomials(
    derivativeProduct,
    scaleExactPolynomial(radicalDerivativeProduct, HALF),
  );
}

function reducePolynomialOverCubicRadical(
  numerator: ExactPolynomial,
  radicand: ExactPolynomial,
) {
  if (exactPolynomialDegree(numerator) > CUBIC_HERMITE_NUMERATOR_DEGREE_CAP) {
    return undefined;
  }

  const variable = numerator.variable;
  const radicandDerivative = derivativeExactPolynomial(radicand);
  const leading = getExactPolynomialCoefficient(radicand, 3);
  let residual = normalizeExactPolynomial(numerator);
  let correction = zeroPolynomial(variable);
  let operations = 0;

  for (let degree = exactPolynomialDegree(residual); degree >= 2; degree -= 1) {
    const residualCoefficient = getExactPolynomialCoefficient(residual, degree);
    if (exactScalarIsZero(residualCoefficient)) {
      continue;
    }

    operations += 1;
    if (operations > CUBIC_HERMITE_OPERATION_CAP) {
      return undefined;
    }

    const correctionDegree = degree - 2;
    const leadingFactor = multiplyExactScalars(
      leading,
      { numerator: 2 * correctionDegree + 3, denominator: 2 },
    );
    const correctionCoefficient = divideExactScalars(residualCoefficient, leadingFactor);
    if (!correctionCoefficient) {
      return undefined;
    }

    const correctionTerm = monomialPolynomial(variable, correctionDegree, correctionCoefficient);
    const contribution = contributionForCorrectionTerm(
      correctionTerm,
      radicand,
      radicandDerivative,
      Math.max(degree, exactPolynomialDegree(radicand) + correctionDegree),
    );
    if (!contribution) {
      return undefined;
    }

    correction = addExactPolynomials(correction, correctionTerm);
    residual = addExactPolynomials(residual, contribution, -1);
  }

  return {
    correction: normalizeExactPolynomial(correction),
    residual: normalizeExactPolynomial(residual),
  };
}

function residualBasisKinds(residual: ExactPolynomial) {
  const kinds: Array<'first-kind' | 'second-kind'> = [];
  if (!exactScalarIsZero(getExactPolynomialCoefficient(residual, 0))) {
    kinds.push('first-kind');
  }
  if (!exactScalarIsZero(getExactPolynomialCoefficient(residual, 1))) {
    kinds.push('second-kind');
  }
  return kinds;
}

function detailSection(input: AlgebraicGenus1CubicHermitePreconditionerSuccess) {
  return mixedDetailSection(
    'Genus-1 Cubic Hermite Preconditioner',
    [
      [textPart('curve: '), mathPart(`y^2=${input.radicandLatex}`)],
      [textPart('input differential: '), mathPart(`${input.numeratorLatex}\\,dx/y`)],
      [textPart('correction: '), mathPart(`${input.correctionLatex}\\,y`)],
      [textPart('residual numerator: '), mathPart(input.residualLatex)],
      [textPart('basis residuals: '), textPart(input.residualBasisKinds.join(' and ') || 'none')],
      [textPart('live-adoptable: '), textPart(input.canAdoptLive ? 'yes' : 'no')],
    ],
  );
}

export function buildAlgebraicGenus1CubicHermitePreconditioner(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1CubicHermitePreconditionerResult {
  const parsed = parsePolynomialOverCubicRadical(node, variable);
  if ('kind' in parsed) {
    return parsed;
  }

  if (!isExactPolynomialDegree(parsed.radicand, 3)) {
    return {
      kind: 'stop',
      variable,
      reason: 'radicand-not-exact-cubic',
      detail: 'The bounded preconditioner accepts exact squarefree cubic radicands only.',
    };
  }

  if (exactPolynomialDegree(parsed.numerator) > CUBIC_HERMITE_NUMERATOR_DEGREE_CAP) {
    return {
      kind: 'stop',
      variable,
      reason: 'over-cap-numerator-degree',
      detail: `Numerator degree exceeds the cap ${CUBIC_HERMITE_NUMERATOR_DEGREE_CAP}.`,
    };
  }

  if (!squarefreeCubicReady(parsed.radicand)) {
    return {
      kind: 'stop',
      variable,
      reason: 'repeated-root-degeneration',
      detail: 'Repeated-root cubics stay on the existing genus-0 degeneration fallback route.',
    };
  }

  const reduced = reducePolynomialOverCubicRadical(parsed.numerator, parsed.radicand);
  if (!reduced) {
    return {
      kind: 'stop',
      variable,
      reason: 'coefficient-solve-stop',
      detail: 'The exact cubic Hermite coefficient solve exceeded the bounded exact-rational surface.',
    };
  }

  if (exactPolynomialDegree(reduced.residual) > 1) {
    return {
      kind: 'stop',
      variable,
      reason: 'residual-not-basis-ready',
      detail: 'The Hermite solve did not reduce the residual to the dx/y and x dx/y basis.',
    };
  }

  const radicandNode = exactPolynomialToNode(parsed.radicand);
  const correctionNode = [
    'Multiply',
    exactPolynomialToNode(reduced.correction),
    ['Sqrt', radicandNode],
  ];
  const residualIntegrandNode = [
    'Divide',
    exactPolynomialToNode(reduced.residual),
    ['Sqrt', radicandNode],
  ];
  const result: AlgebraicGenus1CubicHermitePreconditionerSuccess = {
    kind: 'success',
    variable,
    status: 'cubic-hermite-preconditioner-ready',
    normalizedInputNode: parsed.normalizedInputNode,
    radicandPolynomial: parsed.radicand,
    numeratorPolynomial: parsed.numerator,
    correctionPolynomial: reduced.correction,
    residualPolynomial: reduced.residual,
    correctionNode,
    residualIntegrandNode,
    radicandLatex: exactPolynomialToLatex(parsed.radicand),
    numeratorLatex: exactPolynomialToLatex(parsed.numerator),
    correctionLatex: exactPolynomialToLatex(reduced.correction),
    residualLatex: exactPolynomialToLatex(reduced.residual),
    normalizedInputLatex: boxLatex(parsed.normalizedInputNode),
    residualBasisKinds: residualBasisKinds(reduced.residual),
    exactSupplementEntries: parsed.exactSupplementEntries,
    detailSections: [],
    canMapResidualLive: false,
    canAdoptLive: false,
  };

  return {
    ...result,
    detailSections: [
      ...(parsed.normalizedFromLatex
        ? [{
            title: 'Genus-1 Radical Product Normalization',
            lineKind: 'text' as const,
            lines: [
              `Original radical product: ${parsed.normalizedFromLatex}`,
              `Normalized polynomial-over-cubic-radical form: ${result.normalizedInputLatex}`,
              'The normalization is valid only under the displayed real-branch facts.',
            ],
          }]
        : []),
      detailSection(result),
    ],
  };
}
