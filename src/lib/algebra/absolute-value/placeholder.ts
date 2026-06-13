import { ComputeEngine } from '@cortex-js/compute-engine';
import type { AbsoluteValueExactScalar } from '../../../types/calculator';
import { expressionHasVariable } from '../radical-core';
import {
  exactPolynomialDegree,
  exactPolynomialToNode,
  getExactPolynomialCoefficient,
  parseExactPolynomial,
  quadraticDiscriminant,
  type ExactPolynomial,
} from '../polynomial-core';
import { solveBoundedPolynomialEquationAst } from '../polynomial-factor-solve';
import { evaluateLatexAt } from '../../equation/domain-guards';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { boxLatex, isNodeArray } from '../../symbolic-engine/patterns';
import { ABS_NUMERIC_EPSILON } from './constants';
import {
  buildQuotientNode,
  buildScalarNode,
  containsAbsoluteValue,
  containsPlaceholder,
  divideScalar,
  isZeroScalar,
  multiplyScalar,
  negateNode,
  negateScalar,
  normalizeScalar,
  parseLinearPlaceholder,
  readExactScalar,
  simplifyNode,
} from './shared';

const ce = new ComputeEngine();

export type AbsoluteValuePolynomialRoot = {
  node: unknown;
  latex: string;
  numeric: number;
};

export type AbsoluteValuePlaceholderSolveOutcome =
  | { kind: 'unrecognized' }
  | { kind: 'solved'; roots: AbsoluteValuePolynomialRoot[]; normalizationKind: 'outer-polynomial' | 'outer-nonperiodic' }
  | { kind: 'no-roots'; normalizationKind: 'outer-polynomial' | 'outer-nonperiodic'; reason: 'no-real-nonnegative-root' }
  | { kind: 'unresolved'; normalizationKind: 'outer-polynomial' | 'outer-nonperiodic'; reason: 'outer-depth' | 'outer-sink' };

type AbsoluteValuePlaceholderTransformOutcome =
  | { kind: 'none' }
  | { kind: 'next'; equationNode: unknown }
  | { kind: 'no-roots' };

function buildAbsoluteValuePolynomialRoot(node: unknown): AbsoluteValuePolynomialRoot | null {
  const normalized = simplifyNode(node);
  const numeric = evaluateLatexAt(boxLatex(normalized), 0, 'rad').value;
  if (numeric === null || !Number.isFinite(numeric)) {
    const evaluated = ce.box(normalized as Parameters<typeof ce.box>[0]).N?.()
      ?? ce.box(normalized as Parameters<typeof ce.box>[0]).evaluate();
    const fallback = typeof evaluated.json === 'number' ? evaluated.json : null;
    if (fallback === null || !Number.isFinite(fallback)) {
      return null;
    }
    return {
      node: normalized,
      latex: boxLatex(normalized),
      numeric: fallback,
    };
  }

  return {
    node: normalized,
    latex: boxLatex(normalized),
    numeric,
  };
}

function sortAndDedupeAbsoluteValuePolynomialRoots(roots: AbsoluteValuePolynomialRoot[]) {
  return roots
    .slice()
    .sort((left, right) => left.numeric - right.numeric)
    .filter((root, index, list) =>
      index === 0 || Math.abs(root.numeric - list[index - 1].numeric) > ABS_NUMERIC_EPSILON);
}

function solveLinearOrQuadraticAbsoluteValuePolynomial(
  polynomial: ExactPolynomial,
): AbsoluteValuePolynomialRoot[] | null {
  const degree = exactPolynomialDegree(polynomial);
  if (degree === 1) {
    const root = divideScalar(
      negateScalar(getExactPolynomialCoefficient(polynomial, 0)),
      getExactPolynomialCoefficient(polynomial, 1),
    );
    if (!root) {
      return null;
    }

    const solvedRoot = buildAbsoluteValuePolynomialRoot(buildScalarNode(root));
    return solvedRoot ? [solvedRoot] : null;
  }

  if (degree !== 2) {
    return null;
  }

  const discriminant = quadraticDiscriminant(polynomial);
  if (!discriminant) {
    return null;
  }

  const discriminantNode = buildScalarNode(discriminant);
  const discriminantRoot = buildAbsoluteValuePolynomialRoot(discriminantNode);
  const discriminantNumeric = discriminantRoot?.numeric ?? null;
  if (discriminantNumeric === null) {
    return null;
  }

  if (discriminantNumeric < -ABS_NUMERIC_EPSILON) {
    return [];
  }

  const a = getExactPolynomialCoefficient(polynomial, 2);
  const b = getExactPolynomialCoefficient(polynomial, 1);
  const minusBNode = buildScalarNode(negateScalar(b));
  const twoANode = buildScalarNode(
    multiplyScalar(a, { numerator: 2, denominator: 1 }) ?? { numerator: 0, denominator: 1 },
  );

  if (Math.abs(discriminantNumeric) <= ABS_NUMERIC_EPSILON) {
    const root = buildAbsoluteValuePolynomialRoot(['Divide', minusBNode, twoANode]);
    return root ? [root] : null;
  }

  const sqrtNode = ['Sqrt', discriminantNode];
  const positive = buildAbsoluteValuePolynomialRoot(['Divide', ['Add', minusBNode, sqrtNode], twoANode]);
  const negative = buildAbsoluteValuePolynomialRoot(['Divide', ['Add', minusBNode, ['Negate', sqrtNode]], twoANode]);
  if (!positive || !negative) {
    return null;
  }

  return sortAndDedupeAbsoluteValuePolynomialRoots([positive, negative]);
}

function solveOuterAbsoluteValuePlaceholderRoots(
  polynomial: ExactPolynomial,
  placeholder: string,
): AbsoluteValuePolynomialRoot[] | null {
  const degree = exactPolynomialDegree(polynomial);
  if (degree < 1 || degree > 4) {
    return null;
  }

  if (degree <= 2) {
    return solveLinearOrQuadraticAbsoluteValuePolynomial(polynomial);
  }

  const solved = solveBoundedPolynomialEquationAst(
    ['Equal', exactPolynomialToNode(polynomial), 0],
    placeholder,
  );
  if (!solved) {
    return null;
  }

  const roots = solved.exactSolutions
    .map((latex) => {
      try {
        return buildAbsoluteValuePolynomialRoot(ce.parse(latex).json);
      } catch {
        return null;
      }
    })
    .filter((root): root is AbsoluteValuePolynomialRoot => root !== null);

  return roots.length === solved.exactSolutions.length
    ? sortAndDedupeAbsoluteValuePolynomialRoots(roots)
    : null;
}

function solveLinearAbsoluteValuePlaceholderRoots(
  equationNode: unknown,
  placeholder: string,
): AbsoluteValuePlaceholderSolveOutcome {
  const normalized = normalizeAst(equationNode);
  if (!isNodeArray(normalized) || normalized[0] !== 'Equal' || normalized.length !== 3) {
    return { kind: 'unrecognized' };
  }

  const zeroForm = normalizeAst(['Add', normalized[1], ['Negate', normalized[2]]]);
  const linear = parseLinearPlaceholder(zeroForm, placeholder);
  if (!linear || isZeroScalar(linear.a)) {
    return { kind: 'unrecognized' };
  }

  const rootNode = buildQuotientNode(negateNode(linear.remainder), buildScalarNode(linear.a));
  const root = buildAbsoluteValuePolynomialRoot(rootNode);
  if (!root) {
    return {
      kind: 'unresolved',
      normalizationKind: 'outer-nonperiodic',
      reason: 'outer-sink',
    };
  }

  return {
    kind: 'solved',
    normalizationKind: 'outer-nonperiodic',
    roots: [root],
  };
}

function solvePolynomialAbsoluteValuePlaceholderRoots(
  equationNode: unknown,
  placeholder: string,
): AbsoluteValuePlaceholderSolveOutcome {
  const normalized = normalizeAst(equationNode);
  if (!isNodeArray(normalized) || normalized[0] !== 'Equal' || normalized.length !== 3) {
    return { kind: 'unrecognized' };
  }

  const zeroForm = normalizeAst(['Add', normalized[1], ['Negate', normalized[2]]]);
  const polynomial = parseExactPolynomial(zeroForm, placeholder, 4);
  if (!polynomial || exactPolynomialDegree(polynomial) < 1) {
    return { kind: 'unrecognized' };
  }

  const roots = solveOuterAbsoluteValuePlaceholderRoots(polynomial, placeholder);
  if (!roots) {
    return {
      kind: 'unresolved',
      normalizationKind: 'outer-polynomial',
      reason: 'outer-sink',
    };
  }

  return {
    kind: 'solved',
    normalizationKind: 'outer-polynomial',
    roots,
  };
}

type AbsoluteValuePlaceholderCarrier =
  | {
      family: 'log';
      kind: 'ln' | 'log';
      inner: unknown;
      baseNode: unknown;
      baseNumeric: number;
    }
  | {
      family: 'power';
      kind: 'exp' | 'power';
      inner: unknown;
      baseNode: unknown;
      baseNumeric: number;
    };

function isValidLogLikeBase(baseNumeric: number) {
  return Number.isFinite(baseNumeric) && baseNumeric > 0 && Math.abs(baseNumeric - 1) > ABS_NUMERIC_EPSILON;
}

function matchAbsoluteValuePlaceholderCarrier(node: unknown): AbsoluteValuePlaceholderCarrier | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Ln' && normalized.length === 2) {
    return {
      family: 'log',
      kind: 'ln',
      inner: normalized[1],
      baseNode: 'ExponentialE',
      baseNumeric: Math.E,
    };
  }

  if (normalized[0] === 'Log' && (normalized.length === 2 || normalized.length === 3)) {
    const baseNode = normalized.length === 2 ? 10 : normalized[2];
    const baseNumeric = readFiniteNumericValue(baseNode);
    if (baseNumeric === null || !isValidLogLikeBase(baseNumeric)) {
      return null;
    }

    return {
      family: 'log',
      kind: 'log',
      inner: normalized[1],
      baseNode,
      baseNumeric,
    };
  }

  if (normalized[0] === 'Exp' && normalized.length === 2) {
    return {
      family: 'power',
      kind: 'exp',
      inner: normalized[1],
      baseNode: 'ExponentialE',
      baseNumeric: Math.E,
    };
  }

  if (normalized[0] === 'Power' && normalized.length === 3) {
    const baseNode = normalized[1];
    const exponent = normalized[2];
    if (baseNode === 'ExponentialE') {
      return {
        family: 'power',
        kind: 'exp',
        inner: exponent,
        baseNode,
        baseNumeric: Math.E,
      };
    }

    const baseNumeric = readFiniteNumericValue(baseNode);
    if (baseNumeric === null || !isValidLogLikeBase(baseNumeric)) {
      return null;
    }

    return {
      family: 'power',
      kind: 'power',
      inner: exponent,
      baseNode,
      baseNumeric,
    };
  }

  return null;
}

function reduceSameBaseAbsoluteValuePlaceholderEquation(
  equationNode: unknown,
): AbsoluteValuePlaceholderTransformOutcome {
  const normalized = normalizeAst(equationNode);
  if (!isNodeArray(normalized) || normalized[0] !== 'Equal' || normalized.length !== 3) {
    return { kind: 'none' };
  }

  const leftCarrier = matchAbsoluteValuePlaceholderCarrier(normalized[1]);
  const rightCarrier = matchAbsoluteValuePlaceholderCarrier(normalized[2]);
  if (!leftCarrier || !rightCarrier) {
    return { kind: 'none' };
  }

  if (
    leftCarrier.family !== rightCarrier.family
    || Math.abs(leftCarrier.baseNumeric - rightCarrier.baseNumeric) > ABS_NUMERIC_EPSILON
  ) {
    return { kind: 'none' };
  }

  return {
    kind: 'next',
    equationNode: normalizeAst(['Equal', leftCarrier.inner, rightCarrier.inner]),
  };
}

function reduceInverseAbsoluteValuePlaceholderEquation(
  equationNode: unknown,
): AbsoluteValuePlaceholderTransformOutcome {
  const normalized = normalizeAst(equationNode);
  if (!isNodeArray(normalized) || normalized[0] !== 'Equal' || normalized.length !== 3) {
    return { kind: 'none' };
  }

  const attempts: Array<{ carrierSide: unknown; otherSide: unknown }> = [
    { carrierSide: normalizeAst(normalized[1]), otherSide: normalizeAst(normalized[2]) },
    { carrierSide: normalizeAst(normalized[2]), otherSide: normalizeAst(normalized[1]) },
  ];

  for (const attempt of attempts) {
    const carrier = matchAbsoluteValuePlaceholderCarrier(attempt.carrierSide);
    if (!carrier) {
      continue;
    }

    if (expressionHasVariable(attempt.otherSide)) {
      continue;
    }

    if (carrier.family === 'log') {
      return {
        kind: 'next',
        equationNode: normalizeAst([
          'Equal',
          carrier.inner,
          simplifyNode(['Power', carrier.baseNode, attempt.otherSide]),
        ]),
      };
    }

    const otherNumeric = readFiniteNumericValue(attempt.otherSide);
    if (otherNumeric === null || otherNumeric <= ABS_NUMERIC_EPSILON) {
      return { kind: 'no-roots' };
    }

    const inverseNode = carrier.kind === 'exp'
      ? simplifyNode(['Ln', attempt.otherSide])
      : simplifyNode(['Divide', ['Ln', attempt.otherSide], ['Ln', carrier.baseNode]]);

    return {
      kind: 'next',
      equationNode: normalizeAst(['Equal', carrier.inner, inverseNode]),
    };
  }

  return { kind: 'none' };
}

function readFiniteNumericValue(node: unknown) {
  return buildAbsoluteValuePolynomialRoot(node)?.numeric ?? null;
}

function isEvenInteger(value: number) {
  return Number.isInteger(value) && value % 2 === 0;
}

function invertRationalExponent(
  numerator: number,
  denominator: number,
): AbsoluteValueExactScalar | null {
  return normalizeScalar(denominator, numerator);
}

function matchOuterPlaceholderRadical(
  node: unknown,
  placeholder: string,
): { inner: unknown; index: number } | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Sqrt' && normalized.length === 2) {
    if (!containsPlaceholder(normalized[1], placeholder) || containsAbsoluteValue(normalized[1])) {
      return null;
    }

    return {
      inner: normalized[1],
      index: 2,
    };
  }

  if (normalized[0] === 'Root' && normalized.length === 3) {
    const index = readExactScalar(normalized[2]);
    if (
      !index
      || index.denominator !== 1
      || index.numerator < 2
      || !containsPlaceholder(normalized[1], placeholder)
      || containsAbsoluteValue(normalized[1])
    ) {
      return null;
    }

    return {
      inner: normalized[1],
      index: index.numerator,
    };
  }

  return null;
}

function matchOuterPlaceholderRationalPower(
  node: unknown,
  placeholder: string,
): { base: unknown; exponent: AbsoluteValueExactScalar } | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Power' || normalized.length !== 3) {
    return null;
  }

  const exponent = readExactScalar(normalized[2]);
  if (
    !exponent
    || exponent.numerator <= 0
    || exponent.denominator <= 0
    || !containsPlaceholder(normalized[1], placeholder)
    || containsAbsoluteValue(normalized[1])
  ) {
    return null;
  }

  return {
    base: normalized[1],
    exponent,
  };
}

function reduceRadicalAbsoluteValuePlaceholderEquation(
  equationNode: unknown,
  placeholder: string,
): AbsoluteValuePlaceholderTransformOutcome {
  const normalized = normalizeAst(equationNode);
  if (!isNodeArray(normalized) || normalized[0] !== 'Equal' || normalized.length !== 3) {
    return { kind: 'none' };
  }

  const attempts: Array<{ radicalSide: unknown; otherSide: unknown }> = [
    { radicalSide: normalizeAst(normalized[1]), otherSide: normalizeAst(normalized[2]) },
    { radicalSide: normalizeAst(normalized[2]), otherSide: normalizeAst(normalized[1]) },
  ];

  for (const attempt of attempts) {
    if (containsPlaceholder(attempt.otherSide, placeholder)) {
      continue;
    }

    const radical = matchOuterPlaceholderRadical(attempt.radicalSide, placeholder);
    if (radical) {
      const otherNumeric = readFiniteNumericValue(attempt.otherSide);
      if (otherNumeric === null) {
        return {
          kind: 'next',
          equationNode: normalizeAst([
            'Equal',
            radical.inner,
            simplifyNode(['Power', attempt.otherSide, radical.index]),
          ]),
        };
      }

      if (isEvenInteger(radical.index) && otherNumeric < -ABS_NUMERIC_EPSILON) {
        return { kind: 'no-roots' };
      }

      return {
        kind: 'next',
        equationNode: normalizeAst([
          'Equal',
          radical.inner,
          simplifyNode(['Power', attempt.otherSide, radical.index]),
        ]),
      };
    }

    const rationalPower = matchOuterPlaceholderRationalPower(attempt.radicalSide, placeholder);
    if (!rationalPower) {
      continue;
    }

    const invertedExponent = invertRationalExponent(
      rationalPower.exponent.numerator,
      rationalPower.exponent.denominator,
    );
    if (!invertedExponent) {
      return { kind: 'none' };
    }

    const otherNumeric = readFiniteNumericValue(attempt.otherSide);
    if (
      otherNumeric !== null
      && isEvenInteger(invertedExponent.denominator)
      && otherNumeric < -ABS_NUMERIC_EPSILON
    ) {
      return { kind: 'no-roots' };
    }

    return {
      kind: 'next',
      equationNode: normalizeAst([
        'Equal',
        rationalPower.base,
        simplifyNode(['Power', attempt.otherSide, buildScalarNode(invertedExponent)]),
      ]),
    };
  }

  return { kind: 'none' };
}

export function solveAbsoluteValuePlaceholderEquation(
  equationNode: unknown,
  placeholder: string,
  remainingTransforms: number,
): AbsoluteValuePlaceholderSolveOutcome {
  const linearSink = solveLinearAbsoluteValuePlaceholderRoots(equationNode, placeholder);
  if (linearSink.kind !== 'unrecognized') {
    return linearSink;
  }

  const polynomialSink = solvePolynomialAbsoluteValuePlaceholderRoots(equationNode, placeholder);
  if (polynomialSink.kind !== 'unrecognized') {
    return polynomialSink;
  }

  const transforms = [
    reduceSameBaseAbsoluteValuePlaceholderEquation(equationNode),
    reduceInverseAbsoluteValuePlaceholderEquation(equationNode),
    reduceRadicalAbsoluteValuePlaceholderEquation(equationNode, placeholder),
  ];

  for (const transform of transforms) {
    if (transform.kind === 'none') {
      continue;
    }

    if (transform.kind === 'no-roots') {
      return {
        kind: 'no-roots',
        normalizationKind: 'outer-nonperiodic',
        reason: 'no-real-nonnegative-root',
      };
    }

    if (remainingTransforms <= 0) {
      return {
        kind: 'unresolved',
        normalizationKind: 'outer-nonperiodic',
        reason: 'outer-depth',
      };
    }

    const recursive = solveAbsoluteValuePlaceholderEquation(
      transform.equationNode,
      placeholder,
      remainingTransforms - 1,
    );

    return recursive.kind === 'unrecognized'
      ? {
          kind: 'unresolved',
          normalizationKind: 'outer-nonperiodic',
          reason: 'outer-sink',
        }
      : recursive;
  }

  return { kind: 'unrecognized' };
}
