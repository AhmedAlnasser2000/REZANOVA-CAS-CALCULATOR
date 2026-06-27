import type { ExactSupplementEntry } from '../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import {
  buildExactScalarNode,
  exactPolynomialDegree,
  exactPolynomialToLatex,
  exactScalarToNumber,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import type { AntiderivativeBackcheck } from '../../calculus/engine/verification';
import {
  boxLatex,
  flattenAdd,
  isNodeArray,
  wrapGroupedLatex,
} from '../patterns';

type TrigSubstitutionRadicalResult = {
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex: string[];
};

type SignedNode = {
  node: unknown;
  sign: 1 | -1;
};

type ExactAffine = {
  slope: ExactScalar;
  latex: string;
};

type RadicalFamily = 'minus' | 'plus' | 'outside';

function proof(family: RadicalFamily): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason: `verified by affine trig-substitution ${family} radical rule proof`,
  };
}

function nonnegative(expressionLatex: string): ExactSupplementEntry {
  return {
    kind: 'condition',
    expressionLatex,
    relation: '\\ge0',
    source: 'candidate-validation',
  };
}

function signedAddTerms(node: unknown, sign: 1 | -1 = 1): SignedNode[] {
  if (isNodeArray(node) && node[0] === 'Add') {
    return flattenAdd(node).flatMap((term) => signedAddTerms(term, sign));
  }

  if (isNodeArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedAddTerms(first, sign)),
      ...rest.flatMap((term) => signedAddTerms(term, sign === 1 ? -1 : 1)),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedAddTerms(node[1], sign === 1 ? -1 : 1);
  }

  return [{ node, sign }];
}

function signedScalar(node: unknown, sign: 1 | -1) {
  const scalar = readExactScalarNode(node);
  if (!scalar) {
    return undefined;
  }
  return sign === 1 ? scalar : negateExactScalar(scalar);
}

function exactScalarLatex(value: ExactScalar) {
  return boxLatex(buildExactScalarNode(value));
}

function exactScalarSqrtLatex(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  const numeratorRoot = Math.sqrt(normalized.numerator);
  const denominatorRoot = Math.sqrt(normalized.denominator);
  if (Number.isInteger(numeratorRoot) && Number.isInteger(denominatorRoot)) {
    return exactScalarLatex({
      numerator: numeratorRoot,
      denominator: denominatorRoot,
    });
  }

  return `\\sqrt{${exactScalarLatex(normalized)}}`;
}

function parseExactAffine(node: unknown, variable: string): ExactAffine | undefined {
  const polynomial = parseExactPolynomial(node, variable, 1);
  if (!polynomial || exactPolynomialDegree(polynomial) !== 1) {
    return undefined;
  }

  const slope = getExactPolynomialCoefficient(polynomial, 1);
  if (slope.numerator === 0) {
    return undefined;
  }

  return {
    slope,
    latex: exactPolynomialToLatex(polynomial),
  };
}

function parseSquaredAffineTerm(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3) {
    return undefined;
  }
  const exponent = readExactScalarNode(node[2]);
  if (!exponent || exponent.numerator !== 2 || exponent.denominator !== 1) {
    return undefined;
  }
  return parseExactAffine(node[1], variable);
}

function multiplyScalarLatex(left: ExactScalar, right: ExactScalar) {
  return exactScalarLatex(multiplyExactScalars(left, right));
}

function divideLatex(numeratorLatex: string, denominatorLatex: string) {
  return denominatorLatex === '1'
    ? numeratorLatex
    : `\\frac{${numeratorLatex}}{${denominatorLatex}}`;
}

function familyFromTerms(radicand: unknown, variable: string) {
  let constant: ExactScalar | undefined;
  let squaredAffine: ExactAffine | undefined;
  let squaredSign: 1 | -1 | undefined;

  for (const term of signedAddTerms(radicand)) {
    const scalar = signedScalar(term.node, term.sign);
    if (scalar) {
      if (constant) {
        return undefined;
      }
      constant = scalar;
      continue;
    }

    const affine = parseSquaredAffineTerm(term.node, variable);
    if (affine) {
      if (squaredAffine || squaredSign) {
        return undefined;
      }
      squaredAffine = affine;
      squaredSign = term.sign;
      continue;
    }

    return undefined;
  }

  if (!constant || !squaredAffine || !squaredSign) {
    return undefined;
  }

  if (exactScalarToNumber(constant) > 0 && squaredSign === -1) {
    return { family: 'minus' as const, r: normalizeExactScalar(constant), affine: squaredAffine };
  }

  if (exactScalarToNumber(constant) > 0 && squaredSign === 1) {
    return { family: 'plus' as const, r: normalizeExactScalar(constant), affine: squaredAffine };
  }

  if (exactScalarToNumber(constant) < 0 && squaredSign === 1) {
    return { family: 'outside' as const, r: normalizeExactScalar(negateExactScalar(constant)), affine: squaredAffine };
  }

  return undefined;
}

function buildRadicandLatex(family: RadicalFamily, rLatex: string, uGrouped: string) {
  switch (family) {
    case 'minus':
      return `${rLatex}-${uGrouped}^{2}`;
    case 'plus':
      return `${rLatex}+${uGrouped}^{2}`;
    case 'outside':
      return `${uGrouped}^{2}-${rLatex}`;
  }
}

function buildExactLatex(family: RadicalFamily, r: ExactScalar, affine: ExactAffine) {
  const rLatex = exactScalarLatex(r);
  const uGrouped = wrapGroupedLatex(affine.latex);
  const radicandLatex = buildRadicandLatex(family, rLatex, uGrouped);
  const denominatorLatex = multiplyScalarLatex({ numerator: 2, denominator: 1 }, affine.slope);
  const firstTerm = divideLatex(
    `${uGrouped}\\sqrt{${radicandLatex}}`,
    denominatorLatex,
  );
  const coefficient = divideLatex(rLatex, denominatorLatex);

  if (family === 'minus') {
    const rootLatex = exactScalarSqrtLatex(r);
    return `${firstTerm}+${coefficient}\\arcsin\\left(\\frac{${uGrouped}}{${rootLatex}}\\right)`;
  }

  const logTerm = `${coefficient}\\ln\\left|${uGrouped}+\\sqrt{${radicandLatex}}\\right|`;
  return family === 'plus'
    ? `${firstTerm}+${logTerm}`
    : `${firstTerm}-${logTerm}`;
}

function supplementsFor(family: RadicalFamily, r: ExactScalar, affine: ExactAffine) {
  if (family === 'plus') {
    return [];
  }

  const rLatex = exactScalarLatex(r);
  const uGrouped = wrapGroupedLatex(affine.latex);
  const radicandLatex = buildRadicandLatex(family, rLatex, uGrouped);
  return mergeExactSupplementLatex({
    entries: [nonnegative(radicandLatex)],
    source: 'candidate-validation',
  });
}

export function tryTrigSubstitutionRadicalRule(
  node: unknown,
  variable: string,
): TrigSubstitutionRadicalResult | undefined {
  if (!isNodeArray(node) || node[0] !== 'Sqrt' || node.length !== 2) {
    return undefined;
  }

  const parsed = familyFromTerms(node[1], variable);
  if (!parsed || exactScalarToNumber(parsed.r) <= 0) {
    return undefined;
  }

  return {
    exactLatex: buildExactLatex(parsed.family, parsed.r, parsed.affine),
    verification: proof(parsed.family),
    exactSupplementLatex: supplementsFor(parsed.family, parsed.r, parsed.affine),
  };
}
