import type { ComplexExactForm } from '../../../types/calculator';
import {
  addExactScalars,
  divideExactScalars,
  exactScalarToNumber,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  readExactScalarNode,
  subtractExactScalars,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { complex } from '../../numeric/complex';
import { isArrayNode } from './math-json';
import {
  ONE_SCALAR,
  ZERO_SCALAR,
  type ExactComplexScalar,
} from './types';

export function scalarLatex(value: ExactScalar) {
  return exactScalarToLatex(normalizeExactScalar(value));
}

export function exactScalarToLatex(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.denominator === 1
    ? `${normalized.numerator}`
    : `\\frac{${normalized.numerator}}{${normalized.denominator}}`;
}

export function exactScalarIsZero(value: ExactScalar) {
  return normalizeExactScalar(value).numerator === 0;
}

export function exactScalarIsOne(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.numerator === 1 && normalized.denominator === 1;
}

export function exactScalarIsNegativeOne(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.numerator === -1 && normalized.denominator === 1;
}

export function perfectSquare(value: number) {
  if (value < 0 || !Number.isInteger(value)) {
    return null;
  }
  const root = Math.sqrt(value);
  return Number.isInteger(root) ? root : null;
}

export function largestSquareFactor(value: number) {
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

export function sqrtExactScalar(value: ExactScalar): ExactScalar | null {
  const normalized = normalizeExactScalar(value);
  const numeratorRoot = perfectSquare(normalized.numerator);
  const denominatorRoot = perfectSquare(normalized.denominator);
  return numeratorRoot !== null && denominatorRoot !== null
    ? normalizeExactScalar({ numerator: numeratorRoot, denominator: denominatorRoot })
    : null;
}

export function sqrtExactScalarLatex(value: ExactScalar) {
  const exactRoot = sqrtExactScalar(value);
  if (exactRoot) {
    return exactScalarToLatex(exactRoot);
  }

  return `\\sqrt{${exactScalarToLatex(value)}}`;
}

export function scalarAbs(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalizeExactScalar({
    numerator: Math.abs(normalized.numerator),
    denominator: normalized.denominator,
  });
}

export function coefficientTimesSqrtLatex(sqrtValue: ExactScalar, coefficient: ExactScalar) {
  const exactRoot = sqrtExactScalar(sqrtValue);
  if (exactRoot) {
    const product = normalizeExactScalar({
      numerator: exactRoot.numerator * coefficient.numerator,
      denominator: exactRoot.denominator * coefficient.denominator,
    });
    return exactScalarToLatex(scalarAbs(product));
  }

  const absCoefficient = scalarAbs(coefficient);
  const normalizedValue = normalizeExactScalar(sqrtValue);
  const numeratorOutside = largestSquareFactor(normalizedValue.numerator);
  const denominatorOutside = largestSquareFactor(normalizedValue.denominator);
  const outside = normalizeExactScalar({
    numerator: absCoefficient.numerator * numeratorOutside,
    denominator: absCoefficient.denominator * denominatorOutside,
  });
  const inside = normalizeExactScalar({
    numerator: normalizedValue.numerator / (numeratorOutside * numeratorOutside),
    denominator: normalizedValue.denominator / (denominatorOutside * denominatorOutside),
  });
  const sqrtLatex = sqrtExactScalarLatex(inside);
  if (outside.numerator === 1 && outside.denominator === 1) {
    return sqrtLatex;
  }
  if (outside.numerator === 0) {
    return '0';
  }
  return `${exactScalarToLatex(outside)}${sqrtLatex}`;
}

export function imaginaryTermLatex(magnitudeLatex: string) {
  return magnitudeLatex === '1' ? 'i' : `${magnitudeLatex}i`;
}

export function exactScalarImaginaryTermLatex(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  if (exactScalarIsOne(normalized)) {
    return 'i';
  }
  if (exactScalarIsNegativeOne(normalized)) {
    return '-i';
  }
  const magnitude = scalarAbs(normalized);
  const term = imaginaryTermLatex(exactScalarToLatex(magnitude));
  return normalized.numerator < 0 ? `-${term}` : term;
}

export function exactComplexToLatex(value: ExactComplexScalar) {
  const normalized = normalizeExactComplexScalar(value);
  const hasReal = !exactScalarIsZero(normalized.re);
  const hasImaginary = !exactScalarIsZero(normalized.im);
  if (!hasImaginary) {
    return exactScalarToLatex(normalized.re);
  }
  if (!hasReal) {
    return exactScalarImaginaryTermLatex(normalized.im);
  }

  const realLatex = exactScalarToLatex(normalized.re);
  const imaginaryMagnitude = imaginaryTermLatex(exactScalarToLatex(scalarAbs(normalized.im)));
  return `${realLatex}${normalizeExactScalar(normalized.im).numerator < 0 ? '-' : '+'}${imaginaryMagnitude}`;
}

export function squareExactScalar(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalizeExactScalar({
    numerator: normalized.numerator * normalized.numerator,
    denominator: normalized.denominator * normalized.denominator,
  });
}

export function exactComplexAngleLatex(value: ExactComplexScalar) {
  const normalized = normalizeExactComplexScalar(value);
  const real = normalizeExactScalar(normalized.re);
  const imaginary = normalizeExactScalar(normalized.im);
  if (real.numerator === 0) {
    return imaginary.numerator >= 0 ? '\\frac{\\pi}{2}' : '-\\frac{\\pi}{2}';
  }
  if (imaginary.numerator === 0) {
    return real.numerator >= 0 ? '0' : '\\pi';
  }

  const ratio = divideExactScalars(scalarAbs(imaginary), scalarAbs(real));
  if (!ratio) {
    return null;
  }
  const arctan = `\\arctan\\left(${exactScalarToLatex(ratio)}\\right)`;
  if (real.numerator > 0) {
    return imaginary.numerator > 0 ? arctan : `-${arctan}`;
  }
  return imaginary.numerator > 0 ? `\\pi-${arctan}` : `-\\pi+${arctan}`;
}

export function exactComplexToFormLatex(value: ExactComplexScalar, form: ComplexExactForm) {
  if (form === 'rectangular') {
    return exactComplexToLatex(value);
  }

  const normalized = normalizeExactComplexScalar(value);
  if (exactScalarIsZero(normalized.im)) {
    return exactScalarToLatex(normalized.re);
  }

  const radiusSquared = addExactScalars(squareExactScalar(normalized.re), squareExactScalar(normalized.im));
  const radiusLatex = sqrtExactScalarLatex(radiusSquared);
  const angleLatex = exactComplexAngleLatex(normalized);
  if (!angleLatex) {
    return null;
  }

  if (form === 'cis') {
    const unit = `\\operatorname{cis}\\left(${angleLatex}\\right)`;
    return radiusLatex === '1' ? unit : `${radiusLatex}${unit}`;
  }

  const unit = `\\cos\\left(${angleLatex}\\right)+i\\sin\\left(${angleLatex}\\right)`;
  return radiusLatex === '1' ? unit : `${radiusLatex}\\left(${unit}\\right)`;
}

export function normalizeExactComplexScalar(value: ExactComplexScalar): ExactComplexScalar {
  return {
    re: normalizeExactScalar(value.re),
    im: normalizeExactScalar(value.im),
  };
}

export function addExactComplexScalars(left: ExactComplexScalar, right: ExactComplexScalar): ExactComplexScalar {
  return normalizeExactComplexScalar({
    re: addExactScalars(left.re, right.re),
    im: addExactScalars(left.im, right.im),
  });
}

export function negateExactComplexScalar(value: ExactComplexScalar): ExactComplexScalar {
  return normalizeExactComplexScalar({
    re: negateExactScalar(value.re),
    im: negateExactScalar(value.im),
  });
}

export function multiplyExactComplexScalars(left: ExactComplexScalar, right: ExactComplexScalar): ExactComplexScalar {
  return normalizeExactComplexScalar({
    re: subtractExactScalars(multiplyExactScalars(left.re, right.re), multiplyExactScalars(left.im, right.im)),
    im: addExactScalars(multiplyExactScalars(left.re, right.im), multiplyExactScalars(left.im, right.re)),
  });
}

export function multiplyExactComplexByScalar(value: ExactComplexScalar, scalar: ExactScalar): ExactComplexScalar {
  return normalizeExactComplexScalar({
    re: multiplyExactScalars(value.re, scalar),
    im: multiplyExactScalars(value.im, scalar),
  });
}

export function divideExactComplexByScalar(value: ExactComplexScalar, scalar: ExactScalar) {
  const real = divideExactScalars(value.re, scalar);
  const imaginary = divideExactScalars(value.im, scalar);
  return real && imaginary ? normalizeExactComplexScalar({ re: real, im: imaginary }) : null;
}

export function divideExactComplexScalars(left: ExactComplexScalar, right: ExactComplexScalar) {
  const normalizedRight = normalizeExactComplexScalar(right);
  const denominator = addExactScalars(
    multiplyExactScalars(normalizedRight.re, normalizedRight.re),
    multiplyExactScalars(normalizedRight.im, normalizedRight.im),
  );
  if (exactScalarIsZero(denominator)) {
    return null;
  }
  const numerator = multiplyExactComplexScalars(left, {
    re: normalizedRight.re,
    im: negateExactScalar(normalizedRight.im),
  });
  return divideExactComplexByScalar(numerator, denominator);
}

export function nonnegativeIntegerExponent(node: unknown) {
  if (typeof node === 'number' && Number.isInteger(node) && node >= 0) {
    return node;
  }
  const scalar = readExactScalarNode(node);
  if (!scalar) {
    return null;
  }
  const normalized = normalizeExactScalar(scalar);
  return normalized.denominator === 1 && normalized.numerator >= 0
    ? normalized.numerator
    : null;
}

export function powExactComplexScalar(base: ExactComplexScalar, exponent: number): ExactComplexScalar {
  let result: ExactComplexScalar = { re: ONE_SCALAR, im: ZERO_SCALAR };
  for (let index = 0; index < exponent; index += 1) {
    result = multiplyExactComplexScalars(result, base);
  }
  return normalizeExactComplexScalar(result);
}

export function parseExactComplexConstantNode(node: unknown): ExactComplexScalar | null {
  const real = readExactScalarNode(node);
  if (real) {
    return { re: real, im: ZERO_SCALAR };
  }

  if (node === 'ImaginaryUnit') {
    return { re: ZERO_SCALAR, im: ONE_SCALAR };
  }

  if (!isArrayNode(node) || node.length === 0) {
    return null;
  }

  if (node[0] === 'Complex' && node.length === 3) {
    const re = readExactScalarNode(node[1]);
    const im = readExactScalarNode(node[2]);
    return re && im ? normalizeExactComplexScalar({ re, im }) : null;
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = parseExactComplexConstantNode(node[1]);
    return child ? negateExactComplexScalar(child) : null;
  }

  if (node[0] === 'Add') {
    return node.slice(1).reduce<ExactComplexScalar | null>((sum, part) => {
      if (!sum) {
        return null;
      }
      const parsed = parseExactComplexConstantNode(part);
      return parsed ? addExactComplexScalars(sum, parsed) : null;
    }, { re: ZERO_SCALAR, im: ZERO_SCALAR });
  }

  if (node[0] === 'Subtract' && node.length === 3) {
    const left = parseExactComplexConstantNode(node[1]);
    const right = parseExactComplexConstantNode(node[2]);
    return left && right ? addExactComplexScalars(left, negateExactComplexScalar(right)) : null;
  }

  if (node[0] === 'Multiply') {
    return node.slice(1).reduce<ExactComplexScalar | null>((product, part) => {
      if (!product) {
        return null;
      }
      const parsed = parseExactComplexConstantNode(part);
      return parsed ? multiplyExactComplexScalars(product, parsed) : null;
    }, { re: ONE_SCALAR, im: ZERO_SCALAR });
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = parseExactComplexConstantNode(node[1]);
    const denominator = readExactScalarNode(node[2]);
    return numerator && denominator ? divideExactComplexByScalar(numerator, denominator) : null;
  }

  if (node[0] === 'Square' && node.length === 2) {
    const base = parseExactComplexConstantNode(node[1]);
    return base ? powExactComplexScalar(base, 2) : null;
  }

  if (node[0] === 'Power' && node.length === 3) {
    const base = parseExactComplexConstantNode(node[1]);
    const exponent = nonnegativeIntegerExponent(node[2]);
    return base && exponent !== null ? powExactComplexScalar(base, exponent) : null;
  }

  return null;
}

export function exactComplexApproxValue(value: ExactComplexScalar) {
  const normalized = normalizeExactComplexScalar(value);
  return complex(exactScalarToNumber(normalized.re), exactScalarToNumber(normalized.im));
}

export function isExactComplexZero(value: ExactComplexScalar) {
  const normalized = normalizeExactComplexScalar(value);
  return exactScalarIsZero(normalized.re) && exactScalarIsZero(normalized.im);
}

export function expOfExactComplex(value: ExactComplexScalar) {
  const normalized = normalizeExactComplexScalar(value);
  const real = exactScalarToNumber(normalized.re);
  const imaginary = exactScalarToNumber(normalized.im);
  const magnitude = Math.exp(real);
  return complex(magnitude * Math.cos(imaginary), magnitude * Math.sin(imaginary));
}
