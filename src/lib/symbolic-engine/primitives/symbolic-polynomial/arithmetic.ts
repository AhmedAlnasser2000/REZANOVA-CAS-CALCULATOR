import {
  addMathJsonNodes,
  multiplyMathJsonNodes,
} from '../simplification/simplification';
import {
  addSymbolicCoefficients,
  divideSymbolicCoefficients,
  isSymbolicCoefficientOne,
  isSymbolicCoefficientZero,
  mergeSymbolicCoefficientFacts,
  multiplySymbolicCoefficients,
  negateSymbolicCoefficient,
  oneSymbolicCoefficient,
  parseSymbolicCoefficient,
  zeroSymbolicCoefficient,
  type SymbolicCoefficient,
  type SymbolicCoefficientFact,
} from '../coefficient-domain';
import type {
  SymbolicPolynomial,
  SymbolicPolynomialOperationResult,
  SymbolicPolynomialOptions,
  SymbolicPolynomialStop,
} from './types';

function coefficientStop(reason: SymbolicPolynomialStop['reason'], detail?: string): SymbolicPolynomialStop {
  return { kind: 'stop', reason, detail };
}

function mergePolynomialFacts(...sources: Array<SymbolicPolynomial | SymbolicCoefficient | SymbolicCoefficientFact[]>) {
  return mergeSymbolicCoefficientFacts(
    sources.flatMap((source) => Array.isArray(source)
      ? source
      : source.facts),
  );
}

export function zeroCoefficient(variable: string): SymbolicCoefficient {
  const zero = zeroSymbolicCoefficient(variable);
  if (zero.kind === 'stop') {
    throw new Error(`Unable to construct zero symbolic coefficient: ${zero.reason}`);
  }
  return zero.coefficient;
}

export function oneCoefficient(variable: string): SymbolicCoefficient {
  const one = oneSymbolicCoefficient(variable);
  if (one.kind === 'stop') {
    throw new Error(`Unable to construct one symbolic coefficient: ${one.reason}`);
  }
  return one.coefficient;
}

export function normalizeSymbolicPolynomial(polynomial: SymbolicPolynomial): SymbolicPolynomial {
  let degree = polynomial.coefficients.length - 1;
  while (degree > 0 && isSymbolicCoefficientZero(polynomial.coefficients[degree])) {
    degree -= 1;
  }
  const coefficients = polynomial.coefficients.slice(0, degree + 1);
  return {
    variable: polynomial.variable,
    degree,
    coefficients,
    facts: mergeSymbolicCoefficientFacts(coefficients.flatMap((coefficient) => coefficient.facts)),
  };
}

export function symbolicPolynomialIsZero(polynomial: SymbolicPolynomial) {
  const normalized = normalizeSymbolicPolynomial(polynomial);
  return normalized.degree === 0 && isSymbolicCoefficientZero(normalized.coefficients[0]);
}

export function getSymbolicPolynomialCoefficient(polynomial: SymbolicPolynomial, degree: number) {
  return polynomial.coefficients[degree] ?? zeroCoefficient(polynomial.variable);
}

export function constantSymbolicPolynomial(
  coefficient: SymbolicCoefficient,
  variable: string,
): SymbolicPolynomial {
  return normalizeSymbolicPolynomial({
    variable,
    degree: 0,
    coefficients: [coefficient],
    facts: coefficient.facts,
  });
}

export function zeroSymbolicPolynomial(variable: string): SymbolicPolynomialOperationResult {
  const zero = zeroSymbolicCoefficient(variable);
  if (zero.kind === 'stop') {
    return {
      kind: 'stop',
      reason: 'coefficient-stop',
      coefficientReason: zero.reason,
    };
  }
  return {
    kind: 'success',
    polynomial: constantSymbolicPolynomial(zero.coefficient, variable),
  };
}

export function addSymbolicPolynomials(
  left: SymbolicPolynomial,
  right: SymbolicPolynomial,
  options: SymbolicPolynomialOptions = {},
): SymbolicPolynomialOperationResult {
  if (left.variable !== right.variable) {
    return coefficientStop('variable-mismatch');
  }
  const variable = left.variable;
  const degree = Math.max(left.degree, right.degree);
  if (degree > (options.maxDegree ?? Number.POSITIVE_INFINITY)) {
    return coefficientStop('over-cap-degree');
  }
  const coefficients: SymbolicCoefficient[] = [];
  for (let index = 0; index <= degree; index += 1) {
    const sum = addSymbolicCoefficients(
      getSymbolicPolynomialCoefficient(left, index),
      getSymbolicPolynomialCoefficient(right, index),
      variable,
    );
    if (sum.kind === 'stop') {
      return { kind: 'stop', reason: 'coefficient-stop', coefficientReason: sum.reason };
    }
    coefficients[index] = sum.coefficient;
  }
  return {
    kind: 'success',
    polynomial: normalizeSymbolicPolynomial({ variable, degree, coefficients, facts: mergePolynomialFacts(left, right) }),
  };
}

export function negateSymbolicPolynomial(polynomial: SymbolicPolynomial): SymbolicPolynomialOperationResult {
  const coefficients: SymbolicCoefficient[] = [];
  for (const coefficient of polynomial.coefficients) {
    const negated = negateSymbolicCoefficient(coefficient, polynomial.variable);
    if (negated.kind === 'stop') {
      return { kind: 'stop', reason: 'coefficient-stop', coefficientReason: negated.reason };
    }
    coefficients.push(negated.coefficient);
  }
  return {
    kind: 'success',
    polynomial: normalizeSymbolicPolynomial({
      variable: polynomial.variable,
      degree: polynomial.degree,
      coefficients,
      facts: polynomial.facts,
    }),
  };
}

export function subtractSymbolicPolynomials(
  left: SymbolicPolynomial,
  right: SymbolicPolynomial,
  options: SymbolicPolynomialOptions = {},
): SymbolicPolynomialOperationResult {
  const negated = negateSymbolicPolynomial(right);
  if (negated.kind === 'stop') {
    return negated;
  }
  return addSymbolicPolynomials(left, negated.polynomial, options);
}

export function multiplySymbolicPolynomials(
  left: SymbolicPolynomial,
  right: SymbolicPolynomial,
  options: SymbolicPolynomialOptions = {},
): SymbolicPolynomialOperationResult {
  if (left.variable !== right.variable) {
    return coefficientStop('variable-mismatch');
  }
  const variable = left.variable;
  const degree = left.degree + right.degree;
  if (degree > (options.maxDegree ?? Number.POSITIVE_INFINITY)) {
    return coefficientStop('over-cap-degree');
  }
  const zero = zeroCoefficient(variable);
  const coefficients = Array.from({ length: degree + 1 }, () => zero);
  for (let leftDegree = 0; leftDegree <= left.degree; leftDegree += 1) {
    for (let rightDegree = 0; rightDegree <= right.degree; rightDegree += 1) {
      const product = multiplySymbolicCoefficients(
        getSymbolicPolynomialCoefficient(left, leftDegree),
        getSymbolicPolynomialCoefficient(right, rightDegree),
        variable,
      );
      if (product.kind === 'stop') {
        return { kind: 'stop', reason: 'coefficient-stop', coefficientReason: product.reason };
      }
      const combined = addSymbolicCoefficients(
        coefficients[leftDegree + rightDegree],
        product.coefficient,
        variable,
      );
      if (combined.kind === 'stop') {
        return { kind: 'stop', reason: 'coefficient-stop', coefficientReason: combined.reason };
      }
      coefficients[leftDegree + rightDegree] = combined.coefficient;
    }
  }
  return {
    kind: 'success',
    polynomial: normalizeSymbolicPolynomial({ variable, degree, coefficients, facts: mergePolynomialFacts(left, right) }),
  };
}

export function scaleSymbolicPolynomial(
  polynomial: SymbolicPolynomial,
  scalar: SymbolicCoefficient,
): SymbolicPolynomialOperationResult {
  const coefficients: SymbolicCoefficient[] = [];
  for (const coefficient of polynomial.coefficients) {
    const product = multiplySymbolicCoefficients(coefficient, scalar, polynomial.variable);
    if (product.kind === 'stop') {
      return { kind: 'stop', reason: 'coefficient-stop', coefficientReason: product.reason };
    }
    coefficients.push(product.coefficient);
  }
  return {
    kind: 'success',
    polynomial: normalizeSymbolicPolynomial({
      variable: polynomial.variable,
      degree: polynomial.degree,
      coefficients,
      facts: mergePolynomialFacts(polynomial, scalar),
    }),
  };
}

export function monomialSymbolicPolynomial(
  variable: string,
  degree: number,
  coefficient: SymbolicCoefficient,
): SymbolicPolynomialOperationResult {
  const zero = zeroCoefficient(variable);
  const coefficients = Array.from({ length: degree + 1 }, () => zero);
  coefficients[degree] = coefficient;
  return {
    kind: 'success',
    polynomial: normalizeSymbolicPolynomial({ variable, degree, coefficients, facts: coefficient.facts }),
  };
}

export function derivativeSymbolicPolynomial(polynomial: SymbolicPolynomial): SymbolicPolynomialOperationResult {
  const variable = polynomial.variable;
  if (polynomial.degree === 0) {
    return zeroSymbolicPolynomial(variable);
  }
  const coefficients: SymbolicCoefficient[] = [];
  for (let degree = 1; degree <= polynomial.degree; degree += 1) {
    const degreeCoefficient = parseSymbolicCoefficient(degree, variable);
    if (degreeCoefficient.kind === 'stop') {
      return {
        kind: 'stop',
        reason: 'coefficient-stop',
        coefficientReason: degreeCoefficient.reason,
      };
    }
    const scaled = multiplySymbolicCoefficients(polynomial.coefficients[degree], degreeCoefficient.coefficient, variable);
    if (scaled.kind === 'stop') {
      return { kind: 'stop', reason: 'coefficient-stop', coefficientReason: scaled.reason };
    }
    coefficients[degree - 1] = scaled.coefficient;
  }
  return {
    kind: 'success',
    polynomial: normalizeSymbolicPolynomial({ variable, degree: polynomial.degree - 1, coefficients, facts: polynomial.facts }),
  };
}

export function makeMonicSymbolicPolynomial(polynomial: SymbolicPolynomial): SymbolicPolynomialOperationResult {
  const normalized = normalizeSymbolicPolynomial(polynomial);
  if (symbolicPolynomialIsZero(normalized)) {
    return { kind: 'success', polynomial: normalized };
  }
  const leading = normalized.coefficients[normalized.degree];
  if (isSymbolicCoefficientOne(leading)) {
    return { kind: 'success', polynomial: normalized };
  }
  const one = oneCoefficient(normalized.variable);
  const reciprocal = divideSymbolicCoefficients(one, leading, normalized.variable);
  if (reciprocal.kind === 'stop') {
    return { kind: 'stop', reason: 'coefficient-stop', coefficientReason: reciprocal.reason };
  }
  return scaleSymbolicPolynomial(normalized, reciprocal.coefficient);
}

export function buildSymbolicPolynomialNode(polynomial: SymbolicPolynomial) {
  const terms: unknown[] = [];
  normalizeSymbolicPolynomial(polynomial).coefficients.forEach((coefficient, degree) => {
    if (isSymbolicCoefficientZero(coefficient)) {
      return;
    }
    if (degree === 0) {
      terms.push(coefficient.node);
      return;
    }
    const variableNode = degree === 1 ? polynomial.variable : ['Power', polynomial.variable, degree];
    terms.push(multiplyMathJsonNodes(coefficient.node, variableNode));
  });
  return addMathJsonNodes(...terms);
}
