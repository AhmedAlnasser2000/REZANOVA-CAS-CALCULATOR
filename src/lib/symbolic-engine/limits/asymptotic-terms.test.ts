import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { parseSymbolicCoefficient } from '../primitives/coefficient-domain';
import {
  LIMIT_ASYMPTOTIC_BRANCH_DRIVER_CAP,
  LIMIT_ASYMPTOTIC_CASE_ROW_CAP,
  LIMIT_ASYMPTOTIC_TAYLOR_ORDER_CAP,
  asymptoticTermFromLocalEquivalent,
  asymptoticTermLatex,
  compareAsymptoticTermOrder,
  finitePowerScale,
  infinityPowerScale,
  localEquivalentFromAsymptoticTerm,
  numericAsymptoticCoefficient,
  symbolicAsymptoticCoefficient,
} from './asymptotic-terms';

const ce = new ComputeEngine();

function coefficient(latex: string) {
  const parsed = parseSymbolicCoefficient(ce.parse(latex).json, 'x');
  expect(parsed.kind).toBe('success');
  if (parsed.kind !== 'success') {
    throw new Error(`expected coefficient for ${latex}`);
  }
  return parsed.coefficient;
}

describe('limits asymptotic term IR', () => {
  it('adapts current numeric local equivalents into finite-power terms', () => {
    const term = asymptoticTermFromLocalEquivalent(
      {
        coefficient: -0.5,
        order: 2,
        reason: 'used local equivalent cos(u) - 1 ~ -u^2/2',
      },
      { variable: 'x' },
    );

    expect(term.scale).toEqual({
      kind: 'finite-power',
      variable: 'x',
      targetLatex: '0',
      carrierLatex: 'x',
    });
    expect(term.coefficient).toMatchObject({
      kind: 'numeric',
      value: -0.5,
      latex: '-\\frac{1}{2}',
      sign: 'negative',
    });
    expect(asymptoticTermLatex(term)).toBe('-\\frac{1}{2}x^{2}');
    expect(term.proofRows.flat()).toContainEqual({
      kind: 'math',
      latex: '-\\frac{1}{2}x^{2}',
    });
  });

  it('roundtrips finite numeric terms back into the legacy local-equivalent shape', () => {
    const term = asymptoticTermFromLocalEquivalent(
      { coefficient: 3, order: 1, reason: 'used local equivalent sin(u) ~ u' },
      { variable: 't', targetLatex: '0' },
    );

    expect(localEquivalentFromAsymptoticTerm(term)).toEqual({
      coefficient: 3,
      order: 1,
      reason: 'adapted from local-equivalent asymptotic term',
    });
  });

  it('keeps target-free symbolic coefficients and their facts for later case splitting', () => {
    const symbolic = symbolicAsymptoticCoefficient(coefficient('\\frac{a+b}{c}'));

    expect(symbolic.kind).toBe('symbolic');
    expect(symbolic.sign).toBe('unknown');
    expect(symbolic.facts).toContainEqual({
      kind: 'nonzero',
      expressionLatex: 'c',
      relation: '\\ne0',
    });
  });

  it('keeps symbolic and infinity-scale terms out of the legacy adapter', () => {
    const symbolicTerm = {
      coefficient: symbolicAsymptoticCoefficient(coefficient('a')),
      order: 1,
      scale: finitePowerScale({ variable: 'x' }),
      source: 'recursive-leading-term' as const,
      proofRows: [],
    };
    const infinityTerm = {
      coefficient: numericAsymptoticCoefficient(2),
      order: 3,
      scale: infinityPowerScale({ variable: 'x', direction: 'posInfinity' }),
      source: 'infinity-scale' as const,
      proofRows: [],
    };

    expect(localEquivalentFromAsymptoticTerm(symbolicTerm)).toBeUndefined();
    expect(localEquivalentFromAsymptoticTerm(infinityTerm)).toBeUndefined();
  });

  it('sorts by leading order and exposes frontier caps centrally', () => {
    const first = asymptoticTermFromLocalEquivalent(
      { coefficient: 1, order: 1, reason: 'first' },
      { variable: 'x' },
    );
    const second = asymptoticTermFromLocalEquivalent(
      { coefficient: 1, order: 3, reason: 'second' },
      { variable: 'x' },
    );

    expect([second, first].sort(compareAsymptoticTermOrder)).toEqual([first, second]);
    expect(LIMIT_ASYMPTOTIC_TAYLOR_ORDER_CAP).toBe(10);
    expect(LIMIT_ASYMPTOTIC_BRANCH_DRIVER_CAP).toBe(3);
    expect(LIMIT_ASYMPTOTIC_CASE_ROW_CAP).toBe(12);
  });
});
