import { readExactScalarNode } from '../../../algebra/polynomial-core';
import {
  addMathJsonNodes,
  multiplyMathJsonNodes,
  simplifyMathJsonNodeOrOriginal,
  subtractMathJsonNodes,
} from '../../primitives/simplification/simplification';
import {
  boxLatex,
  dependsOnVariable,
  flattenMultiply,
  isNodeArray,
  wrapGroupedLatex,
} from '../../patterns';
import { parseSymbolicAffine } from '../symbolic-coefficients';
import { BY_PARTS_POLYNOMIAL_DEGREE_CAP } from '../types';
import {
  parseRischNormanCoefficient,
  type RischNormanCoefficientFact,
  type RischNormanCoefficientStopReason,
} from './coefficient-field';
import {
  parseRischNormanPolynomial,
  buildPolynomialNodeFromCoefficients,
  type RischNormanPolynomialStopReason,
} from './polynomial';
import type { RischNormanAnsatzFact } from './exponential-ansatz';
import { normalizeGeneratedRischNormanLatex } from './output-hygiene';

export type RischNormanExpSinCosAnsatzStopReason =
  | 'coefficient-stop'
  | 'extra-exponential-factor'
  | 'extra-trig-factor'
  | 'missing-exponential-factor'
  | 'missing-trig-factor'
  | 'non-affine-exponent'
  | 'non-affine-trig-argument'
  | 'zero-pivot'
  | RischNormanPolynomialStopReason;

export type RischNormanExpSinCosAnsatzResult =
  | {
    kind: 'success';
    family: 'affine-exp-sin-cos';
    variable: string;
    source: 'Sin' | 'Cos';
    polynomialDegree: number;
    antiderivativeNode: unknown;
    exactLatex: string;
    facts: RischNormanAnsatzFact[];
    proof: 'risch-norman-exp-sincos-ansatz-rule-proof';
  }
  | {
    kind: 'stop';
    reason: RischNormanExpSinCosAnsatzStopReason;
    coefficientReason?: RischNormanCoefficientStopReason;
  };

type ExponentialCarrier = {
  exponent: unknown;
};

type TrigCarrier = {
  head: 'Sin' | 'Cos';
  argument: unknown;
};

type ProductSplit = {
  exponential: ExponentialCarrier;
  trig: TrigCarrier;
  polynomialNode: unknown;
};

type SharedDenominatorCoefficient = {
  numerator: unknown;
  denominatorPower: number;
};

function coefficientStop(reason: RischNormanCoefficientStopReason): RischNormanExpSinCosAnsatzResult {
  return {
    kind: 'stop',
    reason: 'coefficient-stop',
    coefficientReason: reason,
  };
}

function coefficientFactsToAnsatzFacts(facts: RischNormanCoefficientFact[]) {
  return facts.map((fact): RischNormanAnsatzFact => ({
    kind: 'nonzero',
    expressionLatex: fact.expressionLatex,
    relation: fact.relation,
  }));
}

function nonzeroFact(expressionLatex: string): RischNormanAnsatzFact {
  return {
    kind: 'nonzero',
    expressionLatex,
    relation: '\\ne0',
  };
}

function dedupeFacts(facts: RischNormanAnsatzFact[]) {
  const seen = new Set<string>();
  const deduped: RischNormanAnsatzFact[] = [];
  for (const fact of facts) {
    const key = `${fact.kind}:${fact.expressionLatex}:${fact.relation}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(fact);
  }
  return deduped;
}

function expCarrier(node: unknown): ExponentialCarrier | undefined {
  return isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === 'ExponentialE'
    ? { exponent: node[2] }
    : undefined;
}

function trigCarrier(node: unknown): TrigCarrier | undefined {
  return isNodeArray(node)
    && node.length === 2
    && (node[0] === 'Sin' || node[0] === 'Cos')
    ? { head: node[0], argument: node[1] }
    : undefined;
}

function splitProduct(node: unknown, variable: string): RischNormanExpSinCosAnsatzResult | ProductSplit {
  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
  const exponentials = factors
    .map((factor, index) => ({ index, carrier: expCarrier(factor) }))
    .filter((entry): entry is { index: number; carrier: ExponentialCarrier } =>
      Boolean(entry.carrier && dependsOnVariable(entry.carrier.exponent, variable)));
  const trigs = factors
    .map((factor, index) => ({ index, carrier: trigCarrier(factor) }))
    .filter((entry): entry is { index: number; carrier: TrigCarrier } =>
      Boolean(entry.carrier && dependsOnVariable(entry.carrier.argument, variable)));

  if (exponentials.length === 0) {
    return { kind: 'stop', reason: 'missing-exponential-factor' };
  }
  if (exponentials.length > 1) {
    return { kind: 'stop', reason: 'extra-exponential-factor' };
  }
  if (trigs.length === 0) {
    return { kind: 'stop', reason: 'missing-trig-factor' };
  }
  if (trigs.length > 1) {
    return { kind: 'stop', reason: 'extra-trig-factor' };
  }

  const expIndex = exponentials[0].index;
  const trigIndex = trigs[0].index;
  const remaining = factors.filter((_, index) => index !== expIndex && index !== trigIndex);
  return {
    exponential: exponentials[0].carrier,
    trig: trigs[0].carrier,
    polynomialNode: remaining.length === 0 ? 1 : multiplyMathJsonNodes(...remaining),
  };
}

function exactZero(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === 0);
}

function coefficientNodesForDegree(degree: number, source: 'zero' | unknown[]) {
  if (source === 'zero') {
    return Array.from({ length: degree + 1 }, () => 0 as unknown);
  }
  return Array.from({ length: degree + 1 }, (_, index) => source[index] ?? 0);
}

function variablePowerLatex(variable: string, degree: number) {
  return degree === 1 ? variable : `${variable}^{${degree}}`;
}

function braceContentAt(value: string, startIndex: number) {
  if (value[startIndex] !== '{') {
    return undefined;
  }

  let depth = 0;
  for (let index = startIndex; index < value.length; index += 1) {
    const char = value[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return {
          content: value.slice(startIndex + 1, index),
          endIndex: index + 1,
        };
      }
    }
  }

  return undefined;
}

function splitLatexFraction(latex: string) {
  if (!latex.startsWith('\\frac{')) {
    return undefined;
  }

  const numerator = braceContentAt(latex, '\\frac'.length);
  const denominator = numerator ? braceContentAt(latex, numerator.endIndex) : undefined;
  if (!numerator || !denominator || denominator.endIndex !== latex.length) {
    return undefined;
  }

  return {
    numerator: numerator.content,
    denominator: denominator.content,
  };
}

function multiplyCoefficientLatexByVariable(latex: string, variableLatex: string) {
  const fraction = splitLatexFraction(latex);
  if (!fraction) {
    return undefined;
  }

  if (fraction.numerator === '1') {
    return `\\frac{${variableLatex}}{${fraction.denominator}}`;
  }
  if (fraction.numerator === '-1') {
    return `-\\frac{${variableLatex}}{${fraction.denominator}}`;
  }

  const numerator = fraction.numerator.includes('+') || fraction.numerator.slice(1).includes('-')
    ? `${variableLatex}${wrapGroupedLatex(fraction.numerator)}`
    : `${fraction.numerator}${variableLatex}`;
  return `\\frac{${numerator}}{${fraction.denominator}}`;
}

function denominatorPowerNode(denominator: unknown, power: number) {
  if (power <= 0) {
    return 1;
  }
  return power === 1 ? denominator : ['Power', denominator, power];
}

function sharedDenominatorNode(coefficient: SharedDenominatorCoefficient, denominator: unknown) {
  if (exactZero(coefficient.numerator)) {
    return 0;
  }
  if (coefficient.denominatorPower <= 0) {
    return coefficient.numerator;
  }
  return ['Divide', coefficient.numerator, denominatorPowerNode(denominator, coefficient.denominatorPower)];
}

function coefficientLatex(coefficient: SharedDenominatorCoefficient, denominatorLatex: string) {
  if (exactZero(coefficient.numerator)) {
    return '0';
  }
  const numeratorLatex = boxLatex(simplifyMathJsonNodeOrOriginal(coefficient.numerator));
  if (coefficient.denominatorPower <= 0) {
    return numeratorLatex;
  }
  const denominator = coefficient.denominatorPower === 1
    ? denominatorLatex
    : `${wrapGroupedLatex(denominatorLatex)}^{${coefficient.denominatorPower}}`;
  return `\\frac{${numeratorLatex}}{${denominator}}`;
}

function polynomialLatex(
  coefficients: SharedDenominatorCoefficient[],
  variable: string,
  denominatorLatex: string,
) {
  const terms: string[] = [];
  coefficients.forEach((coefficient, degree) => {
    if (exactZero(coefficient.numerator)) {
      return;
    }
    const latex = coefficientLatex(coefficient, denominatorLatex);
    if (degree === 0) {
      terms.push(latex);
      return;
    }
    const variableLatex = variablePowerLatex(variable, degree);
    if (latex === '1') {
      terms.push(variableLatex);
      return;
    }
    if (latex === '-1') {
      terms.push(`-${variableLatex}`);
      return;
    }
    const largeCoefficient = latex.includes('\\frac') || latex.includes('+') || latex.slice(1).includes('-');
    if (largeCoefficient) {
      terms.push(multiplyCoefficientLatexByVariable(latex, variableLatex) ?? `${variableLatex}${wrapGroupedLatex(latex)}`);
      return;
    }
    terms.push(`${latex}${variableLatex}`);
  });
  return terms.length > 0 ? terms.join('+') : '0';
}

function expSinCosLatex(input: {
  expLatex: string;
  trigLatex: string;
  qLatex: string;
  rLatex: string;
}) {
  const pieces: string[] = [];
  if (input.qLatex !== '0') {
    pieces.push(`${wrapGroupedLatex(input.qLatex)}\\sin(${input.trigLatex})`);
  }
  if (input.rLatex !== '0') {
    pieces.push(`${wrapGroupedLatex(input.rLatex)}\\cos(${input.trigLatex})`);
  }
  const inner = pieces.length > 0 ? pieces.join('+') : '0';
  return `e^{${input.expLatex}}\\left(${inner}\\right)`;
}

function solveRawRecurrence(input: {
  polynomialDegree: number;
  expSlope: unknown;
  trigSlope: unknown;
  denominator: unknown;
  targetSin: unknown[];
  targetCos: unknown[];
}) {
  const q = Array.from({ length: input.polynomialDegree + 2 }, (): SharedDenominatorCoefficient => ({
    numerator: 0,
    denominatorPower: 0,
  }));
  const r = Array.from({ length: input.polynomialDegree + 2 }, (): SharedDenominatorCoefficient => ({
    numerator: 0,
    denominatorPower: 0,
  }));

  for (let degree = input.polynomialDegree; degree >= 0; degree -= 1) {
    const carryPower = input.polynomialDegree - degree;
    const carryDenominator = denominatorPowerNode(input.denominator, carryPower);
    const carrySinNumerator = multiplyMathJsonNodes(degree + 1, q[degree + 1].numerator);
    const carryCosNumerator = multiplyMathJsonNodes(degree + 1, r[degree + 1].numerator);
    const residualSinNumerator = subtractMathJsonNodes(
      multiplyMathJsonNodes(input.targetSin[degree], carryDenominator),
      carrySinNumerator,
    );
    const residualCosNumerator = subtractMathJsonNodes(
      multiplyMathJsonNodes(input.targetCos[degree], carryDenominator),
      carryCosNumerator,
    );
    q[degree] = {
      numerator: simplifyMathJsonNodeOrOriginal(addMathJsonNodes(
        multiplyMathJsonNodes(input.expSlope, residualSinNumerator),
        multiplyMathJsonNodes(input.trigSlope, residualCosNumerator),
      )),
      denominatorPower: carryPower + 1,
    };
    r[degree] = {
      numerator: simplifyMathJsonNodeOrOriginal(subtractMathJsonNodes(
        multiplyMathJsonNodes(input.expSlope, residualCosNumerator),
        multiplyMathJsonNodes(input.trigSlope, residualSinNumerator),
      )),
      denominatorPower: carryPower + 1,
    };
  }

  return { q, r };
}

export function solveRischNormanExpSinCosAnsatz(
  node: unknown,
  variable: string,
): RischNormanExpSinCosAnsatzResult {
  const split = splitProduct(node, variable);
  if ('kind' in split) {
    return split;
  }

  const expAffine = parseSymbolicAffine(split.exponential.exponent, variable);
  if (!expAffine) {
    return { kind: 'stop', reason: 'non-affine-exponent' };
  }
  const trigAffine = parseSymbolicAffine(split.trig.argument, variable);
  if (!trigAffine || exactZero(trigAffine.slope)) {
    return { kind: 'stop', reason: 'non-affine-trig-argument' };
  }

  const expSlope = parseRischNormanCoefficient(expAffine.slope, variable);
  if (expSlope.kind === 'stop') {
    return coefficientStop(expSlope.reason);
  }
  const trigSlope = parseRischNormanCoefficient(trigAffine.slope, variable);
  if (trigSlope.kind === 'stop') {
    return coefficientStop(trigSlope.reason);
  }
  const denominatorNode = addMathJsonNodes(
    multiplyMathJsonNodes(expSlope.coefficient.node, expSlope.coefficient.node),
    multiplyMathJsonNodes(trigSlope.coefficient.node, trigSlope.coefficient.node),
  );
  if (exactZero(denominatorNode)) {
    return { kind: 'stop', reason: 'zero-pivot' };
  }

  const polynomial = parseRischNormanPolynomial(
    split.polynomialNode,
    variable,
    BY_PARTS_POLYNOMIAL_DEGREE_CAP,
  );
  if (polynomial.kind === 'stop') {
    return polynomial.reason === 'coefficient-stop'
      ? {
        kind: 'stop',
        reason: 'coefficient-stop',
        coefficientReason: polynomial.coefficientReason,
      }
      : { kind: 'stop', reason: polynomial.reason };
  }

  const coefficientNodes = polynomial.coefficients.map((coefficient) => coefficient.node);
  const targetSin = coefficientNodesForDegree(
    polynomial.degree,
    split.trig.head === 'Sin' ? coefficientNodes : 'zero',
  );
  const targetCos = coefficientNodesForDegree(
    polynomial.degree,
    split.trig.head === 'Cos' ? coefficientNodes : 'zero',
  );
  const solved = solveRawRecurrence({
    polynomialDegree: polynomial.degree,
    expSlope: expSlope.coefficient.node,
    trigSlope: trigSlope.coefficient.node,
    denominator: denominatorNode,
    targetSin,
    targetCos,
  });
  const denominatorLatex = boxLatex(denominatorNode);
  const qNode = buildPolynomialNodeFromCoefficients(
    solved.q.map((coefficient) => sharedDenominatorNode(coefficient, denominatorNode)),
    variable,
  );
  const rNode = buildPolynomialNodeFromCoefficients(
    solved.r.map((coefficient) => sharedDenominatorNode(coefficient, denominatorNode)),
    variable,
  );
  const expNode = ['Power', 'ExponentialE', split.exponential.exponent];
  const sinNode = ['Sin', split.trig.argument];
  const cosNode = ['Cos', split.trig.argument];
  const antiderivativeNode = simplifyMathJsonNodeOrOriginal(multiplyMathJsonNodes(
    expNode,
    addMathJsonNodes(
      multiplyMathJsonNodes(qNode, sinNode),
      multiplyMathJsonNodes(rNode, cosNode),
    ),
  ));
  const facts = dedupeFacts([
    ...coefficientFactsToAnsatzFacts(polynomial.facts),
    ...coefficientFactsToAnsatzFacts(expSlope.coefficient.facts),
    ...coefficientFactsToAnsatzFacts(trigSlope.coefficient.facts),
    nonzeroFact(denominatorLatex),
  ]);

  return {
    kind: 'success',
    family: 'affine-exp-sin-cos',
    variable,
    source: split.trig.head,
    polynomialDegree: polynomial.degree,
    antiderivativeNode,
    exactLatex: normalizeGeneratedRischNormanLatex(expSinCosLatex({
      expLatex: expAffine.latex,
      trigLatex: trigAffine.latex,
      qLatex: polynomialLatex(solved.q, variable, denominatorLatex),
      rLatex: polynomialLatex(solved.r, variable, denominatorLatex),
    }), variable),
    facts,
    proof: 'risch-norman-exp-sincos-ansatz-rule-proof',
  };
}
