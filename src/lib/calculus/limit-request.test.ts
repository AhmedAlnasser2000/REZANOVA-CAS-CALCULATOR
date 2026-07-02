import { describe, expect, it } from 'vitest';
import { parseNaturalLimitRequest } from './limit-request';

function expectParsed(input: string) {
  const result = parseNaturalLimitRequest(input);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.request;
}

describe('natural limit request parsing', () => {
  it('parses finite text and latex requests', () => {
    const plain = expectParsed('lim x->0 sin(x)/x');
    expect(plain.variable).toBe('x');
    expect(plain.bodyLatex).toBe('\\sin(x)/x');
    expect(plain.target).toMatchObject({
      kind: 'finite',
      value: 0,
      direction: 'two-sided',
    });
    expect(plain.canonicalLatex).toBe('\\lim_{x\\to 0}\\left(\\sin(x)/x\\right)');

    const latex = expectParsed('\\lim_{x\\to0}\\frac{\\sin(x)}{x}');
    expect(latex.variable).toBe('x');
    expect(latex.bodyLatex).toBe('\\frac{\\sin(x)}{x}');
    expect(latex.target).toMatchObject({
      kind: 'finite',
      value: 0,
      direction: 'two-sided',
    });
  });

  it('parses one-sided, infinity, and exact-constant targets', () => {
    const right = expectParsed('\\lim_{x\\to0^+}\\frac{1}{x}');
    expect(right.target).toMatchObject({
      kind: 'finite',
      value: 0,
      direction: 'right',
    });

    const plainRight = expectParsed('lim x -> 0+ 1/x');
    expect(plainRight.target).toMatchObject({
      kind: 'finite',
      value: 0,
      direction: 'right',
    });

    const infinity = expectParsed('\\lim_{t\\to-\\infty}\\frac{1}{t}');
    expect(infinity.variable).toBe('t');
    expect(infinity.target).toMatchObject({
      kind: 'infinite',
      targetKind: 'negInfinity',
    });

    for (const input of [
      'lim x -> infinity 1/x',
      'lim x -> infinty 1/x',
      'lim x -> infty 1/x',
      'lim x -> ∞ 1/x',
      'lim x -> +∞ 1/x',
      'lim x -> +\\infty 1/x',
    ]) {
      const parsed = expectParsed(input);
      expect(parsed.target).toMatchObject({
        kind: 'infinite',
        targetKind: 'posInfinity',
        normalizedTargetLatex: '\\infty',
      });
      expect(parsed.canonicalLatex).toBe('\\lim_{x\\to \\infty}\\left(1/x\\right)');
    }

    for (const input of [
      'lim x -> -∞ 1/x',
      'lim x -> -\\infty 1/x',
    ]) {
      const parsed = expectParsed(input);
      expect(parsed.target).toMatchObject({
        kind: 'infinite',
        targetKind: 'negInfinity',
        normalizedTargetLatex: '-\\infty',
      });
      expect(parsed.canonicalLatex).toBe('\\lim_{x\\to -\\infty}\\left(1/x\\right)');
    }

    const theta = expectParsed('\\lim_{\\theta\\to\\pi/2}\\sin(\\theta)');
    expect(theta.variable).toBe('theta');
    expect(theta.variableLatex).toBe('\\theta');
    expect(theta.target).toMatchObject({
      kind: 'finite',
      normalizedTargetLatex: '\\frac{\\pi}{2}',
    });
    if (theta.target.kind !== 'finite') {
      throw new Error('Expected finite target');
    }
    expect(theta.target.value).toBeCloseTo(Math.PI / 2);
  });

  it('rejects bare expressions and symbolic targets', () => {
    expect(parseNaturalLimitRequest('\\frac{\\sin(x)}{x}')).toMatchObject({
      ok: false,
      looksLikeLimitRequest: false,
    });
    expect(parseNaturalLimitRequest('\\lim_{x\\to a}\\frac{\\sin(x)}{x}')).toMatchObject({
      ok: false,
      looksLikeLimitRequest: true,
    });
  });
});
