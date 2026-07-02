import type { LimitDirection, LimitTargetKind } from '../../../types/calculator';
import {
  addMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  simplifyMathJsonNodeOrOriginal,
} from '../primitives/simplification/simplification';
import { isNodeArray } from '../patterns';
import { formatLimitNumberLatex, limitMethodSection } from './detail-readback';
import { resolveLocalEquivalentLimit } from './local-equivalents';
import type { FiniteLimitRuleSuccess } from './types';

type FractionParts = {
  numerator: unknown;
  denominator: unknown;
};

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

function commonDenominatorRewrite(node: unknown): unknown | undefined {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return undefined;
  }

  const terms = node.slice(1);
  if (terms.length < 2 || terms.length > 4) {
    return undefined;
  }

  const fractions = terms.map(fractionParts);
  if (fractions.every((part) => isOne(part.denominator))) {
    return undefined;
  }

  const denominator = simplifyMathJsonNodeOrOriginal(
    multiplyMathJsonNodes(...fractions.map((part) => part.denominator)),
    { maxNodeCount: 220 },
  );
  const numerator = simplifyMathJsonNodeOrOriginal(
    addMathJsonNodes(...fractions.map((part, index) => {
      const otherDenominators = fractions
        .filter((_, otherIndex) => otherIndex !== index)
        .map((other) => other.denominator);
      return simplifyMathJsonNodeOrOriginal(
        multiplyMathJsonNodes(part.numerator, ...otherDenominators),
        { maxNodeCount: 220 },
      );
    })),
    { maxNodeCount: 260 },
  );

  return simplifyMathJsonNodeOrOriginal(['Divide', numerator, denominator], { maxNodeCount: 320 });
}

export function resolveExactLocalAlgebraLimit(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
): FiniteLimitRuleSuccess | undefined {
  const rewritten = commonDenominatorRewrite(node);
  if (!rewritten) {
    return undefined;
  }

  return resolveLocalEquivalentLimit(
    rewritten,
    target,
    variable,
    direction,
    'Rewrote local algebra over a common denominator before comparing leading behavior.',
  );
}

function flattenAdd(node: unknown) {
  return isNodeArray(node) && node[0] === 'Add' ? node.slice(1) : [node];
}

function isNegatedVariable(node: unknown, variable: string) {
  return (
    isNodeArray(node)
    && node[0] === 'Negate'
    && node.length === 2
    && node[1] === variable
  );
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
    if (!child) {
      return undefined;
    }
    return new Map([...child.entries()].map(([degree, coefficient]) => [degree, -coefficient]));
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

export function resolveInfiniteExactLocalAlgebraLimit(
  node: unknown,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
  variable: string,
) {
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
  if (Math.abs(quadratic - 1) > 1e-10 || !Number.isFinite(linear)) {
    return undefined;
  }

  const value = linear / 2;
  return {
    kind: 'success' as const,
    value,
    exactLatex: formatLimitNumberLatex(value),
    detailSections: limitMethodSection(
      'Form detected: radical difference at positive infinity.',
      'Rewrite/equivalent: rationalized the radical difference by multiplying by the conjugate.',
      'Key calculation: at positive infinity, the leading denominator behaves like 2x.',
      `Conclusion: final limit is ${formatLimitNumberLatex(value)}.`,
    ),
  };
}
