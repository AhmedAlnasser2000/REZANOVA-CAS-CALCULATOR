import type { AngleUnit } from '../../../types/calculator';

const EPSILON = 1e-12;

export type TrigEndpointCarrierKind = 'sin' | 'cos' | 'tan';

export function exactTrigEndpointBranchValues(
  kind: TrigEndpointCarrierKind,
  numericValue: number | null,
  angleUnit: AngleUnit,
  period: string,
) {
  if (numericValue === null || (kind !== 'sin' && kind !== 'cos')) {
    return null;
  }

  const matches = (value: number) => Math.abs(numericValue - value) <= EPSILON;
  const valueByUnit = (radianLatex: string, degreeLatex: string, gradLatex: string) => {
    if (angleUnit === 'rad') {
      return radianLatex;
    }
    return angleUnit === 'deg' ? degreeLatex : gradLatex;
  };

  if (kind === 'sin') {
    if (matches(1)) {
      return [`${valueByUnit('\\frac{\\pi}{2}', '90', '100')}+${period}`];
    }
    if (matches(-1)) {
      return [`-${valueByUnit('\\frac{\\pi}{2}', '90', '100')}+${period}`];
    }
  }

  if (kind === 'cos') {
    if (matches(1)) {
      return [period];
    }
    if (matches(-1)) {
      return [`${valueByUnit('\\pi', '180', '200')}+${period}`];
    }
  }

  return null;
}
