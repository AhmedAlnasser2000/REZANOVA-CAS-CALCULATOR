import {
  addExactPolynomials,
  buildExactPolynomialFromCoefficients,
  divideExactPolynomials,
  exactPolynomialDegree,
  exactPolynomialGcd,
  exactPolynomialIsZero,
  multiplyExactPolynomials,
  parseExactPolynomial,
  readExactScalarNode,
  scaleExactPolynomial,
  type ExactPolynomial,
} from '../../algebra/polynomial-core';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { isNodeArray } from '../../symbolic-engine/patterns';

const DEFAULT_MAX_DEGREE = 32;

type RawExactRationalFunction = {
  variable: string;
  numerator: ExactPolynomial;
  denominator: ExactPolynomial;
};

function oneExactPolynomial(variable: string) {
  return buildExactPolynomialFromCoefficients(variable, [{ numerator: 1, denominator: 1 }]);
}

function rawRationalFromPolynomial(polynomial: ExactPolynomial): RawExactRationalFunction {
  return {
    variable: polynomial.variable,
    numerator: polynomial,
    denominator: oneExactPolynomial(polynomial.variable),
  };
}

function reduceRawRationalFunction(
  rational: RawExactRationalFunction,
): RawExactRationalFunction | null {
  const gcd = exactPolynomialGcd(rational.numerator, rational.denominator);
  if (!gcd || exactPolynomialDegree(gcd) === 0) {
    return rational;
  }

  const numerator = divideExactPolynomials(rational.numerator, gcd);
  const denominator = divideExactPolynomials(rational.denominator, gcd);
  if (
    !numerator
    || !denominator
    || !exactPolynomialIsZero(numerator.remainder)
    || !exactPolynomialIsZero(denominator.remainder)
    || exactPolynomialIsZero(denominator.quotient)
  ) {
    return null;
  }

  return {
    variable: rational.variable,
    numerator: numerator.quotient,
    denominator: denominator.quotient,
  };
}

function multiplyRawRationalFunctions(
  left: RawExactRationalFunction,
  right: RawExactRationalFunction,
  maxDegree: number,
): RawExactRationalFunction | null {
  if (left.variable !== right.variable) {
    return null;
  }

  const numerator = multiplyExactPolynomials(left.numerator, right.numerator, maxDegree);
  const denominator = multiplyExactPolynomials(left.denominator, right.denominator, maxDegree);
  return numerator && denominator && !exactPolynomialIsZero(denominator)
    ? reduceRawRationalFunction({ variable: left.variable, numerator, denominator })
    : null;
}

function addRawRationalFunctions(
  left: RawExactRationalFunction,
  right: RawExactRationalFunction,
  sign: 1 | -1,
  maxDegree: number,
): RawExactRationalFunction | null {
  if (left.variable !== right.variable) {
    return null;
  }

  const leftNumerator = multiplyExactPolynomials(left.numerator, right.denominator, maxDegree);
  const rightNumerator = multiplyExactPolynomials(right.numerator, left.denominator, maxDegree);
  const denominator = multiplyExactPolynomials(left.denominator, right.denominator, maxDegree);
  return leftNumerator && rightNumerator && denominator && !exactPolynomialIsZero(denominator)
    ? reduceRawRationalFunction({
      variable: left.variable,
      numerator: addExactPolynomials(leftNumerator, rightNumerator, sign),
      denominator,
    })
    : null;
}

function powerRawRationalFunction(
  rational: RawExactRationalFunction,
  exponent: number,
  maxDegree: number,
): RawExactRationalFunction | null {
  if (exponent === 0) {
    return {
      variable: rational.variable,
      numerator: oneExactPolynomial(rational.variable),
      denominator: oneExactPolynomial(rational.variable),
    };
  }

  const base = exponent > 0
    ? rational
    : {
      variable: rational.variable,
      numerator: rational.denominator,
      denominator: rational.numerator,
    };
  if (exactPolynomialIsZero(base.denominator)) {
    return null;
  }

  let current: RawExactRationalFunction = {
    variable: rational.variable,
    numerator: oneExactPolynomial(rational.variable),
    denominator: oneExactPolynomial(rational.variable),
  };
  for (let index = 0; index < Math.abs(exponent); index += 1) {
    const multiplied = multiplyRawRationalFunctions(current, base, maxDegree);
    if (!multiplied) {
      return null;
    }
    current = multiplied;
  }
  return current;
}

function parseRawRationalFunction(
  node: unknown,
  variable: string,
  maxDegree: number,
): RawExactRationalFunction | null {
  const polynomial = parseExactPolynomial(node, variable, maxDegree);
  if (polynomial) {
    return rawRationalFromPolynomial(polynomial);
  }

  if (!isNodeArray(node) || node.length === 0 || typeof node[0] !== 'string') {
    return null;
  }

  const [operator, ...children] = node;
  if (operator === 'Negate' && children.length === 1) {
    const child = parseRawRationalFunction(children[0], variable, maxDegree);
    return child
      ? {
        ...child,
        numerator: scaleExactPolynomial(child.numerator, { numerator: -1, denominator: 1 }),
      }
      : null;
  }

  if ((operator === 'Add' || operator === 'Subtract') && children.length > 0) {
    const [first, ...rest] = children;
    if (first === undefined) {
      return null;
    }

    let current = parseRawRationalFunction(first, variable, maxDegree);
    if (!current) {
      return null;
    }
    for (const childNode of rest) {
      const child = parseRawRationalFunction(childNode, variable, maxDegree);
      if (!child) {
        return null;
      }
      current = addRawRationalFunctions(
        current,
        child,
        operator === 'Add' ? 1 : -1,
        maxDegree,
      );
      if (!current) {
        return null;
      }
    }
    return current;
  }

  if (operator === 'Multiply' && children.length > 0) {
    let current: RawExactRationalFunction = {
      variable,
      numerator: oneExactPolynomial(variable),
      denominator: oneExactPolynomial(variable),
    };
    for (const childNode of children) {
      const child = parseRawRationalFunction(childNode, variable, maxDegree);
      if (!child) {
        return null;
      }
      const multiplied = multiplyRawRationalFunctions(current, child, maxDegree);
      if (!multiplied) {
        return null;
      }
      current = multiplied;
    }
    return current;
  }

  if (operator === 'Divide' && children.length === 2) {
    const numerator = parseRawRationalFunction(children[0], variable, maxDegree);
    const denominator = parseRawRationalFunction(children[1], variable, maxDegree);
    if (!numerator || !denominator || exactPolynomialIsZero(denominator.numerator)) {
      return null;
    }
    return multiplyRawRationalFunctions(numerator, {
      variable,
      numerator: denominator.denominator,
      denominator: denominator.numerator,
    }, maxDegree);
  }

  if (operator === 'Power' && children.length === 2) {
    const exponent = readExactScalarNode(children[1]);
    if (!exponent || exponent.denominator !== 1 || Math.abs(exponent.numerator) > maxDegree) {
      return null;
    }
    const base = parseRawRationalFunction(children[0], variable, maxDegree);
    return base ? powerRawRationalFunction(base, exponent.numerator, maxDegree) : null;
  }

  return null;
}

function rawRationalFunctionsEquivalent(
  left: RawExactRationalFunction,
  right: RawExactRationalFunction,
) {
  if (left.variable !== right.variable) {
    return false;
  }

  const maxProductDegree = Math.max(
    exactPolynomialDegree(left.numerator) + exactPolynomialDegree(right.denominator),
    exactPolynomialDegree(right.numerator) + exactPolynomialDegree(left.denominator),
  );
  const leftCrossProduct = multiplyExactPolynomials(
    left.numerator,
    right.denominator,
    maxProductDegree,
  );
  const rightCrossProduct = multiplyExactPolynomials(
    right.numerator,
    left.denominator,
    maxProductDegree,
  );
  return Boolean(leftCrossProduct && rightCrossProduct
    && exactPolynomialIsZero(addExactPolynomials(leftCrossProduct, rightCrossProduct, -1)));
}

export function areRawExactRationalFunctionsEquivalent(
  left: unknown,
  right: unknown,
  variable: string,
  maxDegree = DEFAULT_MAX_DEGREE,
) {
  const rawLeft = parseRawRationalFunction(normalizeAst(left), variable, maxDegree);
  const rawRight = parseRawRationalFunction(normalizeAst(right), variable, maxDegree);
  return rawLeft && rawRight
    ? rawRationalFunctionsEquivalent(rawLeft, rawRight)
    : undefined;
}
