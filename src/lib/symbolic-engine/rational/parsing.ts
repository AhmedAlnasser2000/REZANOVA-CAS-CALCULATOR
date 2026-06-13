import { factorAst } from '../factoring';
import { normalizeAst } from '../normalize';
import {
  flattenAdd,
  isNodeArray,
  mergeFactor,
  termKey,
} from '../patterns';
import { cloneFactors, mergeFactors, scaleFactors } from './factors';
import {
  addScalars,
  divideScalar,
  isExactIntegerNode,
  multiplyScalar,
  powerScalar,
  readExactScalar,
} from './scalars';
import type { ExactScalar, RationalTerm } from './types';

const NUMERIC_CONSTANT_SYMBOLS = new Set(['Pi', 'ExponentialE']);

function collectVariables(node: unknown, variables: Set<string>) {
  if (typeof node === 'string') {
    if (!NUMERIC_CONSTANT_SYMBOLS.has(node)) {
      variables.add(node);
    }
    return;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return;
  }

  for (let index = 1; index < node.length; index += 1) {
    collectVariables(node[index], variables);
  }
}

export function detectSingleVariable(node: unknown) {
  const variables = new Set<string>();
  collectVariables(node, variables);
  if (variables.size > 1) {
    return null;
  }
  return [...variables][0];
}

function parseAffine(node: unknown, variable: string): { a: ExactScalar; b: ExactScalar } | null {
  if (node === variable) {
    return {
      a: { numerator: 1, denominator: 1 },
      b: { numerator: 0, denominator: 1 },
    };
  }

  const scalar = readExactScalar(node);
  if (scalar) {
    return {
      a: { numerator: 0, denominator: 1 },
      b: scalar,
    };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return null;
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = parseAffine(node[1], variable);
    if (!child) {
      return null;
    }
    return {
      a: { numerator: -child.a.numerator, denominator: child.a.denominator },
      b: { numerator: -child.b.numerator, denominator: child.b.denominator },
    };
  }

  if (node[0] === 'Multiply' && node.length === 3) {
    const leftScalar = readExactScalar(node[1]);
    const rightScalar = readExactScalar(node[2]);
    if (leftScalar && node[2] === variable) {
      return {
        a: leftScalar,
        b: { numerator: 0, denominator: 1 },
      };
    }
    if (rightScalar && node[1] === variable) {
      return {
        a: rightScalar,
        b: { numerator: 0, denominator: 1 },
      };
    }
    return null;
  }

  if (node[0] === 'Add') {
    let coefficient = { numerator: 0, denominator: 1 };
    let constant = { numerator: 0, denominator: 1 };
    let sawVariable = false;

    for (const child of node.slice(1)) {
      const childAffine = parseAffine(child, variable);
      if (!childAffine) {
        return null;
      }

      coefficient = addScalars(coefficient, childAffine.a);
      constant = addScalars(constant, childAffine.b);
      sawVariable ||= childAffine.a.numerator !== 0;
    }

    return sawVariable
      ? { a: coefficient, b: constant }
      : null;
  }

  return null;
}

function isSupportedMonomialBase(node: unknown, variable: string | undefined): boolean {
  if (!variable) {
    return false;
  }

  const normalized = normalizeAst(node);
  if (normalized === variable) {
    return true;
  }

  if (readExactScalar(normalized)) {
    return true;
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return false;
  }

  if (normalized[0] === 'Negate' && normalized.length === 2) {
    return isSupportedMonomialBase(normalized[1], variable);
  }

  if (
    normalized[0] === 'Power'
    && normalized.length === 3
    && normalized[1] === variable
  ) {
    const exponent = readExactScalar(normalized[2]);
    return Boolean(exponent && exponent.denominator === 1 && exponent.numerator > 0);
  }

  if (normalized[0] === 'Multiply') {
    let sawSymbolic = false;
    for (const child of normalized.slice(1)) {
      if (readExactScalar(child)) {
        continue;
      }
      if (!isSupportedMonomialBase(child, variable)) {
        return false;
      }
      sawSymbolic = true;
    }
    return sawSymbolic;
  }

  if (normalized[0] === 'Divide' && normalized.length === 3) {
    return (
      (isSupportedMonomialBase(normalized[1], variable) && Boolean(readExactScalar(normalized[2])))
      || (Boolean(readExactScalar(normalized[1])) && isSupportedMonomialBase(normalized[2], variable))
    );
  }

  return false;
}

function isSupportedBinomialBase(node: unknown, variable: string | undefined): boolean {
  if (!variable) {
    return false;
  }

  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Add') {
    return false;
  }

  const terms = flattenAdd(normalized);
  return terms.length === 2 && terms.every((term) => isSupportedMonomialBase(term, variable));
}

function isSupportedAtomicBase(node: unknown, variable: string | undefined): boolean {
  if (!variable) {
    return false;
  }

  if (isSupportedMonomialBase(node, variable)) {
    return true;
  }

  if (isSupportedBinomialBase(node, variable)) {
    return true;
  }

  const affine = parseAffine(normalizeAst(node), variable);
  return affine !== null && affine.a.numerator !== 0;
}

function isSupportedAtomicFactor(node: unknown, variable: string | undefined): boolean {
  if (isSupportedAtomicBase(node, variable)) {
    return true;
  }

  return Boolean(
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && isExactIntegerNode(node[2])
    && node[2] > 0
    && isSupportedAtomicBase(node[1], variable),
  );
}

function parseAtomicFactor(node: unknown, variable: string | undefined, allowRefactor: boolean): RationalTerm | null {
  if (isSupportedAtomicFactor(node, variable)) {
    const factors = new Map<string, { node: unknown; exponent: number }>();
    if (isNodeArray(node) && node[0] === 'Power' && node.length === 3 && isExactIntegerNode(node[2])) {
      mergeFactor(factors, normalizeAst(node[1]), node[2]);
    } else {
      mergeFactor(factors, normalizeAst(node));
    }
    return {
      scalar: { numerator: 1, denominator: 1 },
      numeratorFactors: factors,
      denominatorFactors: new Map(),
    };
  }

  if (!allowRefactor) {
    return null;
  }

  const factored = factorAst(normalizeAst(node)).node;
  return termKey(factored) === termKey(normalizeAst(node))
    ? null
    : parseRationalTerm(factored, variable, false);
}

function multiplyTerms(left: RationalTerm, right: RationalTerm): RationalTerm | null {
  const scalar = multiplyScalar(left.scalar, right.scalar);
  if (!scalar) {
    return null;
  }

  const numeratorFactors = cloneFactors(left.numeratorFactors);
  const denominatorFactors = cloneFactors(left.denominatorFactors);
  mergeFactors(numeratorFactors, right.numeratorFactors);
  mergeFactors(denominatorFactors, right.denominatorFactors);

  return {
    scalar,
    numeratorFactors,
    denominatorFactors,
  };
}

function divideTerms(left: RationalTerm, right: RationalTerm): RationalTerm | null {
  const scalar = divideScalar(left.scalar, right.scalar);
  if (!scalar) {
    return null;
  }

  const numeratorFactors = cloneFactors(left.numeratorFactors);
  const denominatorFactors = cloneFactors(left.denominatorFactors);
  mergeFactors(numeratorFactors, right.denominatorFactors);
  mergeFactors(denominatorFactors, right.numeratorFactors);

  return {
    scalar,
    numeratorFactors,
    denominatorFactors,
  };
}

function powerTerm(term: RationalTerm, exponent: number): RationalTerm | null {
  const scalar = powerScalar(term.scalar, exponent);
  if (!scalar) {
    return null;
  }

  return {
    scalar,
    numeratorFactors: scaleFactors(term.numeratorFactors, exponent),
    denominatorFactors: scaleFactors(term.denominatorFactors, exponent),
  };
}

export function parseRationalTerm(
  node: unknown,
  variable: string | undefined,
  allowRefactor = true,
): RationalTerm | null {
  const scalar = readExactScalar(node);
  if (scalar) {
    return {
      scalar,
      numeratorFactors: new Map(),
      denominatorFactors: new Map(),
    };
  }

  if (typeof node === 'string') {
    if (node !== variable) {
      return null;
    }

    const numeratorFactors = new Map<string, { node: unknown; exponent: number }>();
    mergeFactor(numeratorFactors, node);
    return {
      scalar: { numerator: 1, denominator: 1 },
      numeratorFactors,
      denominatorFactors: new Map(),
    };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return null;
  }

  const [operator, ...children] = node;

  if (operator === 'Negate' && children.length === 1) {
    const child = parseRationalTerm(children[0], variable, allowRefactor);
    if (!child) {
      return null;
    }
    return {
      ...child,
      scalar: {
        numerator: -child.scalar.numerator,
        denominator: child.scalar.denominator,
      },
    };
  }

  if (operator === 'Multiply') {
    return children.reduce<RationalTerm | null>((current, child) => {
      const parsed = parseRationalTerm(child, variable, allowRefactor);
      if (!current || !parsed) {
        return null;
      }
      return multiplyTerms(current, parsed);
    }, {
      scalar: { numerator: 1, denominator: 1 },
      numeratorFactors: new Map(),
      denominatorFactors: new Map(),
    });
  }

  if (operator === 'Divide' && children.length === 2) {
    const left = parseRationalTerm(children[0], variable, allowRefactor);
    const right = parseRationalTerm(children[1], variable, true);
    if (!left || !right) {
      return null;
    }
    return divideTerms(left, right);
  }

  if (
    operator === 'Power'
    && children.length === 2
    && isExactIntegerNode(children[1])
    && children[1] > 0
  ) {
    const atomic = parseAtomicFactor(node, variable, allowRefactor);
    if (atomic) {
      return atomic;
    }

    const base = parseRationalTerm(children[0], variable, allowRefactor);
    return base ? powerTerm(base, children[1]) : null;
  }

  return parseAtomicFactor(node, variable, allowRefactor);
}
