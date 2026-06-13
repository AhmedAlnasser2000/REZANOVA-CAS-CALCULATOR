import {
  addExactScalars,
  divideExactScalars,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  readExactScalarNode,
  type ExactScalar,
} from '../polynomial-core';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { flattenAdd, isNodeArray } from '../../symbolic-engine/patterns';
import {
  combineVariables,
  NUMERIC_CONSTANT_SYMBOLS,
  parseInteger,
} from './math-json';
import type { AffineExpression, Monomial, SupportedBinomial } from './types';

export function parseMonomial(node: unknown): Monomial | null {
  const normalized = normalizeAst(node);
  const scalar = readExactScalarNode(normalized);
  if (scalar) {
    return {
      scalar,
      exponent: 0,
    };
  }

  if (typeof normalized === 'string') {
    if (NUMERIC_CONSTANT_SYMBOLS.has(normalized)) {
      return null;
    }

    return {
      scalar: { numerator: 1, denominator: 1 },
      variable: normalized,
      exponent: 1,
    };
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Negate' && normalized.length === 2) {
    const child = parseMonomial(normalized[1]);
    if (!child) {
      return null;
    }

    return {
      ...child,
      scalar: normalizeExactScalar({
        numerator: -child.scalar.numerator,
        denominator: child.scalar.denominator,
      }),
    };
  }

  if (
    normalized[0] === 'Power'
    && normalized.length === 3
    && typeof normalized[1] === 'string'
    && !NUMERIC_CONSTANT_SYMBOLS.has(normalized[1])
  ) {
    const exponent = parseInteger(normalized[2]);
    if (exponent === null || exponent === 0) {
      return null;
    }

    return {
      scalar: { numerator: 1, denominator: 1 },
      variable: normalized[1],
      exponent,
    };
  }

  if (normalized[0] === 'Multiply') {
    let current: Monomial = { scalar: { numerator: 1, denominator: 1 }, exponent: 0 };

    for (const child of normalized.slice(1)) {
      const parsed = parseMonomial(child);
      if (!parsed) {
        return null;
      }

      const variable = combineVariables(current.variable, parsed.variable);
      if (variable === null) {
        return null;
      }

      const scalarProduct = multiplyExactScalars(current.scalar, parsed.scalar);
      current = {
        scalar: scalarProduct,
        variable,
        exponent: current.exponent + parsed.exponent,
      };
    }

    return current;
  }

  if (normalized[0] === 'Divide' && normalized.length === 3) {
    const left = parseMonomial(normalized[1]);
    const right = parseMonomial(normalized[2]);
    if (!left || !right) {
      return null;
    }

    const variable = combineVariables(left.variable, right.variable);
    if (variable === null) {
      return null;
    }

    const scalarQuotient = divideExactScalars(left.scalar, right.scalar);
    if (!scalarQuotient) {
      return null;
    }

    return {
      scalar: scalarQuotient,
      variable,
      exponent: left.exponent - right.exponent,
    };
  }

  return null;
}

export function parseSupportedBinomial(node: unknown): SupportedBinomial | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Add') {
    return null;
  }

  const terms = flattenAdd(normalized);
  if (terms.length !== 2) {
    return null;
  }

  let variable: string | undefined;
  for (const term of terms) {
    const monomial = parseMonomial(term);
    if (!monomial) {
      return null;
    }
    variable = combineVariables(variable, monomial.variable) ?? undefined;
    if (variable === undefined && monomial.variable) {
      return null;
    }
  }

  return {
    node: normalized,
    variable,
  };
}

export function parseAffine(node: unknown, variable: string): AffineExpression | null {
  const normalized = normalizeAst(node);
  if (normalized === variable) {
    return {
      a: { numerator: 1, denominator: 1 },
      b: { numerator: 0, denominator: 1 },
    };
  }

  const scalar = readExactScalarNode(normalized);
  if (scalar) {
    return {
      a: { numerator: 0, denominator: 1 },
      b: scalar,
    };
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Negate' && normalized.length === 2) {
    const child = parseAffine(normalized[1], variable);
    if (!child) {
      return null;
    }
    return {
      a: negateExactScalar(child.a),
      b: negateExactScalar(child.b),
    };
  }

  if (normalized[0] === 'Add') {
    let coefficient: ExactScalar = { numerator: 0, denominator: 1 };
    let constant: ExactScalar = { numerator: 0, denominator: 1 };

    for (const child of normalized.slice(1)) {
      const childAffine = parseAffine(child, variable);
      if (!childAffine) {
        return null;
      }

      coefficient = addExactScalars(coefficient, childAffine.a);
      constant = addExactScalars(constant, childAffine.b);
    }

    return {
      a: coefficient,
      b: constant,
    };
  }

  if (normalized[0] === 'Multiply') {
    let scalarFactor: ExactScalar = { numerator: 1, denominator: 1 };
    let affineChild: AffineExpression | null = null;

    for (const child of normalized.slice(1)) {
      const childScalar = readExactScalarNode(child);
      if (childScalar) {
        scalarFactor = multiplyExactScalars(scalarFactor, childScalar);
        continue;
      }

      const childAffine = parseAffine(child, variable);
      if (!childAffine || affineChild) {
        return null;
      }
      affineChild = childAffine;
    }

    if (!affineChild) {
      return {
        a: { numerator: 0, denominator: 1 },
        b: scalarFactor,
      };
    }

    return {
      a: multiplyExactScalars(scalarFactor, affineChild.a),
      b: multiplyExactScalars(scalarFactor, affineChild.b),
    };
  }

  if (normalized[0] === 'Divide' && normalized.length === 3) {
    const denominatorScalar = readExactScalarNode(normalized[2]);
    if (!denominatorScalar) {
      return null;
    }

    const numeratorAffine = parseAffine(normalized[1], variable);
    if (!numeratorAffine) {
      return null;
    }

    const nextA = divideExactScalars(numeratorAffine.a, denominatorScalar);
    const nextB = divideExactScalars(numeratorAffine.b, denominatorScalar);
    if (!nextA || !nextB) {
      return null;
    }

    return {
      a: nextA,
      b: nextB,
    };
  }

  return null;
}

function monomialMatchesVariable(monomial: Monomial | null, variable: string) {
  if (!monomial) {
    return false;
  }

  return !monomial.variable || monomial.variable === variable;
}

export function isSupportedRadicandExpression(node: unknown) {
  return Boolean(
    readExactScalarNode(node)
    || parseMonomial(node)
    || parseSupportedBinomial(node),
  );
}

export function isSupportedRadicand(node: unknown, variable: string) {
  const supportedBinomial = parseSupportedBinomial(node);
  return Boolean(
    readExactScalarNode(node)
    || monomialMatchesVariable(parseMonomial(node), variable)
    || parseAffine(node, variable)
    || (supportedBinomial && (supportedBinomial.variable ?? variable) === variable),
  );
}

export function monomialDependsOnVariable(monomial: Monomial) {
  return Boolean(monomial.variable && monomial.exponent !== 0);
}

export function isProvablyNonnegativeMonomial(monomial: Monomial) {
  if (monomial.scalar.numerator < 0) {
    return false;
  }

  if (!monomial.variable || monomial.exponent === 0) {
    return true;
  }

  return Math.abs(monomial.exponent) % 2 === 0;
}
