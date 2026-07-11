import { describe, expect, it } from 'vitest';
import { runCalculateMode } from '../calculate';

describe('runCalculateMode', () => {
  it('dual-writes proven Calculate answer nodes without changing exact output', () => {
    const requests = [
      { action: 'evaluate' as const, latex: '2+3' },
      { action: 'simplify' as const, latex: '(x^2-1)/(x-1)' },
      { action: 'factor' as const, latex: 'x^2+2x+1' },
      { action: 'expand' as const, latex: '(x+1)^2' },
    ];

    for (const request of requests) {
      const result = runCalculateMode({
        ...request,
        angleUnit: 'deg',
        outputStyle: 'both',
        ansLatex: '0',
      });
      expect(result.kind).toBe('success');
      if (result.kind !== 'success') throw new Error('Expected a success outcome');
      expect(result.canonicalMath?.canonicalLatex).toBe(result.exactLatex);
      expect(result.canonicalMath?.mathJson).toBeDefined();
      expect(structuredClone(result.canonicalMath)).toEqual(result.canonicalMath);
    }
  });

  it('pins inverse-trig canonical nodes by angle unit and omits unproven calculus nodes', () => {
    const degrees = runCalculateMode({
      action: 'evaluate',
      latex: '\\arcsin(1)',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });
    const radians = runCalculateMode({
      action: 'evaluate',
      latex: '\\arcsin(1)',
      angleUnit: 'rad',
      outputStyle: 'both',
      ansLatex: '0',
    });
    const integral = runCalculateMode({
      action: 'evaluate',
      latex: '\\int 2x \\ln\\left(x^2+1\\right)\\,dx',
      angleUnit: 'rad',
      outputStyle: 'both',
      ansLatex: '0',
    });

    expect(degrees).toMatchObject({
      kind: 'success',
      exactLatex: '90',
      canonicalMath: { version: 1, canonicalLatex: '90', mathJson: 90 },
    });
    expect(radians).toMatchObject({
      kind: 'success',
      exactLatex: '\\frac{\\pi}{2}',
      canonicalMath: {
        version: 1,
        canonicalLatex: '\\frac{\\pi}{2}',
        mathJson: ['Divide', 'Pi', 2],
      },
    });
    expect(integral).not.toHaveProperty('canonicalMath');
  });

  it('substitutes stored numeric values only in standard Evaluate', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: 'a+k',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
      storedVariables: [
        { name: 'a', valueLatex: '4', numericValue: 4 },
        { name: 'k', valueLatex: '-2', numericValue: -2 },
      ],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('2');
    expect(result.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '4', numericValue: 4 },
      { name: 'k', valueLatex: '-2', numericValue: -2 },
    ]);
    expect(result.detailSections?.[0]).toMatchObject({
      title: 'Stored Values',
      lines: [
        'Used stored values: a=4, k=-2.',
        'Effective expression: 2.',
      ],
    });
  });

  it('substitutes explicit named stored values without substituting raw adjacent text', () => {
    const explicit = runCalculateMode({
      action: 'evaluate',
      latex: '@mass+2',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
      storedVariables: [{ name: 'mass', valueLatex: '5', numericValue: 5 }],
    });

    expect(explicit.kind).toBe('success');
    if (explicit.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(explicit.exactLatex).toBe('7');
    expect(explicit.variableSubstitutions).toEqual([
      { name: 'mass', valueLatex: '5', numericValue: 5 },
    ]);

    const raw = runCalculateMode({
      action: 'evaluate',
      latex: 'mass+2',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
      storedVariables: [{ name: 'mass', valueLatex: '5', numericValue: 5 }],
    });

    expect(raw.kind).toBe('success');
    if (raw.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(raw.variableSubstitutions).toBeUndefined();
    expect(raw.exactLatex).not.toBe('7');
  });

  it('does not substitute stored values in algebra transform actions but preserves calculus active variables', () => {
    const simplified = runCalculateMode({
      action: 'simplify',
      latex: 'a+1',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
      storedVariables: [{ name: 'a', valueLatex: '4', numericValue: 4 }],
    });

    expect(simplified.kind).toBe('success');
    if (simplified.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(simplified.exactLatex).toContain('a');
    expect(simplified.variableSubstitutions).toBeUndefined();
    expect(simplified.detailSections?.[0]).toMatchObject({
      title: 'Variable Policy',
      lines: [
        'Ignored stored values: a=4. Symbolic transforms keep variables symbolic.',
      ],
    });

    const workbench = runCalculateMode({
      action: 'evaluate',
      calculateScreen: 'integral',
      latex: '\\int a x\\,dx',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
      storedVariables: [
        { name: 'a', valueLatex: '4', numericValue: 4 },
        { name: 'x', valueLatex: '9', numericValue: 9 },
      ],
    });

    expect(workbench.kind).toBe('success');
    if (workbench.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(workbench.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '4', numericValue: 4 },
    ]);
    expect(workbench.exactLatex).toContain('x');
    expect(workbench.exactLatex).not.toContain('9');
  });

  it('protects the actual free-form derivative variable from stored substitution', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '\\frac{d}{df}\\left(cx+4fx^2\\right)',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
      storedVariables: [
        { name: 'c', valueLatex: '4', numericValue: 4 },
        { name: 'f', valueLatex: '2', numericValue: 2 },
      ],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.title).toBe('Derivative');
    expect(result.variableSubstitutions).toEqual([
      { name: 'c', valueLatex: '4', numericValue: 4 },
    ]);
    expect(result.exactLatex).toContain('x^2');
    expect(result.exactLatex).not.toContain('\\mathrm{d}2');
    expect(result.detailSections?.[0]).toMatchObject({
      title: 'Stored Values',
      lines: [
        'Used stored values: c=4.',
        'Effective derivative expression: \\frac{\\mathrm{d}}{\\mathrm{d}f}4fx^2+4x.',
      ],
    });
    expect(result.detailSections?.[1]).toMatchObject({
      title: 'Variable Policy',
      lines: ['Kept f symbolic as the derivative variable.'],
    });
  });

  it('protects the derivative-at-point variable while substituting parameters', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      calculateScreen: 'derivativePoint',
      latex: '\\left.\\frac{d}{dx}\\left(a x^2+c x\\right)\\right|_{x=3}',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
      storedVariables: [
        { name: 'a', valueLatex: '4', numericValue: 4 },
        { name: 'c', valueLatex: '2', numericValue: 2 },
        { name: 'x', valueLatex: '9', numericValue: 9 },
      ],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('26');
    expect(result.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '4', numericValue: 4 },
      { name: 'c', valueLatex: '2', numericValue: 2 },
    ]);
    expect(result.detailSections?.[1]).toMatchObject({
      title: 'Variable Policy',
      lines: ['Kept x symbolic as the derivative variable.'],
    });
  });

  it('returns a prompt instead of solving equations', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '5x+6=3',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });

    expect(result.kind).toBe('prompt');
    if (result.kind !== 'prompt') {
      throw new Error('Expected a prompt outcome');
    }
    expect(result.message).toBe('Use Equation mode to solve this expression.');
    expect(result.targetMode).toBe('equation');
    expect(result.carryLatex).toBe('5x+6=3');
  });

  it('keeps factorization inside calculate mode', () => {
    const result = runCalculateMode({
      action: 'factor',
      latex: 'x^2+2x+1',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x+1');
  });

  it('labels free-form Calculate integrals as integrals instead of numeric results', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '\\int_{}^{} 2x ln\\left(x^2+1\\right)\\,dx',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.title).toBe('Integral');
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.calculusStrategy).toBe('u-substitution');
    expect(result.resolvedInputLatex).toContain('\\ln');
    expect(result.resolvedInputLatex).not.toContain('_{}^{}');
  });

  it('carries bounded rational partial-fraction strategy through Calculate mode', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '\\int \\frac{1}{x^2-1}\\,dx',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.title).toBe('Integral');
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.calculusStrategy).toBe('partial-fractions');
    expect(result.exactLatex).toContain('\\ln');
    expect(result.exactLatex).toContain('x-1');
    expect(result.exactLatex).toContain('x+1');
    expect(result.answerRows?.rows).toEqual([
      { latex: result.exactLatex },
    ]);
    expect(result.detailSections?.[0]?.title).toBe('Partial Fractions');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('shared polynomial/rational core');

    const repeated = runCalculateMode({
      action: 'evaluate',
      latex: '\\int \\frac{1}{(x-1)^2}\\,dx',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });

    expect(repeated.kind).toBe('success');
    if (repeated.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(repeated.title).toBe('Integral');
    expect(repeated.resultOrigin).toBe('rule-based-symbolic');
    expect(repeated.calculusStrategy).toBe('partial-fractions');
    expect(repeated.exactLatex).toBe('-\\frac{1}{x-1}+C');
    expect(repeated.detailSections?.[0]?.title).toBe('Partial Fractions');

    const quadratic = runCalculateMode({
      action: 'evaluate',
      latex: '\\int \\frac{x+1}{x^2+1}\\,dx',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });

    expect(quadratic.kind).toBe('success');
    if (quadratic.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(quadratic.title).toBe('Integral');
    expect(quadratic.resultOrigin).toBe('rule-based-symbolic');
    expect(quadratic.calculusStrategy).toBe('partial-fractions');
    expect(quadratic.exactLatex).toBe('\\frac{1}{2}\\ln\\left(x^2+1\\right)+\\arctan\\left(x\\right)+C');
    expect(quadratic.detailSections?.[0]?.lines.join(' ')).toContain('irreducible quadratic');
  });

  it('carries definite-integral method and safety details through Calculate mode', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '\\int_0^1 2x\\,dx',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.title).toBe('Integral');
    expect(result.exactLatex).toBe('1');
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.detailSections?.[0]?.title).toBe('Integral Method');
    expect(result.detailSections?.[1]?.title).toBe('Interval Safety');

    const rational = runCalculateMode({
      action: 'evaluate',
      latex: '\\int_2^3 \\frac{1}{(x-1)^2}\\,dx',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });

    expect(rational.kind).toBe('success');
    if (rational.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(rational.calculusStrategy).toBe('partial-fractions');
    expect(rational.detailSections?.map((section) => section.title)).toContain('Partial Fractions');
  });

  it('surfaces unsafe definite-integral stops through Calculate mode', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '\\int_{-1}^{1}\\frac{1}{x}\\,dx',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('outside the real domain');
    expect(result.detailSections?.[0]?.title).toBe('Interval Safety');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Trust: blocked via domain/range core');
  });

  it('labels free-form Calculate derivatives and exposes derivative strategy metadata', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '\\frac{d}{dx}\\sin^2\\left(\\cos^3\\left(x\\right)\\right)',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.title).toBe('Derivative');
    expect(result.calculusDerivativeStrategies).toContain('function-power');
    expect(result.calculusDerivativeStrategies).toContain('chain-rule');
    expect(result.calculusDerivativeStrategies).not.toContain('compute-engine');
    expect(result.exactLatex).toContain('\\sin(x)');
    expect(result.exactLatex).toContain('\\cos(x)^2');
  });

  it('keeps guided derivative strategy metadata aligned with the shared derivative core', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '\\frac{d}{dx}\\left(\\cos^{2x}\\left(x\\right)\\right)',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.title).toBe('Derivative');
    expect(result.calculusDerivativeStrategies).toContain('function-power');
    expect(result.calculusDerivativeStrategies).toContain('general-power');
    expect(result.calculusDerivativeStrategies).not.toContain('compute-engine');
    expect(result.exactLatex).toContain('\\ln');
  });

  it('normalizes free-form directional limit targets before planning', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '\\lim_{x\\to 0^+}\\frac{1}{x}',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.title).toBe('Limit');
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.exactLatex).toBe('\\infty');
  });

  it('carries accurate limit detail notes through Calculate mode', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '\\lim_{x\\to 0^-}\\frac{3x}{x+x^2}',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('3');
    expect(result.detailSections?.[0]?.title).toBe('Limit Method');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('rational normalizer');
  });

  it('returns a controlled error for algebra relation operators', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: 'x\\le2',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('Inequalities');
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'invalid-request',
      source: 'host',
    });
  });
});
