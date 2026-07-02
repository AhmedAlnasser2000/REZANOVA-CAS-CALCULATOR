import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { tryAlgebraicGenus0InverseReadback } from './integration/algebraic-genus0/inverse-readback';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

function success(latex: string, variable = 'x') {
  const result = tryAlgebraicGenus0InverseReadback(node(latex), variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected algebraic genus-0 inverse readback for ${latex}: ${result.reason}`);
  }
  expect(result.verification.status).toBe('verified-exact');
  return result;
}

describe('algebraic genus-0 inverse readback evidence', () => {
  it('reads affine radical pullbacks back into the original variable', () => {
    const radical = success('\\sqrt{x+1}');
    expect(radical.source).toBe('affine-radical');
    expect(compact(radical.exactLatex)).toContain('x+1');
    expect(compact(radical.exactLatex)).toContain('^{\\frac{3}{2}}');
    expect(compact(radical.exactLatex)).toContain('\\frac{2');

    const reciprocal = success('\\frac{1}{\\sqrt{x+1}}');
    expect(reciprocal.source).toBe('affine-radical');
    expect(compact(reciprocal.exactLatex)).toContain('2\\sqrt{x+1}');
  });

  it('uses inverse-hyperbolic readback for plus quadratics when that is cleaner', () => {
    const reciprocal = success('\\frac{1}{\\sqrt{x^2+1}}');
    expect(reciprocal.source).toBe('quadratic-plus');
    expect(reciprocal.exactLatex).toContain('arsinh');

    const radical = success('\\sqrt{x^2+1}');
    expect(radical.source).toBe('quadratic-plus');
    expect(radical.exactLatex).toContain('arsinh');
    expect(compact(radical.exactLatex)).toContain('x\\sqrt{x^2+1}');
  });

  it('reads circle-type quadratic pullbacks back as arcsin forms', () => {
    const reciprocal = success('\\frac{1}{\\sqrt{4-x^2}}');
    expect(reciprocal.source).toBe('quadratic-minus');
    expect(reciprocal.exactLatex).toContain('\\arcsin');
    expect(compact(reciprocal.exactLatex)).toContain('\\frac{x}{2}');

    const radical = success('\\sqrt{4-x^2}');
    expect(radical.source).toBe('quadratic-minus');
    expect(radical.exactLatex).toContain('\\arcsin');
    expect(compact(radical.exactLatex)).toContain('x\\sqrt{4-x^2}');
  });

  it('has outside-root inverse-hyperbolic readback evidence', () => {
    const reciprocal = success('\\frac{1}{\\sqrt{x^2-4}}');
    expect(reciprocal.source).toBe('quadratic-outside');
    expect(reciprocal.exactLatex).toContain('arcosh');

    const radical = success('\\sqrt{x^2-4}');
    expect(radical.source).toBe('quadratic-outside');
    expect(radical.exactLatex).toContain('arcosh');
  });

  it('recognizes derivative-present radical quotients', () => {
    const result = success('\\frac{x}{\\sqrt{x^2+1}}');
    expect(result.source).toBe('quadratic-derivative-radical');
    expect(compact(result.exactLatex)).toBe('\\sqrt{x^2+1}');
  });

  it('keeps unsupported inverse readback cases explicit', () => {
    const result = tryAlgebraicGenus0InverseReadback(node('\\frac{x^2}{\\sqrt{x^2+1}}'));
    expect(result).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-readback-family',
    });
  });
});
