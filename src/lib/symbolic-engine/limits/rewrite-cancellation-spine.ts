import type { DisplayDetailSection, LimitDirection, LimitTargetKind } from '../../../types/calculator';
import {
  addMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  simplifyMathJsonNodeOrOriginal,
} from '../primitives/simplification/simplification';
import { isNodeArray } from '../patterns';
import {
  limitDetailSection,
  limitTextRow,
  type LimitDetailRow,
} from './detail-readback';
import { resolveFiniteIndeterminateTransformLimit, resolveInfiniteIndeterminateTransformLimit } from './indeterminate-transforms';
import { resolveInfiniteScaleLimit } from './infinity-scale-terms';
import { resolveFiniteRecursiveLeadingTermLimit } from './finite-leading-terms';
import { resolveLocalEquivalentLimit } from './local-equivalents';
import type { FiniteLimitRuleSuccess } from './types';

type FractionParts = {
  numerator: unknown;
  denominator: unknown;
};

export type LimitRewriteCancellationKind =
  | 'common-denominator'
  | 'radical-conjugate'
  | 'finite-log-power-transform'
  | 'infinite-log-power-transform';

const EPSILON = 1e-10;

function isOne(node: unknown) {
  return node === 1;
}

function fractionParts(node: unknown): FractionParts {
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    const child = fractionParts(node[1]);
    return {
      numerator: negateMathJsonNode(child.numerator),
      denominator: child.denominator,
    };
  }

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    return {
      numerator: node[1],
      denominator: node[2],
    };
  }

  return {
    numerator: node,
    denominator: 1,
  };
}

function flattenAdd(node: unknown) {
  const simplified = simplifyMathJsonNodeOrOriginal(node, { maxNodeCount: 320 });
  return isNodeArray(simplified) && simplified[0] === 'Add' ? simplified.slice(1) : [simplified];
}

function commonDenominatorRewrite(node: unknown): unknown | undefined {
  const simplified = simplifyMathJsonNodeOrOriginal(node, { maxNodeCount: 360 });
  if (!isNodeArray(simplified) || simplified[0] !== 'Add') {
    return undefined;
  }

  const terms = simplified.slice(1);
  if (terms.length < 2 || terms.length > 4) {
    return undefined;
  }

  const fractions = terms.map(fractionParts);
  if (fractions.every((part) => isOne(part.denominator))) {
    return undefined;
  }

  const denominator = simplifyMathJsonNodeOrOriginal(
    multiplyMathJsonNodes(...fractions.map((part) => part.denominator)),
    { maxNodeCount: 240 },
  );
  const numerator = simplifyMathJsonNodeOrOriginal(
    addMathJsonNodes(...fractions.map((part, index) => {
      const otherDenominators = fractions
        .filter((_, otherIndex) => otherIndex !== index)
        .map((other) => other.denominator);
      return simplifyMathJsonNodeOrOriginal(
        multiplyMathJsonNodes(part.numerator, ...otherDenominators),
        { maxNodeCount: 240 },
      );
    })),
    { maxNodeCount: 300 },
  );

  return simplifyMathJsonNodeOrOriginal(['Divide', numerator, denominator], { maxNodeCount: 380 });
}

function mergeTerm(map: Map<number, number>, degree: number, coefficient: number) {
  map.set(degree, (map.get(degree) ?? 0) + coefficient);
}

function polynomialCoefficientsUpTo2(node: unknown, variable: string): Map<number, number> | undefined {
  if (typeof node === 'number' && Number.isFinite(node)) {
    return new Map([[0, node]]);
  }
  if (node === variable) {
    return new Map([[1, 1]]);
  }
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return undefined;
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = polynomialCoefficientsUpTo2(node[1], variable);
    return child
      ? new Map([...child.entries()].map(([degree, coefficient]) => [degree, -coefficient]))
      : undefined;
  }

  if (node[0] === 'Add') {
    const result = new Map<number, number>();
    for (const term of node.slice(1)) {
      const termCoefficients = polynomialCoefficientsUpTo2(term, variable);
      if (!termCoefficients) {
        return undefined;
      }
      for (const [degree, coefficient] of termCoefficients.entries()) {
        mergeTerm(result, degree, coefficient);
      }
    }
    return result;
  }

  if (node[0] === 'Power' && node.length === 3 && node[1] === variable && node[2] === 2) {
    return new Map([[2, 1]]);
  }

  if (node[0] === 'Multiply') {
    let scalar = 1;
    let variablePower = 0;
    for (const factor of node.slice(1)) {
      if (typeof factor === 'number' && Number.isFinite(factor)) {
        scalar *= factor;
        continue;
      }
      if (factor === variable) {
        variablePower += 1;
        continue;
      }
      if (isNodeArray(factor) && factor[0] === 'Power' && factor[1] === variable && factor[2] === 2) {
        variablePower += 2;
        continue;
      }
      return undefined;
    }
    return variablePower <= 2 ? new Map([[variablePower, scalar]]) : undefined;
  }

  return undefined;
}

function isNegatedVariable(node: unknown, variable: string) {
  return isNodeArray(node)
    && node[0] === 'Negate'
    && node.length === 2
    && node[1] === variable;
}

function linearNode(coefficient: number, variable: string) {
  if (Math.abs(coefficient) < EPSILON) {
    return undefined;
  }
  if (Math.abs(coefficient - 1) < EPSILON) {
    return variable;
  }
  if (Math.abs(coefficient + 1) < EPSILON) {
    return negateMathJsonNode(variable);
  }
  return multiplyMathJsonNodes(coefficient, variable);
}

function affineNode(linear: number, constant: number, variable: string) {
  const terms: unknown[] = [];
  const linearTerm = linearNode(linear, variable);
  if (linearTerm !== undefined) {
    terms.push(linearTerm);
  }
  if (Math.abs(constant) >= EPSILON) {
    terms.push(constant);
  }
  return simplifyMathJsonNodeOrOriginal(addMathJsonNodes(...terms), { maxNodeCount: 120 });
}

function radicalConjugateRewrite(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
): unknown | undefined {
  if (targetKind !== 'posInfinity') {
    return undefined;
  }

  const terms = flattenAdd(node);
  if (terms.length !== 2) {
    return undefined;
  }

  const sqrtTerm = terms.find((term) => isNodeArray(term) && term[0] === 'Sqrt' && term.length === 2);
  const negativeVariable = terms.find((term) => isNegatedVariable(term, variable));
  if (!isNodeArray(sqrtTerm) || !negativeVariable) {
    return undefined;
  }

  const coefficients = polynomialCoefficientsUpTo2(sqrtTerm[1], variable);
  if (!coefficients) {
    return undefined;
  }

  const quadratic = coefficients.get(2) ?? 0;
  const linear = coefficients.get(1) ?? 0;
  const constant = coefficients.get(0) ?? 0;
  if (Math.abs(quadratic - 1) > EPSILON || !Number.isFinite(linear) || !Number.isFinite(constant)) {
    return undefined;
  }

  const numerator = affineNode(linear, constant, variable);
  const denominator = simplifyMathJsonNodeOrOriginal(
    addMathJsonNodes(sqrtTerm, variable),
    { maxNodeCount: 260 },
  );
  return simplifyMathJsonNodeOrOriginal(['Divide', numerator, denominator], { maxNodeCount: 340 });
}

function prependMethodRows(
  result: FiniteLimitRuleSuccess,
  rows: readonly LimitDetailRow[],
): FiniteLimitRuleSuccess {
  const [first, ...rest] = result.detailSections ?? [];
  const prefix = limitDetailSection('Limit Method', rows);
  if (!first) {
    return {
      ...result,
      detailSections: [prefix],
    };
  }

  const merged: DisplayDetailSection = first.title === 'Limit Method'
    ? (() => {
        const section = limitDetailSection('Limit Method', [
          ...rows,
          ...(first.lineParts ?? first.lines.map(limitTextRow)),
        ]);
        return { ...first, lines: section.lines, lineParts: section.lineParts };
      })()
    : prefix;

  const sections = first.title === 'Limit Method'
    ? [merged, ...rest]
    : [merged, first, ...rest];
  return {
    ...result,
    detailSections: sections,
  };
}

export function classifyFiniteRewriteCancellationCandidate(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
): LimitRewriteCancellationKind | undefined {
  if (commonDenominatorRewrite(node)) {
    return 'common-denominator';
  }
  if (resolveFiniteIndeterminateTransformLimit(node, target, variable, direction)) {
    return 'finite-log-power-transform';
  }
  return undefined;
}

export function classifyInfiniteRewriteCancellationCandidate(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
): LimitRewriteCancellationKind | undefined {
  if (radicalConjugateRewrite(node, targetKind, variable)) {
    return 'radical-conjugate';
  }
  if (resolveInfiniteIndeterminateTransformLimit(node, targetKind, variable)) {
    return 'infinite-log-power-transform';
  }
  return undefined;
}

export function hasFiniteRewriteCancellationCandidate(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
) {
  return classifyFiniteRewriteCancellationCandidate(node, target, variable, direction) !== undefined;
}

export function hasInfiniteRewriteCancellationCandidate(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
) {
  return classifyInfiniteRewriteCancellationCandidate(node, targetKind, variable) !== undefined;
}

export function resolveFiniteRewriteCancellationLimit(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
): FiniteLimitRuleSuccess | undefined {
  const commonDenominator = commonDenominatorRewrite(node);
  if (commonDenominator) {
    const resolved = resolveFiniteRecursiveLeadingTermLimit(commonDenominator, target, variable, direction)
      ?? resolveLocalEquivalentLimit(
        commonDenominator,
        target,
        variable,
        direction,
        'Retried the common-denominator rewrite through finite leading-term comparison.',
      );
    return resolved
      ? prependMethodRows(resolved, [
          limitTextRow('Form detected: rewrite/cancellation spine.'),
          limitTextRow('Rewrite: combined local algebra over a common denominator before retrying the limit.'),
        ])
      : undefined;
  }

  const transformed = resolveFiniteIndeterminateTransformLimit(node, target, variable, direction);
  return transformed
    ? prependMethodRows(transformed, [
        limitTextRow('Form detected: rewrite/cancellation spine.'),
        limitTextRow('Rewrite: selected a safe log/power transform before retrying the sub-limit.'),
      ])
    : undefined;
}

export function resolveInfiniteRewriteCancellationLimit(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
): FiniteLimitRuleSuccess | undefined {
  const conjugate = radicalConjugateRewrite(node, targetKind, variable);
  if (conjugate) {
    const resolved = resolveInfiniteScaleLimit(conjugate, targetKind, variable);
    return resolved
      ? prependMethodRows(resolved, [
          limitTextRow('Form detected: rewrite/cancellation spine.'),
          limitTextRow('Rewrite: rationalized the radical difference with its conjugate before comparing infinity scales.'),
        ])
      : undefined;
  }

  const transformed = resolveInfiniteIndeterminateTransformLimit(node, targetKind, variable);
  return transformed
    ? prependMethodRows(transformed, [
        limitTextRow('Form detected: rewrite/cancellation spine.'),
        limitTextRow('Rewrite: selected a safe log/power transform before retrying the sub-limit.'),
      ])
    : undefined;
}
