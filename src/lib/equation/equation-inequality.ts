import { ComputeEngine, expand } from '@cortex-js/compute-engine';
import {
  allRealInequalitySet,
  emptyInequalitySet,
  greaterThanInequalitySet,
  greaterThanOrEqualInequalitySet,
  inequalitySetToLatex,
  inequalitySetToText,
  intersectInequalitySets,
  lessThanInequalitySet,
  lessThanOrEqualInequalitySet,
  periodicInequalitySetToLatex,
  periodicInequalitySetToText,
  unionInequalitySets,
  type InequalitySet,
  type PeriodicInequalitySet,
} from '../algebra/inequality-core';
import {
  buildSignChartInequalitySet,
  relationToSymbol,
} from '../algebra/inequality-sign-analysis-core';
import {
  classifyPolynomialDomainNode,
  classifyRationalDomainNode,
} from '../algebra/polynomial-domain-core';
import { factorBoundedPolynomialAst } from '../algebra/polynomial-factor-solve';
import {
  addExactScalars,
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactScalarIsZero,
  exactScalarToNumber,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  quadraticDiscriminant,
  readExactScalarNode,
  type ExactPolynomial,
  type ExactScalar,
} from '../algebra/polynomial-core';
import { normalizeAst } from '../symbolic-engine/normalize';
import { formatAngleLatex, convertAngle } from '../trigonometry/angles';
import { formatNumber } from '../display/format';
import type {
  AngleUnit,
  DisplayDetailSection,
  DisplayOutcome,
  EquationAnswerMode,
  EquationDomainIntent,
  OutputStyle,
} from '../../types/calculator';
import {
  extractEquationPolynomialDomain,
  isEquationPolynomialRelation,
  type EquationPolynomialRelation,
} from './equation-polynomial-domain';

type InequalityRelation = Exclude<EquationPolynomialRelation, 'Equal'>;
type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

type RealRoot = {
  numeric: number;
  latex: string;
};

type TopLevelInequality = {
  relation: InequalityRelation;
  left: MathJson;
  right: MathJson;
};

type FiniteInequalityResult = {
  kind: 'finite';
  set: InequalitySet;
  route: string;
  lines: string[];
  proofDetails: string[];
  validWhenLatex: string[];
};

type PeriodicInequalityResult = {
  kind: 'periodic';
  set: PeriodicInequalitySet;
  route: string;
  lines: string[];
  proofDetails: string[];
  validWhenLatex: string[];
  exactLatexOverride?: string;
  readbackTextOverride?: string;
  approxText?: string;
};

type InternalInequalityResult =
  | FiniteInequalityResult
  | PeriodicInequalityResult
  | { kind: 'stop'; reason: string };

type TrigThresholdResult =
  | { kind: 'all' }
  | { kind: 'empty' }
  | {
    kind: 'intervals';
    intervals: readonly (readonly [number, number])[];
    period: number;
  };

const ce = new ComputeEngine();
const ROOT_EPSILON = 1e-9;
const DEFAULT_MAX_REDUCTION_DEPTH = 4;
const TRIG_EPSILON = 1e-10;
const NUMERIC_CONSTANT_SYMBOLS = new Set(['Pi', 'ExponentialE']);
const INNER_TRIG_VARIABLE = '__innerTrigValue';

type TrigFunctionKind = 'sin' | 'cos' | 'tan';

type TrigCall = {
  kind: TrigFunctionKind;
  argument: unknown;
};

type NumericPeriodicInterval = {
  lower: number;
  lowerInclusive: boolean;
  upper: number;
  upperInclusive: boolean;
};

type NumericPeriodicSet = {
  period: number;
  intervals: readonly NumericPeriodicInterval[];
};

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function relationFromLatexFallback(latex: string) {
  return /\\(?:le|leq|ge|geq)(?![A-Za-z])|[<>≤≥]/u.test(latex);
}

export function isTopLevelInequalityLatex(latex: string) {
  const extracted = extractEquationPolynomialDomain({
    equationLatex: latex,
    allowedRelations: ['Less', 'LessEqual', 'Greater', 'GreaterEqual'],
  });
  return extracted.kind === 'success'
    || (extracted.kind === 'stop' && extracted.reason !== 'unsupported-relation')
    || relationFromLatexFallback(latex);
}

function relationText(relation: InequalityRelation) {
  return relationToSymbol(relation);
}

function latexText(text: string) {
  return `\\text{${text.replace(/[{}]/g, '')}}`;
}

function dedupeStrings(lines: readonly string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    deduped.push(normalized);
  }
  return deduped;
}

function reverseRelation(relation: InequalityRelation): InequalityRelation {
  switch (relation) {
    case 'Less':
      return 'Greater';
    case 'LessEqual':
      return 'GreaterEqual';
    case 'Greater':
      return 'Less';
    case 'GreaterEqual':
      return 'LessEqual';
  }
}

function simplifyNode(node: unknown): MathJson {
  try {
    return normalizeAst(ce.box(node as Parameters<typeof ce.box>[0]).simplify().json) as MathJson;
  } catch {
    return normalizeAst(node) as MathJson;
  }
}

function expandAndSimplifyNode(node: unknown): MathJson {
  try {
    const expanded = expand(ce.box(node as Parameters<typeof ce.box>[0]) as never) as { json: unknown };
    return simplifyNode(expanded.json);
  } catch {
    return simplifyNode(node);
  }
}

function latexForNode(node: unknown) {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).latex.replaceAll('\\exponentialE', 'e');
  } catch {
    return '';
  }
}

function rawLatexForNode(node: unknown) {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).latex.replaceAll('\\exponentialE', 'e');
  } catch {
    return '';
  }
}

function topLevelInequality(equationLatex: string): TopLevelInequality | null {
  let json: unknown;
  try {
    json = ce.parse(equationLatex).json;
  } catch {
    return null;
  }
  if (!isNodeArray(json) || !isEquationPolynomialRelation(json[0]) || json[0] === 'Equal' || json.length !== 3) {
    return null;
  }
  return {
    relation: json[0],
    left: json[1] as MathJson,
    right: json[2] as MathJson,
  };
}

function collectVariables(node: unknown, variables = new Set<string>()) {
  if (typeof node === 'string') {
    if (!NUMERIC_CONSTANT_SYMBOLS.has(node)) {
      variables.add(node);
    }
    return variables;
  }
  if (!isNodeArray(node)) {
    return variables;
  }
  for (const child of node.slice(1)) {
    collectVariables(child, variables);
  }
  return variables;
}

function resolveTarget(inputTarget: string | null | undefined, left: unknown, right: unknown) {
  if (inputTarget?.trim()) {
    return inputTarget.trim();
  }
  const variables = collectVariables(['Add', left, right]);
  return variables.size === 1 ? [...variables][0] : null;
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

function numericValueForNode(node: unknown): number | null {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return exactScalarToNumber(scalar);
  }
  try {
    const numeric = ce.box(node as Parameters<typeof ce.box>[0]).evaluate().N?.()
      ?? ce.box(node as Parameters<typeof ce.box>[0]).evaluate();
    const json = numeric.json;
    if (typeof json === 'number' && Number.isFinite(json)) {
      return json;
    }
    if (typeof json === 'object' && json !== null && 'num' in json) {
      const parsed = Number((json as { num: string }).num);
      return Number.isFinite(parsed) ? parsed : null;
    }
  } catch {
    return null;
  }
  return null;
}

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

function exactScalarIsOne(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.numerator === normalized.denominator;
}

function addExactScalarList(values: readonly ExactScalar[]) {
  return values.reduce<ExactScalar>(
    (current, value) => addExactScalars(current, value),
    { numerator: 0, denominator: 1 },
  );
}

function multiplyExactScalarList(values: readonly ExactScalar[]) {
  return values.reduce<ExactScalar>(
    (current, value) => multiplyExactScalars(current, value),
    { numerator: 1, denominator: 1 },
  );
}

function buildAddNode(terms: readonly unknown[]) {
  return terms.length === 1 ? terms[0] : simplifyNode(['Add', ...terms]);
}

function buildMultiplyNode(factors: readonly unknown[]) {
  return factors.length === 1 ? factors[0] : simplifyNode(['Multiply', ...factors]);
}

function peelAdditiveNumericShell(expression: unknown, bound: unknown, relation: InequalityRelation) {
  if (!isNodeArray(expression) || expression[0] !== 'Add' || expression.length < 3) {
    return null;
  }

  const scalarTerms: ExactScalar[] = [];
  const expressionTerms: unknown[] = [];
  for (const term of expression.slice(1)) {
    const scalar = readExactScalarNode(term);
    if (scalar) {
      scalarTerms.push(scalar);
    } else {
      expressionTerms.push(term);
    }
  }

  if (expressionTerms.length !== 1 || scalarTerms.length === 0) {
    return null;
  }

  const scalarSum = addExactScalarList(scalarTerms);
  if (exactScalarIsZero(scalarSum)) {
    return null;
  }

  return {
    left: buildAddNode(expressionTerms),
    right: simplifyNode(['Subtract', bound, exactScalarToNode(scalarSum)]),
    relation,
    line: 'Moved a target-free additive shell across the inequality.',
  };
}

function reciprocalExactScalar(value: ExactScalar) {
  return value.numerator === 0
    ? null
    : normalizeExactScalar({ numerator: value.denominator, denominator: value.numerator });
}

function peelMultiplicativeNumericShell(expression: unknown, bound: unknown, relation: InequalityRelation) {
  const factors = isNodeArray(expression) && expression[0] === 'Multiply'
    ? expression.slice(1)
    : isNodeArray(expression) && expression[0] === 'Divide' && expression.length === 3
      ? [expression[1], ['Power', expression[2], -1]]
      : null;
  if (!factors || factors.length < 2) {
    return null;
  }

  const scalarFactors: ExactScalar[] = [];
  const expressionFactors: unknown[] = [];
  for (const factor of factors) {
    const reciprocal =
      isNodeArray(factor) && factor[0] === 'Power' && factor.length === 3 && factor[2] === -1
        ? readExactScalarNode(factor[1])
        : null;
    if (reciprocal) {
      const inverted = reciprocalExactScalar(reciprocal);
      if (!inverted) {
        return null;
      }
      scalarFactors.push(inverted);
      continue;
    }

    const scalar = readExactScalarNode(factor);
    if (scalar) {
      scalarFactors.push(scalar);
    } else {
      expressionFactors.push(factor);
    }
  }

  if (expressionFactors.length === 0 || scalarFactors.length === 0) {
    return null;
  }

  const scalarProduct = multiplyExactScalarList(scalarFactors);
  if (exactScalarIsZero(scalarProduct) || exactScalarIsOne(scalarProduct)) {
    return null;
  }

  const scalarSign = exactScalarToNumber(scalarProduct);
  return {
    left: buildMultiplyNode(expressionFactors),
    right: simplifyNode(['Divide', bound, exactScalarToNode(scalarProduct)]),
    relation: scalarSign < 0 ? reverseRelation(relation) : relation,
    line: scalarSign < 0
      ? 'Scaled both sides by a negative target-free factor and flipped the inequality direction.'
      : 'Scaled both sides by a positive target-free factor.',
  };
}

function peelNumericShellComparison(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
}): { left: unknown; right: unknown; relation: InequalityRelation; line: string } | null {
  if (numericValueForNode(input.right) !== null) {
    return peelAdditiveNumericShell(input.left, input.right, input.relation)
      ?? peelMultiplicativeNumericShell(input.left, input.right, input.relation);
  }

  if (numericValueForNode(input.left) !== null) {
    const reversedRelation = reverseRelation(input.relation);
    return peelAdditiveNumericShell(input.right, input.left, reversedRelation)
      ?? peelMultiplicativeNumericShell(input.right, input.left, reversedRelation);
  }

  return null;
}

function solveFiniteNode(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
  depth: number;
}): FiniteInequalityResult | null {
  const peeledShell = peelNumericShellComparison(input);
  if (peeledShell) {
    const reduced = solveFiniteNode({
      left: peeledShell.left,
      right: peeledShell.right,
      relation: peeledShell.relation,
      target: input.target,
      depth: input.depth,
    });
    if (reduced) {
      return {
        ...reduced,
        lines: [
          peeledShell.line,
          ...reduced.lines,
        ],
      };
    }
  }

  const affineLeft = solveAffineAgainstNumericBound(input);
  if (affineLeft) {
    return affineLeft;
  }
  const affineRight = solveAffineAgainstNumericBound({
    left: input.right,
    right: input.left,
    relation: reverseRelation(input.relation),
    target: input.target,
  });
  if (affineRight) {
    return affineRight;
  }

  const polynomialNumeric = polynomialAgainstNumericBound(
    input.left,
    input.right,
    input.relation,
    input.target,
  );
  if (polynomialNumeric) {
    return polynomialNumeric;
  }
  const reversedPolynomialNumeric = polynomialAgainstNumericBound(
    input.right,
    input.left,
    reverseRelation(input.relation),
    input.target,
  );
  if (reversedPolynomialNumeric) {
    return reversedPolynomialNumeric;
  }

  const polynomial = polynomialInequality(input.left, input.right, input.relation, input.target);
  if (polynomial) {
    return polynomial;
  }
  const rational = rationalInequality(input.left, input.right, input.relation, input.target);
  if (rational) {
    return rational;
  }
  const rationalNumeric = rationalAgainstNumericBound(
    input.left,
    input.right,
    input.relation,
    input.target,
  );
  if (rationalNumeric) {
    return rationalNumeric;
  }
  const reversedRationalNumeric = rationalAgainstNumericBound(
    input.right,
    input.left,
    reverseRelation(input.relation),
    input.target,
  );
  if (reversedRationalNumeric) {
    return reversedRationalNumeric;
  }
  if (input.depth <= 0) {
    return null;
  }

  return absoluteInequality(input)
    ?? radicalInequality(input)
    ?? logExpInequality(input);
}

function scalarSign(node: unknown) {
  const numeric = numericValueForNode(node);
  if (numeric === null) {
    return null;
  }
  if (Math.abs(numeric) <= ROOT_EPSILON) {
    return 0;
  }
  return numeric > 0 ? 1 : -1;
}

function negateNode(node: unknown) {
  return simplifyNode(['Negate', node]);
}

function absoluteInequality(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
  depth: number;
}): FiniteInequalityResult | null {
  const normalized = normalizeUnaryComparison(input, 'Abs');
  if (!normalized) {
    return null;
  }
  const sign = scalarSign(normalized.bound);
  if (sign === null) {
    return null;
  }
  const variable = input.target;
  if (sign < 0) {
    const set = normalized.relation === 'Greater' || normalized.relation === 'GreaterEqual'
      ? allRealInequalitySet(variable)
      : emptyInequalitySet(variable);
    return finiteSuccess({
      set,
      route: 'absolute-value',
      lines: ['Resolved a textbook absolute-value inequality with a negative bound.'],
    });
  }

  const nextDepth = input.depth - 1;
  const inner = normalized.inner;
  const bound = normalized.bound;
  const negativeBound = negateNode(bound);
  if (normalized.relation === 'Less' || normalized.relation === 'LessEqual') {
    const upper = solveFiniteNode({
      left: inner,
      right: bound,
      relation: normalized.relation,
      target: variable,
      depth: nextDepth,
    });
    const lower = solveFiniteNode({
      left: inner,
      right: negativeBound,
      relation: reverseRelation(normalized.relation),
      target: variable,
      depth: nextDepth,
    });
    return upper && lower
      ? combineFiniteResults('intersection', 'absolute-value', [upper, lower], [
        'Split a textbook absolute-value inequality into matching upper/lower bounds.',
      ])
      : null;
  }

  const upper = solveFiniteNode({
    left: inner,
    right: bound,
    relation: normalized.relation,
    target: variable,
    depth: nextDepth,
  });
  const lower = solveFiniteNode({
    left: inner,
    right: negativeBound,
    relation: reverseRelation(normalized.relation),
    target: variable,
    depth: nextDepth,
  });
  return upper && lower
    ? combineFiniteResults('union', 'absolute-value', [upper, lower], [
      'Split a textbook absolute-value inequality into outer formula branches.',
    ])
    : null;
}

function squareNode(node: unknown) {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return exactScalarToNode(multiplyExactScalars(scalar, scalar));
  }
  return simplifyNode(['Power', node, 2]);
}

function radicalInequality(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
  depth: number;
}): FiniteInequalityResult | null {
  const normalized = normalizeUnaryComparison(input, 'Sqrt');
  if (!normalized) {
    return null;
  }
  const sign = scalarSign(normalized.bound);
  if (sign === null) {
    return null;
  }

  const domain = solveFiniteNode({
    left: normalized.inner,
    right: 0,
    relation: 'GreaterEqual',
    target: input.target,
    depth: input.depth - 1,
  });
  if (!domain) {
    return null;
  }

  const boundSquare = squareNode(normalized.bound);
  let comparison: FiniteInequalityResult | null;
  switch (normalized.relation) {
    case 'Less':
      comparison = sign <= 0
        ? finiteSuccess({ set: emptyInequalitySet(input.target), route: 'radical', lines: ['Square-root values are nonnegative.'] })
        : solveFiniteNode({
          left: normalized.inner,
          right: boundSquare,
          relation: 'Less',
          target: input.target,
          depth: input.depth - 1,
        });
      break;
    case 'LessEqual':
      comparison = sign < 0
        ? finiteSuccess({ set: emptyInequalitySet(input.target), route: 'radical', lines: ['Square-root values are nonnegative.'] })
        : solveFiniteNode({
          left: normalized.inner,
          right: boundSquare,
          relation: 'LessEqual',
          target: input.target,
          depth: input.depth - 1,
        });
      break;
    case 'Greater':
      comparison = sign < 0
        ? domain
        : solveFiniteNode({
          left: normalized.inner,
          right: boundSquare,
          relation: sign === 0 ? 'Greater' : 'Greater',
          target: input.target,
          depth: input.depth - 1,
        });
      break;
    case 'GreaterEqual':
      comparison = sign <= 0
        ? domain
        : solveFiniteNode({
          left: normalized.inner,
          right: boundSquare,
          relation: 'GreaterEqual',
          target: input.target,
          depth: input.depth - 1,
        });
      break;
  }

  if (!comparison) {
    return null;
  }

  const combined = combineFiniteResults('intersection', 'radical', [domain, comparison], [
    'Inverted a guarded square-root inequality and preserved the real radicand domain.',
  ]);
  return {
    ...combined,
    validWhenLatex: dedupeStrings([
      ...combined.validWhenLatex,
      `${latexForNode(normalized.inner)}\\ge0`,
    ]),
  };
}

function logExpInequality(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
  depth: number;
}): FiniteInequalityResult | null {
  const log = normalizeLogComparison(input);
  if (log) {
    const domain = solveFiniteNode({
      left: log.inner,
      right: 0,
      relation: 'Greater',
      target: input.target,
      depth: input.depth - 1,
    });
    const comparison = solveFiniteNode({
      left: log.inner,
      right: log.bound,
      relation: log.relation,
      target: input.target,
      depth: input.depth - 1,
    });
    if (!domain || !comparison) {
      return null;
    }
    const combined = combineFiniteResults('intersection', 'logarithm', [domain, comparison], [
      'Inverted a monotone logarithm inequality and preserved the positive argument domain.',
    ]);
    return {
      ...combined,
      validWhenLatex: dedupeStrings([
        ...combined.validWhenLatex,
        `${latexForNode(log.inner)}>0`,
        ...(log.baseLatex ? [`${log.baseLatex}>0`, `${log.baseLatex}\\ne1`] : []),
      ]),
    };
  }

  const exp = normalizeExpComparison(input);
  if (!exp) {
    return null;
  }
  const sign = scalarSign(exp.bound);
  if (sign === null) {
    return null;
  }
  if (sign <= 0) {
    const set = exp.relation === 'Greater' || exp.relation === 'GreaterEqual'
      ? allRealInequalitySet(input.target)
      : emptyInequalitySet(input.target);
    return finiteSuccess({
      set,
      route: 'exponential',
      lines: ['Resolved an exponential inequality against a nonpositive bound.'],
    });
  }
  const comparison = solveFiniteNode({
    left: exp.inner,
    right: ['Ln', exp.bound],
    relation: exp.relation,
    target: input.target,
    depth: input.depth - 1,
  });
  return comparison
    ? finiteSuccess({
      ...comparison,
      route: 'exponential',
      lines: [
        'Inverted a monotone exponential inequality.',
        ...comparison.lines,
      ],
    })
    : null;
}

function normalizeUnaryComparison(
  input: {
    left: unknown;
    right: unknown;
    relation: InequalityRelation;
  },
  operator: 'Abs' | 'Sqrt',
): { inner: unknown; bound: unknown; relation: InequalityRelation } | null {
  if (isNodeArray(input.left) && input.left[0] === operator && input.left.length === 2 && numericValueForNode(input.right) !== null) {
    return { inner: input.left[1], bound: input.right, relation: input.relation };
  }
  if (isNodeArray(input.right) && input.right[0] === operator && input.right.length === 2 && numericValueForNode(input.left) !== null) {
    return { inner: input.right[1], bound: input.left, relation: reverseRelation(input.relation) };
  }
  return null;
}

function normalizeLogComparison(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
}): { inner: unknown; bound: unknown; relation: InequalityRelation; baseLatex?: string } | null {
  const readLog = (node: unknown) => {
    if (!isNodeArray(node)) {
      return null;
    }
    if (node[0] === 'Ln' && node.length === 2) {
      return { inner: node[1], base: Math.E, baseLatex: undefined };
    }
    if (node[0] === 'Log' && node.length >= 2) {
      const baseNode = node.length >= 3 ? node[2] : 10;
      const base = numericValueForNode(baseNode);
      return base && base > 0 && Math.abs(base - 1) > ROOT_EPSILON
        ? { inner: node[1], base, baseLatex: latexForNode(baseNode) || `${base}` }
        : null;
    }
    return null;
  };

  const leftLog = readLog(input.left);
  if (leftLog && numericValueForNode(input.right) !== null) {
    const bound = leftLog.base === Math.E
      ? ['Power', 'ExponentialE', input.right]
      : ['Power', leftLog.base, input.right];
    return {
      inner: leftLog.inner,
      bound,
      relation: leftLog.base > 1 ? input.relation : reverseRelation(input.relation),
      baseLatex: leftLog.baseLatex,
    };
  }

  const rightLog = readLog(input.right);
  if (rightLog && numericValueForNode(input.left) !== null) {
    const bound = rightLog.base === Math.E
      ? ['Power', 'ExponentialE', input.left]
      : ['Power', rightLog.base, input.left];
    const relation = reverseRelation(input.relation);
    return {
      inner: rightLog.inner,
      bound,
      relation: rightLog.base > 1 ? relation : reverseRelation(relation),
      baseLatex: rightLog.baseLatex,
    };
  }
  return null;
}

function normalizeExpComparison(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
}): { inner: unknown; bound: unknown; relation: InequalityRelation } | null {
  const readExp = (node: unknown) => (
    isNodeArray(node) && node[0] === 'Power' && node[1] === 'ExponentialE' && node.length === 3
      ? node[2]
      : null
  );

  const leftExp = readExp(input.left);
  if (leftExp && numericValueForNode(input.right) !== null) {
    return { inner: leftExp, bound: input.right, relation: input.relation };
  }
  const rightExp = readExp(input.right);
  if (rightExp && numericValueForNode(input.left) !== null) {
    return { inner: rightExp, bound: input.left, relation: reverseRelation(input.relation) };
  }
  return null;
}

function parseAffineArgument(node: unknown, target: string) {
  const classified = classifyPolynomialDomainNode(node, { variable: target, maxDegree: 1 });
  if (classified.kind !== 'success' || classified.metadata.degree > 1) {
    return null;
  }
  const a = classified.metadata.degree === 1
    ? exactScalarToNumber(getExactPolynomialCoefficient(classified.metadata.polynomial, 1))
    : 0;
  const b = exactScalarToNumber(getExactPolynomialCoefficient(classified.metadata.polynomial, 0));
  if (Math.abs(a) <= TRIG_EPSILON) {
    return null;
  }
  return { a, b };
}

function parseAbsAffineArgument(node: unknown, target: string) {
  if (!isNodeArray(node) || node[0] !== 'Abs' || node.length !== 2) {
    return null;
  }
  const affine = parseAffineArgument(node[1], target);
  if (!affine) {
    return null;
  }
  return {
    affine,
    latex: latexForNode(node) || `\\left|${latexForNode(node[1])}\\right|`,
  };
}

function readTrigCall(node: unknown): TrigCall | null {
  if (!isNodeArray(node) || node.length !== 2) {
    return null;
  }
  if (node[0] === 'Sin' || node[0] === 'Cos' || node[0] === 'Tan') {
    return { kind: node[0].toLowerCase() as TrigFunctionKind, argument: node[1] };
  }
  return null;
}

function replaceSingleTrigCall(node: unknown): { node: unknown; trig: TrigCall } | null {
  const trig = readTrigCall(node);
  if (trig) {
    return { node: INNER_TRIG_VARIABLE, trig };
  }
  if (!isNodeArray(node)) {
    return null;
  }

  let found: TrigCall | null = null;
  let foundCount = 0;
  const children = node.slice(1).map((child) => {
    const replaced = replaceSingleTrigCall(child);
    if (!replaced) {
      return child;
    }
    foundCount += 1;
    found = replaced.trig;
    return replaced.node;
  });

  return found && foundCount === 1 ? { node: [node[0], ...children], trig: found } : null;
}

function parseAffineOuterTrigArgument(node: unknown, target: string) {
  const replaced = replaceSingleTrigCall(node);
  if (!replaced) {
    return null;
  }

  const innerAffine = parseAffineArgument(replaced.trig.argument, target);
  if (!innerAffine) {
    return null;
  }

  const classified = classifyPolynomialDomainNode(replaced.node, {
    variable: INNER_TRIG_VARIABLE,
    maxDegree: 1,
  });
  if (classified.kind !== 'success' || classified.metadata.degree !== 1) {
    return null;
  }

  return {
    outerAffine: {
      a: exactScalarToNumber(getExactPolynomialCoefficient(classified.metadata.polynomial, 1)),
      b: exactScalarToNumber(getExactPolynomialCoefficient(classified.metadata.polynomial, 0)),
    },
    inner: {
      kind: replaced.trig.kind,
      affine: innerAffine,
    },
  };
}

function formatPeriodicBound(valueDegrees: number, affine: { a: number; b: number }, unit: AngleUnit) {
  const boundInUnit = convertAngle(valueDegrees, 'deg', unit);
  const xValue = (boundInUnit - affine.b) / affine.a;
  return formatAngleLatex(xValue, unit);
}

function formatAngleDecimalLatex(value: number, unit: AngleUnit) {
  if (unit === 'deg') {
    return `${formatNumber(value)}^{\\circ}`;
  }
  return formatNumber(value);
}

function isPlainDecimalLatex(latex: string) {
  return /^-?\d+(?:\.\d+)?$/.test(latex.trim());
}

function formatNumericForLatex(value: number) {
  return formatNumber(value);
}

function signedTargetFreeTermLatex(value: number) {
  if (Math.abs(value) <= ROOT_EPSILON) {
    return '';
  }
  return value > 0 ? `+${formatNumericForLatex(value)}` : `${formatNumericForLatex(value)}`;
}

function combineAffineShiftLatex(argumentLatex: string, shift: number) {
  const argument = argumentLatex.trim();
  if (Math.abs(shift) <= ROOT_EPSILON) {
    return argument;
  }

  const shiftLatex = formatNumericForLatex(shift);
  if (argument === '0') {
    return shiftLatex;
  }
  if (shift > 0) {
    if (argument.startsWith('-')) {
      return `${shiftLatex}${argument}`;
    }
    return `${shiftLatex}+${argument}`;
  }
  return `${argument}${signedTargetFreeTermLatex(shift)}`;
}

function divideLatexByCoefficient(numeratorLatex: string, coefficient: number) {
  if (Math.abs(coefficient - 1) <= ROOT_EPSILON) {
    return numeratorLatex;
  }
  if (Math.abs(coefficient + 1) <= ROOT_EPSILON) {
    return numeratorLatex.startsWith('-') ? numeratorLatex.slice(1) : `-${numeratorLatex}`;
  }

  const numericMatch = numeratorLatex.trim().match(/^(-?\d+(?:\.\d+)?)$/);
  if (numericMatch) {
    return formatNumericForLatex(Number(numericMatch[1]) / coefficient);
  }

  const degreeMatch = numeratorLatex.trim().match(/^(-?\d+(?:\.\d+)?)\^\{\\circ\}$/);
  if (degreeMatch) {
    return `${formatNumericForLatex(Number(degreeMatch[1]) / coefficient)}^{\\circ}`;
  }

  const piMatch = numeratorLatex.trim().match(/^(-?\d*)\\pi$/);
  if (piMatch) {
    const rawCoefficient = piMatch[1];
    const piCoefficient = !rawCoefficient || rawCoefficient === '+'
      ? 1
      : rawCoefficient === '-'
        ? -1
        : Number(rawCoefficient);
    const divided = piCoefficient / coefficient;
    if (Math.abs(divided - 1) <= ROOT_EPSILON) {
      return '\\pi';
    }
    if (Math.abs(divided + 1) <= ROOT_EPSILON) {
      return '-\\pi';
    }
    if (Number.isInteger(divided)) {
      return `${formatNumericForLatex(divided)}\\pi`;
    }
    if (Math.abs(piCoefficient) === 1 && Number.isInteger(coefficient)) {
      return piCoefficient > 0
        ? `\\frac{\\pi}{${formatNumericForLatex(coefficient)}}`
        : `-\\frac{\\pi}{${formatNumericForLatex(coefficient)}}`;
    }
  }

  return `\\frac{${numeratorLatex}}{${formatNumericForLatex(coefficient)}}`;
}

function affinePreimageBoundLatex(argumentBoundLatex: string, affine: { a: number; b: number }) {
  const shifted = combineAffineShiftLatex(argumentBoundLatex, -affine.b);
  return divideLatexByCoefficient(shifted, affine.a);
}

function thresholdLatexForExactReadback(rawLatex: string) {
  return rawLatex.trim() || formatNumericForLatex(0);
}

function maybeParenthesizedSum(latex: string) {
  return /[+-]/.test(latex.replace(/^-/, '')) ? `\\left(${latex}\\right)` : latex;
}

function formatTrigEndpointArgumentLatex(input: {
  kind: TrigFunctionKind;
  threshold: number;
  thresholdLatex: string;
  valueInUnit: number;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
}) {
  if (input.outputStyle === 'decimal') {
    return formatAngleDecimalLatex(input.valueInUnit, input.angleUnit);
  }

  const formatted = formatAngleLatex(input.valueInUnit, input.angleUnit);
  if (!isPlainDecimalLatex(formatted)) {
    return formatted;
  }

  const valueRadians = convertAngle(input.valueInUnit, input.angleUnit, 'rad');
  const thresholdLatex = thresholdLatexForExactReadback(input.thresholdLatex);
  const asin = Math.asin(Math.max(-1, Math.min(1, input.threshold)));
  const acos = Math.acos(Math.max(-1, Math.min(1, input.threshold)));
  const atan = Math.atan(input.threshold);
  const candidates: Array<{ value: number; latex: string }> = [];

  if (input.kind === 'sin') {
    const alpha = `\\arcsin\\left(${thresholdLatex}\\right)`;
    candidates.push(
      { value: asin, latex: alpha },
      { value: Math.PI - asin, latex: `\\pi-${maybeParenthesizedSum(alpha)}` },
      { value: 2 * Math.PI + asin, latex: `2\\pi+${maybeParenthesizedSum(alpha)}` },
    );
  } else if (input.kind === 'cos') {
    const alpha = `\\arccos\\left(${thresholdLatex}\\right)`;
    candidates.push(
      { value: acos, latex: alpha },
      { value: -acos, latex: `-${maybeParenthesizedSum(alpha)}` },
      { value: 2 * Math.PI - acos, latex: `2\\pi-${maybeParenthesizedSum(alpha)}` },
    );
  } else {
    const alpha = `\\arctan\\left(${thresholdLatex}\\right)`;
    candidates.push(
      { value: atan, latex: alpha },
      { value: Math.PI - atan, latex: `\\pi-${maybeParenthesizedSum(alpha)}` },
      { value: Math.PI + atan, latex: `\\pi+${maybeParenthesizedSum(alpha)}` },
      { value: Math.PI / 2, latex: '\\frac{\\pi}{2}' },
      { value: -Math.PI / 2, latex: '-\\frac{\\pi}{2}' },
    );
  }

  for (const candidate of candidates) {
    if (Math.abs(valueRadians - candidate.value) <= 1e-8) {
      return candidate.latex;
    }
  }

  return formatted;
}

function buildTrigPreimageBoundFormatter(input: {
  kind: TrigFunctionKind;
  threshold: number;
  thresholdLatex: string;
  affine: { a: number; b: number };
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  argumentPeriod?: number;
}) {
  return (targetValue: number) => {
    const rawArgumentValue = input.affine.a * targetValue + input.affine.b;
    const argumentValue = input.argumentPeriod
      ? normalizePeriodicNumber(rawArgumentValue, input.argumentPeriod)
      : rawArgumentValue;
    const argumentLatex = formatTrigEndpointArgumentLatex({
      kind: input.kind,
      threshold: input.threshold,
      thresholdLatex: input.thresholdLatex,
      valueInUnit: argumentValue,
      angleUnit: input.angleUnit,
      outputStyle: input.outputStyle,
    });
    if (input.outputStyle === 'decimal') {
      return formatAngleDecimalLatex(targetValue, input.angleUnit);
    }
    return affinePreimageBoundLatex(argumentLatex, input.affine);
  };
}

function periodFactLatex(periodLatex: string) {
  return `\\text{Period: } ${periodLatex}`;
}

function periodicShiftLatex(periodLatex: string) {
  const normalized = periodLatex.trim();
  if (normalized === '\\pi') {
    return 'k\\pi';
  }
  let match = normalized.match(/^(\d+)\\pi$/);
  if (match) {
    return `${match[1]}k\\pi`;
  }
  match = normalized.match(/^\\frac\{\\pi\}\{([^{}]+)\}$/);
  if (match) {
    return `\\frac{k\\pi}{${match[1]}}`;
  }
  match = normalized.match(/^\\frac\{(\d+)\\pi\}\{([^{}]+)\}$/);
  if (match) {
    return `\\frac{${match[1]}k\\pi}{${match[2]}}`;
  }
  return `k\\cdot ${normalized}`;
}

function indexedPeriodicShiftLatex(periodLatex: string, indexSymbol = 'n') {
  return periodicShiftLatex(periodLatex).replaceAll('k', indexSymbol);
}

function negateLatex(latex: string) {
  const normalized = latex.trim();
  if (normalized === '0') {
    return '0';
  }
  if (normalized.startsWith('-')) {
    return normalized.slice(1);
  }
  return `-${maybeParenthesizedSum(normalized)}`;
}

function appendIndexedShiftLatex(boundLatex: string, shiftLatex: string) {
  if (boundLatex === '0') {
    return shiftLatex;
  }
  if (shiftLatex.startsWith('-')) {
    return `${boundLatex}${shiftLatex}`;
  }
  return `${boundLatex}+${shiftLatex}`;
}

function latexFragmentToReadableText(latex: string) {
  let readable = latex;
  let previous = '';
  while (previous !== readable) {
    previous = readable;
    readable = readable.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  }
  return readable
    .replaceAll('\\;', ' ')
    .replaceAll('\\cup', 'or')
    .replaceAll('\\le', '<=')
    .replaceAll('\\ge', '>=')
    .replaceAll('\\ne', '!=')
    .replaceAll('\\frac{k\\pi}', 'k*pi')
    .replaceAll('\\frac{n\\pi}', 'n*pi')
    .replaceAll('\\pi', 'pi')
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replaceAll('\\cdot', '*')
    .replaceAll('{', '')
    .replaceAll('}', '')
    .replace(/\s+/g, ' ')
    .trim();
}

function absAffineFamilyPeriodShift(input: {
  periodLatex: string;
  affine: { a: number; b: number };
  sign: 1 | -1;
}) {
  const periodStep = divideLatexByCoefficient(input.periodLatex, Math.abs(input.affine.a));
  const shift = indexedPeriodicShiftLatex(periodStep, 'n');
  return input.sign > 0 ? shift : `-${shift}`;
}

function formatFamilyInterval(input: {
  variable: string;
  lowerLatex: string;
  lowerInclusive: boolean;
  upperLatex: string;
  upperInclusive: boolean;
  shiftLatex: string;
}) {
  const lowerOperator = input.lowerInclusive ? '\\le ' : '<';
  const upperOperator = input.upperInclusive ? '\\le ' : '<';
  return `${appendIndexedShiftLatex(input.lowerLatex, input.shiftLatex)}${lowerOperator}${input.variable}${upperOperator}${appendIndexedShiftLatex(input.upperLatex, input.shiftLatex)}`;
}

function absAffineTangentSingularityLatex(input: {
  target: string;
  affine: { a: number; b: number };
  unit: AngleUnit;
}) {
  const singularity = formatAngleLatex(convertAngle(90, 'deg', input.unit), input.unit);
  const period = formatAngleLatex(convertAngle(180, 'deg', input.unit), input.unit);
  const positiveBase = affinePreimageBoundLatex(singularity, input.affine);
  const negativeBase = affinePreimageBoundLatex(negateLatex(singularity), input.affine);
  const positiveShift = absAffineFamilyPeriodShift({ periodLatex: period, affine: input.affine, sign: 1 });
  const negativeShift = absAffineFamilyPeriodShift({ periodLatex: period, affine: input.affine, sign: -1 });
  return [
    `${input.target}\\ne${appendIndexedShiftLatex(positiveBase, positiveShift)}`,
    `${input.target}\\ne${appendIndexedShiftLatex(negativeBase, negativeShift)}`,
  ];
}

function buildAbsAffinePeriodicReadback(input: {
  set: NumericPeriodicSet;
  kind: TrigFunctionKind;
  threshold: number;
  thresholdLatex: string;
  affine: { a: number; b: number };
  target: string;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
}) {
  const periodLatex = formatAngleLatex(input.set.period / Math.abs(input.affine.a), input.angleUnit);
  const normalizeEndpoint = (value: number) => {
    if (Math.abs(value - input.set.period) <= TRIG_EPSILON) {
      return input.set.period;
    }
    return normalizePeriodicNumber(value, input.set.period);
  };
  const argumentBoundLatex = (value: number, outputStyle: OutputStyle) =>
    formatTrigEndpointArgumentLatex({
      kind: input.kind,
      threshold: input.threshold,
      thresholdLatex: input.thresholdLatex,
      valueInUnit: normalizeEndpoint(value),
      angleUnit: input.angleUnit,
      outputStyle,
    });
  const positiveShift = absAffineFamilyPeriodShift({
    periodLatex: formatAngleLatex(input.set.period, input.angleUnit),
    affine: input.affine,
    sign: 1,
  });
  const negativeShift = absAffineFamilyPeriodShift({
    periodLatex: formatAngleLatex(input.set.period, input.angleUnit),
    affine: input.affine,
    sign: -1,
  });

  const families: string[] = [];
  for (const interval of input.set.intervals) {
    const lowerArgumentLatex = argumentBoundLatex(interval.lower, input.outputStyle);
    const upperArgumentLatex = argumentBoundLatex(interval.upper, input.outputStyle);
    families.push(formatFamilyInterval({
      variable: input.target,
      lowerLatex: affinePreimageBoundLatex(lowerArgumentLatex, input.affine),
      lowerInclusive: interval.lowerInclusive,
      upperLatex: affinePreimageBoundLatex(upperArgumentLatex, input.affine),
      upperInclusive: interval.upperInclusive,
      shiftLatex: positiveShift,
    }));
    families.push(formatFamilyInterval({
      variable: input.target,
      lowerLatex: affinePreimageBoundLatex(negateLatex(upperArgumentLatex), input.affine),
      lowerInclusive: interval.upperInclusive,
      upperLatex: affinePreimageBoundLatex(negateLatex(lowerArgumentLatex), input.affine),
      upperInclusive: interval.lowerInclusive,
      shiftLatex: negativeShift,
    }));
  }

  return {
    exactLatex: families.join('\\;\\cup\\;'),
    text: input.outputStyle === 'decimal'
      ? `${latexFragmentToReadableText(families.join(' or '))}; n is a nonnegative integer`
      : 'The x-family answer is shown above; n is a nonnegative integer',
    periodLatex,
  };
}

function trigThresholdDegrees(
  kind: 'sin' | 'cos' | 'tan',
  relation: InequalityRelation,
  value: number,
): TrigThresholdResult {
  if ((kind === 'sin' || kind === 'cos') && (value < -1 - TRIG_EPSILON || value > 1 + TRIG_EPSILON)) {
    const always = kind === 'sin' || kind === 'cos'
      ? value < -1
        ? relation === 'Greater' || relation === 'GreaterEqual'
        : relation === 'Less' || relation === 'LessEqual'
      : false;
    return { kind: always ? 'all' as const : 'empty' as const };
  }

  if (kind === 'sin') {
    const alpha = Math.asin(Math.max(-1, Math.min(1, value))) * 180 / Math.PI;
    if (relation === 'Greater' || relation === 'GreaterEqual') {
      return { kind: 'intervals' as const, intervals: [[alpha, 180 - alpha]] as const, period: 360 };
    }
    return { kind: 'intervals' as const, intervals: [[180 - alpha, 360 + alpha]] as const, period: 360 };
  }

  if (kind === 'cos') {
    const alpha = Math.acos(Math.max(-1, Math.min(1, value))) * 180 / Math.PI;
    if (relation === 'Greater' || relation === 'GreaterEqual') {
      return { kind: 'intervals' as const, intervals: [[-alpha, alpha]] as const, period: 360 };
    }
    return { kind: 'intervals' as const, intervals: [[alpha, 360 - alpha]] as const, period: 360 };
  }

  const alpha = Math.atan(value) * 180 / Math.PI;
  if (relation === 'Greater' || relation === 'GreaterEqual') {
    return { kind: 'intervals' as const, intervals: [[alpha, 90]] as const, period: 180 };
  }
  return { kind: 'intervals' as const, intervals: [[-90, alpha]] as const, period: 180 };
}

function normalizePeriodicNumber(value: number, period: number) {
  const normalized = ((value % period) + period) % period;
  return Math.abs(normalized - period) < TRIG_EPSILON ? 0 : normalized;
}

function normalizeNumericPeriodicSet(period: number, intervals: readonly NumericPeriodicInterval[]): NumericPeriodicSet {
  const pieces: NumericPeriodicInterval[] = [];
  for (const interval of intervals) {
    const width = interval.upper - interval.lower;
    if (width < -TRIG_EPSILON) {
      continue;
    }
    if (width >= period - TRIG_EPSILON) {
      pieces.push({
        lower: 0,
        lowerInclusive: true,
        upper: period,
        upperInclusive: true,
      });
      continue;
    }

    const lower = normalizePeriodicNumber(interval.lower, period);
    const upper = lower + Math.max(0, width);
    if (upper <= period + TRIG_EPSILON) {
      pieces.push({
        lower,
        lowerInclusive: interval.lowerInclusive,
        upper: Math.min(period, upper),
        upperInclusive: interval.upperInclusive,
      });
      continue;
    }
    pieces.push({
      lower,
      lowerInclusive: interval.lowerInclusive,
      upper: period,
      upperInclusive: false,
    });
    pieces.push({
      lower: 0,
      lowerInclusive: false,
      upper: upper - period,
      upperInclusive: interval.upperInclusive,
    });
  }

  const sorted = pieces
    .filter((interval) => interval.upper > interval.lower + TRIG_EPSILON
      || (Math.abs(interval.upper - interval.lower) <= TRIG_EPSILON
        && interval.lowerInclusive
        && interval.upperInclusive))
    .sort((left, right) => left.lower - right.lower);

  const merged: NumericPeriodicInterval[] = [];
  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (!previous || previous.upper < interval.lower - TRIG_EPSILON) {
      merged.push(interval);
      continue;
    }
    if (Math.abs(previous.upper - interval.lower) <= TRIG_EPSILON
      && !previous.upperInclusive
      && !interval.lowerInclusive) {
      merged.push(interval);
      continue;
    }
    previous.upper = Math.max(previous.upper, interval.upper);
    previous.upperInclusive = previous.upperInclusive || interval.upperInclusive;
  }

  return { period, intervals: merged };
}

function numericPeriodicIntervalForTrig(
  lowerDegrees: number,
  upperDegrees: number,
  inclusive: boolean,
  affine: { a: number; b: number },
  unit: AngleUnit,
): NumericPeriodicInterval {
  const lowerUnit = convertAngle(lowerDegrees, 'deg', unit);
  const upperUnit = convertAngle(upperDegrees, 'deg', unit);
  const lower = (lowerUnit - affine.b) / affine.a;
  const upper = (upperUnit - affine.b) / affine.a;
  if (lower <= upper) {
    return {
      lower,
      lowerInclusive: inclusive,
      upper,
      upperInclusive: inclusive,
    };
  }
  return {
    lower: upper,
    lowerInclusive: inclusive,
    upper: lower,
    upperInclusive: inclusive,
  };
}

function numericPeriodicSetForTrigConstraint(input: {
  kind: TrigFunctionKind;
  relation: InequalityRelation;
  threshold: number;
  affine: { a: number; b: number };
  angleUnit: AngleUnit;
}): { kind: 'all' } | { kind: 'empty' } | { kind: 'periodic'; set: NumericPeriodicSet } {
  const intervals = trigThresholdDegrees(input.kind, input.relation, input.threshold);
  if (intervals.kind === 'all' || intervals.kind === 'empty') {
    return intervals;
  }
  const inclusive = input.relation === 'GreaterEqual' || input.relation === 'LessEqual';
  const period = convertAngle(intervals.period, 'deg', input.angleUnit) / Math.abs(input.affine.a);
  return {
    kind: 'periodic',
    set: normalizeNumericPeriodicSet(
      period,
      intervals.intervals.map(([lower, upper]) => {
        const interval = numericPeriodicIntervalForTrig(lower, upper, inclusive, input.affine, input.angleUnit);
        if (input.kind === 'tan') {
          if (input.relation === 'Greater' || input.relation === 'GreaterEqual') {
            interval.upperInclusive = false;
          } else {
            interval.lowerInclusive = false;
          }
        }
        return interval;
      }),
    ),
  };
}

function intersectNumericPeriodicSets(left: NumericPeriodicSet, right: NumericPeriodicSet): NumericPeriodicSet | null {
  if (Math.abs(left.period - right.period) > TRIG_EPSILON) {
    return null;
  }
  const intervals: NumericPeriodicInterval[] = [];
  for (const leftInterval of left.intervals) {
    for (const rightInterval of right.intervals) {
      const lower = Math.max(leftInterval.lower, rightInterval.lower);
      const upper = Math.min(leftInterval.upper, rightInterval.upper);
      if (lower > upper + TRIG_EPSILON) {
        continue;
      }
      intervals.push({
        lower,
        lowerInclusive: leftInterval.lower === lower ? leftInterval.lowerInclusive : rightInterval.lowerInclusive,
        upper,
        upperInclusive: leftInterval.upper === upper ? leftInterval.upperInclusive : rightInterval.upperInclusive,
      });
    }
  }
  return normalizeNumericPeriodicSet(left.period, intervals);
}

function periodicSetFromNumeric(
  variable: string,
  set: NumericPeriodicSet,
  unit: AngleUnit,
  options: { formatBoundLatex?: (value: number) => string } = {},
): PeriodicInequalitySet {
  return {
    variable,
    periodLatex: formatAngleLatex(set.period, unit),
    intervals: set.intervals.map((interval) => ({
      lowerLatex: options.formatBoundLatex?.(interval.lower) ?? formatAngleLatex(interval.lower, unit),
      lowerInclusive: interval.lowerInclusive,
      upperLatex: options.formatBoundLatex?.(interval.upper) ?? formatAngleLatex(interval.upper, unit),
      upperInclusive: interval.upperInclusive,
    })),
  };
}

function mapNumericPeriodicIntervalThroughAffine(
  interval: NumericPeriodicInterval,
  affine: { a: number; b: number },
): NumericPeriodicInterval {
  const lower = (interval.lower - affine.b) / affine.a;
  const upper = (interval.upper - affine.b) / affine.a;
  if (lower <= upper) {
    return {
      lower,
      lowerInclusive: interval.lowerInclusive,
      upper,
      upperInclusive: interval.upperInclusive,
    };
  }
  return {
    lower: upper,
    lowerInclusive: interval.upperInclusive,
    upper: lower,
    upperInclusive: interval.lowerInclusive,
  };
}

function absAffinePreimageNumericPeriodicSet(
  set: NumericPeriodicSet,
  affine: { a: number; b: number },
): NumericPeriodicSet {
  const argumentIntervals: NumericPeriodicInterval[] = [];
  for (const interval of set.intervals) {
    argumentIntervals.push(interval);
    argumentIntervals.push({
      lower: -interval.upper,
      lowerInclusive: interval.upperInclusive,
      upper: -interval.lower,
      upperInclusive: interval.lowerInclusive,
    });
  }

  const argumentSet = normalizeNumericPeriodicSet(set.period, argumentIntervals);
  const mapped = argumentSet.intervals
    .map((interval) => mapNumericPeriodicIntervalThroughAffine(interval, affine))
    .sort((left, right) => left.lower - right.lower);
  return {
    period: set.period / Math.abs(affine.a),
    intervals: mapped,
  };
}

function tangentSingularityLatex(target: string, affine: { a: number; b: number }, unit: AngleUnit) {
  const first = formatPeriodicBound(90, affine, unit);
  const period = formatAngleLatex(convertAngle(180, 'deg', unit) / Math.abs(affine.a), unit);
  return `${target}\\ne${first}+${periodicShiftLatex(period)}`;
}

function solveInnerTrigValueRanges(input: {
  kind: Exclude<TrigFunctionKind, 'tan'>;
  affine: { a: number; b: number };
  ranges: readonly NumericPeriodicInterval[];
  target: string;
  angleUnit: AngleUnit;
}): NumericPeriodicSet | null {
  const pieces: NumericPeriodicInterval[] = [];
  for (const range of input.ranges) {
    let current: NumericPeriodicSet | null = null;
    if (range.lower > -1 + TRIG_EPSILON) {
      const lower = numericPeriodicSetForTrigConstraint({
        kind: input.kind,
        relation: range.lowerInclusive ? 'GreaterEqual' : 'Greater',
        threshold: range.lower,
        affine: input.affine,
        angleUnit: input.angleUnit,
      });
      if (lower.kind !== 'periodic') {
        if (lower.kind === 'empty') {
          continue;
        }
      } else {
        current = lower.set;
      }
    }

    if (range.upper < 1 - TRIG_EPSILON) {
      const upper = numericPeriodicSetForTrigConstraint({
        kind: input.kind,
        relation: range.upperInclusive ? 'LessEqual' : 'Less',
        threshold: range.upper,
        affine: input.affine,
        angleUnit: input.angleUnit,
      });
      if (upper.kind === 'empty') {
        continue;
      }
      if (upper.kind === 'periodic') {
        current = current ? intersectNumericPeriodicSets(current, upper.set) : upper.set;
        if (!current) {
          return null;
        }
      }
    }

    if (!current) {
      const period = convertAngle(360, 'deg', input.angleUnit) / Math.abs(input.affine.a);
      current = normalizeNumericPeriodicSet(period, [{
        lower: 0,
        lowerInclusive: true,
        upper: period,
        upperInclusive: true,
      }]);
    }
    pieces.push(...current.intervals);
  }

  if (pieces.length === 0) {
    const period = convertAngle(360, 'deg', input.angleUnit) / Math.abs(input.affine.a);
    return normalizeNumericPeriodicSet(period, []);
  }
  return normalizeNumericPeriodicSet(
    convertAngle(360, 'deg', input.angleUnit) / Math.abs(input.affine.a),
    pieces,
  );
}

function nestedTrigInequality(input: {
  matched: TrigCall & { bound: unknown; relation: InequalityRelation };
  target: string;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
}): PeriodicInequalityResult | FiniteInequalityResult | null {
  const parsed = parseAffineOuterTrigArgument(input.matched.argument, input.target);
  if (!parsed) {
    return null;
  }
  const threshold = numericValueForNode(input.matched.bound);
  if (threshold === null) {
    return null;
  }

  const outer = trigThresholdDegrees(input.matched.kind, input.matched.relation, threshold);
  if (outer.kind === 'all') {
    return finiteSuccess({
      set: allRealInequalitySet(input.target),
      route: 'nested-periodic-trig',
      lines: ['Solved a two-layer trigonometric inequality from the outer function range.'],
      validWhenLatex: parsed.inner.kind === 'tan'
        ? [
            tangentSingularityLatex(input.target, parsed.inner.affine, input.angleUnit),
            periodFactLatex(formatAngleLatex(convertAngle(180, 'deg', input.angleUnit) / Math.abs(parsed.inner.affine.a), input.angleUnit)),
          ]
        : undefined,
    });
  }
  if (outer.kind === 'empty') {
    return finiteSuccess({
      set: emptyInequalitySet(input.target),
      route: 'nested-periodic-trig',
      lines: ['Solved a two-layer trigonometric inequality from the outer function range.'],
    });
  }
  if (parsed.inner.kind === 'tan') {
    return null;
  }

  const outerPeriod = outer.period * Math.PI / 180;
  const zRange = [
    parsed.outerAffine.b - Math.abs(parsed.outerAffine.a),
    parsed.outerAffine.b + Math.abs(parsed.outerAffine.a),
  ];
  const allowedInnerRanges: NumericPeriodicInterval[] = [];
  const inclusive = input.matched.relation === 'GreaterEqual' || input.matched.relation === 'LessEqual';

  for (const [lowerDegrees, upperDegrees] of outer.intervals) {
    const lower = lowerDegrees * Math.PI / 180;
    const upper = upperDegrees * Math.PI / 180;
    const firstShift = Math.floor((zRange[0] - upper) / outerPeriod) - 1;
    const lastShift = Math.ceil((zRange[1] - lower) / outerPeriod) + 1;
    for (let shift = firstShift; shift <= lastShift; shift += 1) {
      const shiftedLower = lower + shift * outerPeriod;
      const shiftedUpper = upper + shift * outerPeriod;
      let innerLower = (shiftedLower - parsed.outerAffine.b) / parsed.outerAffine.a;
      let innerUpper = (shiftedUpper - parsed.outerAffine.b) / parsed.outerAffine.a;
      if (innerLower > innerUpper) {
        [innerLower, innerUpper] = [innerUpper, innerLower];
      }
      innerLower = Math.max(-1, innerLower);
      innerUpper = Math.min(1, innerUpper);
      if (innerLower > innerUpper + TRIG_EPSILON) {
        continue;
      }
      allowedInnerRanges.push({
        lower: innerLower,
        lowerInclusive: inclusive,
        upper: innerUpper,
        upperInclusive: inclusive,
      });
    }
  }

  if (allowedInnerRanges.length === 0) {
    return finiteSuccess({
      set: emptyInequalitySet(input.target),
      route: 'nested-periodic-trig',
      lines: ['Solved a two-layer trigonometric inequality after the outer range produced no inner values.'],
    });
  }

  const numericSet = solveInnerTrigValueRanges({
    kind: parsed.inner.kind,
    affine: parsed.inner.affine,
    ranges: allowedInnerRanges,
    target: input.target,
    angleUnit: input.angleUnit,
  });
  if (!numericSet) {
    return null;
  }
  const periodicSet = periodicSetFromNumeric(input.target, numericSet, input.angleUnit);
  return {
    kind: 'periodic',
    set: periodicSet,
    route: 'nested-periodic-trig',
    lines: [
      `Solved a two-layer ${input.matched.kind}/${parsed.inner.kind} trigonometric inequality as periodic real interval families.`,
      `Reduced the outer ${input.matched.kind} inequality to supported bounds on the inner ${parsed.inner.kind} value.`,
    ],
    proofDetails: [],
    validWhenLatex: [
      periodFactLatex(periodicSet.periodLatex),
    ],
  };
}

function trigInequality(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
}): PeriodicInequalityResult | FiniteInequalityResult | null {
  const normalize = () => {
    const leftTrig = readTrigCall(input.left);
    if (leftTrig && numericValueForNode(input.right) !== null) {
      return { ...leftTrig, bound: input.right, relation: input.relation };
    }
    const rightTrig = readTrigCall(input.right);
    if (rightTrig && numericValueForNode(input.left) !== null) {
      return { ...rightTrig, bound: input.left, relation: reverseRelation(input.relation) };
    }
    return null;
  };
  const matched = normalize();
  if (!matched) {
    return null;
  }
  const threshold = numericValueForNode(matched.bound);
  const thresholdLatex = rawLatexForNode(matched.bound);
  const affine = parseAffineArgument(matched.argument, input.target);
  if (threshold === null) {
    return null;
  }
  if (!affine) {
    const absAffine = parseAbsAffineArgument(matched.argument, input.target);
    if (absAffine) {
      const numeric = numericPeriodicSetForTrigConstraint({
        kind: matched.kind,
        relation: matched.relation,
        threshold,
        affine: { a: 1, b: 0 },
        angleUnit: input.angleUnit,
      });
      if (numeric.kind === 'all') {
        return finiteSuccess({
          set: allRealInequalitySet(input.target),
          route: 'abs-affine-periodic-trig',
          lines: ['Solved an abs-affine trigonometric inequality from the function range.'],
          validWhenLatex: [`${absAffine.latex}\\ge0`],
        });
      }
      if (numeric.kind === 'empty') {
        return finiteSuccess({
          set: emptyInequalitySet(input.target),
          route: 'abs-affine-periodic-trig',
          lines: ['Solved an abs-affine trigonometric inequality from the function range.'],
          validWhenLatex: [`${absAffine.latex}\\ge0`],
        });
      }

      const xNumericSet = absAffinePreimageNumericPeriodicSet(numeric.set, absAffine.affine);
      const readback = buildAbsAffinePeriodicReadback({
        set: numeric.set,
        kind: matched.kind,
        threshold,
        thresholdLatex,
        affine: absAffine.affine,
        target: input.target,
        angleUnit: input.angleUnit,
        outputStyle: input.outputStyle,
      });
      const decimalReadback = input.outputStyle === 'both'
        ? buildAbsAffinePeriodicReadback({
            set: numeric.set,
            kind: matched.kind,
            threshold,
            thresholdLatex,
            affine: absAffine.affine,
            target: input.target,
            angleUnit: input.angleUnit,
            outputStyle: 'decimal',
          })
        : null;
      const formatBoundLatex = buildTrigPreimageBoundFormatter({
        kind: matched.kind,
        threshold,
        thresholdLatex,
        affine: absAffine.affine,
        angleUnit: input.angleUnit,
        outputStyle: input.outputStyle,
        argumentPeriod: numeric.set.period,
      });
      const periodicSet = periodicSetFromNumeric(input.target, xNumericSet, input.angleUnit, {
        formatBoundLatex,
      });
      return {
        kind: 'periodic',
        set: periodicSet,
        route: 'abs-affine-periodic-trig',
        lines: [
          `Solved an abs-affine ${matched.kind} inequality as x-periodic real interval families.`,
          `Relation tested: ${matched.kind}(u) ${relationText(matched.relation)} ${latexForNode(matched.bound)} with u=${absAffine.latex}.`,
        ],
        proofDetails: [
          `Split ${absAffine.latex} into affine branches and flattened the periodic preimage back to ${input.target}.`,
        ],
        validWhenLatex: dedupeStrings([
          '\\text{Branch index } n\\in\\mathbb{Z}_{\\ge0}',
          `\\text{Branch step: } ${readback.periodLatex}`,
          ...(matched.kind === 'tan'
            ? absAffineTangentSingularityLatex({
                target: input.target,
                affine: absAffine.affine,
                unit: input.angleUnit,
              })
            : []),
        ]),
        exactLatexOverride: readback.exactLatex,
        readbackTextOverride: readback.text,
        ...(decimalReadback ? { approxText: decimalReadback.text } : {}),
      };
    }
    return nestedTrigInequality({
      matched,
      target: input.target,
      angleUnit: input.angleUnit,
      outputStyle: input.outputStyle,
    });
  }

  const numeric = numericPeriodicSetForTrigConstraint({
    kind: matched.kind,
    relation: matched.relation,
    threshold,
    affine,
    angleUnit: input.angleUnit,
  });
  if (numeric.kind === 'all') {
    return finiteSuccess({
      set: allRealInequalitySet(input.target),
      route: 'periodic-trig',
      lines: ['Solved a direct trigonometric inequality from the function range.'],
    });
  }
  if (numeric.kind === 'empty') {
    return finiteSuccess({
      set: emptyInequalitySet(input.target),
      route: 'periodic-trig',
      lines: ['Solved a direct trigonometric inequality from the function range.'],
    });
  }

  const formatBoundLatex = buildTrigPreimageBoundFormatter({
    kind: matched.kind,
    threshold,
    thresholdLatex,
    affine,
    angleUnit: input.angleUnit,
    outputStyle: input.outputStyle,
    argumentPeriod: numeric.set.period * Math.abs(affine.a),
  });
  const periodicSet = periodicSetFromNumeric(input.target, numeric.set, input.angleUnit, {
    formatBoundLatex,
  });
  const decimalSet = input.outputStyle === 'both'
    ? periodicSetFromNumeric(input.target, numeric.set, input.angleUnit, {
        formatBoundLatex: buildTrigPreimageBoundFormatter({
          kind: matched.kind,
          threshold,
          thresholdLatex,
          affine,
          angleUnit: input.angleUnit,
          outputStyle: 'decimal',
          argumentPeriod: numeric.set.period * Math.abs(affine.a),
        }),
      })
    : null;

  return {
    kind: 'periodic',
    set: periodicSet,
    route: 'periodic-trig',
    lines: [
      `Solved a direct affine ${matched.kind} inequality as periodic real interval families.`,
      `Relation tested: ${matched.kind}(u) ${relationText(matched.relation)} ${latexForNode(matched.bound)}.`,
    ],
    proofDetails: [],
    validWhenLatex: dedupeStrings([
      periodFactLatex(periodicSet.periodLatex),
      ...(matched.kind === 'tan'
        ? [tangentSingularityLatex(input.target, affine, input.angleUnit)]
        : []),
    ]),
    ...(decimalSet ? { approxText: periodicInequalitySetToText(decimalSet) } : {}),
  };
}

function solveComparison(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
  depth: number;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
}): FiniteInequalityResult | PeriodicInequalityResult | null {
  const peeledShell = peelNumericShellComparison(input);
  if (peeledShell) {
    const reduced = solveComparison({
      left: peeledShell.left,
      right: peeledShell.right,
      relation: peeledShell.relation,
      target: input.target,
      depth: input.depth,
      angleUnit: input.angleUnit,
      outputStyle: input.outputStyle,
    });
    if (reduced) {
      return {
        ...reduced,
        lines: [
          peeledShell.line,
          ...reduced.lines,
        ],
      };
    }
  }

  const finite = solveFiniteNode(input);
  if (finite) {
    return finite;
  }

  return trigInequality({
    left: input.left,
    right: input.right,
    relation: input.relation,
    target: input.target,
    angleUnit: input.angleUnit,
    outputStyle: input.outputStyle,
  });
}

function solveInternal(input: {
  equationLatex: string;
  target?: string | null;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
}): InternalInequalityResult {
  const top = topLevelInequality(input.equationLatex);
  if (!top) {
    return { kind: 'stop', reason: 'The inequality could not be parsed as a supported top-level relation.' };
  }
  const target = resolveTarget(input.target, top.left, top.right);
  if (!target) {
    return { kind: 'stop', reason: 'The guarded inequality route requires exactly one solve target and no symbolic parameters.' };
  }

  const solved = solveComparison({
    left: top.left,
    right: top.right,
    relation: top.relation,
    target,
    depth: DEFAULT_MAX_REDUCTION_DEPTH,
    angleUnit: input.angleUnit,
    outputStyle: input.outputStyle,
  });
  if (solved) {
    return solved;
  }

  return {
    kind: 'stop',
    reason: 'This inequality is outside the guarded real inequality engine: unsupported rational/radical/log/exp/trig shape, symbolic parameter, chained relation, or composition depth.',
  };
}

function unsupportedInequalityOutcome(input: {
  answerMode: EquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
  reason?: string;
}): DisplayOutcome {
  const lines = [
    'INEQUALITY-PREIMAGE1 supports guarded real one-variable inequalities: polynomial, factorable rational, textbook abs/radical, monotone log/exp, finite composition through 4 layers, direct affine trig, and representable two-layer trig cases, plus abs-affine periodic preimages.',
    input.reason ?? 'This inequality is outside the guarded real inequality engine.',
  ];
  if (input.equationDomainIntent === 'complex') {
    lines.push('Complex intent is enabled, but ordered inequalities are solved over the real line.');
  }

  return {
    kind: 'error',
    title: 'Inequality',
    error: 'This inequality is outside the supported guarded real inequality families.',
    warnings: [],
    answerMode: input.answerMode,
    answerDomain: 'conditional-real',
    solutionKind: 'condition-fact-only-stop',
    detailSections: [
      {
        title: 'Inequality Route',
        lines,
      },
      {
        title: 'What To Try',
        lines: [
          'Use Exact mode with one variable and exact numeric constants.',
          'Use an = equation when you need symbolic solving, Approximate, or Isolate.',
        ],
      },
    ],
  };
}

export function inequalityAnswerModeGuidanceOutcome(input: {
  answerMode: EquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
}): DisplayOutcome {
  const modeLabel = input.answerMode === 'approximate' ? 'Approximate' : 'Isolate';
  return {
    kind: 'error',
    title: 'Inequality',
    error: `${modeLabel} answer mode does not solve inequalities.`,
    warnings: [],
    answerMode: input.answerMode,
    answerDomain: 'conditional-real',
    solutionKind: 'condition-fact-only-stop',
    detailSections: [
      {
        title: 'Answer Mode',
        lines: [
          `Answer mode: ${modeLabel}.`,
          'Use Exact mode for guarded real interval inequality sets.',
        ],
      },
      {
        title: 'Real Order',
        lines: [
          input.equationDomainIntent === 'complex'
            ? 'Complex intent is enabled, but ordered inequalities are solved over the real line.'
            : 'Ordered inequalities are solved over the real line.',
        ],
      },
    ],
  };
}

function buildSuccessOutcome(input: {
  result: FiniteInequalityResult | PeriodicInequalityResult;
  equationDomainIntent: EquationDomainIntent;
}): DisplayOutcome {
  const exactLatex = input.result.kind === 'finite'
    ? inequalitySetToLatex(input.result.set)
    : input.result.exactLatexOverride ?? periodicInequalitySetToLatex(input.result.set);
  const resultText = input.result.kind === 'finite'
    ? inequalitySetToText(input.result.set)
    : input.result.readbackTextOverride ?? periodicInequalitySetToText(input.result.set);
  const realOrderLatex = input.equationDomainIntent === 'complex'
    ? latexText('Complex intent is enabled; ordered inequalities are solved over the real line.')
    : latexText('Ordered inequalities are solved over the real line.');
  const validWhenLatex = dedupeStrings([
    ...input.result.validWhenLatex,
    realOrderLatex,
  ]);

  const detailSections: DisplayDetailSection[] = [
    {
      title: input.result.kind === 'periodic' ? 'Periodic Inequality Route' : 'Inequality Route',
      lines: [
        'Answer mode: Exact.',
        ...input.result.lines,
      ],
    },
  ];
  if (input.result.kind === 'periodic') {
    detailSections.push({
      title: 'Periodic Readback',
      lines: [
        `${resultText}.`,
      ],
    });
  }
  if (input.result.proofDetails.length > 0) {
    detailSections.push({
      title: 'Inequality Proof',
      lines: input.result.proofDetails,
    });
  }

  return {
    kind: 'success',
    title: 'Inequality',
    exactLatex,
    approxText: input.result.kind === 'periodic' ? input.result.approxText : undefined,
    warnings: [],
    answerMode: 'exact',
    answerDomain: 'conditional-real',
    solutionKind: 'inequality-solution-set',
    exactSupplementLatex: validWhenLatex,
    detailSections,
  };
}

export function solveBoundedLinearInequality(input: {
  equationLatex: string;
  target?: string | null;
  answerMode: EquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
  angleUnit?: AngleUnit;
  outputStyle?: OutputStyle;
}): DisplayOutcome {
  if (input.answerMode !== 'exact') {
    return inequalityAnswerModeGuidanceOutcome({
      answerMode: input.answerMode,
      equationDomainIntent: input.equationDomainIntent,
    });
  }

  const result = solveInternal({
    equationLatex: input.equationLatex,
    target: input.target,
    angleUnit: input.angleUnit ?? 'rad',
    outputStyle: input.outputStyle ?? 'exact',
  });
  if (result.kind === 'stop') {
    return unsupportedInequalityOutcome({
      ...input,
      reason: result.reason,
    });
  }

  return buildSuccessOutcome({
    result,
    equationDomainIntent: input.equationDomainIntent,
  });
}
