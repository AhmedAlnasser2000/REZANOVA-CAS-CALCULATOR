import type { LimitDirection } from '../../../types/calculator';
import { differentiateAst } from '../differentiation';
import { isNodeArray } from '../patterns';
import {
  evaluateNodeAt,
  factorial,
  isInteger,
  isNonZeroish,
  isZeroish,
  success,
} from './evaluation';
import { formatLimitNumberLatex, formatLimitValueLatex } from './detail-readback';
import {
  matchExpMinusOne,
  matchFunctionMinusOne,
  matchOneMinusFunction,
  matchOnePlus,
} from './known-rules';
import type { FiniteLimitRuleSuccess, FiniteLimitRuleValue, LocalEquivalent } from './types';

const LOCAL_EQUIVALENT_MAX_DERIVATIVE_ORDER = 10;

function combineEquivalentNotes(...equivalents: (LocalEquivalent | undefined)[]) {
  return equivalents.flatMap((equivalent) => equivalent?.notes ?? []);
}

function matchOneMinusExp(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return null;
  }

  const terms = node.slice(1);
  if (terms.length !== 2 || !terms.some((term) => term === 1)) {
    return null;
  }

  const negatedExp = terms.find((term) =>
    isNodeArray(term)
    && term[0] === 'Negate'
    && term.length === 2
    && isNodeArray(term[1])
    && term[1][0] === 'Power'
    && term[1].length === 3
    && term[1][1] === 'ExponentialE');

  return isNodeArray(negatedExp) && isNodeArray(negatedExp[1])
    ? negatedExp[1][2]
    : null;
}

function isLocalEquivalentEligible(node: unknown, variable: string): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node);
  }

  if (typeof node === 'string') {
    return node === variable || node === 'ExponentialE' || node === 'Pi';
  }

  if (!isNodeArray(node) || node.length === 0 || typeof node[0] !== 'string') {
    return false;
  }

  if (
    node[0] === 'Rational'
    && node.length === 3
    && typeof node[1] === 'number'
    && typeof node[2] === 'number'
    && node[2] !== 0
  ) {
    return true;
  }

  if (![
    'Add',
    'Arcsin',
    'Arctan',
    'Cos',
    'Divide',
    'Ln',
    'Log',
    'Multiply',
    'Negate',
    'Power',
    'Sin',
    'Sqrt',
    'Tan',
  ].includes(node[0])) {
    return false;
  }

  return node.slice(1).every((child) => isLocalEquivalentEligible(child, variable));
}

function boundedDerivativeEquivalent(
  node: unknown,
  target: number,
  variable: string,
): LocalEquivalent | undefined {
  if (!isLocalEquivalentEligible(node, variable)) {
    return undefined;
  }

  let derivative = node;
  for (let order = 1; order <= LOCAL_EQUIVALENT_MAX_DERIVATIVE_ORDER; order += 1) {
    try {
      derivative = differentiateAst(derivative, variable);
    } catch {
      return undefined;
    }

    const derivativeValue = evaluateNodeAt(derivative, target, variable);
    if (derivativeValue === undefined) {
      return undefined;
    }

    if (!isZeroish(derivativeValue)) {
      const coefficient = derivativeValue / factorial(order);
      return {
        coefficient,
        order,
        reason: `Taylor leading-term check found first nonzero derivative of order ${order}`,
        notes: [
          `Taylor leading term: first nonzero derivative order ${order}, coefficient ${formatLimitNumberLatex(coefficient)}.`,
        ],
      };
    }
  }

  return undefined;
}

function localEquivalent(
  node: unknown,
  target: number,
  variable: string,
): LocalEquivalent | undefined {
  const direct = evaluateNodeAt(node, target, variable);
  if (isNonZeroish(direct)) {
    return {
      coefficient: direct as number,
      order: 0,
      reason: 'factor has a finite nonzero target value',
    };
  }

  if (node === variable && isZeroish(direct)) {
    return {
      coefficient: 1,
      order: 1,
      reason: `${variable} is the local target carrier`,
    };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return undefined;
  }

  const cosineInner = matchOneMinusFunction(node, 'Cos');
  if (cosineInner) {
    const inner = localEquivalent(cosineInner, target, variable);
    if (inner && inner.order > 0) {
      return {
        coefficient: (inner.coefficient ** 2) / 2,
        order: inner.order * 2,
        reason: 'used local equivalent 1 - cos(u) ~ u^2/2',
      };
    }
  }

  const cosineMinusOneInner = matchFunctionMinusOne(node, 'Cos');
  if (cosineMinusOneInner) {
    const inner = localEquivalent(cosineMinusOneInner, target, variable);
    if (inner && inner.order > 0) {
      return {
        coefficient: -(inner.coefficient ** 2) / 2,
        order: inner.order * 2,
        reason: 'used local equivalent cos(u) - 1 ~ -u^2/2',
      };
    }
  }

  const expInner = matchExpMinusOne(node);
  if (expInner) {
    const inner = localEquivalent(expInner, target, variable);
    if (inner && inner.order > 0) {
      return {
        coefficient: inner.coefficient,
        order: inner.order,
        reason: 'used local equivalent e^u - 1 ~ u',
      };
    }
  }

  const oneMinusExpInner = matchOneMinusExp(node);
  if (oneMinusExpInner) {
    const inner = localEquivalent(oneMinusExpInner, target, variable);
    if (inner && inner.order > 0) {
      return {
        coefficient: -inner.coefficient,
        order: inner.order,
        reason: 'used local equivalent 1 - e^u ~ -u',
      };
    }
  }

  const sqrtArgument = matchFunctionMinusOne(node, 'Sqrt');
  const sqrtInner = sqrtArgument ? matchOnePlus(sqrtArgument) : null;
  if (sqrtInner) {
    const inner = localEquivalent(sqrtInner, target, variable);
    if (inner && inner.order > 0) {
      return {
        coefficient: inner.coefficient / 2,
        order: inner.order,
        reason: 'used local equivalent sqrt(1 + u) - 1 ~ u/2',
      };
    }
  }

  if ((node[0] === 'Sin' || node[0] === 'Tan' || node[0] === 'Arcsin' || node[0] === 'Arctan') && node.length === 2) {
    const inner = localEquivalent(node[1], target, variable);
    if (inner && inner.order > 0) {
      return {
        coefficient: inner.coefficient,
        order: inner.order,
        reason: `used local equivalent ${node[0]}(u) ~ u`,
      };
    }
  }

  if ((node[0] === 'Ln' || node[0] === 'Log') && node.length === 2) {
    const inner = matchOnePlus(node[1]);
    const equivalent = inner ? localEquivalent(inner, target, variable) : undefined;
    if (equivalent && equivalent.order > 0) {
      return {
        coefficient: equivalent.coefficient,
        order: equivalent.order,
        reason: 'used local equivalent ln(1 + u) ~ u',
      };
    }
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = localEquivalent(node[1], target, variable);
    return child
      ? {
          coefficient: -child.coefficient,
          order: child.order,
          reason: child.reason,
          notes: child.notes,
        }
      : undefined;
  }

  if (node[0] === 'Multiply') {
    const factors = node.slice(1).map((child) => localEquivalent(child, target, variable));
    if (factors.every(Boolean)) {
      const equivalents = factors as LocalEquivalent[];
      return {
        coefficient: equivalents.reduce((product, factor) => product * factor.coefficient, 1),
        order: equivalents.reduce((sum, factor) => sum + factor.order, 0),
        reason: 'combined local equivalent factors in a product',
        notes: combineEquivalentNotes(...equivalents),
      };
    }
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = localEquivalent(node[1], target, variable);
    const denominator = localEquivalent(node[2], target, variable);
    if (numerator && denominator && !isZeroish(denominator.coefficient)) {
      return {
        coefficient: numerator.coefficient / denominator.coefficient,
        order: numerator.order - denominator.order,
        reason: 'combined local equivalent orders in a quotient',
        notes: combineEquivalentNotes(numerator, denominator),
      };
    }
  }

  if (node[0] === 'Power' && node.length === 3 && isInteger(node[2])) {
    const base = localEquivalent(node[1], target, variable);
    if (base) {
      return {
        coefficient: base.coefficient ** node[2],
        order: base.order * node[2],
        reason: 'raised a local equivalent factor to an integer power',
        notes: base.notes,
      };
    }
  }

  if (node[0] === 'Add') {
    if (isZeroish(direct)) {
      const taylor = boundedDerivativeEquivalent(node, target, variable);
      if (taylor) {
        return taylor;
      }
    }

    const terms = node.slice(1).map((child) => localEquivalent(child, target, variable));
    if (terms.every(Boolean)) {
      const equivalents = terms as LocalEquivalent[];
      const grouped = new Map<number, number>();
      for (const term of equivalents) {
        grouped.set(term.order, (grouped.get(term.order) ?? 0) + term.coefficient);
      }

      for (const order of [...grouped.keys()].sort((left, right) => left - right)) {
        const coefficient = grouped.get(order) ?? 0;
        if (!isZeroish(coefficient)) {
          return {
            coefficient,
            order,
            reason: 'combined same-order local equivalent terms in a sum',
            notes: combineEquivalentNotes(...equivalents),
          };
        }
      }
    }
  }

  return isZeroish(direct)
    ? boundedDerivativeEquivalent(node, target, variable)
    : undefined;
}

function signedInfinityFromLocalEquivalent(
  equivalent: LocalEquivalent,
  direction: LimitDirection,
): FiniteLimitRuleValue | undefined {
  if (equivalent.order >= 0 || isZeroish(equivalent.coefficient)) {
    return undefined;
  }

  const signForSide = (side: Exclude<LimitDirection, 'two-sided'>) => {
    const sideSign = side === 'left' && Math.abs(equivalent.order) % 2 === 1 ? -1 : 1;
    return equivalent.coefficient * sideSign > 0 ? 1 : -1;
  };

  if (direction === 'left' || direction === 'right') {
    return signForSide(direction) > 0 ? 'posInfinity' : 'negInfinity';
  }

  const left = signForSide('left');
  const right = signForSide('right');
  return left === right
    ? left > 0 ? 'posInfinity' : 'negInfinity'
    : undefined;
}

export function resolveLocalEquivalentLimit(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
  intro: string,
): FiniteLimitRuleSuccess | undefined {
  const equivalent = localEquivalent(node, target, variable);
  if (!equivalent || !Number.isFinite(equivalent.coefficient)) {
    return undefined;
  }

  const baseLines = [
    'Form detected: finite local equivalent comparison of local orders.',
    `Rewrite/equivalent: ${intro}`,
    ...(equivalent.notes ?? []),
    `Key calculation: coefficient ${formatLimitNumberLatex(equivalent.coefficient)} with net order ${equivalent.order}.`,
    `Reason: ${equivalent.reason}.`,
  ];

  if (equivalent.order === 0) {
    return success(equivalent.coefficient, 'rule-based-symbolic', [
      ...baseLines,
      `Conclusion: final limit is ${formatLimitNumberLatex(equivalent.coefficient)}.`,
    ]);
  }

  if (equivalent.order > 0) {
    return success(0, 'rule-based-symbolic', [
      ...baseLines,
      'Conclusion: positive net order means the expression tends to 0 at the target.',
      'Conclusion: final limit is 0.',
    ]);
  }

  const infinity = signedInfinityFromLocalEquivalent(equivalent, direction);
  return infinity
    ? success(infinity, 'rule-based-symbolic', [
        ...baseLines,
        'Conclusion: negative net order creates a pole; the requested direction determines the signed infinity when signs agree.',
        `Conclusion: final limit is ${formatLimitValueLatex(infinity) ?? 'undefined'}.`,
      ])
    : undefined;
}
