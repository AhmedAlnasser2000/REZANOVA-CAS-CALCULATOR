import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { classifyDerivativePreflight } from './differentiation-preflight';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

describe('differentiation preflight', () => {
  it('classifies direct symbolic product, quotient, and chain shapes', () => {
    const product = classifyDerivativePreflight(node('x\\sin(x)'), 'x');
    const quotient = classifyDerivativePreflight(node('\\frac{x^2}{x+1}'), 'x');
    const chain = classifyDerivativePreflight(node('\\sin(x^2+1)'), 'x');

    expect(product.kind).toBe('direct-symbolic');
    expect(quotient.kind).toBe('direct-symbolic');
    expect(chain.kind).toBe('direct-symbolic');
  });

  it('classifies erf and erfi as direct symbolic special functions', () => {
    const result = classifyDerivativePreflight(node('\\operatorname{erf}(x)'), 'x');
    const erfi = classifyDerivativePreflight(node('\\operatorname{erfi}(x)'), 'x');

    expect(result.kind).toBe('direct-symbolic');
    expect(erfi.kind).toBe('direct-symbolic');
    expect(result.computeEngineFallbackHeads).toEqual([]);
    expect(result.unsupportedHeads).toEqual([]);
  });

  it('rejects relation and piecewise-style inputs as unsupported expression forms', () => {
    const relation = classifyDerivativePreflight(node('x=1'), 'x');
    const piecewise = classifyDerivativePreflight(
      node('\\begin{cases}x&x>0\\\\-x&x<0\\end{cases}'),
      'x',
    );

    expect(relation.kind).toBe('unsupported');
    expect(relation.unsupportedHeads).toContain('Equal');
    expect(piecewise.kind).toBe('unsupported');
    expect(piecewise.unsupportedHeads).toContain('Which');
  });

  it('stops over-budget expressions before symbolic differentiation', () => {
    const largeSum = ['Add', ...Array.from({ length: 180 }, () => 'x')];
    const result = classifyDerivativePreflight(largeSum, 'x');

    expect(result.kind).toBe('too-complex');
    expect(result.nodeCount).toBeGreaterThan(160);
  });

  it('marks malformed MathJSON before routing', () => {
    const result = classifyDerivativePreflight(['Sin', 'x', 'x'], 'x');

    expect(result.kind).toBe('malformed');
  });
});
