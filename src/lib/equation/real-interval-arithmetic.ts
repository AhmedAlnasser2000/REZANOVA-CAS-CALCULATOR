import { ComputeEngine } from '@cortex-js/compute-engine';

import { readNumericNode } from './domain-guards';
import type { EquationNumericDomainFact } from './numeric-domain-segmentation';

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export type RealInterval = {
  left: number;
  right: number;
};

export type RealIntervalEvaluation =
  | { kind: 'known'; interval: RealInterval }
  | { kind: 'unknown'; reason: string };

export type RealIntervalDomainStatus = 'safe' | 'invalid' | 'split-required' | 'unknown';

export type RealIntervalDomainClassification = {
  status: RealIntervalDomainStatus;
  factKind: EquationNumericDomainFact['kind'];
  expressionLatex?: string;
  relationLatex?: string;
  message: string;
  evidence: string;
};

export type RealIntervalDomainSummary = {
  status: RealIntervalDomainStatus;
  classifications: RealIntervalDomainClassification[];
  safeCount: number;
  invalidCount: number;
  splitRequiredCount: number;
  unknownCount: number;
};

const ce = new ComputeEngine();
const EPSILON = 1e-12;

function orderedInterval(left: number, right: number): RealInterval {
  return left <= right ? { left, right } : { left: right, right: left };
}

function intervalWidth(interval: RealInterval) {
  return interval.right - interval.left;
}

function numericConstant(node: unknown): number | null {
  const direct = readNumericNode(node);
  if (direct !== null) {
    return direct;
  }
  if (typeof node === 'string') {
    if (node === 'Pi') {
      return Math.PI;
    }
    if (node === 'ExponentialE') {
      return Math.E;
    }
  }
  return null;
}

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function combineKnown(
  left: RealIntervalEvaluation,
  right: RealIntervalEvaluation,
  combine: (left: RealInterval, right: RealInterval) => RealIntervalEvaluation,
): RealIntervalEvaluation {
  if (left.kind === 'unknown') {
    return left;
  }
  if (right.kind === 'unknown') {
    return right;
  }
  return combine(left.interval, right.interval);
}

function addIntervals(left: RealInterval, right: RealInterval): RealInterval {
  return { left: left.left + right.left, right: left.right + right.right };
}

function subtractIntervals(left: RealInterval, right: RealInterval): RealInterval {
  return { left: left.left - right.right, right: left.right - right.left };
}

function multiplyIntervals(left: RealInterval, right: RealInterval): RealInterval {
  const values = [
    left.left * right.left,
    left.left * right.right,
    left.right * right.left,
    left.right * right.right,
  ];
  return { left: Math.min(...values), right: Math.max(...values) };
}

function divideIntervals(left: RealInterval, right: RealInterval): RealIntervalEvaluation {
  if (right.left <= 0 && right.right >= 0) {
    return { kind: 'unknown', reason: 'division interval crosses zero' };
  }
  return { kind: 'known', interval: multiplyIntervals(left, { left: 1 / right.right, right: 1 / right.left }) };
}

function powerInterval(base: RealInterval, exponent: number): RealIntervalEvaluation {
  if (!Number.isInteger(exponent)) {
    if (base.left < 0) {
      return { kind: 'unknown', reason: 'fractional power interval crosses negative values' };
    }
    return { kind: 'known', interval: orderedInterval(Math.pow(base.left, exponent), Math.pow(base.right, exponent)) };
  }

  if (exponent === 0) {
    return { kind: 'known', interval: { left: 1, right: 1 } };
  }
  if (exponent < 0) {
    const positive = powerInterval(base, Math.abs(exponent));
    if (positive.kind === 'unknown') {
      return positive;
    }
    return divideIntervals({ left: 1, right: 1 }, positive.interval);
  }

  const values = [Math.pow(base.left, exponent), Math.pow(base.right, exponent)];
  if (exponent % 2 === 0 && base.left <= 0 && base.right >= 0) {
    values.push(0);
  }
  return { kind: 'known', interval: { left: Math.min(...values), right: Math.max(...values) } };
}

function criticalTrigRange(
  interval: RealInterval,
  fn: (value: number) => number,
  criticalStep: number,
  criticalOffset: number,
): RealInterval {
  if (intervalWidth(interval) >= Math.PI * 2) {
    return { left: -1, right: 1 };
  }
  const values = [fn(interval.left), fn(interval.right)];
  const first = Math.ceil((interval.left - criticalOffset) / criticalStep);
  const last = Math.floor((interval.right - criticalOffset) / criticalStep);
  for (let k = first; k <= last; k += 1) {
    const point = criticalOffset + criticalStep * k;
    if (point > interval.left + EPSILON && point < interval.right - EPSILON) {
      values.push(fn(point));
    }
  }
  return { left: Math.min(...values), right: Math.max(...values) };
}

function tangentInterval(interval: RealInterval): RealIntervalEvaluation {
  const firstPole = Math.ceil((interval.left - Math.PI / 2) / Math.PI);
  const lastPole = Math.floor((interval.right - Math.PI / 2) / Math.PI);
  if (firstPole <= lastPole) {
    return { kind: 'unknown', reason: 'tangent interval crosses a pole' };
  }
  return { kind: 'known', interval: orderedInterval(Math.tan(interval.left), Math.tan(interval.right)) };
}

function rationalExponent(node: unknown): number | null {
  if (typeof node === 'number') {
    return node;
  }
  if (isArrayNode(node) && node[0] === 'Rational' && node.length === 3) {
    const numerator = numericConstant(node[1]);
    const denominator = numericConstant(node[2]);
    return numerator !== null && denominator !== null && denominator !== 0
      ? numerator / denominator
      : null;
  }
  return numericConstant(node);
}

export function evaluateRealIntervalMathJson(
  node: MathJson,
  target: string,
  interval: RealInterval,
): RealIntervalEvaluation {
  const constant = numericConstant(node);
  if (constant !== null) {
    return { kind: 'known', interval: { left: constant, right: constant } };
  }
  if (typeof node === 'string') {
    return node === target
      ? { kind: 'known', interval }
      : { kind: 'unknown', reason: `unresolved symbol ${node}` };
  }
  if (!isArrayNode(node) || node.length === 0) {
    return { kind: 'unknown', reason: 'unsupported expression shape' };
  }

  const [operator, ...operands] = node;
  if (operator === 'Negate' && operands.length === 1) {
    const value = evaluateRealIntervalMathJson(operands[0] as MathJson, target, interval);
    return value.kind === 'known'
      ? { kind: 'known', interval: { left: -value.interval.right, right: -value.interval.left } }
      : value;
  }
  if (operator === 'Add') {
    let total: RealIntervalEvaluation = { kind: 'known', interval: { left: 0, right: 0 } };
    for (const operand of operands) {
      total = combineKnown(total, evaluateRealIntervalMathJson(operand as MathJson, target, interval), (left, right) => ({
        kind: 'known',
        interval: addIntervals(left, right),
      }));
      if (total.kind === 'unknown') {
        return total;
      }
    }
    return total;
  }
  if (operator === 'Subtract' && operands.length === 2) {
    return combineKnown(
      evaluateRealIntervalMathJson(operands[0] as MathJson, target, interval),
      evaluateRealIntervalMathJson(operands[1] as MathJson, target, interval),
      (left, right) => ({ kind: 'known', interval: subtractIntervals(left, right) }),
    );
  }
  if (operator === 'Multiply') {
    let product: RealIntervalEvaluation = { kind: 'known', interval: { left: 1, right: 1 } };
    for (const operand of operands) {
      product = combineKnown(product, evaluateRealIntervalMathJson(operand as MathJson, target, interval), (left, right) => ({
        kind: 'known',
        interval: multiplyIntervals(left, right),
      }));
      if (product.kind === 'unknown') {
        return product;
      }
    }
    return product;
  }
  if (operator === 'Divide' && operands.length === 2) {
    return combineKnown(
      evaluateRealIntervalMathJson(operands[0] as MathJson, target, interval),
      evaluateRealIntervalMathJson(operands[1] as MathJson, target, interval),
      divideIntervals,
    );
  }
  if (operator === 'Power' && operands.length === 2) {
    const exponent = rationalExponent(operands[1]);
    if (exponent === null) {
      return { kind: 'unknown', reason: 'non-numeric exponent' };
    }
    const base = evaluateRealIntervalMathJson(operands[0] as MathJson, target, interval);
    return base.kind === 'known' ? powerInterval(base.interval, exponent) : base;
  }
  if (operator === 'Sqrt' && operands.length === 1) {
    const radicand = evaluateRealIntervalMathJson(operands[0] as MathJson, target, interval);
    if (radicand.kind === 'unknown') {
      return radicand;
    }
    if (radicand.interval.right < 0) {
      return { kind: 'unknown', reason: 'square-root interval is negative' };
    }
    return {
      kind: 'known',
      interval: {
        left: Math.sqrt(Math.max(0, radicand.interval.left)),
        right: Math.sqrt(radicand.interval.right),
      },
    };
  }
  if ((operator === 'Ln' || operator === 'Log') && operands.length >= 1) {
    const argument = evaluateRealIntervalMathJson(operands[0] as MathJson, target, interval);
    if (argument.kind === 'unknown') {
      return argument;
    }
    if (argument.interval.left <= 0) {
      return { kind: 'unknown', reason: 'log interval crosses nonpositive values' };
    }
    return {
      kind: 'known',
      interval: { left: Math.log(argument.interval.left), right: Math.log(argument.interval.right) },
    };
  }
  if (operator === 'Exp' && operands.length === 1) {
    const argument = evaluateRealIntervalMathJson(operands[0] as MathJson, target, interval);
    return argument.kind === 'known'
      ? { kind: 'known', interval: { left: Math.exp(argument.interval.left), right: Math.exp(argument.interval.right) } }
      : argument;
  }
  if (operator === 'Sin' && operands.length === 1) {
    const argument = evaluateRealIntervalMathJson(operands[0] as MathJson, target, interval);
    return argument.kind === 'known'
      ? { kind: 'known', interval: criticalTrigRange(argument.interval, Math.sin, Math.PI / 2, Math.PI / 2) }
      : argument;
  }
  if (operator === 'Cos' && operands.length === 1) {
    const argument = evaluateRealIntervalMathJson(operands[0] as MathJson, target, interval);
    return argument.kind === 'known'
      ? { kind: 'known', interval: criticalTrigRange(argument.interval, Math.cos, Math.PI, 0) }
      : argument;
  }
  if (operator === 'Tan' && operands.length === 1) {
    const argument = evaluateRealIntervalMathJson(operands[0] as MathJson, target, interval);
    return argument.kind === 'known' ? tangentInterval(argument.interval) : argument;
  }

  return { kind: 'unknown', reason: `unsupported operator ${String(operator)}` };
}

export function evaluateRealIntervalLatex(
  expressionLatex: string,
  target: string,
  interval: RealInterval,
): RealIntervalEvaluation {
  try {
    return evaluateRealIntervalMathJson(ce.parse(expressionLatex).json as MathJson, target, orderedInterval(interval.left, interval.right));
  } catch {
    return { kind: 'unknown', reason: 'parse failure' };
  }
}

function classifyZeroExclusion(interval: RealInterval): RealIntervalDomainStatus {
  if (interval.left > 0 || interval.right < 0) {
    return 'safe';
  }
  if (Math.abs(interval.left) <= EPSILON && Math.abs(interval.right) <= EPSILON) {
    return 'invalid';
  }
  return 'split-required';
}

function classifyPositive(interval: RealInterval): RealIntervalDomainStatus {
  if (interval.left > 0) {
    return 'safe';
  }
  if (interval.right <= 0) {
    return 'invalid';
  }
  return 'split-required';
}

function classifyNonnegative(interval: RealInterval): RealIntervalDomainStatus {
  if (interval.left >= 0) {
    return 'safe';
  }
  if (interval.right < 0) {
    return 'invalid';
  }
  return 'split-required';
}

function classifyInverseTrigDomain(interval: RealInterval): RealIntervalDomainStatus {
  if (interval.left >= -1 && interval.right <= 1) {
    return 'safe';
  }
  if (interval.right < -1 || interval.left > 1) {
    return 'invalid';
  }
  return 'split-required';
}

function classifyTargetExclusion(relationLatex: string | undefined, targetInterval: RealInterval): RealIntervalDomainStatus | null {
  if (!relationLatex) {
    return null;
  }
  const match = relationLatex.replace(/\s+/gu, '').match(/^\\ne(-?\d+(?:\.\d+)?)$/u);
  if (!match) {
    return null;
  }
  const excluded = Number(match[1]);
  if (!Number.isFinite(excluded)) {
    return null;
  }
  if (excluded < targetInterval.left || excluded > targetInterval.right) {
    return 'safe';
  }
  if (Math.abs(targetInterval.left - excluded) <= EPSILON && Math.abs(targetInterval.right - excluded) <= EPSILON) {
    return 'invalid';
  }
  return 'split-required';
}

function statusForFact(
  fact: EquationNumericDomainFact,
  evaluated: RealIntervalEvaluation,
  targetInterval: RealInterval,
): RealIntervalDomainStatus {
  if (fact.kind === 'solved-denominator-exclusion') {
    const targetStatus = classifyTargetExclusion(fact.relationLatex, targetInterval);
    if (targetStatus) {
      return targetStatus;
    }
  }
  if (evaluated.kind === 'unknown') {
    return 'unknown';
  }
  if (fact.kind === 'denominator-exclusion' || fact.kind === 'solved-denominator-exclusion' || fact.relationLatex === '\\ne0') {
    return classifyZeroExclusion(evaluated.interval);
  }
  if (fact.relationLatex === '>0') {
    return classifyPositive(evaluated.interval);
  }
  if (fact.relationLatex === '\\ge0') {
    return classifyNonnegative(evaluated.interval);
  }
  if (fact.kind === 'inverse-trig-domain') {
    return classifyInverseTrigDomain(evaluated.interval);
  }
  return 'unknown';
}

function evidenceFor(
  fact: EquationNumericDomainFact,
  evaluated: RealIntervalEvaluation,
  status: RealIntervalDomainStatus,
) {
  if (evaluated.kind === 'unknown') {
    return `${fact.message}: interval arithmetic unknown (${evaluated.reason}).`;
  }
  const range = `[${evaluated.interval.left.toPrecision(6)}, ${evaluated.interval.right.toPrecision(6)}]`;
  return `${fact.message}: interval arithmetic ${status}; expression range ${range}.`;
}

function isClassifiableFact(fact: EquationNumericDomainFact) {
  return fact.kind === 'denominator-exclusion'
    || fact.kind === 'solved-denominator-exclusion'
    || fact.kind === 'log-domain'
    || fact.kind === 'root-domain'
    || fact.kind === 'fractional-power-domain'
    || fact.kind === 'inverse-trig-domain';
}

export function classifyRealDomainFactsOverInterval(input: {
  facts: readonly EquationNumericDomainFact[];
  target: string;
  start: number;
  end: number;
}): RealIntervalDomainSummary {
  const targetInterval = orderedInterval(input.start, input.end);
  const classifications = input.facts
    .filter(isClassifiableFact)
    .map((fact): RealIntervalDomainClassification => {
      const evaluated = fact.expressionLatex
        ? evaluateRealIntervalLatex(fact.expressionLatex, input.target, targetInterval)
        : { kind: 'unknown' as const, reason: 'missing expression' };
      const status = statusForFact(fact, evaluated, targetInterval);
      return {
        status,
        factKind: fact.kind,
        expressionLatex: fact.expressionLatex,
        relationLatex: fact.relationLatex,
        message: fact.message,
        evidence: evidenceFor(fact, evaluated, status),
      };
    });

  const safeCount = classifications.filter((classification) => classification.status === 'safe').length;
  const invalidCount = classifications.filter((classification) => classification.status === 'invalid').length;
  const splitRequiredCount = classifications.filter((classification) => classification.status === 'split-required').length;
  const unknownCount = classifications.filter((classification) => classification.status === 'unknown').length;
  const status: RealIntervalDomainStatus = invalidCount > 0
    ? 'invalid'
    : splitRequiredCount > 0
      ? 'split-required'
      : unknownCount > 0
        ? 'unknown'
        : 'safe';

  return {
    status,
    classifications,
    safeCount,
    invalidCount,
    splitRequiredCount,
    unknownCount,
  };
}
