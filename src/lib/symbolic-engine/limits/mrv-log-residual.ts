import type { LimitTargetKind } from '../../../types/calculator';
import { isNodeArray } from '../patterns';
import {
  combineInfinityScale,
  leadingInfinityScaleTerm,
  zeroInfinityScale,
  type InfinityScale,
  type InfinityScaleTerm,
} from './infinity-scale-terms';

const EPSILON = 1e-10;

function isCloseToZero(value: number) {
  return Math.abs(value) < EPSILON;
}

function signedNode(node: unknown, sign: 1 | -1): unknown {
  return sign === 1 ? node : ['Negate', node];
}

export function appendSignedExpression(node: unknown, sign: 1 | -1, output: unknown[]) {
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

function signedTermKey(node: unknown): { key: string; sign: 1 | -1; sample: unknown } {
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return {
      key: JSON.stringify(node[1]),
      sign: -1,
      sample: node[1],
    };
  }
  return {
    key: JSON.stringify(node),
    sign: 1,
    sample: node,
  };
}

function cancelExactOppositeTerms(terms: unknown[]) {
  const counts = new Map<string, { count: number; sample: unknown }>();
  terms.forEach((term) => {
    const keyed = signedTermKey(term);
    const current = counts.get(keyed.key) ?? { count: 0, sample: keyed.sample };
    counts.set(keyed.key, {
      count: current.count + keyed.sign,
      sample: current.sample,
    });
  });

  const reduced: unknown[] = [];
  counts.forEach((entry) => {
    const count = Math.round(entry.count);
    if (count > 0) {
      Array.from({ length: count }).forEach(() => reduced.push(entry.sample));
    } else if (count < 0) {
      Array.from({ length: Math.abs(count) }).forEach(() => reduced.push(['Negate', entry.sample]));
    }
  });
  return reduced;
}

function scaleBy(scale: InfinityScale, factor: number): InfinityScale {
  return {
    expRate: scale.expRate * factor,
    power: scale.power * factor,
    logs: scale.logs.map((logPower) => logPower * factor),
  };
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
    if (numerator === undefined || denominator === undefined || isCloseToZero(denominator)) {
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

function logarithmicExponentFactor(
  node: unknown,
  variable: string,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
): { coefficient: number; scale: InfinityScale } | undefined {
  if (isNodeArray(node) && node[0] === 'Log' && node.length === 2) {
    const inner = leadingInfinityScaleTerm(node[1], variable, targetKind);
    if (!inner || inner.coefficient <= 0) {
      return undefined;
    }
    return {
      coefficient: inner.coefficient,
      scale: inner.scale,
    };
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    const child = logarithmicExponentFactor(node[1], variable, targetKind);
    return child
      ? {
          coefficient: 1 / child.coefficient,
          scale: scaleBy(child.scale, -1),
        }
      : undefined;
  }

  if (isNodeArray(node) && node[0] === 'Multiply') {
    let scalar = 1;
    let logPart: { coefficient: number; scale: InfinityScale } | undefined;
    for (const factor of node.slice(1)) {
      const numeric = numericConstant(factor);
      if (numeric !== undefined) {
        scalar *= numeric;
        continue;
      }
      const child = logarithmicExponentFactor(factor, variable, targetKind);
      if (!child || logPart) {
        return undefined;
      }
      logPart = child;
    }
    if (!logPart) {
      return undefined;
    }
    return {
      coefficient: logPart.coefficient ** scalar,
      scale: scaleBy(logPart.scale, scalar),
    };
  }

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    const denominator = numericConstant(node[2]);
    if (denominator === undefined || isCloseToZero(denominator)) {
      return undefined;
    }
    const numerator = logarithmicExponentFactor(node[1], variable, targetKind);
    return numerator
      ? {
          coefficient: numerator.coefficient ** (1 / denominator),
          scale: scaleBy(numerator.scale, 1 / denominator),
        }
      : undefined;
  }

  return undefined;
}

export function logarithmicExponentDifferenceScale(
  node: unknown,
  variable: string,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
): InfinityScaleTerm | undefined {
  const terms: unknown[] = [];
  appendSignedExpression(node, 1, terms);
  const reducedTerms = cancelExactOppositeTerms(terms);
  if (reducedTerms.length === 0) {
    return undefined;
  }

  let sawLogarithmicTerm = false;
  let coefficient = 1;
  let scale = zeroInfinityScale();
  for (const term of reducedTerms) {
    const constant = numericConstant(term);
    if (constant !== undefined) {
      coefficient *= Math.exp(constant);
      continue;
    }

    const logarithmic = logarithmicExponentFactor(term, variable, targetKind);
    if (!logarithmic) {
      return undefined;
    }
    sawLogarithmicTerm = true;
    coefficient *= logarithmic.coefficient;
    scale = combineInfinityScale(scale, logarithmic.scale);
  }

  if (!sawLogarithmicTerm) {
    return undefined;
  }

  return {
    coefficient,
    scale,
    reason: 'converted logarithmic exponent differences into residual MRV-lite scales',
  };
}
