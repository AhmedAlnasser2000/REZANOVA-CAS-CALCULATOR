import { ComputeEngine } from '@cortex-js/compute-engine';

const ce = new ComputeEngine();

export type ExactScalar = {
  numerator: number;
  denominator: number;
};

export type ExactPolynomial = {
  variable: string;
  terms: Map<number, ExactScalar>;
};

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isExactIntegerNode(node: unknown): node is number {
  return typeof node === 'number' && Number.isFinite(node) && Number.isInteger(node);
}

function greatestCommonDivisor(left: number, right: number) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

export function normalizeExactScalar(value: ExactScalar): ExactScalar {
  if (value.denominator === 0) {
    return value;
  }

  if (value.numerator === 0) {
    return { numerator: 0, denominator: 1 };
  }

  const sign = value.denominator < 0 ? -1 : 1;
  const numerator = value.numerator * sign;
  const denominator = Math.abs(value.denominator);
  const divisor = greatestCommonDivisor(numerator, denominator);
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
}

export function negateExactScalar(value: ExactScalar): ExactScalar {
  return {
    numerator: -value.numerator,
    denominator: value.denominator,
  };
}

export function addExactScalars(left: ExactScalar, right: ExactScalar): ExactScalar {
  return normalizeExactScalar({
    numerator: left.numerator * right.denominator + right.numerator * left.denominator,
    denominator: left.denominator * right.denominator,
  });
}

export function multiplyExactScalars(left: ExactScalar, right: ExactScalar): ExactScalar {
  return normalizeExactScalar({
    numerator: left.numerator * right.numerator,
    denominator: left.denominator * right.denominator,
  });
}

export function divideExactScalars(left: ExactScalar, right: ExactScalar): ExactScalar | null {
  if (right.numerator === 0) {
    return null;
  }

  return normalizeExactScalar({
    numerator: left.numerator * right.denominator,
    denominator: left.denominator * right.numerator,
  });
}

export function exactScalarToNumber(value: ExactScalar) {
  return value.numerator / value.denominator;
}

export function buildExactScalarNode(value: ExactScalar): unknown {
  const normalized = normalizeExactScalar(value);
  if (normalized.denominator === 1) {
    return normalized.numerator;
  }

  return ['Rational', normalized.numerator, normalized.denominator];
}

export function readExactScalarNode(node: unknown): ExactScalar | null {
  if (isExactIntegerNode(node)) {
    return { numerator: node, denominator: 1 };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return null;
  }

  if (
    node[0] === 'Rational'
    && node.length === 3
    && isExactIntegerNode(node[1])
    && isExactIntegerNode(node[2])
  ) {
    return normalizeExactScalar({ numerator: node[1], denominator: node[2] });
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = readExactScalarNode(node[1]);
    return child
      ? { numerator: -child.numerator, denominator: child.denominator }
      : null;
  }

  return null;
}

function polynomialFromScalar(variable: string, value: ExactScalar): ExactPolynomial {
  return {
    variable,
    terms: new Map<number, ExactScalar>([[0, normalizeExactScalar(value)]]),
  };
}

function polynomialFromDegree(variable: string, degree: number, coefficient: ExactScalar): ExactPolynomial {
  return {
    variable,
    terms: new Map<number, ExactScalar>([[degree, normalizeExactScalar(coefficient)]]),
  };
}

function clonePolynomialTerms(terms: Map<number, ExactScalar>) {
  const clone = new Map<number, ExactScalar>();
  for (const [degree, coefficient] of terms.entries()) {
    clone.set(degree, coefficient);
  }
  return clone;
}

export function addExactPolynomials(
  left: ExactPolynomial,
  right: ExactPolynomial,
  sign: 1 | -1 = 1,
): ExactPolynomial {
  if (left.variable !== right.variable) {
    throw new Error('Cannot add polynomials with different variables.');
  }

  const terms = clonePolynomialTerms(left.terms);
  for (const [degree, coefficient] of right.terms.entries()) {
    const signed = sign === 1 ? coefficient : negateExactScalar(coefficient);
    const current = terms.get(degree);
    const next = current ? addExactScalars(current, signed) : signed;
    if (next.numerator === 0) {
      terms.delete(degree);
    } else {
      terms.set(degree, next);
    }
  }

  return {
    variable: left.variable,
    terms,
  };
}

export function scaleExactPolynomial(polynomial: ExactPolynomial, factor: ExactScalar): ExactPolynomial {
  const terms = new Map<number, ExactScalar>();
  for (const [degree, coefficient] of polynomial.terms.entries()) {
    const next = multiplyExactScalars(coefficient, factor);
    if (next.numerator !== 0) {
      terms.set(degree, next);
    }
  }

  return {
    variable: polynomial.variable,
    terms,
  };
}

export function multiplyExactPolynomials(
  left: ExactPolynomial,
  right: ExactPolynomial,
  maxDegree: number,
): ExactPolynomial | null {
  if (left.variable !== right.variable) {
    return null;
  }

  const terms = new Map<number, ExactScalar>();

  for (const [leftDegree, leftCoefficient] of left.terms.entries()) {
    for (const [rightDegree, rightCoefficient] of right.terms.entries()) {
      const degree = leftDegree + rightDegree;
      if (degree > maxDegree) {
        return null;
      }

      const coefficient = multiplyExactScalars(leftCoefficient, rightCoefficient);
      if (coefficient.numerator === 0) {
        continue;
      }

      const current = terms.get(degree);
      const next = current ? addExactScalars(current, coefficient) : coefficient;
      if (next.numerator === 0) {
        terms.delete(degree);
      } else {
        terms.set(degree, next);
      }
    }
  }

  return {
    variable: left.variable,
    terms,
  };
}

function buildMonomialNode(variable: string, degree: number) {
  if (degree === 0) {
    return 1;
  }

  if (degree === 1) {
    return variable;
  }

  return ['Power', variable, degree];
}

function buildTermNode(variable: string, degree: number, coefficient: ExactScalar) {
  if (degree === 0) {
    return buildExactScalarNode(coefficient);
  }

  const variableNode = buildMonomialNode(variable, degree);
  const normalized = normalizeExactScalar(coefficient);
  if (normalized.numerator === 1 && normalized.denominator === 1) {
    return variableNode;
  }

  if (normalized.numerator === -1 && normalized.denominator === 1) {
    return ['Negate', variableNode];
  }

  return ['Multiply', buildExactScalarNode(normalized), variableNode];
}

export function exactPolynomialToNode(polynomial: ExactPolynomial): unknown {
  const entries = [...polynomial.terms.entries()]
    .filter(([, coefficient]) => coefficient.numerator !== 0)
    .sort((left, right) => right[0] - left[0]);

  if (entries.length === 0) {
    return 0;
  }

  const nodes = entries.map(([degree, coefficient]) =>
    buildTermNode(polynomial.variable, degree, coefficient));

  return nodes.length === 1 ? nodes[0] : ['Add', ...nodes];
}

export function exactPolynomialToLatex(polynomial: ExactPolynomial) {
  return ce.box(exactPolynomialToNode(polynomial) as Parameters<typeof ce.box>[0]).latex;
}

export function exactPolynomialDegree(polynomial: ExactPolynomial) {
  const degrees = [...polynomial.terms.keys()];
  return degrees.length === 0 ? 0 : Math.max(...degrees);
}

export function getExactPolynomialCoefficient(polynomial: ExactPolynomial, degree: number) {
  return polynomial.terms.get(degree) ?? { numerator: 0, denominator: 1 };
}

export function exactPolynomialLeadingCoefficient(polynomial: ExactPolynomial) {
  return getExactPolynomialCoefficient(polynomial, exactPolynomialDegree(polynomial));
}

export function exactPolynomialConstantTerm(polynomial: ExactPolynomial) {
  return getExactPolynomialCoefficient(polynomial, 0);
}

export function quadraticDiscriminant(polynomial: ExactPolynomial): ExactScalar | null {
  if (exactPolynomialDegree(polynomial) !== 2) {
    return null;
  }

  const a = getExactPolynomialCoefficient(polynomial, 2);
  if (a.numerator === 0) {
    return null;
  }

  const b = getExactPolynomialCoefficient(polynomial, 1);
  const c = getExactPolynomialCoefficient(polynomial, 0);
  const bSquared = multiplyExactScalars(b, b);
  const fourAC = multiplyExactScalars(
    { numerator: 4, denominator: 1 },
    multiplyExactScalars(a, c),
  );
  return addExactScalars(bSquared, negateExactScalar(fourAC));
}

export function parseExactPolynomial(
  node: unknown,
  variable: string,
  maxDegree: number,
): ExactPolynomial | null {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return polynomialFromScalar(variable, scalar);
  }

  if (node === variable) {
    return polynomialFromDegree(variable, 1, { numerator: 1, denominator: 1 });
  }

  if (!isNodeArray(node) || node.length === 0 || typeof node[0] !== 'string') {
    return null;
  }

  const operator = node[0];

  if (operator === 'Negate' && node.length === 2) {
    const child = parseExactPolynomial(node[1], variable, maxDegree);
    return child ? scaleExactPolynomial(child, { numerator: -1, denominator: 1 }) : null;
  }

  if (operator === 'Add' || operator === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    if (first === undefined) {
      return null;
    }

    const initial = parseExactPolynomial(first, variable, maxDegree);
    if (!initial) {
      return null;
    }

    return rest.reduce<ExactPolynomial | null>((current, child) => {
      if (!current) {
        return null;
      }
      const parsedChild = parseExactPolynomial(child, variable, maxDegree);
      if (!parsedChild) {
        return null;
      }
      return addExactPolynomials(current, parsedChild, operator === 'Add' ? 1 : -1);
    }, initial);
  }

  if (operator === 'Multiply') {
    const factors = node.slice(1);
    if (factors.length === 0) {
      return null;
    }

    return factors.reduce<ExactPolynomial | null>((current, factor) => {
      const parsedFactor = parseExactPolynomial(factor, variable, maxDegree);
      if (!current || !parsedFactor) {
        return null;
      }
      return multiplyExactPolynomials(current, parsedFactor, maxDegree);
    }, polynomialFromScalar(variable, { numerator: 1, denominator: 1 }));
  }

  if (operator === 'Divide' && node.length === 3) {
    const numerator = parseExactPolynomial(node[1], variable, maxDegree);
    const denominator = readExactScalarNode(node[2]);
    if (!numerator || !denominator) {
      return null;
    }
    const reciprocal = divideExactScalars({ numerator: 1, denominator: 1 }, denominator);
    return reciprocal ? scaleExactPolynomial(numerator, reciprocal) : null;
  }

  if (operator === 'Power' && node.length === 3 && node[1] === variable) {
    const exponent = readExactScalarNode(node[2]);
    if (!exponent || exponent.denominator !== 1 || exponent.numerator < 0 || exponent.numerator > maxDegree) {
      return null;
    }
    return polynomialFromDegree(variable, exponent.numerator, { numerator: 1, denominator: 1 });
  }

  return null;
}
