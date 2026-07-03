import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';

function success(latex: string, variable = 'x') {
  const result = resolveSymbolicIntegralFromLatex(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected live genus-1 integration for ${latex}`);
  }
  return result;
}

function certificateLines(latex: string, variable = 'x') {
  const result = success(latex, variable);
  const section = result.detailSections?.find(
    (candidate) => candidate.title === 'Genus-1 Elementarity Certificate',
  );
  expect(section).toBeTruthy();
  return {
    result,
    lines: section?.lines.join('\n') ?? '',
  };
}

describe('algebraic genus-1 elementarity certificates', () => {
  it('adds non-elementarity proof context to canonical first/second/third-kind answers', () => {
    const first = certificateLines('\\frac{1}{\\sqrt{(1-x^2)(1-m*x^2)}}');
    expect(first.result.exactLatex).toBe('\\operatorname{EllipticF}\\left(\\arcsin(x),m\\right)');
    expect(first.result.strategy).toBe('u-substitution');
    expect(first.lines).toContain('first-kind');
    expect(first.lines).toContain('not elementary');
    expect(first.lines).toContain('canonical Legendre template');

    const second = certificateLines('\\sqrt{\\frac{1-m*x^2}{1-x^2}}');
    expect(second.result.exactLatex).toBe('\\operatorname{EllipticE}\\left(\\arcsin(x),m\\right)');
    expect(second.lines).toContain('second-kind');

    const third = certificateLines('\\frac{1}{(1-n*x^2)\\sqrt{(1-x^2)(1-m*x^2)}}');
    expect(third.result.exactLatex).toBe('\\operatorname{EllipticPi}\\left(n,\\arcsin(x),m\\right)');
    expect(third.lines).toContain('third-kind');
  });

  it('adds certificate details to exact-rational named-root first-kind charts', () => {
    const realRoot = certificateLines('\\frac{1}{\\sqrt{x^3-x}}');
    expect(realRoot.result.exactLatex).toContain('EllipticF');
    expect(realRoot.lines).toContain('named-root Legendre chart');
    expect(realRoot.lines).toContain('\\mathbb{C}(x,y)');

    const complexPair = certificateLines('\\frac{1}{\\sqrt{t^3+t+1}}', 't');
    expect(complexPair.result.exactLatex).toContain('EllipticF');
    expect(complexPair.lines).toContain('complex-pair Legendre chart');
    expect(complexPair.lines).toContain('\\mathbb{C}(t,y)');
  });

  it('adds certificate details to bounded Hermite reductions over elliptic bases', () => {
    const result = certificateLines('\\frac{A*x^2+B}{\\sqrt{(1-x^2)(1-m*x^2)}}');

    expect(result.result.exactLatex).toContain('EllipticF');
    expect(result.result.exactLatex).toContain('EllipticE');
    expect(result.lines).toContain('first-kind and second-kind');
    expect(result.lines).toContain('bounded Hermite reduction');
    expect(result.lines).toContain('coefficient specializations');
  });
});
