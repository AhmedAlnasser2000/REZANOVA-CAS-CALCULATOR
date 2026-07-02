import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import {
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactScalarEquals,
  exactScalarIsZero,
  exactScalarToNumber,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  readExactScalarNode,
  subtractExactScalars,
  type ExactScalar,
} from '../../../algebra/polynomial-core';
import {
  addMathJsonNodes,
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  simplifyMathJsonNodeOrOriginal,
} from '../../primitives/simplification/simplification';
import {
  getSymbolicPolynomialCoefficient,
  parseSymbolicPolynomial,
} from '../../primitives/symbolic-polynomial';
import {
  boxLatex,
  isNodeArray,
  wrapGroupedLatex,
} from '../../patterns';
import {
  pullbackAlgebraicGenus0Integral,
  type AlgebraicGenus0PullbackSuccess,
  type AlgebraicGenus0PullbackStopReason,
} from './pullback';

export type AlgebraicGenus0InverseReadbackSource =
  | 'affine-radical'
  | 'quadratic-derivative-radical'
  | 'quadratic-minus'
  | 'quadratic-outside'
  | 'quadratic-plus';

export type AlgebraicGenus0InverseReadbackStopReason =
  | 'pullback-stop'
  | 'unsupported-integrand-shape'
  | 'unsupported-quadratic'
  | 'unsupported-readback-family';

export type AlgebraicGenus0InverseReadbackSuccess = {
  kind: 'success';
  variable: string;
  parameter: string;
  source: AlgebraicGenus0InverseReadbackSource;
  antiderivativeNode: unknown;
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex: string[];
  pullback: AlgebraicGenus0PullbackSuccess;
};

export type AlgebraicGenus0InverseReadbackStop = {
  kind: 'stop';
  variable: string;
  parameter: string;
  reason: AlgebraicGenus0InverseReadbackStopReason;
  detail: string;
  pullbackReason?: AlgebraicGenus0PullbackStopReason;
};

export type AlgebraicGenus0InverseReadback =
  | AlgebraicGenus0InverseReadbackSuccess
  | AlgebraicGenus0InverseReadbackStop;

type RadicalShape =
  | { kind: 'radical'; radicand: unknown }
  | { kind: 'reciprocal-radical'; radicand: unknown }
  | { kind: 'quotient-radical'; numerator: unknown; radicand: unknown };

type StandardQuadratic = {
  family: 'minus' | 'outside' | 'plus';
  radicand: unknown;
  radius: ExactScalar;
  rootAbsLeading: ExactScalar;
  shiftedVariable: unknown;
};

type InverseReadbackPlan = {
  node: unknown;
  source: AlgebraicGenus0InverseReadbackSource;
  exactLatex?: string;
};

const TWO: ExactScalar = { numerator: 2, denominator: 1 };
const THREE: ExactScalar = { numerator: 3, denominator: 1 };

function stop(input: {
  variable: string;
  parameter: string;
  reason: AlgebraicGenus0InverseReadbackStopReason;
  detail: string;
  pullbackReason?: AlgebraicGenus0PullbackStopReason;
}): AlgebraicGenus0InverseReadbackStop {
  return { kind: 'stop', ...input };
}

function proof(source: AlgebraicGenus0InverseReadbackSource): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason: `verified by algebraic genus-0 inverse readback rule proof (${source})`,
  };
}

function finish(input: {
  variable: string;
  source: AlgebraicGenus0InverseReadbackSource;
  node: unknown;
  exactLatex?: string;
  pullback: AlgebraicGenus0PullbackSuccess;
}): AlgebraicGenus0InverseReadbackSuccess {
  const antiderivativeNode = simplifyMathJsonNodeOrOriginal(input.node);
  return {
    kind: 'success',
    variable: input.variable,
    parameter: input.pullback.parameter,
    source: input.source,
    antiderivativeNode,
    exactLatex: input.exactLatex ?? boxLatex(antiderivativeNode),
    verification: proof(input.source),
    exactSupplementLatex: input.pullback.exactSupplementLatex,
    pullback: input.pullback,
  };
}

function isExactOne(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === scalar.denominator);
}

function radicalShape(node: unknown): RadicalShape | undefined {
  if (isNodeArray(node) && node[0] === 'Sqrt' && node.length === 2) {
    const rawRadicand = node[1];
    if (
      isNodeArray(rawRadicand)
      && rawRadicand[0] === 'Divide'
      && rawRadicand.length === 3
      && isExactOne(rawRadicand[1])
    ) {
      return { kind: 'reciprocal-radical', radicand: rawRadicand[2] };
    }
    return { kind: 'radical', radicand: rawRadicand };
  }

  if (
    isNodeArray(node)
    && node[0] === 'Divide'
    && node.length === 3
    && isNodeArray(node[2])
    && node[2][0] === 'Sqrt'
    && node[2].length === 2
  ) {
    return { kind: 'quotient-radical', numerator: node[1], radicand: node[2][1] };
  }

  return undefined;
}

function exactNode(value: ExactScalar) {
  return buildExactScalarNode(normalizeExactScalar(value));
}

function exactSqrt(value: ExactScalar): ExactScalar | undefined {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator < 0 || normalized.denominator <= 0) {
    return undefined;
  }
  const numerator = Math.sqrt(normalized.numerator);
  const denominator = Math.sqrt(normalized.denominator);
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    return undefined;
  }
  return normalizeExactScalar({ numerator, denominator });
}

function power(node: unknown, exponent: ExactScalar) {
  return ['Power', node, exactNode(exponent)];
}

function sqrt(node: unknown) {
  return ['Sqrt', node];
}

function affineReadback(
  shape: RadicalShape,
  variable: string,
): InverseReadbackPlan | undefined {
  if (shape.kind === 'quotient-radical') {
    return undefined;
  }

  const parsed = parseSymbolicPolynomial(shape.radicand, variable, 1);
  if (parsed.kind !== 'success' || parsed.polynomial.degree !== 1) {
    return undefined;
  }

  const slope = getSymbolicPolynomialCoefficient(parsed.polynomial, 1).node;
  const slopeLatex = boxLatex(simplifyMathJsonNodeOrOriginal(slope));
  const radicandLatex = wrapGroupedLatex(boxLatex(simplifyMathJsonNodeOrOriginal(shape.radicand)));
  if (shape.kind === 'radical') {
    const numerator = multiplyMathJsonNodes(
      TWO.numerator,
      power(shape.radicand, { numerator: 3, denominator: 2 }),
    );
    const denominator = multiplyMathJsonNodes(THREE.numerator, slope);
    return {
      node: divideMathJsonNodes(numerator, denominator),
      source: 'affine-radical',
      exactLatex: slopeLatex === '1'
        ? `\\frac{2}{3}${radicandLatex}^{\\frac{3}{2}}`
        : `\\frac{2${radicandLatex}^{\\frac{3}{2}}}{3${wrapGroupedLatex(slopeLatex)}}`,
    };
  }

  return {
    node: divideMathJsonNodes(
      multiplyMathJsonNodes(TWO.numerator, sqrt(shape.radicand)),
      slope,
    ),
    source: 'affine-radical',
    exactLatex: slopeLatex === '1'
      ? `2\\sqrt{${boxLatex(simplifyMathJsonNodeOrOriginal(shape.radicand))}}`
      : `\\frac{2\\sqrt{${boxLatex(simplifyMathJsonNodeOrOriginal(shape.radicand))}}}{${wrapGroupedLatex(slopeLatex)}}`,
  };
}

function standardQuadratic(radicand: unknown, variable: string): StandardQuadratic | undefined {
  const polynomial = parseExactPolynomial(radicand, variable, 2);
  if (!polynomial || exactPolynomialDegree(polynomial) !== 2) {
    return undefined;
  }

  const leading = getExactPolynomialCoefficient(polynomial, 2);
  if (exactScalarIsZero(leading)) {
    return undefined;
  }
  const linear = getExactPolynomialCoefficient(polynomial, 1);
  const constant = getExactPolynomialCoefficient(polynomial, 0);
  const rootAbsLeading = exactSqrt(leading.numerator < 0 ? negateExactScalar(leading) : leading);
  if (!rootAbsLeading) {
    return undefined;
  }

  const twoLeading = multiplyExactScalars(TWO, leading);
  const shift = divideExactScalars(linear, twoLeading);
  if (!shift) {
    return undefined;
  }

  const normalizedConstant = divideExactScalars(constant, leading);
  if (!normalizedConstant) {
    return undefined;
  }
  const completedConstant = subtractExactScalars(
    normalizedConstant,
    multiplyExactScalars(shift, shift),
  );
  const signedRadius = multiplyExactScalars(leading, completedConstant);
  if (exactScalarIsZero(signedRadius)) {
    return undefined;
  }

  const leadingSign = exactScalarToNumber(leading) > 0 ? 1 : -1;
  const completedSign = exactScalarToNumber(completedConstant) > 0 ? 1 : -1;
  let family: StandardQuadratic['family'];
  if (leadingSign > 0 && completedSign > 0) {
    family = 'plus';
  } else if (leadingSign < 0 && completedSign < 0) {
    family = 'minus';
  } else if (leadingSign > 0 && completedSign < 0) {
    family = 'outside';
  } else {
    return undefined;
  }

  const radius = signedRadius.numerator < 0 ? negateExactScalar(signedRadius) : signedRadius;
  const shiftedVariable = multiplyMathJsonNodes(
    exactNode(rootAbsLeading),
    addMathJsonNodes(variable, exactNode(shift)),
  );
  return {
    family,
    radicand,
    radius,
    rootAbsLeading,
    shiftedVariable,
  };
}

function inverseFunctionFor(family: StandardQuadratic['family']) {
  if (family === 'minus') {
    return 'Arcsin';
  }
  if (family === 'plus') {
    return 'Arsinh';
  }
  return 'Arcosh';
}

function quadraticRadicalReadback(
  shape: Exclude<RadicalShape, { kind: 'quotient-radical' }>,
  variable: string,
): InverseReadbackPlan | undefined {
  const parsed = standardQuadratic(shape.radicand, variable);
  if (!parsed) {
    return undefined;
  }

  const radiusNode = exactNode(parsed.radius);
  const rootRadius = sqrt(radiusNode);
  const scaledVariable = divideMathJsonNodes(parsed.shiftedVariable, rootRadius);
  const inverse = [inverseFunctionFor(parsed.family), scaledVariable];
  const slopeNode = exactNode(parsed.rootAbsLeading);
  const source = parsed.family === 'minus'
    ? 'quadratic-minus'
    : parsed.family === 'plus'
      ? 'quadratic-plus'
      : 'quadratic-outside';

  if (shape.kind === 'reciprocal-radical') {
    return {
      node: divideMathJsonNodes(inverse, slopeNode),
      source,
    };
  }

  const signedInverseTerm = parsed.family === 'outside'
    ? multiplyMathJsonNodes(-1, radiusNode, inverse)
    : multiplyMathJsonNodes(radiusNode, inverse);
  const numerator = addMathJsonNodes(
    multiplyMathJsonNodes(parsed.shiftedVariable, sqrt(shape.radicand)),
    signedInverseTerm,
  );
  return {
    node: divideMathJsonNodes(numerator, multiplyMathJsonNodes(2, slopeNode)),
    source,
  };
}

function derivativeRadicalReadback(
  shape: RadicalShape,
  variable: string,
): InverseReadbackPlan | undefined {
  if (shape.kind !== 'quotient-radical') {
    return undefined;
  }

  const denominator = parseExactPolynomial(shape.radicand, variable, 2);
  const numerator = parseExactPolynomial(shape.numerator, variable, 1);
  if (!denominator || !numerator || exactPolynomialDegree(denominator) !== 2) {
    return undefined;
  }

  const a = getExactPolynomialCoefficient(denominator, 2);
  const b = getExactPolynomialCoefficient(denominator, 1);
  const numeratorLinear = getExactPolynomialCoefficient(numerator, 1);
  const numeratorConstant = getExactPolynomialCoefficient(numerator, 0);
  const derivativeLinear = multiplyExactScalars(TWO, a);
  if (exactScalarIsZero(derivativeLinear)) {
    return undefined;
  }
  const scale = divideExactScalars(numeratorLinear, derivativeLinear);
  if (!scale) {
    return undefined;
  }
  if (!exactScalarEquals(multiplyExactScalars(scale, b), numeratorConstant)) {
    return undefined;
  }

  return {
    node: multiplyMathJsonNodes(2, exactNode(scale), sqrt(shape.radicand)),
    source: 'quadratic-derivative-radical',
  };
}

function readbackFor(shape: RadicalShape, variable: string) {
  return affineReadback(shape, variable)
    ?? derivativeRadicalReadback(shape, variable)
    ?? (shape.kind === 'radical' || shape.kind === 'reciprocal-radical'
      ? quadraticRadicalReadback(shape, variable)
      : undefined);
}

export function tryAlgebraicGenus0InverseReadback(
  integrand: unknown,
  variable = 'x',
  requestedParameter?: string,
): AlgebraicGenus0InverseReadback {
  const pullback = pullbackAlgebraicGenus0Integral(integrand, variable, requestedParameter);
  const parameter = pullback.parameter;
  if (pullback.kind !== 'success') {
    return stop({
      variable,
      parameter,
      reason: 'pullback-stop',
      pullbackReason: pullback.reason,
      detail: pullback.detail,
    });
  }

  const shape = radicalShape(integrand);
  if (!shape) {
    return stop({
      variable,
      parameter,
      reason: 'unsupported-integrand-shape',
      detail: 'The inverse readback slice accepts direct radical, reciprocal radical, or simple quotient-radical shapes.',
    });
  }

  const readback = readbackFor(shape, variable);
  if (!readback) {
    return stop({
      variable,
      parameter,
      reason: 'unsupported-readback-family',
      detail: 'The pullback succeeded, but this milestone has no clean inverse readback for the resulting family yet.',
    });
  }

  return finish({
    variable,
    source: readback.source,
    node: readback.node,
    exactLatex: readback.exactLatex,
    pullback,
  });
}
