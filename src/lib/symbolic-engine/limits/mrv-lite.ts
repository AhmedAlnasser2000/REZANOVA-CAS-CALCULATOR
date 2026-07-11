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
  type InfinityScaleTerm,
} from './infinity-scale-terms';
import { appendSignedExpression, logarithmicExponentDifferenceScale } from './mrv-log-residual';
import type { FiniteLimitRuleSuccess, FiniteLimitRuleValue } from './types';
import { profileSymbolicLimitsResult } from '../../display/printer';

const EPSILON = 1e-10;

type MrvFactorModel = {
  exponentTerms: { sign: 1 | -1; node: unknown }[];
  numeratorFactors: unknown[];
  denominatorFactors: unknown[];
};

type MrvDominantTerm = {
  exponent?: InfinityScaleTerm;
  residual: InfinityScaleTerm;
  reason: string;
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

function isPositiveUnboundedExponent(term: InfinityScaleTerm | undefined) {
  return Boolean(
    term
    && compareInfinityScale(term.scale, zeroInfinityScale()) > 0
    && term.coefficient > 0,
  );
}

function normalizedMrvTermForSum(term: MrvDominantTerm): MrvDominantTerm | undefined {
  if (!term.exponent) {
    return term;
  }

  const tendency = exponentTendency(term.exponent);
  if (tendency === 'positive-infinity') {
    return term;
  }
  if (tendency === 'negative-infinity') {
    return undefined;
  }
  if (tendency === 'zero') {
    return {
      ...term,
      exponent: undefined,
      reason: `${term.reason}; the exponential factor tends to 1`,
    };
  }

  return {
    ...term,
    exponent: undefined,
    residual: {
      ...term.residual,
      coefficient: term.residual.coefficient * Math.exp(term.exponent.coefficient),
    },
    reason: `${term.reason}; the exponential factor tends to a finite constant`,
  };
}

function dominantTermLatex(term: MrvDominantTerm) {
  const coefficientLatex = formatLimitNumberLatex(term.residual.coefficient);
  const residualScale = infinityScaleLabel(term.residual.scale);
  const residual =
    residualScale === '1'
      ? coefficientLatex
      : coefficientLatex === '1'
        ? residualScale
        : coefficientLatex === '-1'
          ? `-${residualScale}`
          : `${coefficientLatex}${residualScale}`;

  const exponentTerm = term.exponent;
  if (!exponentTerm || !isPositiveUnboundedExponent(exponentTerm)) {
    return residual;
  }

  const exponentScale = infinityScaleLabel(exponentTerm.scale);
  const exponent =
    Math.abs(exponentTerm.coefficient - 1) < EPSILON
      ? exponentScale
      : `${formatLimitNumberLatex(exponentTerm.coefficient)}${exponentScale}`;
  const exponential = `e^{${exponent}}`;
  if (residualScale === '1' && Math.abs(term.residual.coefficient - 1) < EPSILON) {
    return exponential;
  }
  if (residualScale === '1' && Math.abs(term.residual.coefficient + 1) < EPSILON) {
    return `-${exponential}`;
  }
  return `${residual}\\,${exponential}`;
}

function compareDominantTerms(left: MrvDominantTerm, right: MrvDominantTerm) {
  const leftExponential = isPositiveUnboundedExponent(left.exponent);
  const rightExponential = isPositiveUnboundedExponent(right.exponent);
  if (leftExponential && rightExponential && left.exponent && right.exponent) {
    const exponentScale = compareInfinityScale(left.exponent.scale, right.exponent.scale);
    if (exponentScale !== 0) {
      return exponentScale;
    }

    const exponentCoefficient = left.exponent.coefficient - right.exponent.coefficient;
    if (Math.abs(exponentCoefficient) >= EPSILON) {
      return exponentCoefficient > 0 ? 1 : -1;
    }

    return compareInfinityScale(left.residual.scale, right.residual.scale);
  }

  if (leftExponential !== rightExponential) {
    return leftExponential ? 1 : -1;
  }

  return compareInfinityScale(left.residual.scale, right.residual.scale);
}

function sameDominanceClass(left: MrvDominantTerm, right: MrvDominantTerm) {
  const leftExponential = isPositiveUnboundedExponent(left.exponent);
  const rightExponential = isPositiveUnboundedExponent(right.exponent);
  if (leftExponential !== rightExponential) {
    return false;
  }

  if (leftExponential && left.exponent && right.exponent) {
    return compareInfinityScale(left.exponent.scale, right.exponent.scale) === 0
      && Math.abs(left.exponent.coefficient - right.exponent.coefficient) < EPSILON
      && compareInfinityScale(left.residual.scale, right.residual.scale) === 0;
  }

  return compareInfinityScale(left.residual.scale, right.residual.scale) === 0;
}

function multiplyResidualCoefficient(term: MrvDominantTerm, factor: number): MrvDominantTerm {
  return {
    ...term,
    residual: {
      ...term.residual,
      coefficient: term.residual.coefficient * factor,
    },
  };
}

function mrvTermFromNode(
  node: unknown,
  variable: string,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
): MrvDominantTerm | undefined {
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    const child = mrvTermFromNode(node[1], variable, targetKind);
    return child ? multiplyResidualCoefficient(child, -1) : undefined;
  }

  const model: MrvFactorModel = {
    exponentTerms: [],
    numeratorFactors: [],
    denominatorFactors: [],
  };
  collectFactors(node, model);

  if (model.exponentTerms.length === 0) {
    const residual = leadingInfinityScaleTerm(node, variable, targetKind);
    return residual
      ? normalizedMrvTermForSum({
          residual,
          reason: residual.reason,
        })
      : undefined;
  }

  const exponentDifference = exponentDifferenceNode(model.exponentTerms);
  if (!exponentDifference) {
    return undefined;
  }

  const exponent = leadingInfinityScaleTerm(exponentDifference, variable, targetKind);
  const residual = leadingInfinityScaleTerm(
    quotientNode(model.numeratorFactors, model.denominatorFactors),
    variable,
    targetKind,
  );
  if (!exponent || !residual) {
    return undefined;
  }

  return normalizedMrvTermForSum({
    exponent,
    residual,
    reason: 'identified the dominant exponential scale inside a term',
  });
}

function sumChildren(node: unknown) {
  return isNodeArray(node) && node[0] === 'Add' ? node.slice(1) : [node];
}

function leadingMrvSumTerm(
  node: unknown,
  variable: string,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
): MrvDominantTerm | undefined {
  const terms = sumChildren(node)
    .map((child) => mrvTermFromNode(child, variable, targetKind))
    .filter(Boolean) as MrvDominantTerm[];
  if (terms.length === 0) {
    return undefined;
  }

  const ordered = [...terms].sort((left, right) => -compareDominantTerms(left, right));
  while (ordered.length > 0) {
    const dominant = ordered[0];
    const sameClass = ordered.filter((term) => sameDominanceClass(term, dominant));
    const coefficient = sameClass.reduce((sum, term) => sum + term.residual.coefficient, 0);
    if (!isCloseToZero(coefficient)) {
      return {
        exponent: dominant.exponent,
        residual: {
          ...dominant.residual,
          coefficient,
        },
        reason: sameClass.length > 1
          ? 'combined matching MRV-lite dominant terms in a sum'
          : 'selected the MRV-lite dominant term in a sum',
      };
    }
    ordered.splice(0, sameClass.length);
  }

  return {
    residual: {
      coefficient: 0,
      scale: zeroInfinityScale(),
      reason: 'all MRV-lite dominant terms canceled',
    },
    reason: 'all MRV-lite dominant terms canceled',
  };
}

function residualQuotient(numerator: InfinityScaleTerm, denominator: InfinityScaleTerm): InfinityScaleTerm | undefined {
  if (isCloseToZero(denominator.coefficient)) {
    return undefined;
  }
  return {
    coefficient: numerator.coefficient / denominator.coefficient,
    scale: combineInfinityScale(numerator.scale, denominator.scale, -1),
    reason: 'compared residual MRV-lite scales in a quotient',
  };
}

function withMultipliedResidual(term: InfinityScaleTerm, residual: InfinityScaleTerm): InfinityScaleTerm {
  return {
    coefficient: term.coefficient * residual.coefficient,
    scale: combineInfinityScale(term.scale, residual.scale),
    reason: residual.reason,
    notes: term.notes,
  };
}

function quotientRows(input: {
  numerator: MrvDominantTerm;
  denominator: MrvDominantTerm;
  conclusion: DisplayDetailLinePart[];
  extraRows?: DisplayDetailLinePart[][];
}) {
  return limitMethodRowsSection([
    [limitTextPart('Form detected: MRV-lite dominant-sum comparison.')],
    [
      limitTextPart('Numerator dominant term: '),
      limitMathPart(dominantTermLatex(input.numerator)),
      limitTextPart('.'),
    ],
    [
      limitTextPart('Denominator dominant term: '),
      limitMathPart(dominantTermLatex(input.denominator)),
      limitTextPart('.'),
    ],
    ...(input.extraRows ?? []),
    input.conclusion,
  ]);
}

function successFromDominantSumComparison(input: {
  numerator: MrvDominantTerm;
  denominator: MrvDominantTerm;
}): FiniteLimitRuleSuccess | undefined {
  const numeratorExp = isPositiveUnboundedExponent(input.numerator.exponent);
  const denominatorExp = isPositiveUnboundedExponent(input.denominator.exponent);

  if (numeratorExp && denominatorExp && input.numerator.exponent && input.denominator.exponent) {
    const exponentScaleComparison = compareInfinityScale(input.numerator.exponent.scale, input.denominator.exponent.scale);
    const exponentCoefficientDelta = input.numerator.exponent.coefficient - input.denominator.exponent.coefficient;
    if (exponentScaleComparison > 0 || (exponentScaleComparison === 0 && exponentCoefficientDelta > EPSILON)) {
      const infinity: FiniteLimitRuleValue = input.numerator.residual.coefficient * input.denominator.residual.coefficient >= 0
        ? 'posInfinity'
        : 'negInfinity';
      return profileSymbolicLimitsResult({
        kind: 'success',
        value: infinity,
        exactLatex: formatLimitValueLatex(infinity),
        approxText: infinity === 'posInfinity' ? 'Infinity' : '-Infinity',
        origin: 'rule-based-symbolic',
        detailSections: quotientRows({
          numerator: input.numerator,
          denominator: input.denominator,
          conclusion: [
            limitTextPart('Conclusion: the numerator exponential scale dominates, so the limit is '),
            limitMathPart(formatLimitValueLatex(infinity) ?? '\\infty'),
            limitTextPart('.'),
          ],
        }),
      });
    }

    if (exponentScaleComparison < 0 || (exponentScaleComparison === 0 && exponentCoefficientDelta < -EPSILON)) {
      return profileSymbolicLimitsResult({
        kind: 'success',
        value: 0,
        exactLatex: '0',
        approxText: '0',
        origin: 'rule-based-symbolic',
        detailSections: quotientRows({
          numerator: input.numerator,
          denominator: input.denominator,
          conclusion: [
            limitTextPart('Conclusion: the denominator exponential scale dominates, so the limit is '),
            limitMathPart('0'),
            limitTextPart('.'),
          ],
        }),
      });
    }
  } else if (numeratorExp !== denominatorExp) {
    if (numeratorExp) {
      const infinity: FiniteLimitRuleValue = input.numerator.residual.coefficient * input.denominator.residual.coefficient >= 0
        ? 'posInfinity'
        : 'negInfinity';
      return profileSymbolicLimitsResult({
        kind: 'success',
        value: infinity,
        exactLatex: formatLimitValueLatex(infinity),
        approxText: infinity === 'posInfinity' ? 'Infinity' : '-Infinity',
        origin: 'rule-based-symbolic',
        detailSections: quotientRows({
          numerator: input.numerator,
          denominator: input.denominator,
          conclusion: [
            limitTextPart('Conclusion: the numerator exponential scale dominates, so the limit is '),
            limitMathPart(formatLimitValueLatex(infinity) ?? '\\infty'),
            limitTextPart('.'),
          ],
        }),
      });
    }

    return profileSymbolicLimitsResult({
      kind: 'success',
      value: 0,
      exactLatex: '0',
      approxText: '0',
      origin: 'rule-based-symbolic',
      detailSections: quotientRows({
        numerator: input.numerator,
        denominator: input.denominator,
        conclusion: [
          limitTextPart('Conclusion: the denominator exponential scale dominates, so the limit is '),
          limitMathPart('0'),
          limitTextPart('.'),
        ],
      }),
    });
  }

  const residual = residualQuotient(input.numerator.residual, input.denominator.residual);
  if (!residual) {
    return undefined;
  }
  return successFromScale({
    term: residual,
    rows: [
      [
        limitTextPart('Numerator dominant term: '),
        limitMathPart(dominantTermLatex(input.numerator)),
        limitTextPart('.'),
      ],
      [
        limitTextPart('Denominator dominant term: '),
        limitMathPart(dominantTermLatex(input.denominator)),
        limitTextPart('.'),
      ],
      [
        limitTextPart('Key calculation: matching exponential scales cancel, leaving the residual quotient.'),
      ],
    ],
  });
}

function resolveMrvLiteDominantSumLimit(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
): FiniteLimitRuleSuccess | undefined {
  if (targetKind !== 'posInfinity') {
    return undefined;
  }

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    const numerator = leadingMrvSumTerm(node[1], variable, targetKind);
    const denominator = leadingMrvSumTerm(node[2], variable, targetKind);
    if (!numerator || !denominator || (!isPositiveUnboundedExponent(numerator.exponent) && !isPositiveUnboundedExponent(denominator.exponent))) {
      return undefined;
    }
    return successFromDominantSumComparison({ numerator, denominator });
  }

  if (isNodeArray(node) && node[0] === 'Add') {
    const term = leadingMrvSumTerm(node, variable, targetKind);
    if (!term || !isPositiveUnboundedExponent(term.exponent)) {
      return undefined;
    }
    const infinity: FiniteLimitRuleValue = term.residual.coefficient >= 0 ? 'posInfinity' : 'negInfinity';
    return profileSymbolicLimitsResult({
      kind: 'success',
      value: infinity,
      exactLatex: formatLimitValueLatex(infinity),
      approxText: infinity === 'posInfinity' ? 'Infinity' : '-Infinity',
      origin: 'rule-based-symbolic',
      detailSections: limitMethodRowsSection([
        [limitTextPart('Form detected: MRV-lite dominant-sum comparison.')],
        [
          limitTextPart('Dominant term: '),
          limitMathPart(dominantTermLatex(term)),
          limitTextPart('.'),
        ],
        [
          limitTextPart('Conclusion: the dominant exponential scale grows without bound, so the limit is '),
          limitMathPart(formatLimitValueLatex(infinity) ?? '\\infty'),
          limitTextPart('.'),
        ],
      ]),
    });
  }

  return undefined;
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
    return profileSymbolicLimitsResult({
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
    });
  }

  if (comparison === 0) {
    return profileSymbolicLimitsResult({
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
    });
  }

  const infinity: FiniteLimitRuleValue = coefficient >= 0 ? 'posInfinity' : 'negInfinity';
  return profileSymbolicLimitsResult({
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
  });
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
    return resolveMrvLiteDominantSumLimit(node, targetKind, variable);
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

  const logarithmicResidual = logarithmicExponentDifferenceScale(exponentDifference, variable, targetKind);
  if (logarithmicResidual) {
    const converted = withMultipliedResidual(ordinaryTerm, logarithmicResidual);
    return successFromScale({
      term: converted,
      rows: [
        ...baseRows,
        [
          limitTextPart('Rewrite/equivalent: '),
          limitTextPart('the logarithmic exponent difference contributes the residual scale '),
          limitMathPart(infinityScaleLabel(logarithmicResidual.scale)),
          limitTextPart('.'),
        ],
      ],
    });
  }

  const tendency = exponentTendency(exponentTerm);
  if (tendency === 'positive-infinity') {
    const sign = ordinaryTerm.coefficient >= 0 ? 1 : -1;
    const infinity: FiniteLimitRuleValue = sign > 0 ? 'posInfinity' : 'negInfinity';
    return profileSymbolicLimitsResult({
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
    });
  }

  if (tendency === 'negative-infinity') {
    return profileSymbolicLimitsResult({
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
    });
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
