import type { ExactSupplementEntry } from '../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import {
  exactPolynomialDegree,
  exactPolynomialIsZero,
  exactPolynomialToLatex,
  multiplyExactScalars,
  parseExactPolynomial,
  readExactScalarNode,
  type ExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import type { AntiderivativeBackcheck } from '../../calculus/engine/verification';
import {
  boxLatex,
  dependsOnVariable,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
  wrapGroupedLatex,
} from '../patterns';
import { sameNode } from './node-helpers';

const MAX_SYMBOLIC_PARTS_DEGREE = 6;
const MAX_SYMBOLIC_AFFINE_POWER = 12;

type SymbolicRuleResult = {
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex: string[];
};

type SymbolicAffine = {
  slope: unknown;
  offset?: unknown;
  slopeLatex: string;
  latex: string;
};

type SignedNode = {
  node: unknown;
  sign: 1 | -1;
};

function proof(reason: string): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason,
  };
}

function nonzero(expressionLatex: string): ExactSupplementEntry {
  return {
    kind: 'exclusion',
    expressionLatex,
    relation: '\\ne0',
    source: 'candidate-validation',
  };
}

function positive(expressionLatex: string): ExactSupplementEntry {
  return {
    kind: 'condition',
    expressionLatex,
    relation: '>0',
    source: 'candidate-validation',
  };
}

function supplements(entries: ExactSupplementEntry[]) {
  return mergeExactSupplementLatex({ entries, source: 'candidate-validation' });
}

function success(
  exactLatex: string,
  reason: string,
  entries: ExactSupplementEntry[],
): SymbolicRuleResult {
  return {
    exactLatex,
    verification: proof(reason),
    exactSupplementLatex: supplements(entries),
  };
}

function exactInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  if (!scalar || scalar.denominator !== 1) {
    return undefined;
  }

  return scalar.numerator;
}

function targetFree(node: unknown, variable: string) {
  return !dependsOnVariable(node, variable);
}

function negateNode(node: unknown): unknown {
  return isNodeArray(node) && node[0] === 'Negate' && node.length === 2
    ? node[1]
    : ['Negate', node];
}

function signedNode(node: unknown, sign: 1 | -1): unknown {
  return sign === 1 ? node : negateNode(node);
}

function multiplyNodes(factors: unknown[]): unknown {
  const meaningful = factors.filter((factor) => {
    const scalar = readExactScalarNode(factor);
    return !scalar || scalar.numerator !== 1 || scalar.denominator !== 1;
  });
  if (meaningful.length === 0) {
    return 1;
  }

  return meaningful.length === 1 ? meaningful[0] : ['Multiply', ...meaningful];
}

function addNodes(nodes: unknown[]): unknown {
  if (nodes.length === 0) {
    return 0;
  }
  return nodes.length === 1 ? nodes[0] : ['Add', ...nodes];
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

function parseLinearSignedTerm(
  term: SignedNode,
  variable: string,
): { kind: 'slope' | 'offset'; node: unknown } | null {
  const { node, sign } = term;
  if (node === variable) {
    return { kind: 'slope', node: signedNode(1, sign) };
  }

  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return targetFree(node, variable)
      ? { kind: 'offset', node: signedNode(node, sign) }
      : null;
  }

  const factors = flattenMultiply(node);
  const variableFactors = factors.filter((factor) => sameNode(factor, variable));
  const coefficientFactors = factors.filter((factor) => !sameNode(factor, variable));
  if (variableFactors.length !== 1 || !coefficientFactors.every((factor) => targetFree(factor, variable))) {
    return targetFree(node, variable)
      ? { kind: 'offset', node: signedNode(node, sign) }
      : null;
  }

  return {
    kind: 'slope',
    node: signedNode(multiplyNodes(coefficientFactors), sign),
  };
}

export function parseSymbolicAffine(node: unknown, variable: string): SymbolicAffine | undefined {
  if (node === variable) {
    return { slope: 1, slopeLatex: '1', latex: variable };
  }

  const slopeParts: unknown[] = [];
  const offsetParts: unknown[] = [];
  for (const term of signedAddTerms(node)) {
    const parsed = parseLinearSignedTerm(term, variable);
    if (!parsed) {
      return undefined;
    }
    if (parsed.kind === 'slope') {
      slopeParts.push(parsed.node);
    } else {
      offsetParts.push(parsed.node);
    }
  }

  if (slopeParts.length === 0) {
    return undefined;
  }

  const slope = addNodes(slopeParts);
  const offset = offsetParts.length > 0 ? addNodes(offsetParts) : undefined;
  return {
    slope,
    offset,
    slopeLatex: boxLatex(slope),
    latex: boxLatex(node),
  };
}

function divideBySymbolic(
  numeratorLatex: string,
  denominatorLatex: string,
  sign: 1 | -1 = 1,
) {
  const signedNumerator = sign === 1 ? numeratorLatex : `-${wrapGroupedLatex(numeratorLatex)}`;
  if (denominatorLatex === '1') {
    return signedNumerator;
  }

  return sign === 1
    ? `\\frac{${numeratorLatex}}{${denominatorLatex}}`
    : `-\\frac{${numeratorLatex}}{${denominatorLatex}}`;
}

function multiplyDenominator(...parts: string[]) {
  const meaningful = parts.filter((part) => part !== '1');
  return meaningful.length === 0
    ? '1'
    : meaningful.map((part) => wrapGroupedLatex(part)).join('');
}

function slopePowerLatex(slopeLatex: string, power: number) {
  if (power === 0 || slopeLatex === '1') {
    return '1';
  }
  if (power === 1) {
    return slopeLatex;
  }
  return `${wrapGroupedLatex(slopeLatex)}^{${power}}`;
}

function joinAdditiveLatex(parts: string[]) {
  return parts
    .filter((part) => part !== '0')
    .reduce((joined, part, index) => {
      if (index === 0) {
        return part;
      }
      return part.startsWith('-') ? `${joined}${part}` : `${joined}+${part}`;
    }, '') || undefined;
}

function symbolicAffinePower(
  base: unknown,
  exponent: number,
  variable: string,
) {
  if (!Number.isInteger(exponent) || Math.abs(exponent) > MAX_SYMBOLIC_AFFINE_POWER) {
    return undefined;
  }

  const affine = parseSymbolicAffine(base, variable);
  if (!affine) {
    return undefined;
  }

  const facts = [nonzero(affine.slopeLatex)];
  const groupedBase = wrapGroupedLatex(affine.latex);
  if (exponent === -1) {
    return success(
      divideBySymbolic(`\\ln\\left|${groupedBase}\\right|`, affine.slopeLatex),
      'verified by symbolic affine reciprocal rule proof',
      facts,
    );
  }

  const nextExponent = exponent + 1;
  if (nextExponent === 0) {
    return undefined;
  }

  const numerator = nextExponent === 1 ? groupedBase : `${groupedBase}^{${nextExponent}}`;
  const denominator = multiplyDenominator(String(nextExponent), affine.slopeLatex);
  return success(
    divideBySymbolic(numerator, denominator),
    'verified by symbolic affine power rule proof',
    facts,
  );
}

export function trySymbolicDirectRule(node: unknown, variable: string): SymbolicRuleResult | undefined {
  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
    const exponent = exactInteger(node[2]);
    if (exponent !== undefined) {
      const powered = symbolicAffinePower(node[1], exponent, variable);
      if (powered) {
        return powered;
      }
    }

    if (node[1] === 'ExponentialE') {
      const affine = parseSymbolicAffine(node[2], variable);
      return affine
        ? success(
          divideBySymbolic(`e^{${affine.latex}}`, affine.slopeLatex),
          'verified by symbolic affine exponential rule proof',
          [nonzero(affine.slopeLatex)],
        )
        : undefined;
    }

    if (targetFree(node[1], variable) && !readExactScalarNode(node[1])) {
      const affine = parseSymbolicAffine(node[2], variable);
      const baseLatex = boxLatex(node[1]);
      return affine
        ? success(
          divideBySymbolic(
            `${wrapGroupedLatex(baseLatex)}^{${affine.latex}}`,
            multiplyDenominator(affine.slopeLatex, `\\ln\\left(${baseLatex}\\right)`),
          ),
          'verified by positive symbolic-base affine exponential rule proof',
          [positive(baseLatex), nonzero(`${baseLatex}-1`), nonzero(affine.slopeLatex)],
        )
        : undefined;
    }
  }

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3 && readExactScalarNode(node[1])) {
    const numerator = readExactScalarNode(node[1]);
    if (numerator?.numerator === 1 && numerator.denominator === 1) {
      const reciprocal = symbolicAffinePower(node[2], -1, variable);
      if (reciprocal) {
        return reciprocal;
      }
    }
  }

  const affinePower = symbolicAffinePower(node, 1, variable);
  if (affinePower && !sameNode(node, variable)) {
    return affinePower;
  }

  if (!isNodeArray(node) || node.length !== 2) {
    return undefined;
  }

  const affine = parseSymbolicAffine(node[1], variable);
  if (!affine) {
    return undefined;
  }

  const angle = affine.latex;
  const facts = [nonzero(affine.slopeLatex)];
  switch (node[0]) {
    case 'Sin':
      return success(
        divideBySymbolic(`\\cos\\left(${angle}\\right)`, affine.slopeLatex, -1),
        'verified by symbolic affine sine rule proof',
        facts,
      );
    case 'Cos':
      return success(
        divideBySymbolic(`\\sin\\left(${angle}\\right)`, affine.slopeLatex),
        'verified by symbolic affine cosine rule proof',
        facts,
      );
    case 'Tan':
      return success(
        divideBySymbolic(`\\ln\\left(\\cos\\left(${angle}\\right)\\right)`, affine.slopeLatex, -1),
        'verified by symbolic affine tangent rule proof',
        facts,
      );
    case 'Cot':
      return success(
        divideBySymbolic(`\\ln\\left(\\sin\\left(${angle}\\right)\\right)`, affine.slopeLatex),
        'verified by symbolic affine cotangent rule proof',
        facts,
      );
    case 'Ln': {
      const grouped = wrapGroupedLatex(angle);
      return success(
        divideBySymbolic(
          `${grouped}\\ln\\left|${grouped}\\right|-${grouped}`,
          affine.slopeLatex,
        ),
        'verified by symbolic affine logarithm rule proof',
        [nonzero(affine.slopeLatex), positive(angle)],
      );
    }
    case 'Log': {
      const grouped = wrapGroupedLatex(angle);
      return success(
        divideBySymbolic(
          `${grouped}\\ln\\left|${grouped}\\right|-${grouped}`,
          multiplyDenominator(affine.slopeLatex, '\\ln(10)'),
        ),
        'verified by symbolic affine base-ten logarithm rule proof',
        [nonzero(affine.slopeLatex), positive(angle)],
      );
    }
    default:
      return undefined;
  }
}

export function trySymbolicTrigPowerDirectRule(
  node: unknown,
  variable: string,
): SymbolicRuleResult | undefined {
  if (
    !isNodeArray(node)
    || node[0] !== 'Power'
    || node.length !== 3
    || !isNodeArray(node[1])
    || node[1].length !== 2
  ) {
    return undefined;
  }

  const exponent = exactInteger(node[2]);
  const head = node[1][0];
  const affine = parseSymbolicAffine(node[1][1], variable);
  if (exponent !== 2 || !affine || (head !== 'Sec' && head !== 'Csc')) {
    return undefined;
  }

  return head === 'Sec'
    ? success(
      divideBySymbolic(`\\tan\\left(${affine.latex}\\right)`, affine.slopeLatex),
      'verified by symbolic affine secant-square rule proof',
      [nonzero(affine.slopeLatex)],
    )
    : success(
      divideBySymbolic(`\\cot\\left(${affine.latex}\\right)`, affine.slopeLatex, -1),
      'verified by symbolic affine cosecant-square rule proof',
      [nonzero(affine.slopeLatex)],
    );
}

function derivativeExactPolynomial(polynomial: ExactPolynomial): ExactPolynomial {
  const terms = new Map<number, ExactScalar>();
  for (const [degree, coefficient] of polynomial.terms.entries()) {
    if (degree === 0) {
      continue;
    }
    const derived = multiplyExactScalars(coefficient, {
      numerator: degree,
      denominator: 1,
    });
    if (derived.numerator !== 0) {
      terms.set(degree - 1, derived);
    }
  }
  return {
    variable: polynomial.variable,
    terms,
  };
}

function scaledPolynomialLatex(
  polynomial: ExactPolynomial,
  denominatorLatex: string,
  sign: 1 | -1,
) {
  const latex = exactPolynomialToLatex(polynomial);
  return divideBySymbolic(
    wrapGroupedLatex(latex),
    denominatorLatex,
    sign,
  );
}

function symbolicExponentialParts(
  polynomial: ExactPolynomial,
  affine: SymbolicAffine,
  baseLatex?: string,
) {
  const pieces: string[] = [];
  let derivative = polynomial;
  let sign: 1 | -1 = 1;
  let power = 1;
  const logLatex = baseLatex ? `\\ln\\left(${baseLatex}\\right)` : undefined;
  while (!exactPolynomialIsZero(derivative)) {
    const denominator = multiplyDenominator(
      slopePowerLatex(affine.slopeLatex, power),
      ...(logLatex ? [slopePowerLatex(logLatex, power)] : []),
    );
    pieces.push(scaledPolynomialLatex(derivative, denominator, sign));
    derivative = derivativeExactPolynomial(derivative);
    sign = sign === 1 ? -1 : 1;
    power += 1;
  }

  const polynomialPart = joinAdditiveLatex(pieces);
  if (!polynomialPart) {
    return undefined;
  }

  const carrier = baseLatex
    ? `${wrapGroupedLatex(baseLatex)}^{${affine.latex}}`
    : `e^{${affine.latex}}`;
  return `${carrier}\\left(${polynomialPart}\\right)`;
}

function symbolicTrigParts(
  polynomial: ExactPolynomial,
  affine: SymbolicAffine,
  kind: 'Sin' | 'Cos',
) {
  const pieces: string[] = [];
  let derivative = polynomial;
  let current: 'Sin' | 'Cos' = kind;
  let sign: 1 | -1 = 1;
  let power = 1;
  while (!exactPolynomialIsZero(derivative)) {
    const head = current === 'Sin' ? 'Cos' : 'Sin';
    const termSign: 1 | -1 = current === 'Sin' ? (sign === 1 ? -1 : 1) : sign;
    const coefficient = scaledPolynomialLatex(
      derivative,
      slopePowerLatex(affine.slopeLatex, power),
      termSign,
    );
    pieces.push(`${coefficient}${wrapGroupedLatex(`\\${head.toLowerCase()}\\left(${affine.latex}\\right)`)}`);
    derivative = derivativeExactPolynomial(derivative);
    current = current === 'Sin' ? 'Cos' : 'Sin';
    sign = current === 'Sin' ? (sign === 1 ? -1 : 1) : sign;
    power += 1;
  }

  return joinAdditiveLatex(pieces);
}

function productWithSelectedFactor(factors: unknown[], selectedIndex: number) {
  const remaining = factors.filter((_, index) => index !== selectedIndex);
  if (remaining.length === 0) {
    return undefined;
  }
  return remaining.length === 1 ? remaining[0] : ['Multiply', ...remaining];
}

export function trySymbolicPartsRule(node: unknown, variable: string): SymbolicRuleResult | undefined {
  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  const factors = flattenMultiply(node);
  const transcendentalIndex = factors.findIndex((factor) =>
    isNodeArray(factor)
    && (
      (factor.length === 2 && (factor[0] === 'Sin' || factor[0] === 'Cos' || factor[0] === 'Ln'))
      || (
        factor[0] === 'Power'
        && factor.length === 3
        && (factor[1] === 'ExponentialE' || targetFree(factor[1], variable))
        && dependsOnVariable(factor[2], variable)
      )
    ));
  if (transcendentalIndex < 0) {
    return undefined;
  }

  const polynomialNode = productWithSelectedFactor(factors, transcendentalIndex);
  const polynomial = polynomialNode
    ? parseExactPolynomial(polynomialNode, variable, MAX_SYMBOLIC_PARTS_DEGREE)
    : undefined;
  const factor = factors[transcendentalIndex];
  if (!polynomial || exactPolynomialDegree(polynomial) > MAX_SYMBOLIC_PARTS_DEGREE) {
    return undefined;
  }

  if (isNodeArray(factor) && factor[0] === 'Power' && factor.length === 3) {
    const affine = parseSymbolicAffine(factor[2], variable);
    if (!affine) {
      return undefined;
    }

    if (factor[1] === 'ExponentialE') {
      const exactLatex = symbolicExponentialParts(polynomial, affine);
      return exactLatex
        ? success(
          exactLatex,
          'verified by symbolic polynomial-times-exponential by-parts recurrence',
          [nonzero(affine.slopeLatex)],
        )
        : undefined;
    }

    if (targetFree(factor[1], variable) && !readExactScalarNode(factor[1])) {
      const baseLatex = boxLatex(factor[1]);
      const exactLatex = symbolicExponentialParts(polynomial, affine, baseLatex);
      return exactLatex
        ? success(
          exactLatex,
          'verified by symbolic polynomial-times-positive-base exponential by-parts recurrence',
          [positive(baseLatex), nonzero(`${baseLatex}-1`), nonzero(affine.slopeLatex)],
        )
        : undefined;
    }
  }

  if (isNodeArray(factor) && factor.length === 2 && (factor[0] === 'Sin' || factor[0] === 'Cos')) {
    const affine = parseSymbolicAffine(factor[1], variable);
    const exactLatex = affine ? symbolicTrigParts(polynomial, affine, factor[0]) : undefined;
    return exactLatex && affine
      ? success(
        exactLatex,
        'verified by symbolic polynomial-times-trig by-parts recurrence',
        [nonzero(affine.slopeLatex)],
      )
      : undefined;
  }

  if (
    isNodeArray(factor)
    && factor[0] === 'Ln'
    && factor.length === 2
    && sameNode(polynomialNode, variable)
  ) {
    const affine = parseSymbolicAffine(factor[1], variable);
    if (!affine || !affine.offset) {
      return undefined;
    }

    const u = wrapGroupedLatex(affine.latex);
    const slopeSquared = slopePowerLatex(affine.slopeLatex, 2);
    const first = divideBySymbolic(`${u}^{2}\\ln\\left|${u}\\right|`, multiplyDenominator('2', slopeSquared));
    const second = divideBySymbolic(`${u}^{2}`, multiplyDenominator('4', slopeSquared), -1);
    const third = divideBySymbolic(`${boxLatex(affine.offset)}${u}\\ln\\left|${u}\\right|`, slopeSquared, -1);
    const fourth = divideBySymbolic(`${boxLatex(affine.offset)}${u}`, slopeSquared);
    return success(
      joinAdditiveLatex([first, second, third, fourth]) ?? '',
      'verified by symbolic affine-log integration-by-parts rule proof',
      [nonzero(affine.slopeLatex), positive(affine.latex)],
    );
  }

  return undefined;
}

function parseSymbolicBinomialBase(
  node: unknown,
  variable: string,
  reciprocal = false,
) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return undefined;
  }

  let constant: unknown | undefined;
  let coefficient: unknown | undefined;
  let degree: unknown | undefined;
  for (const term of flattenAdd(node)) {
    if (targetFree(term, variable)) {
      constant = term;
      continue;
    }

    if (!isNodeArray(term) || term[0] !== 'Multiply') {
      return undefined;
    }

    const factors = flattenMultiply(term);
    const powerFactor = factors.find((factor) =>
      isNodeArray(factor)
      && factor[0] === 'Power'
      && factor.length === 3
      && factor[1] === variable);
    if (!powerFactor) {
      return undefined;
    }
    const exponentNode = (powerFactor as unknown[])[2];
    const expectedExponent = reciprocal ? negateNode(exponentNode) : exponentNode;
    degree = reciprocal ? expectedExponent : exponentNode;
    const coefficientFactors = factors.filter((factor) => factor !== powerFactor);
    if (!coefficientFactors.every((factor) => targetFree(factor, variable))) {
      return undefined;
    }
    coefficient = multiplyNodes(coefficientFactors);
  }

  return constant && coefficient && degree && targetFree(degree, variable)
    ? {
      coefficient,
      degree,
      latex: boxLatex(node),
    }
    : undefined;
}

function isExpectedPowerNode(node: unknown, variable: string, degree: unknown, reciprocal = false) {
  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3 || node[1] !== variable) {
    return false;
  }
  const expected = reciprocal
    ? ['Add', negateNode(degree), -1]
    : ['Add', degree, -1];
  return boxLatex(node[2]).replace(/\s+/g, '') === boxLatex(expected).replace(/\s+/g, '');
}

function substitutionFactors(node: unknown): unknown[] {
  const rawFactors = isNodeArray(node) && node[0] === 'Multiply' ? flattenMultiply(node) : [node];
  return rawFactors.flatMap((factor) => {
    if (!isNodeArray(factor) || factor[0] !== 'Divide' || factor.length !== 3) {
      return [factor];
    }

    const numeratorFactors = readExactScalarNode(factor[1])?.numerator === 1
      ? []
      : substitutionFactors(factor[1]);
    return [...numeratorFactors, ['Power', factor[2], -1]];
  });
}

export function trySymbolicBinomialSubstitutionRule(
  node: unknown,
  variable: string,
): SymbolicRuleResult | undefined {
  const factors = substitutionFactors(node);
  for (let index = 0; index < factors.length; index += 1) {
    const factor = factors[index];
    if (!isNodeArray(factor) || factor[0] !== 'Power' || factor.length !== 3) {
      continue;
    }

    const base = parseSymbolicBinomialBase(factor[1], variable)
      ?? parseSymbolicBinomialBase(factor[1], variable, true);
    if (!base) {
      continue;
    }

    const reciprocal = boxLatex(base.degree).startsWith('-');
    const remaining = factors.filter((_, factorIndex) => factorIndex !== index);
    const powerFactor = remaining.find((candidate) =>
      isExpectedPowerNode(candidate, variable, base.degree, reciprocal));
    if (!powerFactor) {
      continue;
    }

    const coefficientFactors = remaining.filter((candidate) => candidate !== powerFactor);
    if (!coefficientFactors.every((candidate) => targetFree(candidate, variable))) {
      continue;
    }

    const derivativeCoefficient = multiplyNodes(coefficientFactors);
    const derivativeScale = multiplyNodes([
      reciprocal ? -1 : 1,
      base.coefficient,
      base.degree,
    ]);
    const nextExponentLatex = boxLatex(['Add', factor[2], 1]);
    const coefficientLatex = boxLatex(derivativeCoefficient);
    const denominator = factor[2] === -1 || boxLatex(factor[2]) === '-1'
      ? boxLatex(derivativeScale)
      : multiplyDenominator(boxLatex(derivativeScale), nextExponentLatex);
    const primitive = factor[2] === -1 || boxLatex(factor[2]) === '-1'
      ? `\\ln\\left|${wrapGroupedLatex(base.latex)}\\right|`
      : `${wrapGroupedLatex(base.latex)}^{${nextExponentLatex}}`;
    return success(
      divideBySymbolic(`${coefficientLatex}${wrapGroupedLatex(primitive)}`, denominator),
      'verified by symbolic derivative-present binomial substitution rule proof',
      [
        nonzero(boxLatex(derivativeScale)),
        ...(factor[2] === -1 || boxLatex(factor[2]) === '-1' ? [] : [nonzero(nextExponentLatex)]),
      ],
    );
  }

  return undefined;
}
