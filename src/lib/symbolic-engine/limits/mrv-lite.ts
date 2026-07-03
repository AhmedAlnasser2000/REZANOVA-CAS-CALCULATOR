import type { DisplayDetailLinePart, LimitTargetKind } from '../../../types/calculator';
import { isNodeArray } from '../patterns';
import {
  formatLimitNumberLatex,
  formatLimitValueLatex,
  limitMathPart,
  limitMethodRowsSection,
  limitTextPart,
} from './detail-readback';
import {
  combineInfinityScale,
  compareInfinityScale,
  infinityScaleLabel,
  leadingInfinityScaleTerm,
  zeroInfinityScale,
  type InfinityScale,
  type InfinityScaleTerm,
} from './infinity-scale-terms';
import type { FiniteLimitRuleSuccess, FiniteLimitRuleValue } from './types';

const EPSILON = 1e-10;

type MrvFactorModel = {
  exponentTerms: { sign: 1 | -1; node: unknown }[];
  numeratorFactors: unknown[];
  denominatorFactors: unknown[];
};

function isCloseToZero(value: number) {
  return Math.abs(value) < EPSILON;
}

function isExponentialFactor(node: unknown): node is ['Power', 'ExponentialE', unknown] {
  return isNodeArray(node)
    && node.length === 3
    && node[0] === 'Power'
    && node[1] === 'ExponentialE';
}

function signedNode(node: unknown, sign: 1 | -1): unknown {
  return sign === 1 ? node : ['Negate', node];
}

function appendSignedExpression(node: unknown, sign: 1 | -1, output: unknown[]) {
  if (isNodeArray(node) && node[0] === 'Add') {
    node.slice(1).forEach((child) => appendSignedExpression(child, sign, output));
    return;
  }

  if (isNodeArray(node) && node[0] === 'Subtract' && node.length === 3) {
    appendSignedExpression(node[1], sign, output);
    appendSignedExpression(node[2], sign === 1 ? -1 : 1, output);
    return;
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    appendSignedExpression(node[1], sign === 1 ? -1 : 1, output);
    return;
  }

  output.push(signedNode(node, sign));
}

function collectFactors(node: unknown, model: MrvFactorModel, sign: 1 | -1 = 1) {
  if (isNodeArray(node) && node[0] === 'Multiply') {
    node.slice(1).forEach((factor) => collectFactors(factor, model, sign));
    return;
  }

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    collectFactors(node[1], model, sign);
    collectFactors(node[2], model, sign === 1 ? -1 : 1);
    return;
  }

  if (isExponentialFactor(node)) {
    model.exponentTerms.push({ sign, node: node[2] });
    return;
  }

  if (sign === 1) {
    model.numeratorFactors.push(node);
  } else {
    model.denominatorFactors.push(node);
  }
}

function productNode(factors: unknown[]) {
  if (factors.length === 0) {
    return 1;
  }
  if (factors.length === 1) {
    return factors[0];
  }
  return ['Multiply', ...factors];
}

function quotientNode(numeratorFactors: unknown[], denominatorFactors: unknown[]) {
  const numerator = productNode(numeratorFactors);
  if (denominatorFactors.length === 0) {
    return numerator;
  }
  return ['Divide', numerator, productNode(denominatorFactors)];
}

function exponentDifferenceNode(exponentTerms: MrvFactorModel['exponentTerms']) {
  const terms: unknown[] = [];
  exponentTerms.forEach((term) => appendSignedExpression(term.node, term.sign, terms));
  if (terms.length === 0) {
    return undefined;
  }
  if (terms.length === 1) {
    return terms[0];
  }
  return ['Add', ...terms];
}

function isPlainLogScale(term: InfinityScaleTerm) {
  const [firstLog = 0, ...restLogs] = term.scale.logs;
  return isCloseToZero(term.scale.expRate)
    && isCloseToZero(term.scale.power)
    && Math.abs(firstLog - 1) < EPSILON
    && restLogs.every(isCloseToZero);
}

function scaleWithPower(power: number): InfinityScale {
  return {
    ...zeroInfinityScale(),
    power,
  };
}

function withCombinedScale(term: InfinityScaleTerm, scale: InfinityScale, reason: string): InfinityScaleTerm {
  return {
    coefficient: term.coefficient,
    scale: combineInfinityScale(term.scale, scale),
    reason,
    notes: term.notes,
  };
}

function numericApproxText(value: number) {
  return `${isCloseToZero(value) ? 0 : value}`;
}

function exactConstantWithExp(coefficient: number, exponent: number) {
  const coefficientLatex = formatLimitNumberLatex(coefficient);
  if (isCloseToZero(exponent)) {
    return coefficientLatex;
  }

  const exponentLatex = formatLimitNumberLatex(exponent);
  const eLatex = exponentLatex === '1' ? 'e' : `e^{${exponentLatex}}`;
  if (coefficientLatex === '1') {
    return eLatex;
  }
  if (coefficientLatex === '-1') {
    return `-${eLatex}`;
  }
  return `${coefficientLatex}${eLatex}`;
}

function successFromScale(input: {
  term: InfinityScaleTerm;
  rows: DisplayDetailLinePart[][];
  finiteMultiplier?: number;
  finiteMultiplierLatex?: string;
}): FiniteLimitRuleSuccess {
  const comparison = compareInfinityScale(input.term.scale, zeroInfinityScale());
  const coefficient = input.term.coefficient * (input.finiteMultiplier ?? 1);
  const coefficientLatex = input.finiteMultiplierLatex
    ? exactConstantWithExp(input.term.coefficient, Math.log(input.finiteMultiplier ?? 1))
    : formatLimitNumberLatex(coefficient);
  const detailRows: DisplayDetailLinePart[][] = [
    [limitTextPart('Form detected: MRV-lite exponential scale comparison.')],
    ...input.rows,
    [
      limitTextPart('Residual scale: '),
      limitMathPart(infinityScaleLabel(input.term.scale)),
      limitTextPart(' with coefficient '),
      limitMathPart(coefficientLatex),
      limitTextPart('.'),
    ],
    [limitTextPart(`Reason: ${input.term.reason}.`)],
  ];

  if (comparison < 0) {
    return {
      kind: 'success',
      value: 0,
      exactLatex: '0',
      approxText: '0',
      origin: 'rule-based-symbolic',
      detailSections: limitMethodRowsSection([
        ...detailRows,
        [
          limitTextPart('Conclusion: the residual scale tends to '),
          limitMathPart('0'),
          limitTextPart('.'),
        ],
      ]),
    };
  }

  if (comparison === 0) {
    return {
      kind: 'success',
      value: coefficient,
      exactLatex: input.finiteMultiplierLatex ?? coefficientLatex,
      approxText: numericApproxText(coefficient),
      origin: 'rule-based-symbolic',
      detailSections: limitMethodRowsSection([
        ...detailRows,
        [
          limitTextPart('Conclusion: matching scales leave '),
          limitMathPart(input.finiteMultiplierLatex ?? coefficientLatex),
          limitTextPart('.'),
        ],
      ]),
    };
  }

  const infinity: FiniteLimitRuleValue = coefficient >= 0 ? 'posInfinity' : 'negInfinity';
  return {
    kind: 'success',
    value: infinity,
    exactLatex: formatLimitValueLatex(infinity),
    approxText: infinity === 'posInfinity' ? 'Infinity' : '-Infinity',
    origin: 'rule-based-symbolic',
    detailSections: limitMethodRowsSection([
      ...detailRows,
      [
        limitTextPart('Conclusion: the residual scale grows without bound, so the limit is '),
        limitMathPart(formatLimitValueLatex(infinity) ?? (infinity === 'posInfinity' ? '\\infty' : '-\\infty')),
        limitTextPart('.'),
      ],
    ]),
  };
}

function exponentTendency(term: InfinityScaleTerm) {
  const scaleComparison = compareInfinityScale(term.scale, zeroInfinityScale());
  if (scaleComparison > 0) {
    return term.coefficient > 0 ? 'positive-infinity' : 'negative-infinity';
  }
  if (scaleComparison < 0) {
    return 'zero';
  }
  if (isCloseToZero(term.coefficient)) {
    return 'zero';
  }
  return term.coefficient > 0 ? 'positive-constant' : 'negative-constant';
}

export function resolveMrvLiteLimit(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
): FiniteLimitRuleSuccess | undefined {
  if (targetKind !== 'posInfinity') {
    return undefined;
  }

  const model: MrvFactorModel = {
    exponentTerms: [],
    numeratorFactors: [],
    denominatorFactors: [],
  };
  collectFactors(node, model);
  if (model.exponentTerms.length === 0) {
    return undefined;
  }

  const exponentDifference = exponentDifferenceNode(model.exponentTerms);
  if (exponentDifference === undefined) {
    return undefined;
  }

  const exponentTerm = leadingInfinityScaleTerm(exponentDifference, variable, targetKind);
  const ordinaryTerm = leadingInfinityScaleTerm(
    quotientNode(model.numeratorFactors, model.denominatorFactors),
    variable,
    targetKind,
  );
  if (!exponentTerm || !ordinaryTerm) {
    return undefined;
  }

  const exponentScale = infinityScaleLabel(exponentTerm.scale);
  const ordinaryScale = infinityScaleLabel(ordinaryTerm.scale);
  const baseRows: DisplayDetailLinePart[][] = [
    [
      limitTextPart('Exponential comparison: exponent difference has dominant scale '),
      limitMathPart(exponentScale),
      limitTextPart(' with coefficient '),
      limitMathPart(formatLimitNumberLatex(exponentTerm.coefficient)),
      limitTextPart('.'),
    ],
    [
      limitTextPart('Non-exponential factors reduce to scale '),
      limitMathPart(ordinaryScale),
      limitTextPart('.'),
    ],
  ];

  if (isPlainLogScale(exponentTerm)) {
    const converted = withCombinedScale(
      ordinaryTerm,
      scaleWithPower(exponentTerm.coefficient),
      'converted an exponential log-difference into an ordinary power scale',
    );
    return successFromScale({
      term: converted,
      rows: [
        ...baseRows,
        [
          limitTextPart('Rewrite/equivalent: '),
          limitMathPart(`e^{${formatLimitNumberLatex(exponentTerm.coefficient)}\\log(x)}`),
          limitTextPart(' contributes '),
          limitMathPart(`x^{${formatLimitNumberLatex(exponentTerm.coefficient)}}`),
          limitTextPart('.'),
        ],
      ],
    });
  }

  const tendency = exponentTendency(exponentTerm);
  if (tendency === 'positive-infinity') {
    const sign = ordinaryTerm.coefficient >= 0 ? 1 : -1;
    const infinity: FiniteLimitRuleValue = sign > 0 ? 'posInfinity' : 'negInfinity';
    return {
      kind: 'success',
      value: infinity,
      exactLatex: formatLimitValueLatex(infinity),
      approxText: infinity === 'posInfinity' ? 'Infinity' : '-Infinity',
      origin: 'rule-based-symbolic',
      detailSections: limitMethodRowsSection([
        [limitTextPart('Form detected: MRV-lite exponential scale comparison.')],
        ...baseRows,
        [limitTextPart('Key calculation: a positive unbounded exponent difference dominates algebraic and logarithmic residual factors.')],
        [
          limitTextPart('Conclusion: the limit is '),
          limitMathPart(formatLimitValueLatex(infinity) ?? '\\infty'),
          limitTextPart('.'),
        ],
      ]),
    };
  }

  if (tendency === 'negative-infinity') {
    return {
      kind: 'success',
      value: 0,
      exactLatex: '0',
      approxText: '0',
      origin: 'rule-based-symbolic',
      detailSections: limitMethodRowsSection([
        [limitTextPart('Form detected: MRV-lite exponential scale comparison.')],
        ...baseRows,
        [limitTextPart('Key calculation: a negative unbounded exponent difference gives exponential decay.')],
        [
          limitTextPart('Conclusion: the limit is '),
          limitMathPart('0'),
          limitTextPart('.'),
        ],
      ]),
    };
  }

  if (tendency === 'zero') {
    return successFromScale({
      term: ordinaryTerm,
      rows: [
        ...baseRows,
        [
          limitTextPart('Key calculation: the exponent difference tends to '),
          limitMathPart('0'),
          limitTextPart(', so the exponential factor tends to '),
          limitMathPart('1'),
          limitTextPart('.'),
        ],
      ],
    });
  }

  if (compareInfinityScale(ordinaryTerm.scale, zeroInfinityScale()) !== 0) {
    return successFromScale({
      term: ordinaryTerm,
      rows: [
        ...baseRows,
        [limitTextPart('Key calculation: the exponent difference tends to a finite nonzero constant, so only the residual scale decides zero or infinity.')],
      ],
    });
  }

  const finiteMultiplier = Math.exp(exponentTerm.coefficient);
  return successFromScale({
    term: ordinaryTerm,
    finiteMultiplier,
    finiteMultiplierLatex: exactConstantWithExp(ordinaryTerm.coefficient, exponentTerm.coefficient),
    rows: [
      ...baseRows,
      [
        limitTextPart('Key calculation: the exponent difference tends to '),
        limitMathPart(formatLimitNumberLatex(exponentTerm.coefficient)),
        limitTextPart('.'),
      ],
    ],
  });
}

export function hasMrvLiteCandidate(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
) {
  return Boolean(resolveMrvLiteLimit(node, targetKind, variable));
}
