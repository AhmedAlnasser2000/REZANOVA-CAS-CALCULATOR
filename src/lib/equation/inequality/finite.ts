import {
  greaterThanInequalitySet,
  greaterThanOrEqualInequalitySet,
  intersectInequalitySets,
  lessThanInequalitySet,
  lessThanOrEqualInequalitySet,
  unionInequalitySets,
  type InequalitySet,
} from '../../algebra/inequality-core';
import { buildSignChartInequalitySet } from '../../algebra/inequality-sign-analysis-core';
import {
  classifyPolynomialDomainNode,
  classifyRationalDomainNode,
} from '../../algebra/polynomial-domain-core';
import { factorBoundedPolynomialAst } from '../../algebra/polynomial-factor-solve';
import {
  addExactScalars,
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactScalarIsZero,
  exactScalarToNumber,
  getExactPolynomialCoefficient,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  quadraticDiscriminant,
  readExactScalarNode,
  type ExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import {
  expandAndSimplifyNode,
  latexForNode,
  numericValueForNode,
  rawLatexForNode,
  relationText,
  reverseRelation,
  simplifyNode,
} from './relation';
import {
  ROOT_EPSILON,
  type FiniteInequalityResult,
  type InequalityRelation,
  type RealRoot,
} from './types';

function perfectSquare(value: number) {
  if (value < 0 || !Number.isInteger(value)) {
    return null;
  }
  const root = Math.sqrt(value);
  return Number.isInteger(root) ? root : null;
}

function largestSquareFactor(value: number) {
  const absolute = Math.abs(value);
  let factor = 1;
  let remaining = absolute;
  for (let candidate = 2; candidate * candidate <= remaining; candidate += 1) {
    while (remaining % (candidate * candidate) === 0) {
      factor *= candidate;
      remaining /= candidate * candidate;
    }
  }
  return factor;
}

function exactScalarToLatex(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.denominator === 1
    ? `${normalized.numerator}`
    : `\\frac{${normalized.numerator}}{${normalized.denominator}}`;
}

function exactScalarToNode(value: ExactScalar) {
  return buildExactScalarNode(normalizeExactScalar(value));
}

function sqrtExactScalar(value: ExactScalar): ExactScalar | null {
  const normalized = normalizeExactScalar(value);
  const numeratorRoot = perfectSquare(normalized.numerator);
  const denominatorRoot = perfectSquare(normalized.denominator);
  return numeratorRoot !== null && denominatorRoot !== null
    ? normalizeExactScalar({ numerator: numeratorRoot, denominator: denominatorRoot })
    : null;
}

function sqrtScaledLatex(value: ExactScalar, coefficient: ExactScalar) {
  const exactRoot = sqrtExactScalar(value);
  if (exactRoot) {
    const product = normalizeExactScalar({
      numerator: exactRoot.numerator * coefficient.numerator,
      denominator: exactRoot.denominator * coefficient.denominator,
    });
    return exactScalarToLatex(product);
  }

  const normalizedValue = normalizeExactScalar(value);
  const numeratorOutside = largestSquareFactor(normalizedValue.numerator);
  const denominatorOutside = largestSquareFactor(normalizedValue.denominator);
  const outside = normalizeExactScalar({
    numerator: coefficient.numerator * numeratorOutside,
    denominator: coefficient.denominator * denominatorOutside,
  });
  const inside = normalizeExactScalar({
    numerator: normalizedValue.numerator / (numeratorOutside * numeratorOutside),
    denominator: normalizedValue.denominator / (denominatorOutside * denominatorOutside),
  });
  const sqrtLatex = inside.denominator === 1
    ? `\\sqrt{${inside.numerator}}`
    : `\\sqrt{${exactScalarToLatex(inside)}}`;

  if (outside.numerator === 1 && outside.denominator === 1) {
    return sqrtLatex;
  }
  if (outside.numerator === -1 && outside.denominator === 1) {
    return `-${sqrtLatex}`;
  }
  return `${exactScalarToLatex(outside)}${sqrtLatex}`;
}

function linearRoot(polynomial: ExactPolynomial): RealRoot | null {
  const root = divideExactScalars(
    negateExactScalar(getExactPolynomialCoefficient(polynomial, 0)),
    getExactPolynomialCoefficient(polynomial, 1),
  );
  if (!root) {
    return null;
  }
  return {
    numeric: exactScalarToNumber(root),
    latex: exactScalarToLatex(root),
  };
}

function quadraticRoots(polynomial: ExactPolynomial): RealRoot[] | null {
  const discriminant = quadraticDiscriminant(polynomial);
  if (!discriminant) {
    return null;
  }
  const discriminantNumber = exactScalarToNumber(discriminant);
  if (discriminantNumber < -ROOT_EPSILON) {
    return [];
  }

  const a = getExactPolynomialCoefficient(polynomial, 2);
  const b = getExactPolynomialCoefficient(polynomial, 1);
  const denominator = normalizeExactScalar({
    numerator: 2 * a.numerator,
    denominator: a.denominator,
  });
  const negativeB = negateExactScalar(b);

  if (Math.abs(discriminantNumber) <= ROOT_EPSILON) {
    const root = divideExactScalars(negativeB, denominator);
    return root ? [{ numeric: exactScalarToNumber(root), latex: exactScalarToLatex(root) }] : null;
  }

  const exactRoot = sqrtExactScalar(discriminant);
  const rootFromSign = (sign: 1 | -1): RealRoot | null => {
    if (exactRoot) {
      const signedRoot = sign === 1 ? exactRoot : negateExactScalar(exactRoot);
      const numerator = addExactScalars(negativeB, signedRoot);
      const root = divideExactScalars(numerator, denominator);
      return root ? { numeric: exactScalarToNumber(root), latex: exactScalarToLatex(root) } : null;
    }

    if (exactScalarIsZero(negativeB)) {
      const coefficient = divideExactScalars({ numerator: sign, denominator: 1 }, denominator);
      return coefficient
        ? {
          numeric: (sign * Math.sqrt(discriminantNumber)) / exactScalarToNumber(denominator),
          latex: sqrtScaledLatex(discriminant, coefficient),
        }
        : null;
    }

    const sqrtLatex = `\\sqrt{${exactScalarToLatex(discriminant)}}`;
    const denominatorLatex = exactScalarToLatex(denominator);
    const numeratorLatex = `${exactScalarToLatex(negativeB)}${sign === 1 ? '+' : '-'}${sqrtLatex}`;
    return {
      numeric: (exactScalarToNumber(negativeB) + sign * Math.sqrt(discriminantNumber))
        / exactScalarToNumber(denominator),
      latex: `\\frac{${numeratorLatex}}{${denominatorLatex}}`,
    };
  };

  const roots = [rootFromSign(-1), rootFromSign(1)];
  return roots.every((root): root is RealRoot => root !== null) ? roots : null;
}

function sortAndDedupeRoots(roots: RealRoot[]) {
  return roots
    .slice()
    .sort((left, right) => left.numeric - right.numeric)
    .filter((root, index, list) =>
      index === 0 || Math.abs(root.numeric - list[index - 1].numeric) > ROOT_EPSILON);
}

function realRootsForPolynomial(polynomial: ExactPolynomial, zeroForm: unknown): RealRoot[] | null {
  const degree = exactPolynomialDegree(polynomial);
  if (degree <= 0) {
    return [];
  }
  if (degree === 1) {
    const root = linearRoot(polynomial);
    return root ? [root] : null;
  }
  if (degree === 2) {
    const roots = quadraticRoots(polynomial);
    return roots ? sortAndDedupeRoots(roots) : null;
  }

  const factorization = factorBoundedPolynomialAst(zeroForm, polynomial.variable);
  if (!factorization) {
    return null;
  }

  const roots: RealRoot[] = [];
  for (const factor of factorization.factors) {
    const factorPolynomial = parseExactPolynomial(factor.node, polynomial.variable, 2);
    if (!factorPolynomial) {
      return null;
    }
    if (factor.degree === 1) {
      const root = linearRoot(factorPolynomial);
      if (!root) {
        return null;
      }
      roots.push(root);
      continue;
    }
    if (factor.degree === 2) {
      const quadratic = quadraticRoots(factorPolynomial);
      if (!quadratic) {
        return null;
      }
      roots.push(...quadratic);
      continue;
    }
    return null;
  }

  return sortAndDedupeRoots(roots);
}

function evaluatePolynomial(polynomial: ExactPolynomial, value: number) {
  let result = 0;
  const degree = exactPolynomialDegree(polynomial);
  for (let index = degree; index >= 0; index -= 1) {
    result = result * value + exactScalarToNumber(getExactPolynomialCoefficient(polynomial, index));
  }
  return result;
}

function finiteSuccess(input: {
  set: InequalitySet;
  route: string;
  lines: string[];
  proofDetails?: string[];
  validWhenLatex?: string[];
}): FiniteInequalityResult {
  return {
    kind: 'finite',
    set: input.set,
    route: input.route,
    lines: input.lines,
    proofDetails: input.proofDetails ?? [],
    validWhenLatex: input.validWhenLatex ?? [],
  };
}

function combineFiniteResults(
  kind: 'intersection' | 'union',
  route: string,
  results: readonly FiniteInequalityResult[],
  lines: readonly string[],
): FiniteInequalityResult {
  const set = kind === 'intersection'
    ? results.slice(1).reduce((current, result) => intersectInequalitySets(current, result.set), results[0].set)
    : unionInequalitySets(...results.map((result) => result.set));
  return finiteSuccess({
    set,
    route,
    lines: [
      ...lines,
      ...results.flatMap((result) => result.lines),
    ],
    proofDetails: results.flatMap((result) => result.proofDetails),
    validWhenLatex: results.flatMap((result) => result.validWhenLatex),
  });
}

function solveWithSignChart(input: {
  variable: string;
  relation: InequalityRelation;
  roots: readonly RealRoot[];
  exclusions?: readonly RealRoot[];
  evaluateAt: (value: number) => number | null;
}) {
  return buildSignChartInequalitySet({
    variable: input.variable,
    relation: input.relation,
    roots: input.roots.map((root) => ({ numeric: root.numeric, latex: root.latex })),
    exclusions: (input.exclusions ?? []).map((root) => ({ numeric: root.numeric, latex: root.latex })),
    evaluateAt: input.evaluateAt,
  });
}

function polynomialInequality(
  left: unknown,
  right: unknown,
  relation: InequalityRelation,
  target: string,
): FiniteInequalityResult | null {
  const zeroForm = expandAndSimplifyNode(['Subtract', left, right]);
  const classified = classifyPolynomialDomainNode(zeroForm, { variable: target, maxDegree: 4 });
  if (classified.kind !== 'success') {
    return null;
  }

  const polynomial = classified.metadata.polynomial;
  const roots = realRootsForPolynomial(polynomial, zeroForm);
  if (!roots) {
    return null;
  }
  const chart = solveWithSignChart({
    variable: classified.metadata.variable,
    relation,
    roots,
    evaluateAt: (value) => evaluatePolynomial(polynomial, value),
  });
  if (chart.kind !== 'success') {
    return null;
  }

  const degree = exactPolynomialDegree(polynomial);
  return finiteSuccess({
    set: chart.set,
    route: degree <= 1 ? 'linear-polynomial' : 'polynomial-sign-chart',
    lines: [
      `Solved a bounded one-variable polynomial inequality through degree ${degree}.`,
      `Relation tested: p(x) ${relationText(relation)} 0.`,
      `Polynomial degree: ${degree}.`,
    ],
  });
}

function polynomialAgainstNumericBound(
  left: unknown,
  right: unknown,
  relation: InequalityRelation,
  target: string,
): FiniteInequalityResult | null {
  const rightNumeric = numericValueForNode(right);
  if (rightNumeric === null || readExactScalarNode(right) !== null) {
    return null;
  }
  const classified = classifyPolynomialDomainNode(left, { variable: target, maxDegree: 2 });
  if (classified.kind !== 'success' || classified.metadata.degree !== 2) {
    return null;
  }

  const polynomial = classified.metadata.polynomial;
  const quadratic = getExactPolynomialCoefficient(polynomial, 2);
  const linear = getExactPolynomialCoefficient(polynomial, 1);
  const constant = getExactPolynomialCoefficient(polynomial, 0);
  if (Math.abs(exactScalarToNumber(quadratic) - 1) > ROOT_EPSILON || !exactScalarIsZero(linear)) {
    return null;
  }

  const constantNumber = exactScalarToNumber(constant);
  const radicandNumeric = rightNumeric - constantNumber;
  const boundLatex = rawLatexForNode(right);
  const constantLatex = exactScalarToLatex(normalizeExactScalar({
    numerator: Math.abs(constant.numerator),
    denominator: constant.denominator,
  }));
  const radicandLatex = exactScalarIsZero(constant)
    ? boundLatex
    : constantNumber < 0
      ? `${constantLatex}+${boundLatex}`
      : `${boundLatex}-${constantLatex}`;
  const roots = radicandNumeric < -ROOT_EPSILON
    ? []
    : [
      { numeric: -Math.sqrt(Math.max(0, radicandNumeric)), latex: `-\\sqrt{${radicandLatex}}` },
      { numeric: Math.sqrt(Math.max(0, radicandNumeric)), latex: `\\sqrt{${radicandLatex}}` },
    ];

  const chart = solveWithSignChart({
    variable: target,
    relation,
    roots,
    evaluateAt: (value) => evaluatePolynomial(polynomial, value) - rightNumeric,
  });
  if (chart.kind !== 'success') {
    return null;
  }

  return finiteSuccess({
    set: chart.set,
    route: 'quadratic-numeric-bound',
    lines: [
      'Solved a guarded quadratic inequality against a non-rational numeric bound.',
      `Relation tested: p(x) ${relationText(relation)} ${boundLatex}.`,
    ],
  });
}

function rationalInequality(
  left: unknown,
  right: unknown,
  relation: InequalityRelation,
  target: string,
): FiniteInequalityResult | null {
  const zeroForm = simplifyNode(['Subtract', left, right]);
  const classified = classifyRationalDomainNode(zeroForm, { variable: target, maxDegree: 4 });
  if (classified.kind !== 'success' || classified.metadata.denominator.degree === 0) {
    return null;
  }

  const numeratorRoots = realRootsForPolynomial(
    classified.metadata.rational.numerator,
    classified.metadata.numerator.node,
  );
  const denominatorRoots = realRootsForPolynomial(
    classified.metadata.rational.denominator,
    classified.metadata.denominator.node,
  );
  if (!numeratorRoots || !denominatorRoots) {
    return null;
  }

  const chart = solveWithSignChart({
    variable: classified.metadata.variable,
    relation,
    roots: numeratorRoots,
    exclusions: denominatorRoots,
    evaluateAt: (value) => {
      const denominator = evaluatePolynomial(classified.metadata.rational.denominator, value);
      if (Math.abs(denominator) <= ROOT_EPSILON) {
        return null;
      }
      return evaluatePolynomial(classified.metadata.rational.numerator, value) / denominator;
    },
  });
  if (chart.kind !== 'success') {
    return null;
  }

  return finiteSuccess({
    set: chart.set,
    route: 'rational-sign-chart',
    lines: [
      'Solved a factorable one-variable rational inequality through degree 4.',
      `Relation tested: r(x) ${relationText(relation)} 0.`,
    ],
    validWhenLatex: denominatorRoots.map((root) => `${target}\\ne${root.latex}`),
  });
}

function polynomialNumericCoefficients(polynomial: ExactPolynomial) {
  const degree = exactPolynomialDegree(polynomial);
  return Array.from({ length: degree + 1 }, (_, index) =>
    exactScalarToNumber(getExactPolynomialCoefficient(polynomial, index)));
}

function evaluateNumericPolynomial(coefficients: readonly number[], value: number) {
  let result = 0;
  for (let index = coefficients.length - 1; index >= 0; index -= 1) {
    result = result * value + coefficients[index];
  }
  return result;
}

function numericPolynomialDegree(coefficients: readonly number[]) {
  for (let index = coefficients.length - 1; index >= 0; index -= 1) {
    if (Math.abs(coefficients[index]) > ROOT_EPSILON) {
      return index;
    }
  }
  return 0;
}

function rationalAgainstNumericBound(
  left: unknown,
  right: unknown,
  relation: InequalityRelation,
  target: string,
): FiniteInequalityResult | null {
  const rightNumeric = numericValueForNode(right);
  if (rightNumeric === null || readExactScalarNode(right) !== null) {
    return null;
  }

  const classified = classifyRationalDomainNode(left, { variable: target, maxDegree: 4 });
  if (classified.kind !== 'success' || classified.metadata.denominator.degree === 0) {
    return null;
  }

  const numeratorCoefficients = polynomialNumericCoefficients(classified.metadata.rational.numerator);
  const denominatorCoefficients = polynomialNumericCoefficients(classified.metadata.rational.denominator);
  const adjustedLength = Math.max(numeratorCoefficients.length, denominatorCoefficients.length);
  const adjustedNumerator = Array.from({ length: adjustedLength }, (_, index) =>
    (numeratorCoefficients[index] ?? 0) - rightNumeric * (denominatorCoefficients[index] ?? 0));
  if (numericPolynomialDegree(adjustedNumerator) > 1) {
    return null;
  }

  const denominatorRoots = realRootsForPolynomial(
    classified.metadata.rational.denominator,
    classified.metadata.denominator.node,
  );
  if (!denominatorRoots) {
    return null;
  }

  const adjustedLinearCoefficient = adjustedNumerator[1] ?? 0;
  const adjustedConstant = adjustedNumerator[0] ?? 0;
  const numeratorRoots: RealRoot[] = Math.abs(adjustedLinearCoefficient) <= ROOT_EPSILON
    ? []
    : [{
        numeric: -adjustedConstant / adjustedLinearCoefficient,
        latex: latexForNode(simplifyNode([
          'Divide',
          [
            'Subtract',
            ['Multiply', right, exactScalarToNode(getExactPolynomialCoefficient(classified.metadata.rational.denominator, 0))],
            exactScalarToNode(getExactPolynomialCoefficient(classified.metadata.rational.numerator, 0)),
          ],
          [
            'Subtract',
            exactScalarToNode(getExactPolynomialCoefficient(classified.metadata.rational.numerator, 1)),
            ['Multiply', right, exactScalarToNode(getExactPolynomialCoefficient(classified.metadata.rational.denominator, 1))],
          ],
        ])),
      }];

  const chart = solveWithSignChart({
    variable: classified.metadata.variable,
    relation,
    roots: numeratorRoots,
    exclusions: denominatorRoots,
    evaluateAt: (value) => {
      const denominator = evaluatePolynomial(classified.metadata.rational.denominator, value);
      if (Math.abs(denominator) <= ROOT_EPSILON) {
        return null;
      }
      return evaluateNumericPolynomial(adjustedNumerator, value) / denominator;
    },
  });
  if (chart.kind !== 'success') {
    return null;
  }

  return finiteSuccess({
    set: chart.set,
    route: 'rational-numeric-bound-sign-chart',
    lines: [
      'Solved a factorable one-variable rational inequality against an exact numeric bound.',
      `Relation tested: r(x) ${relationText(relation)} ${rawLatexForNode(right)}.`,
    ],
    validWhenLatex: denominatorRoots.map((root) => `${target}\\ne${root.latex}`),
  });
}

function solveAffineAgainstNumericBound(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
}): FiniteInequalityResult | null {
  const rightNumeric = numericValueForNode(input.right);
  if (rightNumeric === null) {
    return null;
  }
  const classified = classifyPolynomialDomainNode(input.left, { variable: input.target, maxDegree: 1 });
  if (classified.kind !== 'success' || classified.metadata.degree !== 1) {
    return null;
  }

  const a = getExactPolynomialCoefficient(classified.metadata.polynomial, 1);
  const b = getExactPolynomialCoefficient(classified.metadata.polynomial, 0);
  const aNumber = exactScalarToNumber(a);
  if (Math.abs(aNumber) <= ROOT_EPSILON) {
    return null;
  }
  const bNumber = exactScalarToNumber(b);
  const rootNumeric = (rightNumeric - bNumber) / aNumber;
  const relation = aNumber < 0 ? reverseRelation(input.relation) : input.relation;
  const rootNode = simplifyNode([
    'Divide',
    ['Subtract', input.right, exactScalarToNode(b)],
    exactScalarToNode(a),
  ]);
  const rightLatex = rawLatexForNode(input.right);
  const rightIsExactScalar = readExactScalarNode(input.right) !== null;
  const rootLatex = rightIsExactScalar
    ? latexForNode(rootNode)
    : Math.abs(aNumber - 1) <= ROOT_EPSILON && Math.abs(bNumber) <= ROOT_EPSILON
      ? rightLatex
      : Math.abs(aNumber - 1) <= ROOT_EPSILON && b.denominator === 1 && b.numerator < 0
        ? `${Math.abs(b.numerator)}+${rightLatex}`
        : latexForNode(rootNode);

  let set: InequalitySet;
  switch (relation) {
    case 'Less':
      set = lessThanInequalitySet(input.target, rootNumeric);
      break;
    case 'LessEqual':
      set = lessThanOrEqualInequalitySet(input.target, rootNumeric);
      break;
    case 'Greater':
      set = greaterThanInequalitySet(input.target, rootNumeric);
      break;
    case 'GreaterEqual':
      set = greaterThanOrEqualInequalitySet(input.target, rootNumeric);
      break;
  }
  set = {
    ...set,
    intervals: set.intervals.map((interval) => ({
      ...interval,
      lowerLatex: interval.lower !== undefined ? rootLatex : interval.lowerLatex,
      upperLatex: interval.upper !== undefined ? rootLatex : interval.upperLatex,
    })),
  };

  return finiteSuccess({
    set,
    route: 'affine-transcendental-bound',
    lines: [
      'Reduced a monotone inequality to an affine real bound.',
    ],
  });
}


export {
  combineFiniteResults,
  exactScalarToLatex,
  exactScalarToNode,
  finiteSuccess,
  polynomialAgainstNumericBound,
  polynomialInequality,
  rationalAgainstNumericBound,
  rationalInequality,
  solveAffineAgainstNumericBound,
};
