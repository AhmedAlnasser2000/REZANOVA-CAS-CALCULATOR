import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { classifyDerivativePreflight } from './differentiation-preflight';
import {
  ellipticFunctionLatex,
  isEllipticFunctionNode,
} from './integration/algebraic-genus1/elliptic-functions';
import { resolveSymbolicIntegralFromAst } from './integration/dispatch';
import { profileTranscendentalFieldTower } from './integration/transcendental-field-tower';

const ce = new ComputeEngine();

describe('algebraic genus-1 elliptic function substrate', () => {
  it('renders Legendre elliptic heads as MathLive-safe operator calls', () => {
    expect(isEllipticFunctionNode(['EllipticF', 'x', 'm'])).toBe(true);
    expect(isEllipticFunctionNode(['EllipticE', ['Arcsin', 'x'], 'm'])).toBe(true);
    expect(isEllipticFunctionNode(['EllipticPi', 'n', ['Arcsin', 'x'], 'm'])).toBe(true);
    expect(ellipticFunctionLatex(['EllipticF', ['Arcsin', 'x'], 'm'])).toBe(
      '\\operatorname{EllipticF}\\left(\\arcsin(x),m\\right)',
    );
    expect(ellipticFunctionLatex(['EllipticE', ['Arcsin', 'x'], 'm'])).toBe(
      '\\operatorname{EllipticE}\\left(\\arcsin(x),m\\right)',
    );
    expect(ellipticFunctionLatex(['EllipticPi', 'n', ['Arcsin', 'x'], 'm'])).toBe(
      '\\operatorname{EllipticPi}\\left(n,\\arcsin(x),m\\right)',
    );
  });

  it('classifies elliptic functions as direct derivative heads with fixed arity', () => {
    const firstKind = classifyDerivativePreflight(['EllipticF', 'x', 'm'], 'x');
    const secondKind = classifyDerivativePreflight(['EllipticE', 'x', 'm'], 'x');
    const thirdKind = classifyDerivativePreflight(['EllipticPi', 'n', 'x', 'm'], 'x');
    const malformedThirdKind = classifyDerivativePreflight(['EllipticPi', 'x', 'm'], 'x');

    expect(firstKind.kind).toBe('direct-symbolic');
    expect(secondKind.kind).toBe('direct-symbolic');
    expect(thirdKind.kind).toBe('direct-symbolic');
    expect(malformedThirdKind.kind).toBe('malformed');
  });

  it('profiles elliptic heads as behavior-invisible special-function towers', () => {
    const firstKind = profileTranscendentalFieldTower(
      ce.parse('\\operatorname{EllipticF}(x,m)').json,
      'x',
    );
    const thirdKind = profileTranscendentalFieldTower(
      ce.parse('\\operatorname{EllipticPi}(n,x,m)').json,
      'x',
    );

    expect(firstKind.kind).toBe('ready');
    expect(thirdKind.kind).toBe('ready');
    if (firstKind.kind !== 'ready' || thirdKind.kind !== 'ready') {
      throw new Error('expected ready tower profiles');
    }
    expect(firstKind.readiness).toContain('depth1-special-function');
    expect(firstKind.extensions[0]).toMatchObject({
      family: 'special-function',
      head: 'EllipticF',
      argumentLatex: 'x',
    });
    expect(thirdKind.extensions[0]).toMatchObject({
      family: 'special-function',
      head: 'EllipticPi',
      argumentLatex: 'x',
    });
  });

  it('does not make elliptic heads live integration routes yet', () => {
    const result = resolveSymbolicIntegralFromAst(['EllipticF', 'x', 'm'], 'x');

    expect(result.kind).toBe('error');
    expect(result.candidate.method).toBe('unsupported');
  });
});
