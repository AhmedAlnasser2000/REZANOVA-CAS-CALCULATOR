import type {
  DisplayDetailSection,
  LimitDirection,
} from '../../../types/calculator';
import { derivativeVariableLatex } from '../derivative-target';
import {
  limitValueToLatex,
  type LimitValue,
} from './shared';
import {
  limitDetailSection,
  limitMathPart,
  limitTextPart,
} from '../../symbolic-engine/limits/detail-readback';

type OneSidedEvidence =
  | { kind: 'success'; value: number }
  | { kind: 'unbounded'; sign: 1 | -1 };

function signToInfiniteLimit(sign: 1 | -1): LimitValue {
  return sign > 0 ? 'posInfinity' : 'negInfinity';
}

function oneSidedEvidenceLatex(result: OneSidedEvidence) {
  if (result.kind === 'unbounded') {
    return limitValueToLatex(signToInfiniteLimit(result.sign));
  }
  return limitValueToLatex(result.value);
}

function finiteTargetSideLatex(target: number, direction: Exclude<LimitDirection, 'two-sided'>) {
  const targetLatex = limitValueToLatex(target);
  return `${targetLatex}^{${direction === 'right' ? '+' : '-'}}`;
}

function oneSidedApproachLatex(input: {
  variable: string;
  target: number;
  direction: Exclude<LimitDirection, 'two-sided'>;
}) {
  return `${derivativeVariableLatex(input.variable)}\\to ${finiteTargetSideLatex(input.target, input.direction)}`;
}

function oneSidedLimitCalculationLatex(input: {
  variable: string;
  target: number;
  direction: Exclude<LimitDirection, 'two-sided'>;
  valueLatex: string;
}) {
  const variableLatex = derivativeVariableLatex(input.variable);
  return `\\lim_{${oneSidedApproachLatex(input)}} f(${variableLatex})=${input.valueLatex}`;
}

export function twoSidedMismatchDetails(input: {
  evidence: { left: OneSidedEvidence; right: OneSidedEvidence };
  target: number;
  variable: string;
}): DisplayDetailSection[] {
  const leftLatex = oneSidedEvidenceLatex(input.evidence.left);
  const rightLatex = oneSidedEvidenceLatex(input.evidence.right);

  return [
    limitDetailSection('Why This Limit Fails', [
      [
        limitTextPart('Left calculation: '),
        limitMathPart(oneSidedLimitCalculationLatex({
          variable: input.variable,
          target: input.target,
          direction: 'left',
          valueLatex: leftLatex,
        })),
        limitTextPart('.'),
      ],
      [
        limitTextPart('Right calculation: '),
        limitMathPart(oneSidedLimitCalculationLatex({
          variable: input.variable,
          target: input.target,
          direction: 'right',
          valueLatex: rightLatex,
        })),
        limitTextPart('.'),
      ],
      [
        limitTextPart('Left side tends to '),
        limitMathPart(leftLatex),
        limitTextPart(', while '),
        limitTextPart('Right side tends to '),
        limitMathPart(rightLatex),
        limitTextPart('.'),
      ],
      [
        limitTextPart('The two one-sided limits are different, so the two-sided limit does not exist.'),
      ],
    ]),
  ];
}

export function signedFiniteLimitBehaviorDetails(input: {
  direction: LimitDirection;
  target: number;
  variable: string;
  value: LimitValue;
}): DisplayDetailSection[] {
  if (input.value !== 'posInfinity' && input.value !== 'negInfinity') {
    return [];
  }

  const valueLatex = limitValueToLatex(input.value);
  if (input.direction === 'left' || input.direction === 'right') {
    const side = input.direction === 'right' ? 'right-hand' : 'left-hand';
    const comparison = input.direction === 'right' ? 'greater than' : 'less than';
    const sign = input.value === 'posInfinity' ? 'positive' : 'negative';
    return [{
      ...limitDetailSection('Side Behavior', [
        [
          limitTextPart(`This is a ${side} limit: `),
          limitMathPart(oneSidedApproachLatex({
            variable: input.variable,
            target: input.target,
            direction: input.direction,
          })),
          limitTextPart(` using values ${comparison} the target.`),
        ],
        [
          limitTextPart(`On that side, sample values stay ${sign} and grow without bound.`),
        ],
        [
          limitTextPart('Calculation: '),
          limitMathPart(oneSidedLimitCalculationLatex({
            variable: input.variable,
            target: input.target,
            direction: input.direction,
            valueLatex,
          })),
          limitTextPart('.'),
        ],
        [
          limitTextPart(`Conclusion: the ${side} limit is `),
          limitMathPart(valueLatex),
          limitTextPart('.'),
        ],
      ]),
    }];
  }

  return [{
    ...limitDetailSection('Side Behavior', [
      [
        limitTextPart('Left calculation: '),
        limitMathPart(oneSidedLimitCalculationLatex({
          variable: input.variable,
          target: input.target,
          direction: 'left',
          valueLatex,
        })),
        limitTextPart('.'),
      ],
      [
        limitTextPart('Right calculation: '),
        limitMathPart(oneSidedLimitCalculationLatex({
          variable: input.variable,
          target: input.target,
          direction: 'right',
          valueLatex,
        })),
        limitTextPart('.'),
      ],
      [
        limitTextPart('Left-hand and right-hand behavior share the same signed divergence '),
        limitMathPart(valueLatex),
        limitTextPart('.'),
      ],
      [
        limitTextPart('Because the two sides agree, the two-sided limit is '),
        limitMathPart(valueLatex),
        limitTextPart('.'),
      ],
    ]),
  }];
}
