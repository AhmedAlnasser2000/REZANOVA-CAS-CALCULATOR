import type { LimitTargetKind } from '../../../types/calculator';
import { dependsOnVariable, isNodeArray } from '../patterns';
import {
  buildLimitConditionalCases,
  type LimitConditionalCaseRow,
} from './conditional-cases';
import {
  formatLimitNumberLatex,
  limitDetailSection,
  limitMathPart,
  limitTextPart,
} from './detail-readback';
import type { LimitAsymptoticBranchDriver } from './asymptotic-terms';
import type { FiniteLimitRuleSuccess } from './types';

const MAX_SYMBOLIC_INFINITY_TERMS = 4;

type SymbolicInfinityTerm = {
  degree: number;
  driver: LimitAsymptoticBranchDriver;
  branchSign: 1 | -1;
  termLatex: string;
};

function nodeLatex(node: unknown): string | undefined {
  if (typeof node === 'number' && Number.isFinite(node)) {
    return formatLimitNumberLatex(node);
  }

  if (typeof node === 'string') {
    if (node === 'Pi') {
      return '\\pi';
    }
    if (node === 'ExponentialE') {
      return 'e';
    }
    return node;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return undefined;
  }

  if (node[0] === 'Rational' && typeof node[1] === 'number' && typeof node[2] === 'number') {
    return `\\frac{${node[1]}}{${node[2]}}`;
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = nodeLatex(node[1]);
    return child ? `-${child}` : undefined;
  }

  if (node[0] === 'Add') {
    const terms = node.slice(1).map(nodeLatex);
    return terms.every(Boolean) ? `(${terms.join('+')})` : undefined;
  }

  if (node[0] === 'Subtract' && node.length === 3) {
    const left = nodeLatex(node[1]);
    const right = nodeLatex(node[2]);
    return left && right ? `(${left}-${right})` : undefined;
  }

  if (node[0] === 'Multiply') {
    const factors = node.slice(1).map(nodeLatex);
    return factors.every(Boolean) ? factors.join('') : undefined;
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = nodeLatex(node[1]);
    const denominator = nodeLatex(node[2]);
    return numerator && denominator ? `\\frac{${numerator}}{${denominator}}` : undefined;
  }

  if (node[0] === 'Power' && node.length === 3) {
    const base = nodeLatex(node[1]);
    const exponent = nodeLatex(node[2]);
    return base && exponent ? `${base}^{${exponent}}` : undefined;
  }

  return undefined;
}

function numericConstant(node: unknown): number | undefined {
  if (typeof node === 'number' && Number.isFinite(node)) {
    return node;
  }
  if (!isNodeArray(node) || node.length === 0) {
    return undefined;
  }
  if (node[0] === 'Rational' && typeof node[1] === 'number' && typeof node[2] === 'number' && node[2] !== 0) {
    return node[1] / node[2];
  }
  if (node[0] === 'Negate' && node.length === 2) {
    const child = numericConstant(node[1]);
    return child === undefined ? undefined : -child;
  }
  if (node[0] === 'Multiply') {
    let product = 1;
    for (const factor of node.slice(1)) {
      const value = numericConstant(factor);
      if (value === undefined) {
        return undefined;
      }
      product *= value;
    }
    return product;
  }
  return undefined;
}

function variablePowerDegree(node: unknown, variable: string): number | undefined {
  if (node === variable) {
    return 1;
  }
  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node[1] === variable
    && typeof node[2] === 'number'
    && Number.isInteger(node[2])
    && node[2] >= 1
  ) {
    return node[2];
  }
  return undefined;
}

function coefficientDriver(input: {
  factors: readonly unknown[];
  numericSign: 1 | -1;
}): { driver: LimitAsymptoticBranchDriver; sign: 1 | -1; coefficientLatex: string } | undefined {
  let numeric = input.numericSign;
  const symbolicFactors: string[] = [];

  for (const factor of input.factors) {
    const numericFactor = numericConstant(factor);
    if (numericFactor !== undefined) {
      numeric *= numericFactor;
      continue;
    }
    const latex = nodeLatex(factor);
    if (!latex) {
      return undefined;
    }
    symbolicFactors.push(latex);
  }

  if (symbolicFactors.length === 0) {
    return undefined;
  }

  const sign = numeric < 0 ? -1 : 1;
  const magnitude = Math.abs(numeric);
  const coefficientLatex = magnitude === 1
    ? symbolicFactors.join('')
    : `${formatLimitNumberLatex(magnitude)}${symbolicFactors.join('')}`;

  return {
    sign,
    coefficientLatex,
    driver: {
      latex: coefficientLatex,
      source: 'leading-coefficient',
    },
  };
}

function parseSymbolicInfinityTerm(
  node: unknown,
  variable: string,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  numericSign: 1 | -1 = 1,
): SymbolicInfinityTerm | undefined {
  const degree = variablePowerDegree(node, variable);
  if (degree !== undefined) {
    return undefined;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return undefined;
  }

  if (node[0] === 'Negate' && node.length === 2) {
    return parseSymbolicInfinityTerm(node[1], variable, targetKind, numericSign === 1 ? -1 : 1);
  }

  const factors = node[0] === 'Multiply' ? node.slice(1) : [node];
  let variableDegree: number | undefined;
  const coefficientFactors: unknown[] = [];
  for (const factor of factors) {
    const factorDegree = variablePowerDegree(factor, variable);
    if (factorDegree !== undefined) {
      if (variableDegree !== undefined) {
        return undefined;
      }
      variableDegree = factorDegree;
      continue;
    }
    if (dependsOnVariable(factor, variable)) {
      return undefined;
    }
    coefficientFactors.push(factor);
  }

  if (variableDegree === undefined) {
    return undefined;
  }

  const coefficient = coefficientDriver({
    factors: coefficientFactors,
    numericSign,
  });
  if (!coefficient) {
    return undefined;
  }

  const variableSign = targetKind === 'negInfinity' && variableDegree % 2 === 1 ? -1 : 1;
  const branchSign = (coefficient.sign * variableSign) as 1 | -1;
  const powerLatex = variableDegree === 1 ? variable : `${variable}^{${variableDegree}}`;
  return {
    degree: variableDegree,
    driver: coefficient.driver,
    branchSign,
    termLatex: `${coefficient.sign < 0 ? '-' : ''}${coefficient.coefficientLatex}${powerLatex}`,
  };
}

function parseSymbolicInfinityTerms(
  node: unknown,
  variable: string,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
): SymbolicInfinityTerm[] | undefined {
  const rawTerms = isNodeArray(node) && node[0] === 'Add' ? node.slice(1) : [node];
  if (rawTerms.length > MAX_SYMBOLIC_INFINITY_TERMS) {
    return undefined;
  }

  const terms = rawTerms.map((term) => parseSymbolicInfinityTerm(term, variable, targetKind));
  if (!terms.every(Boolean)) {
    return undefined;
  }

  return (terms as SymbolicInfinityTerm[])
    .sort((left, right) => right.degree - left.degree);
}

function valueForSign(term: SymbolicInfinityTerm, coefficientSign: 'positive' | 'negative') {
  const sign = coefficientSign === 'positive' ? term.branchSign : -term.branchSign;
  return sign > 0 ? '\\infty' : '-\\infty';
}

function rowsFromTerms(
  terms: readonly SymbolicInfinityTerm[],
  prefix: LimitConditionalCaseRow['conditions'] = [],
): LimitConditionalCaseRow[] {
  const [term, ...rest] = terms;
  if (!term) {
    return [{
      valueLatex: '0',
      conditions: prefix,
    }];
  }

  return [
    {
      valueLatex: valueForSign(term, 'positive'),
      conditions: [...prefix, { kind: 'positive', driver: term.driver }],
      proofRows: [[
        limitTextPart('Leading term '),
        limitMathPart(term.termLatex),
        limitTextPart(' controls this branch.'),
      ]],
    },
    {
      valueLatex: valueForSign(term, 'negative'),
      conditions: [...prefix, { kind: 'negative', driver: term.driver }],
      proofRows: [[
        limitTextPart('Leading term '),
        limitMathPart(term.termLatex),
        limitTextPart(' controls this branch.'),
      ]],
    },
    ...rowsFromTerms(rest, [...prefix, { kind: 'zero', driver: term.driver }]),
  ];
}

export function resolveSymbolicInfinityCaseLimit(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
): FiniteLimitRuleSuccess | undefined {
  const terms = parseSymbolicInfinityTerms(node, variable, targetKind);
  if (!terms || terms.length === 0) {
    return undefined;
  }

  const cases = buildLimitConditionalCases({
    rows: rowsFromTerms(terms),
  });
  if (!cases.ok) {
    return {
      kind: 'success',
      origin: 'rule-based-symbolic',
      detailSections: cases.detailSections,
    };
  }

  return {
    kind: 'success',
    exactLatex: cases.exactLatex,
    origin: 'rule-based-symbolic',
    detailSections: [
      limitDetailSection('Limit Method', [
        [
          limitTextPart('Form detected: symbolic infinity leading term.'),
        ],
        [
          limitTextPart('Dominant terms are compared by degree, then branch on target-free leading-coefficient signs.'),
        ],
      ]),
      ...cases.detailSections,
    ],
  };
}

export function hasSymbolicInfinityCaseCandidate(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
) {
  return Boolean(parseSymbolicInfinityTerms(node, variable, targetKind));
}
