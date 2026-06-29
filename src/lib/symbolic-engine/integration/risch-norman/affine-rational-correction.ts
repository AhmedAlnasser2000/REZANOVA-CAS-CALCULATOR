import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import { readExactScalarNode } from '../../../algebra/polynomial-core';
import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import {
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  simplifyMathJsonNodeOrOriginal,
} from '../../primitives/simplification/simplification';
import {
  boxLatex,
  flattenMultiply,
  isNodeArray,
  wrapGroupedLatex,
} from '../../patterns';
import { parseSymbolicAffine } from '../symbolic-coefficients';
import {
  parseRischNormanCoefficient,
  type RischNormanCoefficient,
  type RischNormanCoefficientFact,
  type RischNormanCoefficientStopReason,
} from './coefficient-field';
import { parseRischNormanPolynomial } from './polynomial';
import { normalizeGeneratedRischNormanLatex } from './output-hygiene';

export type RischNormanAffineRationalCorrectionStopReason =
  | 'coefficient-stop'
  | 'non-affine-denominator'
  | 'over-cap-degree'
  | 'over-cap-power'
  | 'unsupported-shape'
  | 'zero-slope';

export type RischNormanAffineRationalCorrectionResult =
  | {
    kind: 'success';
    exactLatex: string;
    verification: AntiderivativeBackcheck;
    exactSupplementLatex: string[];
  }
  | {
    kind: 'stop';
    reason: RischNormanAffineRationalCorrectionStopReason;
    coefficientReason?: RischNormanCoefficientStopReason;
  };

type ParsedDenominator = {
  base: unknown;
  power: number;
};

type ParsedIntegrand = {
  numerator: unknown;
  denominator: ParsedDenominator;
};

const MAX_AFFINE_RATIONAL_CORRECTION_DEGREE = 6;
const MAX_AFFINE_RATIONAL_CORRECTION_POWER = 3;

function proof(): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason: 'verified by internal Risch-Norman affine rational-correction rule proof',
  };
}

function coefficientStop(reason: RischNormanCoefficientStopReason): RischNormanAffineRationalCorrectionResult {
  return {
    kind: 'stop',
    reason: 'coefficient-stop',
    coefficientReason: reason,
  };
}

function factEntry(expressionLatex: string): ExactSupplementEntry {
  return {
    kind: 'exclusion',
    expressionLatex,
    relation: '\\ne0',
    source: 'candidate-validation',
  };
}

function entriesForCoefficientFacts(facts: RischNormanCoefficientFact[]) {
  return facts.map((fact) => factEntry(fact.expressionLatex));
}

function nonzeroEntriesForCoefficient(coefficient: RischNormanCoefficient): ExactSupplementEntry[] {
  const scalar = readExactScalarNode(coefficient.node);
  return scalar && scalar.numerator !== 0
    ? []
    : [factEntry(coefficient.latex)];
}

function supplements(entries: ExactSupplementEntry[]) {
  return mergeExactSupplementLatex({ entries, source: 'candidate-validation' });
}

function exactInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  return scalar && scalar.denominator === 1 ? scalar.numerator : undefined;
}

function exactZero(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === 0);
}

function binomial(n: number, k: number) {
  if (k < 0 || k > n) {
    return 0;
  }
  let value = 1;
  for (let i = 1; i <= k; i += 1) {
    value = (value * (n - i + 1)) / i;
  }
  return value;
}

function parsePositiveDenominator(node: unknown): ParsedDenominator | undefined {
  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
  ) {
    const power = exactInteger(node[2]);
    return power && power > 0 ? { base: node[1], power } : undefined;
  }

  return { base: node, power: 1 };
}

function parseNegativePower(node: unknown): ParsedIntegrand | undefined {
  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
  ) {
    const power = exactInteger(node[2]);
    return power && power < 0
      ? {
        numerator: 1,
        denominator: {
          base: node[1],
          power: -power,
        },
      }
      : undefined;
  }

  return undefined;
}

function parseIntegrand(node: unknown): ParsedIntegrand | undefined {
  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    const denominator = parsePositiveDenominator(node[2]);
    return denominator ? { numerator: node[1], denominator } : undefined;
  }

  const negativePower = parseNegativePower(node);
  if (negativePower) {
    return negativePower;
  }

  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  const factors = flattenMultiply(node);
  const denominatorIndexes = factors
    .map((factor, index) => ({ index, parsed: parseNegativePower(factor) }))
    .filter((entry): entry is { index: number; parsed: ParsedIntegrand } => Boolean(entry.parsed));
  if (denominatorIndexes.length !== 1) {
    return undefined;
  }

  const denominator = denominatorIndexes[0].parsed.denominator;
  const numeratorFactors = factors.filter((_, index) => index !== denominatorIndexes[0].index);
  return {
    numerator: numeratorFactors.length === 0
      ? 1
      : numeratorFactors.length === 1
        ? numeratorFactors[0]
        : ['Multiply', ...numeratorFactors],
    denominator,
  };
}

function coefficientPower(node: unknown, power: number) {
  if (power === 0) {
    return 1;
  }
  if (power === 1) {
    return node;
  }
  return ['Power', node, power];
}

function offsetPower(offsetNode: unknown, power: number) {
  if (power === 0) {
    return 1;
  }
  if (exactZero(offsetNode)) {
    return 0;
  }
  const negated = negateMathJsonNode(offsetNode);
  return power === 1 ? negated : ['Power', negated, power];
}

function termCoefficient(input: {
  polynomialCoefficientNode: unknown;
  binomialCoefficient: number;
  offsetNode: unknown;
  offsetPower: number;
  slopeNode: unknown;
  slopePower: number;
  integrationPower: number;
}) {
  const numerator = multiplyMathJsonNodes(
    input.polynomialCoefficientNode,
    input.binomialCoefficient,
    offsetPower(input.offsetNode, input.offsetPower),
  );
  if (exactZero(numerator)) {
    return 0;
  }

  const denominator = coefficientPower(input.slopeNode, input.slopePower);
  const withSlope = divideMathJsonNodes(numerator, denominator);
  return input.integrationPower === 0
    ? withSlope
    : divideMathJsonNodes(withSlope, input.integrationPower);
}

function coefficientLatex(node: unknown) {
  return boxLatex(simplifyMathJsonNodeOrOriginal(node));
}

function primitiveLatex(uLatex: string, power: number) {
  if (power === 0) {
    return `\\ln\\left|${wrapGroupedLatex(uLatex)}\\right|`;
  }
  if (power === 1) {
    return wrapGroupedLatex(uLatex);
  }
  return `${wrapGroupedLatex(uLatex)}^{${power}}`;
}

function termLatex(coefficientNode: unknown, primitive: string) {
  if (exactZero(coefficientNode)) {
    return undefined;
  }

  const coefficient = coefficientLatex(coefficientNode);
  if (coefficient === '1') {
    return primitive;
  }
  if (coefficient === '-1') {
    return `-${wrapGroupedLatex(primitive)}`;
  }
  return `${wrapGroupedLatex(coefficient)}${primitive}`;
}

function joinAdditiveLatex(parts: string[]) {
  return parts
    .filter((part) => part !== '0')
    .reduce((joined, part, index) => {
      if (index === 0) {
        return part;
      }
      return part.startsWith('-') ? `${joined}${part}` : `${joined}+${part}`;
    }, '') || '0';
}

function buildCorrectionLatex(input: {
  coefficients: unknown[];
  denominatorPower: number;
  offsetNode: unknown;
  slope: RischNormanCoefficient;
  uLatex: string;
}) {
  const terms: string[] = [];
  input.coefficients.forEach((coefficientNode, degree) => {
    if (exactZero(coefficientNode)) {
      return;
    }

    for (let expandedDegree = 0; expandedDegree <= degree; expandedDegree += 1) {
      const integrationPower = expandedDegree - input.denominatorPower + 1;
      const termCoefficientNode = termCoefficient({
        polynomialCoefficientNode: coefficientNode,
        binomialCoefficient: binomial(degree, expandedDegree),
        offsetNode: input.offsetNode,
        offsetPower: degree - expandedDegree,
        slopeNode: input.slope.node,
        slopePower: degree + 1,
        integrationPower,
      });
      const term = termLatex(
        termCoefficientNode,
        primitiveLatex(input.uLatex, integrationPower),
      );
      if (term) {
        terms.push(term);
      }
    }
  });
  return joinAdditiveLatex(terms);
}

function dedupeEntries(entries: ExactSupplementEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = 'expressionLatex' in entry
      ? `${entry.expressionLatex}:${entry.relation}`
      : `${entry.kind}:${entry.latex}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function tryRischNormanAffineRationalCorrectionRule(
  node: unknown,
  variable: string,
): RischNormanAffineRationalCorrectionResult | undefined {
  const parsed = parseIntegrand(node);
  if (!parsed) {
    return undefined;
  }
  if (parsed.denominator.power > MAX_AFFINE_RATIONAL_CORRECTION_POWER) {
    return undefined;
  }
  const exactNumerator = readExactScalarNode(parsed.numerator);
  if (
    parsed.denominator.power === 1
    && exactNumerator?.numerator === 1
    && exactNumerator.denominator === 1
  ) {
    return undefined;
  }

  const affine = parseSymbolicAffine(parsed.denominator.base, variable);
  if (!affine) {
    return undefined;
  }

  const slope = parseRischNormanCoefficient(affine.slope, variable);
  if (slope.kind === 'stop') {
    return coefficientStop(slope.reason);
  }
  if (exactZero(slope.coefficient.node)) {
    return { kind: 'stop', reason: 'zero-slope' };
  }

  let offsetNode: unknown = 0;
  const entries = [
    ...entriesForCoefficientFacts(slope.coefficient.facts),
    ...nonzeroEntriesForCoefficient(slope.coefficient),
  ];
  if (affine.offset !== undefined) {
    const offset = parseRischNormanCoefficient(affine.offset, variable);
    if (offset.kind === 'stop') {
      return coefficientStop(offset.reason);
    }
    offsetNode = offset.coefficient.node;
    entries.push(...entriesForCoefficientFacts(offset.coefficient.facts));
  }

  const polynomial = parseRischNormanPolynomial(
    parsed.numerator,
    variable,
    MAX_AFFINE_RATIONAL_CORRECTION_DEGREE,
  );
  if (polynomial.kind === 'stop') {
    return polynomial.reason === 'over-cap-degree'
      ? { kind: 'stop', reason: 'over-cap-degree' }
      : undefined;
  }
  entries.push(...entriesForCoefficientFacts(polynomial.facts));

  return {
    kind: 'success',
    exactLatex: normalizeGeneratedRischNormanLatex(buildCorrectionLatex({
      coefficients: polynomial.coefficients.map((coefficient) => coefficient.node),
      denominatorPower: parsed.denominator.power,
      offsetNode,
      slope: slope.coefficient,
      uLatex: affine.latex,
    }), variable),
    verification: proof(),
    exactSupplementLatex: supplements(dedupeEntries(entries)),
  };
}
