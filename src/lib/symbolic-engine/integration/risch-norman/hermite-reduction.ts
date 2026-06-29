import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import { readExactScalarNode } from '../../../algebra/polynomial-core';
import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import {
  addMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
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
import {
  isRischNormanCoefficientOne,
  isRischNormanCoefficientZero,
  divideRischNormanCoefficients,
  mergeRischNormanCoefficientFacts,
  multiplyRischNormanCoefficients,
  parseRischNormanCoefficient,
  subtractRischNormanCoefficients,
  type RischNormanCoefficient,
  type RischNormanCoefficientFact,
  type RischNormanCoefficientStopReason,
} from './coefficient-field';
import {
  buildPolynomialNodeFromCoefficients,
} from './polynomial';
import { normalizeGeneratedRischNormanLatex } from './output-hygiene';

export type RischNormanHermiteReductionStopReason =
  | 'coefficient-stop'
  | 'non-rational-shape'
  | 'not-hermite-correction'
  | 'over-cap-degree'
  | 'over-cap-power'
  | 'unsupported-denominator';

export type RischNormanHermiteReductionResult =
  | {
    kind: 'success';
    antiderivativeNode: unknown;
    exactLatex: string;
    verification: AntiderivativeBackcheck;
    exactSupplementLatex: string[];
  }
  | {
    kind: 'stop';
    reason: RischNormanHermiteReductionStopReason;
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

type AnsatzTerm = {
  kind: 'correction' | 'log-residual';
  basis: unknown[];
};

type AnsatzAttempt =
  | {
    kind: 'success';
    solution: RischNormanCoefficient[];
    facts: RischNormanCoefficientFact[];
  }
  | {
    kind: 'stop';
    reason: 'coefficient-stop' | 'not-hermite-correction';
    coefficientReason?: RischNormanCoefficientStopReason;
  };

type CollectedPolynomial =
  | {
    kind: 'success';
    coefficients: unknown[];
    degree: number;
    facts: RischNormanCoefficientFact[];
  }
  | {
    kind: 'stop';
    reason: 'coefficient-stop' | 'over-cap-degree' | 'selected-variable-dependent-coefficient';
    coefficientReason?: RischNormanCoefficientStopReason;
  };

const MAX_HERMITE_DEGREE = 6;
const MAX_HERMITE_POWER = 3;

function proof(): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason: 'verified by internal Risch-Norman Hermite rational-correction rule proof',
  };
}

function coefficientStop(reason: RischNormanCoefficientStopReason): RischNormanHermiteReductionResult {
  return {
    kind: 'stop',
    reason: 'coefficient-stop',
    coefficientReason: reason,
  };
}

function exactInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  return scalar && scalar.denominator === 1 ? scalar.numerator : undefined;
}

function exactZeroNode(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === 0);
}

function parsePositiveDenominator(node: unknown): ParsedDenominator | undefined {
  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
    const power = exactInteger(node[2]);
    return power && power > 0 ? { base: node[1], power } : undefined;
  }

  return { base: node, power: 1 };
}

function parseNegativePower(node: unknown): ParsedIntegrand | undefined {
  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3) {
    return undefined;
  }

  const power = exactInteger(node[2]);
  return power && power < 0
    ? {
      numerator: 1,
      denominator: { base: node[1], power: -power },
    }
    : undefined;
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

  const numeratorFactors = factors.filter((_, index) => index !== denominatorIndexes[0].index);
  return {
    numerator: numeratorFactors.length === 0
      ? 1
      : numeratorFactors.length === 1
        ? numeratorFactors[0]
        : ['Multiply', ...numeratorFactors],
    denominator: denominatorIndexes[0].parsed.denominator,
  };
}

function zeroArray(length: number) {
  return Array.from({ length }, () => 0 as unknown);
}

function trimPolynomial(coefficients: unknown[]) {
  const trimmed = [...coefficients];
  while (trimmed.length > 1 && exactZeroNode(trimmed[trimmed.length - 1])) {
    trimmed.pop();
  }
  return trimmed;
}

function addPolynomials(left: unknown[], right: unknown[]) {
  const width = Math.max(left.length, right.length);
  return trimPolynomial(Array.from({ length: width }, (_, index) =>
    addMathJsonNodes(left[index] ?? 0, right[index] ?? 0)));
}

function negatePolynomial(polynomial: unknown[]) {
  return polynomial.map(negateMathJsonNode);
}

function subtractPolynomials(left: unknown[], right: unknown[]) {
  return addPolynomials(left, negatePolynomial(right));
}

function multiplyPolynomialByScalar(polynomial: unknown[], scalar: unknown) {
  return trimPolynomial(polynomial.map((coefficient) => multiplyMathJsonNodes(coefficient, scalar)));
}

function multiplyPolynomials(left: unknown[], right: unknown[]) {
  const product = zeroArray(Math.max(1, left.length + right.length - 1));
  left.forEach((leftCoefficient, leftDegree) => {
    right.forEach((rightCoefficient, rightDegree) => {
      product[leftDegree + rightDegree] = addMathJsonNodes(
        product[leftDegree + rightDegree],
        multiplyMathJsonNodes(leftCoefficient, rightCoefficient),
      );
    });
  });
  return trimPolynomial(product);
}

function derivativePolynomial(polynomial: unknown[]) {
  if (polynomial.length <= 1) {
    return [0];
  }
  return trimPolynomial(polynomial.slice(1).map((coefficient, index) =>
    multiplyMathJsonNodes(coefficient, index + 1)));
}

function monomial(degree: number) {
  const coefficients = zeroArray(degree + 1);
  coefficients[degree] = 1;
  return coefficients;
}

function coefficientAt(polynomial: unknown[], degree: number) {
  return polynomial[degree] ?? 0;
}

function containsTargetFreeSymbol(node: unknown, variable: string): boolean {
  if (typeof node === 'string') {
    return node !== variable
      && node !== 'ExponentialE'
      && node !== 'Pi'
      && node !== 'ImaginaryUnit';
  }

  return isNodeArray(node) && node.slice(1).some((child) => containsTargetFreeSymbol(child, variable));
}

function polynomialDegree(coefficients: unknown[]) {
  return trimPolynomial(coefficients).length - 1;
}

function signedTerms(node: unknown, sign: 1 | -1 = 1): Array<{ node: unknown; sign: 1 | -1 }> {
  if (isNodeArray(node) && node[0] === 'Add') {
    return node.slice(1).flatMap((term) => signedTerms(term, sign));
  }

  if (isNodeArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedTerms(first, sign)),
      ...rest.flatMap((term) => signedTerms(term, sign === 1 ? -1 : 1)),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedTerms(node[1], sign === 1 ? -1 : 1);
  }

  return [{ node, sign }];
}

function mergeCollectedFacts(polynomials: CollectedPolynomial[]) {
  return mergeRischNormanCoefficientFacts(polynomials.flatMap((polynomial) =>
    polynomial.kind === 'success' ? polynomial.facts : []));
}

function collectScalarPolynomial(
  node: unknown,
  variable: string,
): CollectedPolynomial {
  const coefficient = parseRischNormanCoefficient(node, variable);
  if (coefficient.kind === 'stop') {
    return {
      kind: 'stop',
      reason: 'coefficient-stop',
      coefficientReason: coefficient.reason,
    };
  }

  return {
    kind: 'success',
    coefficients: [coefficient.coefficient.node],
    degree: 0,
    facts: coefficient.coefficient.facts,
  };
}

function collectPolynomial(
  node: unknown,
  variable: string,
  maxDegree: number,
): CollectedPolynomial {
  const simplified = node;

  if (!dependsOnVariable(simplified, variable)) {
    return collectScalarPolynomial(simplified, variable);
  }

  if (simplified === variable) {
    return {
      kind: 'success',
      coefficients: [0, 1],
      degree: 1,
      facts: [],
    };
  }

  if (isNodeArray(simplified) && simplified[0] === 'Power' && simplified.length === 3) {
    const power = exactInteger(simplified[2]);
    if (simplified[1] === variable && power !== undefined && power >= 0) {
      if (power > maxDegree) {
        return { kind: 'stop', reason: 'over-cap-degree' };
      }
      return {
        kind: 'success',
        coefficients: monomial(power),
        degree: power,
        facts: [],
      };
    }

    if (power === undefined || power < 0) {
      return { kind: 'stop', reason: 'selected-variable-dependent-coefficient' };
    }

    const base = collectPolynomial(simplified[1], variable, maxDegree);
    if (base.kind === 'stop') {
      return base;
    }
    let product: unknown[] = [1];
    for (let index = 0; index < power; index += 1) {
      product = multiplyPolynomials(product, base.coefficients);
      if (polynomialDegree(product) > maxDegree) {
        return { kind: 'stop', reason: 'over-cap-degree' };
      }
    }
    return {
      kind: 'success',
      coefficients: product,
      degree: polynomialDegree(product),
      facts: base.facts,
    };
  }

  if (isNodeArray(simplified) && (simplified[0] === 'Add' || simplified[0] === 'Subtract' || simplified[0] === 'Negate')) {
    let sum: unknown[] = [0];
    const facts: RischNormanCoefficientFact[] = [];
    for (const term of signedTerms(simplified)) {
      const collected = collectPolynomial(term.node, variable, maxDegree);
      if (collected.kind === 'stop') {
        return collected;
      }
      const signed = term.sign === 1
        ? collected.coefficients
        : negatePolynomial(collected.coefficients);
      sum = addPolynomials(sum, signed);
      if (polynomialDegree(sum) > maxDegree) {
        return { kind: 'stop', reason: 'over-cap-degree' };
      }
      facts.push(...collected.facts);
    }
    return {
      kind: 'success',
      coefficients: sum,
      degree: polynomialDegree(sum),
      facts: mergeRischNormanCoefficientFacts(facts),
    };
  }

  if (isNodeArray(simplified) && simplified[0] === 'Multiply') {
    let product: unknown[] = [1];
    const factors = flattenMultiply(simplified);
    const collectedFactors: CollectedPolynomial[] = [];
    for (const factor of factors) {
      const collected = collectPolynomial(factor, variable, maxDegree);
      if (collected.kind === 'stop') {
        return collected;
      }
      product = multiplyPolynomials(product, collected.coefficients);
      if (polynomialDegree(product) > maxDegree) {
        return { kind: 'stop', reason: 'over-cap-degree' };
      }
      collectedFactors.push(collected);
    }
    return {
      kind: 'success',
      coefficients: product,
      degree: polynomialDegree(product),
      facts: mergeCollectedFacts(collectedFactors),
    };
  }

  return { kind: 'stop', reason: 'selected-variable-dependent-coefficient' };
}

function correctionBasisNumerator(input: {
  denominator: unknown[];
  denominatorDerivative: unknown[];
  correctionPower: number;
  monomialDegree: number;
}) {
  const basis = monomial(input.monomialDegree);
  const derivativeTimesDenominator = multiplyPolynomials(derivativePolynomial(basis), input.denominator);
  const basisTimesDenominatorDerivative = multiplyPolynomialByScalar(
    multiplyPolynomials(basis, input.denominatorDerivative),
    input.correctionPower,
  );
  return subtractPolynomials(derivativeTimesDenominator, basisTimesDenominatorDerivative);
}

function buildExactDerivativeTerms(input: {
  denominator: unknown[];
  denominatorDerivative: unknown[];
  denominatorDegree: number;
  denominatorPower: number;
}) {
  const correctionPower = input.denominatorPower - 1;
  return Array.from({ length: input.denominatorDegree }, (_, monomialDegree): AnsatzTerm => ({
    kind: 'correction',
    basis: correctionBasisNumerator({
      denominator: input.denominator,
      denominatorDerivative: input.denominatorDerivative,
      correctionPower,
      monomialDegree,
    }),
  }));
}

function buildDerivativePlusLogTerms(input: {
  denominator: unknown[];
  denominatorDerivative: unknown[];
  denominatorDegree: number;
}) {
  return [
    ...buildExactDerivativeTerms({
      denominator: input.denominator,
      denominatorDerivative: input.denominatorDerivative,
      denominatorDegree: input.denominatorDegree,
      denominatorPower: 2,
    }),
    {
      kind: 'log-residual' as const,
      basis: multiplyPolynomials(input.denominatorDerivative, input.denominator),
    },
  ];
}

function parseCoefficientOrStop(node: unknown, variable: string): RischNormanCoefficient | undefined {
  const parsed = parseRischNormanCoefficient(node, variable);
  return parsed.kind === 'success' ? parsed.coefficient : undefined;
}

function coefficientsEqual(left: unknown, right: unknown, variable: string) {
  const leftCoefficient = parseCoefficientOrStop(left, variable);
  const rightCoefficient = parseCoefficientOrStop(right, variable);
  if (!leftCoefficient || !rightCoefficient) {
    return false;
  }
  if (leftCoefficient.key === rightCoefficient.key) {
    return true;
  }
  const difference = parseRischNormanCoefficient(subtractMathJsonNodes(left, right), variable);
  return difference.kind === 'success' && isRischNormanCoefficientZero(difference.coefficient);
}

function verifySolution(input: {
  terms: AnsatzTerm[];
  solution: RischNormanCoefficient[];
  numerator: unknown[];
  maxDegree: number;
  variable: string;
}) {
  for (let degree = 0; degree <= input.maxDegree; degree += 1) {
    const predicted = input.terms.reduce<unknown>((sum, term, index) =>
      addMathJsonNodes(
        sum,
        multiplyMathJsonNodes(input.solution[index].node, coefficientAt(term.basis, degree)),
      ), 0);
    if (!coefficientsEqual(predicted, coefficientAt(input.numerator, degree), input.variable)) {
      return false;
    }
  }
  return true;
}

function highestBasisDegree(term: AnsatzTerm) {
  for (let degree = term.basis.length - 1; degree >= 0; degree -= 1) {
    if (!exactZeroNode(coefficientAt(term.basis, degree))) {
      return degree;
    }
  }
  return undefined;
}

function parseCoefficientForSolve(
  node: unknown,
  variable: string,
): RischNormanCoefficient | AnsatzAttempt {
  const parsed = parseRischNormanCoefficient(node, variable);
  return parsed.kind === 'success'
    ? parsed.coefficient
    : {
      kind: 'stop',
      reason: 'coefficient-stop',
      coefficientReason: parsed.reason,
    };
}

function isAnsatzStop(value: RischNormanCoefficient | AnsatzAttempt): value is AnsatzAttempt {
  return 'kind' in value;
}

function solveAnsatz(input: {
  terms: AnsatzTerm[];
  numerator: unknown[];
  maxDegree: number;
  variable: string;
}): AnsatzAttempt {
  const orderedTerms = input.terms
    .map((term, index) => ({ term, index, degree: highestBasisDegree(term) }))
    .filter((entry): entry is { term: AnsatzTerm; index: number; degree: number } =>
      entry.degree !== undefined)
    .sort((left, right) => right.degree - left.degree);
  if (orderedTerms.length !== input.terms.length) {
    return { kind: 'stop', reason: 'not-hermite-correction' };
  }

  const solution = new Array<RischNormanCoefficient>(input.terms.length);
  const residual: RischNormanCoefficient[] = [];
  for (let degree = 0; degree <= input.maxDegree; degree += 1) {
    const parsed = parseCoefficientForSolve(coefficientAt(input.numerator, degree), input.variable);
    if (isAnsatzStop(parsed)) {
      return parsed;
    }
    residual[degree] = parsed;
  }

  for (const { term, index, degree } of orderedTerms) {
    const pivot = parseCoefficientForSolve(coefficientAt(term.basis, degree), input.variable);
    if (isAnsatzStop(pivot)) {
      return pivot;
    }
    if (isRischNormanCoefficientZero(pivot)) {
      return { kind: 'stop', reason: 'not-hermite-correction' };
    }

    const solved = divideRischNormanCoefficients(residual[degree], pivot, input.variable);
    if (solved.kind === 'stop') {
      return {
        kind: 'stop',
        reason: 'coefficient-stop',
        coefficientReason: solved.reason,
      };
    }
    solution[index] = solved.coefficient;

    for (let residualDegree = 0; residualDegree <= input.maxDegree; residualDegree += 1) {
      const basisCoefficient = parseCoefficientForSolve(
        coefficientAt(term.basis, residualDegree),
        input.variable,
      );
      if (isAnsatzStop(basisCoefficient)) {
        return basisCoefficient;
      }
      if (isRischNormanCoefficientZero(basisCoefficient)) {
        continue;
      }
      const scaled = multiplyRischNormanCoefficients(
        solved.coefficient,
        basisCoefficient,
        input.variable,
      );
      if (scaled.kind === 'stop') {
        return {
          kind: 'stop',
          reason: 'coefficient-stop',
          coefficientReason: scaled.reason,
        };
      }
      const reduced = subtractRischNormanCoefficients(
        residual[residualDegree],
        scaled.coefficient,
        input.variable,
      );
      if (reduced.kind === 'stop') {
        return {
          kind: 'stop',
          reason: 'coefficient-stop',
          coefficientReason: reduced.reason,
        };
      }
      residual[residualDegree] = reduced.coefficient;
    }
  }

  if (!residual.every(isRischNormanCoefficientZero)) {
    return { kind: 'stop', reason: 'not-hermite-correction' };
  }

  if (!verifySolution({
    terms: input.terms,
    solution,
    numerator: input.numerator,
    maxDegree: input.maxDegree,
    variable: input.variable,
  })) {
    return { kind: 'stop', reason: 'not-hermite-correction' };
  }

  return {
    kind: 'success',
    solution,
    facts: mergeRischNormanCoefficientFacts(solution.flatMap((coefficient) => coefficient.facts)),
  };
}

function factEntry(fact: RischNormanCoefficientFact): ExactSupplementEntry {
  return {
    kind: 'exclusion',
    expressionLatex: fact.expressionLatex.replace(/^-?\d+(?=[A-Za-z]|\\left|\()/, ''),
    relation: '\\ne0',
    source: 'candidate-validation',
  };
}

function denominatorPowerNode(base: unknown, power: number) {
  return power === 1 ? base : ['Power', base, power];
}

function denominatorPowerLatex(baseLatex: string, power: number) {
  return power === 1 ? baseLatex : `${wrapGroupedLatex(baseLatex)}^{${power}}`;
}

function correctionNode(polynomialNode: unknown, denominatorBase: unknown, denominatorPower: number) {
  return ['Divide', polynomialNode, denominatorPowerNode(denominatorBase, denominatorPower)];
}

function correctionLatex(polynomialLatex: string, denominatorLatex: string, denominatorPower: number) {
  return `\\frac{${polynomialLatex}}{${denominatorPowerLatex(denominatorLatex, denominatorPower)}}`;
}

function coefficientTimesLogLatex(coefficient: RischNormanCoefficient, denominatorLatex: string) {
  const log = `\\ln\\left|${denominatorLatex}\\right|`;
  if (isRischNormanCoefficientOne(coefficient)) {
    return log;
  }
  return `${coefficient.latex}\\cdot ${log}`;
}

function coefficientTimesLogNode(coefficient: RischNormanCoefficient, denominatorNode: unknown) {
  const logNode = ['Ln', ['Abs', denominatorNode]];
  return isRischNormanCoefficientOne(coefficient)
    ? logNode
    : multiplyMathJsonNodes(coefficient.node, logNode);
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

function buildResult(input: {
  terms: AnsatzTerm[];
  solution: RischNormanCoefficient[];
  facts: RischNormanCoefficientFact[];
  denominatorBase: unknown;
  denominatorLatex: string;
  denominatorPower: number;
  variable: string;
}) {
  const correctionCoefficients = input.terms
    .map((term, index) => ({ term, coefficient: input.solution[index] }))
    .filter((entry) => entry.term.kind === 'correction')
    .map((entry) => entry.coefficient.node);
  const correctionPolynomial = simplifyMathJsonNodeOrOriginal(
    buildPolynomialNodeFromCoefficients(correctionCoefficients, input.variable),
  );
  const correctionDenominatorPower = input.denominatorPower - 1;
  const correction = correctionNode(
    correctionPolynomial,
    input.denominatorBase,
    correctionDenominatorPower,
  );
  const correctionLatexPart = correctionLatex(
    boxLatex(correctionPolynomial),
    input.denominatorLatex,
    correctionDenominatorPower,
  );
  const logResidual = input.terms
    .map((term, index) => ({ term, coefficient: input.solution[index] }))
    .find((entry) => entry.term.kind === 'log-residual');
  const antiderivativeNode = logResidual && !isRischNormanCoefficientZero(logResidual.coefficient)
    ? addMathJsonNodes(correction, coefficientTimesLogNode(logResidual.coefficient, input.denominatorBase))
    : correction;
  const exactLatex = logResidual && !isRischNormanCoefficientZero(logResidual.coefficient)
    ? joinAdditiveLatex([
      correctionLatexPart,
      coefficientTimesLogLatex(logResidual.coefficient, input.denominatorLatex),
    ])
    : correctionLatexPart;

  const facts = mergeRischNormanCoefficientFacts(input.facts);
  return {
    kind: 'success' as const,
    antiderivativeNode,
    exactLatex: normalizeGeneratedRischNormanLatex(exactLatex, input.variable),
    verification: proof(),
    exactSupplementLatex: mergeExactSupplementLatex({
      entries: facts.map(factEntry),
      source: 'candidate-validation',
    }),
  };
}

export function tryRischNormanHermiteReductionRule(
  node: unknown,
  variable: string,
): RischNormanHermiteReductionResult {
  const parsed = parseIntegrand(node);
  if (!parsed) {
    return { kind: 'stop', reason: 'non-rational-shape' };
  }
  if (parsed.denominator.power < 2 || parsed.denominator.power > MAX_HERMITE_POWER) {
    return { kind: 'stop', reason: 'over-cap-power' };
  }

  const denominatorNode = parsed.denominator.base;
  const numeratorNode = parsed.numerator;
  const denominator = collectPolynomial(denominatorNode, variable, MAX_HERMITE_DEGREE);
  if (denominator.kind === 'stop') {
    return denominator.reason === 'over-cap-degree'
      ? { kind: 'stop', reason: 'over-cap-degree' }
      : coefficientStop(denominator.coefficientReason ?? 'selected-variable-dependent-coefficient');
  }
  if (denominator.degree < 2) {
    return { kind: 'stop', reason: 'unsupported-denominator' };
  }

  const numerator = collectPolynomial(numeratorNode, variable, MAX_HERMITE_DEGREE);
  if (numerator.kind === 'stop') {
    return numerator.reason === 'over-cap-degree'
      ? { kind: 'stop', reason: 'over-cap-degree' }
      : coefficientStop(numerator.coefficientReason ?? 'selected-variable-dependent-coefficient');
  }

  const denominatorCoefficients = denominator.coefficients;
  const numeratorCoefficients = numerator.coefficients;
  if (![...denominatorCoefficients, ...numeratorCoefficients].some((coefficient) =>
    containsTargetFreeSymbol(coefficient, variable))) {
    return { kind: 'stop', reason: 'unsupported-denominator' };
  }
  const denominatorDerivative = derivativePolynomial(denominatorCoefficients);
  const maxDegree = Math.max(
    numeratorCoefficients.length - 1,
    denominatorCoefficients.length + denominator.degree - 2,
  );
  const exactDerivativeTerms = buildExactDerivativeTerms({
    denominator: denominatorCoefficients,
    denominatorDerivative,
    denominatorDegree: denominator.degree,
    denominatorPower: parsed.denominator.power,
  });
  const exactDerivative = solveAnsatz({
    terms: exactDerivativeTerms,
    numerator: numeratorCoefficients,
    maxDegree,
    variable,
  });
  if (exactDerivative.kind === 'success') {
    return buildResult({
      terms: exactDerivativeTerms,
      solution: exactDerivative.solution,
      facts: [...denominator.facts, ...numerator.facts, ...exactDerivative.facts],
      denominatorBase: denominatorNode,
      denominatorLatex: boxLatex(denominatorNode),
      denominatorPower: parsed.denominator.power,
      variable,
    });
  }

  if (parsed.denominator.power !== 2) {
    return { kind: 'stop', reason: 'not-hermite-correction' };
  }

  const derivativePlusLogTerms = buildDerivativePlusLogTerms({
    denominator: denominatorCoefficients,
    denominatorDerivative,
    denominatorDegree: denominator.degree,
  });
  const derivativePlusLog = solveAnsatz({
    terms: derivativePlusLogTerms,
    numerator: numeratorCoefficients,
    maxDegree,
    variable,
  });
  if (derivativePlusLog.kind !== 'success') {
    return { kind: 'stop', reason: 'not-hermite-correction' };
  }

  return buildResult({
    terms: derivativePlusLogTerms,
    solution: derivativePlusLog.solution,
    facts: [...denominator.facts, ...numerator.facts, ...derivativePlusLog.facts],
    denominatorBase: denominatorNode,
    denominatorLatex: boxLatex(denominatorNode),
    denominatorPower: parsed.denominator.power,
    variable,
  });
}
