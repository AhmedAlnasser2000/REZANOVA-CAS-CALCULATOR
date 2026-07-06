import type { DisplayDetailLinePart } from '../../../types/calculator';
import type {
  SymbolicCoefficient,
  SymbolicCoefficientFact,
} from '../primitives/coefficient-domain';
import {
  limitMathPart,
  limitTextPart,
  formatLimitNumberLatex,
} from './detail-readback';
import type { LocalEquivalent } from './types';

export type LimitAsymptoticCoefficientSign =
  | 'positive'
  | 'negative'
  | 'zero'
  | 'unknown';

export type LimitAsymptoticCoefficient =
  | {
      kind: 'numeric';
      value: number;
      latex: string;
      sign: LimitAsymptoticCoefficientSign;
      facts: [];
    }
  | {
      kind: 'symbolic';
      coefficient: SymbolicCoefficient;
      latex: string;
      sign: 'unknown';
      facts: SymbolicCoefficientFact[];
    };

export type LimitAsymptoticScale =
  | {
      kind: 'finite-power';
      variable: string;
      targetLatex: string;
      carrierLatex: string;
    }
  | {
      kind: 'infinity-power';
      variable: string;
      direction: 'posInfinity' | 'negInfinity';
      carrierLatex: string;
    }
  | {
      kind: 'log-scale';
      variable: string;
      depth: number;
      carrierLatex: string;
    }
  | {
      kind: 'exp-scale';
      variable: string;
      depth: number;
      carrierLatex: string;
    };

export type LimitAsymptoticTermSource =
  | 'local-equivalent'
  | 'recursive-leading-term'
  | 'infinity-scale'
  | 'rewrite'
  | 'mrv-lite';

export type LimitAsymptoticTerm = {
  coefficient: LimitAsymptoticCoefficient;
  order: number;
  scale: LimitAsymptoticScale;
  source: LimitAsymptoticTermSource;
  proofRows: DisplayDetailLinePart[][];
};

export type LimitAsymptoticSeries = {
  variable: string;
  scale: LimitAsymptoticScale;
  terms: LimitAsymptoticTerm[];
  proofRows: DisplayDetailLinePart[][];
};

export type LimitAsymptoticBranchDriver = {
  latex: string;
  node?: unknown;
  source: 'coefficient-sign' | 'leading-coefficient' | 'piecewise-condition';
};

export type LimitAsymptoticCondition =
  | { kind: 'positive'; driver: LimitAsymptoticBranchDriver }
  | { kind: 'negative'; driver: LimitAsymptoticBranchDriver }
  | { kind: 'zero'; driver: LimitAsymptoticBranchDriver }
  | { kind: 'nonzero'; driver: LimitAsymptoticBranchDriver };

export const LIMIT_ASYMPTOTIC_CASE_ROW_CAP = 12;
export const LIMIT_ASYMPTOTIC_BRANCH_DRIVER_CAP = 3;
export const LIMIT_ASYMPTOTIC_TAYLOR_ORDER_CAP = 10;

function numericSign(value: number): LimitAsymptoticCoefficientSign {
  if (Object.is(value, 0) || Math.abs(value) < 1e-12) {
    return 'zero';
  }
  return value > 0 ? 'positive' : 'negative';
}

export function numericAsymptoticCoefficient(value: number): LimitAsymptoticCoefficient {
  return {
    kind: 'numeric',
    value,
    latex: formatLimitNumberLatex(value),
    sign: numericSign(value),
    facts: [],
  };
}

export function symbolicAsymptoticCoefficient(
  coefficient: SymbolicCoefficient,
): LimitAsymptoticCoefficient {
  return {
    kind: 'symbolic',
    coefficient,
    latex: coefficient.latex,
    sign: 'unknown',
    facts: coefficient.facts,
  };
}

export function finitePowerScale(input: {
  variable: string;
  targetLatex?: string;
  carrierLatex?: string;
}): LimitAsymptoticScale {
  const targetLatex = input.targetLatex ?? '0';
  return {
    kind: 'finite-power',
    variable: input.variable,
    targetLatex,
    carrierLatex: input.carrierLatex ?? (
      targetLatex === '0'
        ? input.variable
        : `${input.variable}-${targetLatex}`
    ),
  };
}

export function infinityPowerScale(input: {
  variable: string;
  direction: 'posInfinity' | 'negInfinity';
  carrierLatex?: string;
}): LimitAsymptoticScale {
  return {
    kind: 'infinity-power',
    variable: input.variable,
    direction: input.direction,
    carrierLatex: input.carrierLatex ?? input.variable,
  };
}

export function asymptoticTermFromLocalEquivalent(
  equivalent: LocalEquivalent,
  input: {
    variable: string;
    targetLatex?: string;
    carrierLatex?: string;
  },
): LimitAsymptoticTerm {
  const scale = finitePowerScale(input);
  const coefficient = numericAsymptoticCoefficient(equivalent.coefficient);
  return {
    coefficient,
    order: equivalent.order,
    scale,
    source: 'local-equivalent',
    proofRows: [
      [
        limitTextPart('Leading term: '),
        limitMathPart(asymptoticTermLatex({
          coefficient,
          order: equivalent.order,
          scale,
          source: 'local-equivalent',
          proofRows: [],
        })),
        limitTextPart('.'),
      ],
      [
        limitTextPart('Reason: '),
        limitTextPart(equivalent.reason),
        limitTextPart('.'),
      ],
    ],
  };
}

export function localEquivalentFromAsymptoticTerm(
  term: LimitAsymptoticTerm,
): LocalEquivalent | undefined {
  if (term.scale.kind !== 'finite-power' || term.coefficient.kind !== 'numeric') {
    return undefined;
  }

  return {
    coefficient: term.coefficient.value,
    order: term.order,
    reason: `adapted from ${term.source} asymptotic term`,
  };
}

export function compareAsymptoticTermOrder(
  left: LimitAsymptoticTerm,
  right: LimitAsymptoticTerm,
): number {
  return left.order - right.order;
}

function coefficientLatex(coefficient: LimitAsymptoticCoefficient) {
  return coefficient.latex;
}

function scaledCarrierLatex(scale: LimitAsymptoticScale, order: number) {
  if (order === 0) {
    return '';
  }
  const exponent = order === 1 ? '' : `^{${order}}`;
  return `${scale.carrierLatex}${exponent}`;
}

export function asymptoticTermLatex(term: LimitAsymptoticTerm): string {
  const coefficient = coefficientLatex(term.coefficient);
  const carrier = scaledCarrierLatex(term.scale, term.order);
  if (!carrier) {
    return coefficient;
  }
  if (coefficient === '1') {
    return carrier;
  }
  if (coefficient === '-1') {
    return `-${carrier}`;
  }
  return `${coefficient}${carrier}`;
}
