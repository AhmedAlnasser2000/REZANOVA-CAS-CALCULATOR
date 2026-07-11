import type { DisplayDetailLinePart, LimitTargetKind } from '../../../types/calculator';
import { dependsOnVariable, isNodeArray } from '../patterns';
import {
  formatLimitNumberLatex,
  formatLimitValueLatex,
  limitMathPart,
  limitMethodRowsSection,
  limitTextPart,
} from './detail-readback';
import type { FiniteLimitRuleSuccess, FiniteLimitRuleValue } from './types';
import { profileSymbolicLimitsResult } from '../../display/printer';

const LOG_DEPTH_CAP = 4;
const EPSILON = 1e-10;

export type InfinityScale = {
  expRate: number;
  power: number;
  logs: number[];
};

export type InfinityScaleTerm = {
  coefficient: number;
  scale: InfinityScale;
  reason: string;
  notes?: string[];
};

export const zeroInfinityScale = (): InfinityScale => ({
  expRate: 0,
  power: 0,
  logs: Array.from({ length: LOG_DEPTH_CAP }, () => 0),
});

function cloneScale(scale: InfinityScale): InfinityScale {
  return {
    expRate: scale.expRate,
    power: scale.power,
    logs: [...scale.logs],
  };
}

export function combineInfinityScale(left: InfinityScale, right: InfinityScale, sign: 1 | -1 = 1): InfinityScale {
  const logs = Array.from({ length: LOG_DEPTH_CAP }, (_, index) =>
    (left.logs[index] ?? 0) + sign * (right.logs[index] ?? 0));
  return {
    expRate: left.expRate + sign * right.expRate,
    power: left.power + sign * right.power,
    logs,
  };
}

export function scaleInfinityScaleBy(scale: InfinityScale, factor: number): InfinityScale {
  return {
    expRate: scale.expRate * factor,
    power: scale.power * factor,
    logs: scale.logs.map((logPower) => logPower * factor),
  };
}

function compareNumber(left: number, right: number) {
  const delta = left - right;
  if (Math.abs(delta) < EPSILON) {
    return 0;
  }
  return delta > 0 ? 1 : -1;
}

function numericApproxText(value: number) {
  return `${Math.abs(value) < EPSILON ? 0 : value}`;
}

export function compareInfinityScale(left: InfinityScale, right: InfinityScale) {
  const exp = compareNumber(left.expRate, right.expRate);
  if (exp !== 0) {
    return exp;
  }

  const power = compareNumber(left.power, right.power);
  if (power !== 0) {
    return power;
  }

  for (let index = 0; index < LOG_DEPTH_CAP; index += 1) {
    const log = compareNumber(left.logs[index] ?? 0, right.logs[index] ?? 0);
    if (log !== 0) {
      return log;
    }
  }

  return 0;
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
    const value = numericConstant(node[1]);
    return value === undefined ? undefined : -value;
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = numericConstant(node[1]);
    const denominator = numericConstant(node[2]);
    if (numerator === undefined || denominator === undefined || Math.abs(denominator) < EPSILON) {
      return undefined;
    }
    return numerator / denominator;
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

function directionSign(targetKind: Exclude<LimitTargetKind, 'finite'>) {
  return targetKind === 'posInfinity' ? 1 : -1;
}

function linearVariableCoefficient(node: unknown, variable: string): number | undefined {
  if (node === variable) {
    return 1;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return undefined;
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const coefficient = linearVariableCoefficient(node[1], variable);
    return coefficient === undefined ? undefined : -coefficient;
  }

  if (node[0] === 'Multiply') {
    let scalar = 1;
    let sawVariable = false;
    for (const factor of node.slice(1)) {
      const coefficient = linearVariableCoefficient(factor, variable);
      if (coefficient !== undefined) {
        if (sawVariable) {
          return undefined;
        }
        sawVariable = true;
        scalar *= coefficient;
        continue;
      }

      const constant = numericConstant(factor);
      if (constant === undefined) {
        return undefined;
      }
      scalar *= constant;
    }
    return sawVariable ? scalar : undefined;
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = linearVariableCoefficient(node[1], variable);
    const denominator = numericConstant(node[2]);
    if (numerator === undefined || denominator === undefined || Math.abs(denominator) < EPSILON) {
      return undefined;
    }
    return numerator / denominator;
  }

  return undefined;
}

function logDepth(node: unknown, variable: string): number | undefined {
  if (node === variable) {
    return -1;
  }
  if (!isNodeArray(node) || node.length !== 2 || node[0] !== 'Log') {
    return undefined;
  }
  const inner = logDepth(node[1], variable);
  if (inner === undefined || inner + 1 >= LOG_DEPTH_CAP) {
    return undefined;
  }
  return inner + 1;
}

function firstNonZeroLogScale(scale: InfinityScale) {
  for (let index = 0; index < LOG_DEPTH_CAP; index += 1) {
    const power = scale.logs[index] ?? 0;
    if (Math.abs(power) >= EPSILON) {
      return { index, power };
    }
  }
  return undefined;
}

function logScaleFromUnboundedInner(
  inner: InfinityScaleTerm,
): InfinityScaleTerm | undefined {
  if (inner.coefficient <= 0) {
    return undefined;
  }

  if (Math.abs(inner.scale.expRate) >= EPSILON) {
    return {
      coefficient: inner.scale.expRate,
      scale: { ...zeroInfinityScale(), power: 1 },
      reason: 'converted a logarithm of an exponential scale to its exponent scale',
      notes: combineNotes(inner),
    };
  }

  if (Math.abs(inner.scale.power) >= EPSILON) {
    const scale = zeroInfinityScale();
    scale.logs[0] = 1;
    return {
      coefficient: inner.scale.power,
      scale,
      reason: 'converted a logarithm of a power scale to a logarithmic scale',
      notes: combineNotes(inner),
    };
  }

  const logScale = firstNonZeroLogScale(inner.scale);
  if (logScale && logScale.index + 1 < LOG_DEPTH_CAP) {
    const scale = zeroInfinityScale();
    scale.logs[logScale.index + 1] = 1;
    return {
      coefficient: logScale.power,
      scale,
      reason: 'converted a logarithm of an iterated-log scale to the next log scale',
      notes: combineNotes(inner),
    };
  }

  return undefined;
}

export function infinityScaleLabel(scale: InfinityScale) {
  const factors: string[] = [];
  if (Math.abs(scale.expRate) >= EPSILON) {
    const coefficient = formatLimitNumberLatex(scale.expRate);
    const exponent = coefficient === '1'
      ? 'x'
      : coefficient === '-1'
        ? '-x'
        : `${coefficient}x`;
    factors.push(`e^{${exponent}}`);
  }
  if (Math.abs(scale.power) >= EPSILON) {
    factors.push(scale.power === 1 ? 'x' : `x^{${formatLimitNumberLatex(scale.power)}}`);
  }
  scale.logs.forEach((power, index) => {
    if (Math.abs(power) < EPSILON) {
      return;
    }
    const argument = Array.from({ length: index }, () => '\\log(').join('') + 'x' + ')'.repeat(index);
    const base = `\\log(${argument})`;
    factors.push(power === 1 ? base : `${base}^{${formatLimitNumberLatex(power)}}`);
  });
  return factors.length > 0 ? factors.join(' ') : '1';
}

function combineNotes(...terms: (InfinityScaleTerm | undefined)[]) {
  return terms.flatMap((term) => term?.notes ?? []);
}

function multiplyTerms(left: InfinityScaleTerm, right: InfinityScaleTerm): InfinityScaleTerm {
  return {
    coefficient: left.coefficient * right.coefficient,
    scale: combineInfinityScale(left.scale, right.scale),
    reason: 'combined infinity scales in a product',
    notes: combineNotes(left, right),
  };
}

function divideTerms(left: InfinityScaleTerm, right: InfinityScaleTerm): InfinityScaleTerm | undefined {
  if (Math.abs(right.coefficient) < EPSILON) {
    return undefined;
  }
  return {
    coefficient: left.coefficient / right.coefficient,
    scale: combineInfinityScale(left.scale, right.scale, -1),
    reason: 'compared infinity scales in a quotient',
    notes: combineNotes(left, right),
  };
}

export function leadingInfinityScaleTerm(
  node: unknown,
  variable: string,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
): InfinityScaleTerm | undefined {
  const constant = numericConstant(node);
  if (constant !== undefined) {
    return {
      coefficient: constant,
      scale: zeroInfinityScale(),
      reason: 'target-free numeric constant',
    };
  }

  if (!dependsOnVariable(node, variable)) {
    return undefined;
  }

  const targetSign = directionSign(targetKind);
  if (node === variable) {
    return {
      coefficient: targetSign,
      scale: { ...zeroInfinityScale(), power: 1 },
      reason: 'the selected variable is the infinity carrier',
    };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return undefined;
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = leadingInfinityScaleTerm(node[1], variable, targetKind);
    return child
      ? {
          ...child,
          coefficient: -child.coefficient,
        }
      : undefined;
  }

  if (node[0] === 'Sqrt' && node.length === 2) {
    const child = leadingInfinityScaleTerm(node[1], variable, targetKind);
    if (!child || child.coefficient < 0) {
      return undefined;
    }
    return {
      coefficient: Math.sqrt(child.coefficient),
      scale: scaleInfinityScaleBy(child.scale, 0.5),
      reason: 'converted a square root to a half-power infinity scale',
      notes: combineNotes(child),
    };
  }

  const depth = logDepth(node, variable);
  if (depth !== undefined && depth >= 0) {
    if (targetKind !== 'posInfinity') {
      return undefined;
    }
    const scale = zeroInfinityScale();
    scale.logs[depth] = 1;
    return {
      coefficient: 1,
      scale,
      reason: depth === 0 ? 'recognized log(x) growth' : 'recognized iterated logarithm growth',
    };
  }

  if (isNodeArray(node) && node[0] === 'Log' && node.length === 2 && targetKind === 'posInfinity') {
    const inner = leadingInfinityScaleTerm(node[1], variable, targetKind);
    const logScale = inner ? logScaleFromUnboundedInner(inner) : undefined;
    if (logScale) {
      return logScale;
    }
  }

  if (node[0] === 'Power' && node.length === 3) {
    if (node[1] === 'ExponentialE') {
      const exponentCoefficient = linearVariableCoefficient(node[2], variable);
      if (exponentCoefficient === undefined) {
        return undefined;
      }
      return {
        coefficient: 1,
        scale: { ...zeroInfinityScale(), expRate: exponentCoefficient * targetSign },
        reason: 'recognized a linear exponential scale',
      };
    }

    const exponent = numericConstant(node[2]);
    if (exponent === undefined) {
      return undefined;
    }
    if (node[1] === variable) {
      if (targetKind === 'negInfinity' && !Number.isInteger(exponent)) {
        return undefined;
      }
      const coefficient = targetKind === 'negInfinity' && Number.isInteger(exponent) && Math.abs(exponent % 2) === 1
        ? -1
        : 1;
      return {
        coefficient,
        scale: { ...zeroInfinityScale(), power: exponent },
        reason: 'recognized a power of the selected variable',
      };
    }

    const base = leadingInfinityScaleTerm(node[1], variable, targetKind);
    if (!base || base.coefficient < 0 || !Number.isInteger(exponent)) {
      return undefined;
    }
    return {
      coefficient: base.coefficient ** exponent,
      scale: scaleInfinityScaleBy(base.scale, exponent),
      reason: 'raised an infinity scale to a numeric power',
      notes: combineNotes(base),
    };
  }

  if (node[0] === 'Multiply') {
    let result: InfinityScaleTerm = {
      coefficient: 1,
      scale: zeroInfinityScale(),
      reason: 'empty product scale',
    };
    for (const factor of node.slice(1)) {
      const term = leadingInfinityScaleTerm(factor, variable, targetKind);
      if (!term) {
        return undefined;
      }
      result = multiplyTerms(result, term);
    }
    return result;
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = leadingInfinityScaleTerm(node[1], variable, targetKind);
    const denominator = leadingInfinityScaleTerm(node[2], variable, targetKind);
    return numerator && denominator ? divideTerms(numerator, denominator) : undefined;
  }

  if (node[0] === 'Add') {
    const terms = node.slice(1).map((child) => leadingInfinityScaleTerm(child, variable, targetKind));
    if (!terms.every(Boolean)) {
      return undefined;
    }
    const ordered = (terms as InfinityScaleTerm[]).sort((left, right) => -compareInfinityScale(left.scale, right.scale));
    while (ordered.length > 0) {
      const dominant = ordered[0];
      const sameScale = ordered.filter((term) => compareInfinityScale(term.scale, dominant.scale) === 0);
      const coefficient = sameScale.reduce((sum, term) => sum + term.coefficient, 0);
      if (Math.abs(coefficient) >= EPSILON) {
        return {
          coefficient,
          scale: cloneScale(dominant.scale),
          reason: 'selected the dominant infinity scale in a sum',
          notes: [
            ...combineNotes(...sameScale),
            `Dominant scale: ${infinityScaleLabel(dominant.scale)}.`,
          ],
        };
      }
      ordered.splice(0, sameScale.length);
    }
    return {
      coefficient: 0,
      scale: zeroInfinityScale(),
      reason: 'all leading infinity scales canceled',
    };
  }

  return undefined;
}

function successFromTerm(term: InfinityScaleTerm): FiniteLimitRuleSuccess | undefined {
  const comparison = compareInfinityScale(term.scale, zeroInfinityScale());
  const coefficientLatex = formatLimitNumberLatex(term.coefficient);
  const methodRows: DisplayDetailLinePart[][] = [
    [limitTextPart('Form detected: infinity scale comparison.')],
    [
      limitTextPart('Rewrite/equivalent: dominant scale '),
      limitMathPart(infinityScaleLabel(term.scale)),
      limitTextPart(' with coefficient '),
      limitMathPart(coefficientLatex),
      limitTextPart('.'),
    ],
    [
      limitTextPart('Key calculation: compare '),
      limitMathPart(infinityScaleLabel(term.scale)),
      limitTextPart(' against the constant scale '),
      limitMathPart('1'),
      limitTextPart('.'),
    ],
    ...infinityScaleNoteRows(term.notes),
    [limitTextPart(`Reason: ${term.reason}.`)],
  ];

  if (comparison < 0) {
    return profileSymbolicLimitsResult({
      kind: 'success',
      value: 0,
      exactLatex: '0',
      approxText: '0',
      origin: 'rule-based-symbolic',
      detailSections: limitMethodRowsSection([
        ...methodRows,
        [
          limitTextPart('Conclusion: the denominator scale dominates, so the expression tends to '),
          limitMathPart('0'),
          limitTextPart('.'),
        ],
      ]),
    });
  }

  if (comparison === 0) {
    const value = Math.abs(term.coefficient) < EPSILON ? 0 : term.coefficient;
    const exactLatex = formatLimitNumberLatex(value);
    return {
      kind: 'success',
      value,
      exactLatex,
      approxText: numericApproxText(value),
      origin: 'rule-based-symbolic',
      detailSections: limitMethodRowsSection([
        ...methodRows,
        [
          limitTextPart('Conclusion: matching scales leave the coefficient '),
          limitMathPart(exactLatex),
          limitTextPart('.'),
        ],
      ]),
    };
  }

  const infinity: FiniteLimitRuleValue = term.coefficient >= 0 ? 'posInfinity' : 'negInfinity';
  return profileSymbolicLimitsResult({
    kind: 'success',
    value: infinity,
    exactLatex: formatLimitValueLatex(infinity),
    approxText: infinity === 'posInfinity' ? 'Infinity' : '-Infinity',
    origin: 'rule-based-symbolic',
    detailSections: limitMethodRowsSection([
      ...methodRows,
      [
        limitTextPart('Conclusion: the dominant scale grows without bound, so the limit is '),
        limitMathPart(formatLimitValueLatex(infinity) ?? (infinity === 'posInfinity' ? '\\infty' : '-\\infty')),
        limitTextPart('.'),
      ],
    ]),
  });
}

function infinityScaleNoteRows(notes: readonly string[] | undefined): DisplayDetailLinePart[][] {
  return (notes ?? []).map((note) => {
    const dominantScale = note.match(/^Dominant scale:\s*(.+)\.$/u);
    if (dominantScale) {
      return [
        limitTextPart('Dominant scale: '),
        limitMathPart(dominantScale[1]),
        limitTextPart('.'),
      ];
    }
    return [limitTextPart(note)];
  });
}

export function resolveInfiniteScaleLimit(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
): FiniteLimitRuleSuccess | undefined {
  const term = leadingInfinityScaleTerm(node, variable, targetKind);
  return term ? successFromTerm(term) : undefined;
}

export function hasInfiniteScaleCandidate(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
) {
  return Boolean(resolveInfiniteScaleLimit(node, targetKind, variable));
}
