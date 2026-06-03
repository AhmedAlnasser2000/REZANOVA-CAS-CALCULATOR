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
  valueDomainMetadataFromInequalitySet,
  type InequalitySet,
  type PeriodicInequalityInterval,
  type PeriodicInequalitySet,
} from '../algebra/inequality-core';
import {
  buildSignChartInequalitySet,
  relationToSymbol,
} from '../algebra/inequality-sign-analysis-core';
import { assumptionFactsToDetailSections } from '../algebra/assumption-readback';
import { buildValueDomainMetadata } from '../algebra/value-domain-core';
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
import type {
  AngleUnit,
  DisplayDetailSection,
  DisplayOutcome,
  EquationAnswerMode,
  EquationDomainIntent,
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
  factDetails: string[];
};

type PeriodicInequalityResult = {
  kind: 'periodic';
  set: PeriodicInequalitySet;
  route: string;
  lines: string[];
  factDetails: string[];
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
const DEFAULT_MAX_REDUCTION_DEPTH = 2;
const TRIG_EPSILON = 1e-10;
const NUMERIC_CONSTANT_SYMBOLS = new Set(['Pi', 'ExponentialE']);

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
  factDetails?: string[];
}): FiniteInequalityResult {
  return {
    kind: 'finite',
    set: input.set,
    route: input.route,
    lines: input.lines,
    factDetails: input.factDetails ?? [],
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
    factDetails: results.flatMap((result) => result.factDetails),
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
    ],
    factDetails: [
      `Polynomial degree: ${degree}.`,
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
    factDetails: [
      `Denominator exclusions: ${denominatorRoots.map((root) => `${target}\\ne${root.latex}`).join(', ') || 'none'}.`,
    ],
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

function solveFiniteNode(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
  depth: number;
}): FiniteInequalityResult | null {
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

  const polynomial = polynomialInequality(input.left, input.right, input.relation, input.target);
  if (polynomial) {
    return polynomial;
  }
  const rational = rationalInequality(input.left, input.right, input.relation, input.target);
  if (rational) {
    return rational;
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

  return comparison
    ? combineFiniteResults('intersection', 'radical', [domain, comparison], [
      'Inverted a guarded square-root inequality and preserved the real radicand domain.',
    ])
    : null;
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
    return domain && comparison
      ? combineFiniteResults('intersection', 'logarithm', [domain, comparison], [
        'Inverted a monotone logarithm inequality and preserved the positive argument domain.',
      ])
      : null;
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
}): { inner: unknown; bound: unknown; relation: InequalityRelation } | null {
  const readLog = (node: unknown) => {
    if (!isNodeArray(node)) {
      return null;
    }
    if (node[0] === 'Ln' && node.length === 2) {
      return { inner: node[1], base: Math.E };
    }
    if (node[0] === 'Log' && node.length >= 2) {
      const baseNode = node.length >= 3 ? node[2] : 10;
      const base = numericValueForNode(baseNode);
      return base && base > 0 && Math.abs(base - 1) > ROOT_EPSILON
        ? { inner: node[1], base }
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

function formatPeriodicBound(valueDegrees: number, affine: { a: number; b: number }, unit: AngleUnit) {
  const boundInUnit = convertAngle(valueDegrees, 'deg', unit);
  const xValue = (boundInUnit - affine.b) / affine.a;
  return formatAngleLatex(xValue, unit);
}

function periodicInterval(
  lowerDegrees: number,
  upperDegrees: number,
  relation: InequalityRelation,
  affine: { a: number; b: number },
  unit: AngleUnit,
): PeriodicInequalityInterval {
  return {
    lowerLatex: formatPeriodicBound(lowerDegrees, affine, unit),
    lowerInclusive: relation === 'GreaterEqual' || relation === 'LessEqual',
    upperLatex: formatPeriodicBound(upperDegrees, affine, unit),
    upperInclusive: relation === 'GreaterEqual' || relation === 'LessEqual',
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
    return {
      kind: 'intervals' as const,
      intervals: [[-180 - alpha, alpha], [180 - alpha, 180 - alpha + 360]] as const,
      period: 360,
    };
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

function trigInequality(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
  angleUnit: AngleUnit;
}): PeriodicInequalityResult | FiniteInequalityResult | null {
  const normalize = () => {
    const read = (node: unknown) => {
      if (!isNodeArray(node) || node.length !== 2) {
        return null;
      }
      if (node[0] === 'Sin' || node[0] === 'Cos' || node[0] === 'Tan') {
        return { kind: node[0].toLowerCase() as 'sin' | 'cos' | 'tan', argument: node[1] };
      }
      return null;
    };
    const leftTrig = read(input.left);
    if (leftTrig && numericValueForNode(input.right) !== null) {
      return { ...leftTrig, bound: input.right, relation: input.relation };
    }
    const rightTrig = read(input.right);
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
  const affine = parseAffineArgument(matched.argument, input.target);
  if (threshold === null || !affine) {
    return null;
  }

  const intervals = trigThresholdDegrees(matched.kind, matched.relation, threshold);
  if (intervals.kind === 'all') {
    return finiteSuccess({
      set: allRealInequalitySet(input.target),
      route: 'periodic-trig',
      lines: ['Solved a direct trigonometric inequality from the function range.'],
    });
  }
  if (intervals.kind === 'empty') {
    return finiteSuccess({
      set: emptyInequalitySet(input.target),
      route: 'periodic-trig',
      lines: ['Solved a direct trigonometric inequality from the function range.'],
    });
  }

  const periodUnit = convertAngle(intervals.period, 'deg', input.angleUnit) / Math.abs(affine.a);
  const periodLatex = formatAngleLatex(periodUnit, input.angleUnit);
  const periodicSet: PeriodicInequalitySet = {
    variable: input.target,
    periodLatex,
    intervals: intervals.intervals.map(([lower, upper]) =>
      periodicInterval(lower, upper, matched.relation, affine, input.angleUnit)),
  };

  return {
    kind: 'periodic',
    set: periodicSet,
    route: 'periodic-trig',
    lines: [
      `Solved a direct affine ${matched.kind} inequality as periodic real interval families.`,
      `Relation tested: ${matched.kind}(u) ${relationText(matched.relation)} ${latexForNode(matched.bound)}.`,
    ],
    factDetails: [
      `Period: ${periodLatex}.`,
    ],
  };
}

function solveInternal(input: {
  equationLatex: string;
  target?: string | null;
  angleUnit: AngleUnit;
}): InternalInequalityResult {
  const top = topLevelInequality(input.equationLatex);
  if (!top) {
    return { kind: 'stop', reason: 'The inequality could not be parsed as a supported top-level relation.' };
  }
  const target = resolveTarget(input.target, top.left, top.right);
  if (!target) {
    return { kind: 'stop', reason: 'The guarded inequality route requires exactly one solve target and no symbolic parameters.' };
  }

  const finite = solveFiniteNode({
    left: top.left,
    right: top.right,
    relation: top.relation,
    target,
    depth: DEFAULT_MAX_REDUCTION_DEPTH,
  });
  if (finite) {
    return finite;
  }

  const trig = trigInequality({
    left: top.left,
    right: top.right,
    relation: top.relation,
    target,
    angleUnit: input.angleUnit,
  });
  if (trig) {
    return trig;
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
    'INEQUALITY-EQUATION3 supports guarded real one-variable inequalities: polynomial, factorable rational, textbook abs/radical, monotone log/exp, and direct affine trig cases.',
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
    : periodicInequalitySetToLatex(input.result.set);
  const resultText = input.result.kind === 'finite'
    ? inequalitySetToText(input.result.set)
    : periodicInequalitySetToText(input.result.set);
  const metadata = input.result.kind === 'finite'
    ? valueDomainMetadataFromInequalitySet(input.result.set, {
      expressionLatex: exactLatex,
      details: [
        `Solved inequality: ${resultText}.`,
        ...input.result.factDetails,
      ],
    })
    : buildValueDomainMetadata({
      answerDomain: 'conditional-real',
      solutionKind: 'inequality-solution-set',
      facts: [],
    });

  const detailSections: DisplayDetailSection[] = [
    {
      title: input.result.kind === 'periodic' ? 'Periodic Inequality Route' : 'Inequality Route',
      lines: [
        'Answer mode: Exact.',
        ...input.result.lines,
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
    ...assumptionFactsToDetailSections(metadata.facts),
  ];
  if (input.result.kind === 'periodic') {
    detailSections.push({
      title: 'Inequality Facts',
      lines: [
        `${resultText}.`,
        ...input.result.factDetails,
      ],
    });
  } else if (input.result.factDetails.length > 0) {
    detailSections.push({
      title: 'Inequality Proof Facts',
      lines: input.result.factDetails,
    });
  }

  return {
    kind: 'success',
    title: 'Inequality',
    exactLatex,
    warnings: [],
    answerMode: 'exact',
    answerDomain: 'conditional-real',
    solutionKind: 'inequality-solution-set',
    detailSections,
  };
}

export function solveBoundedLinearInequality(input: {
  equationLatex: string;
  target?: string | null;
  answerMode: EquationAnswerMode;
  equationDomainIntent: EquationDomainIntent;
  angleUnit?: AngleUnit;
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
