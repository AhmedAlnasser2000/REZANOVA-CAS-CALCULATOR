import type {
  DisplayDetailSection,
  LimitDirection,
} from '../../../types/calculator';
import { isNodeArray, parseAffine } from '../patterns';
import { boxLatex } from '../patterns/latex';
import {
  formatLimitValueLatex,
  limitDetailSection,
  limitMathPart,
  limitTextPart,
} from './detail-readback';
import type { FiniteLimitRuleSuccess } from './types';

const EPSILON = 1e-10;

export type FiniteAbsSideBehaviorResult =
  | FiniteLimitRuleSuccess
  | {
      kind: 'failure';
      error: string;
      detailSections: DisplayDetailSection[];
    };

type AbsAffineQuotient = {
  expressionLatex: string;
  carrierLatex: string;
  coefficient: number;
};

type AbsAffineCarrier = {
  expressionLatex: string;
  carrierLatex: string;
  coefficient: number;
};

function isClose(left: number, right: number) {
  return Math.abs(left - right) <= EPSILON * Math.max(1, Math.abs(left), Math.abs(right));
}

function rootOfAffine(a: number, b: number) {
  return Math.abs(a) <= EPSILON ? undefined : -b / a;
}

function absAffineCarrier(
  node: unknown,
  target: number,
  variable: string,
): AbsAffineCarrier | undefined {
  if (!isNodeArray(node) || node[0] !== 'Abs' || node.length !== 2) {
    return undefined;
  }

  const affine = parseAffine(node[1], variable);
  if (!affine) {
    return undefined;
  }

  const root = rootOfAffine(affine.a, affine.b);
  if (root === undefined || !isClose(root, target)) {
    return undefined;
  }

  return {
    expressionLatex: boxLatex(node),
    carrierLatex: affine.latex,
    coefficient: affine.a,
  };
}

function absAffineQuotient(
  node: unknown,
  target: number,
  variable: string,
): AbsAffineQuotient | undefined {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const numerator = absAffineCarrier(node[1], target, variable);
  if (!numerator) {
    return undefined;
  }

  const denominator = parseAffine(node[2], variable);
  if (
    !denominator
    || !isClose(denominator.a, numerator.coefficient)
    || !isClose(denominator.b, -target * denominator.a)
  ) {
    return undefined;
  }

  return {
    expressionLatex: boxLatex(node),
    carrierLatex: numerator.carrierLatex,
    coefficient: numerator.coefficient,
  };
}

function sideValue(coefficient: number, direction: Exclude<LimitDirection, 'two-sided'>) {
  const rightSign = coefficient > 0 ? 1 : -1;
  return direction === 'right' ? rightSign : -rightSign;
}

function approachLatex(variable: string, target: number, direction: Exclude<LimitDirection, 'two-sided'>) {
  const targetLatex = formatLimitValueLatex(target) ?? `${target}`;
  return `${variable}\\to ${targetLatex}^{${direction === 'left' ? '-' : '+'}}`;
}

function calculationLatex(input: {
  expressionLatex: string;
  variable: string;
  target: number;
  direction: Exclude<LimitDirection, 'two-sided'>;
  value: number;
}) {
  return `\\lim_{${approachLatex(input.variable, input.target, input.direction)}}${input.expressionLatex}=${input.value}`;
}

function absCarrierSuccessDetails(input: {
  expressionLatex: string;
  carrierLatex: string;
  variable: string;
  target: number;
}) {
  return [limitDetailSection('Limit Method', [
    [limitTextPart('Form detected: absolute-value carrier at its zero.')],
    [
      limitTextPart('Carrier: '),
      limitMathPart(input.carrierLatex),
      limitTextPart(' changes sign at the target.'),
    ],
    [
      limitTextPart('Key calculation: '),
      limitMathPart(`\\lim_{${input.variable}\\to ${formatLimitValueLatex(input.target) ?? input.target}}${input.expressionLatex}=0`),
      limitTextPart('.'),
    ],
    [limitTextPart('Conclusion: the absolute-value carrier tends to 0 from both sides.')],
  ])];
}

function absQuotientSuccessDetails(input: {
  quotient: AbsAffineQuotient;
  variable: string;
  target: number;
  direction: Exclude<LimitDirection, 'two-sided'>;
  value: number;
}) {
  const side = input.direction === 'right' ? 'right-hand' : 'left-hand';
  return [limitDetailSection('Side Behavior', [
    [limitTextPart(`Form detected: ${side} absolute-value quotient.`)],
    [
      limitTextPart('Carrier: '),
      limitMathPart(input.quotient.carrierLatex),
      limitTextPart(input.value > 0 ? ' is positive on this side.' : ' is negative on this side.'),
    ],
    [
      limitTextPart('Key calculation: '),
      limitMathPart(calculationLatex({
        expressionLatex: input.quotient.expressionLatex,
        variable: input.variable,
        target: input.target,
        direction: input.direction,
        value: input.value,
      })),
      limitTextPart('.'),
    ],
    [
      limitTextPart('Conclusion: the one-sided limit is '),
      limitMathPart(`${input.value}`),
      limitTextPart('.'),
    ],
  ])];
}

function absQuotientFailureDetails(input: {
  quotient: AbsAffineQuotient;
  variable: string;
  target: number;
  leftValue: number;
  rightValue: number;
}) {
  return [limitDetailSection('Why This Limit Fails', [
    [limitTextPart('Form detected: two-sided absolute-value quotient at a sign change.')],
    [
      limitTextPart('Carrier: '),
      limitMathPart(input.quotient.carrierLatex),
      limitTextPart(' has opposite signs on the two sides of the target.'),
    ],
    [
      limitTextPart('Left calculation: '),
      limitMathPart(calculationLatex({
        expressionLatex: input.quotient.expressionLatex,
        variable: input.variable,
        target: input.target,
        direction: 'left',
        value: input.leftValue,
      })),
      limitTextPart('.'),
    ],
    [
      limitTextPart('Right calculation: '),
      limitMathPart(calculationLatex({
        expressionLatex: input.quotient.expressionLatex,
        variable: input.variable,
        target: input.target,
        direction: 'right',
        value: input.rightValue,
      })),
      limitTextPart('.'),
    ],
    [limitTextPart('Conclusion: the one-sided limits are different, so the two-sided limit does not exist.')],
  ])];
}

function success(value: number, detailSections: DisplayDetailSection[]): FiniteLimitRuleSuccess {
  return {
    kind: 'success',
    value,
    exactLatex: `${value}`,
    approxText: `${value}`,
    origin: 'rule-based-symbolic',
    detailSections,
  };
}

export function hasFiniteAbsSideBehaviorCandidate(
  node: unknown,
  target: number,
  variable: string,
): boolean {
  return Boolean(
    absAffineCarrier(node, target, variable)
    || absAffineQuotient(node, target, variable),
  );
}

export function resolveFiniteAbsSideBehaviorLimit(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
): FiniteAbsSideBehaviorResult | undefined {
  const quotient = absAffineQuotient(node, target, variable);
  if (quotient) {
    const leftValue = sideValue(quotient.coefficient, 'left');
    const rightValue = sideValue(quotient.coefficient, 'right');

    if (direction === 'left') {
      return success(leftValue, absQuotientSuccessDetails({
        quotient,
        variable,
        target,
        direction: 'left',
        value: leftValue,
      }));
    }
    if (direction === 'right') {
      return success(rightValue, absQuotientSuccessDetails({
        quotient,
        variable,
        target,
        direction: 'right',
        value: rightValue,
      }));
    }

    return {
      kind: 'failure',
      error: 'Left and right absolute-value behavior do not agree near the target.',
      detailSections: absQuotientFailureDetails({
        quotient,
        variable,
        target,
        leftValue,
        rightValue,
      }),
    };
  }

  const carrier = absAffineCarrier(node, target, variable);
  if (!carrier) {
    return undefined;
  }

  return success(0, absCarrierSuccessDetails({
    expressionLatex: carrier.expressionLatex,
    carrierLatex: carrier.carrierLatex,
    variable,
    target,
  }));
}
