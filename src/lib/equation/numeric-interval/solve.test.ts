import { describe, expect, it } from 'vitest';
import { runNumericIntervalSolve } from '../numeric-interval-solve';

describe('runNumericIntervalSolve', () => {
  it('finds bracketed numeric roots on an interval', () => {
    const result = runNumericIntervalSolve('\\cos\\left(x\\right)=x', {
      start: '0',
      end: '1',
      subdivisions: 256,
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric solve success');
    }
    expect(result.roots[0]).toBeGreaterThan(0.73);
    expect(result.roots[0]).toBeLessThan(0.75);
    expect(result.method).toContain('Bracket-first');
  });

  it('respects degree angle mode for direct trig equations', () => {
    const result = runNumericIntervalSolve('\\sin\\left(x\\right)=\\frac{1}{2}', {
      start: '20',
      end: '40',
      subdivisions: 256,
    }, [], 'deg');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric solve success');
    }
    expect(result.roots[0]).toBeGreaterThan(29.9);
    expect(result.roots[0]).toBeLessThan(30.1);
  });

  it('respects grad angle mode for direct trig equations', () => {
    const result = runNumericIntervalSolve('\\sin\\left(x\\right)=\\frac{1}{2}', {
      start: '30',
      end: '40',
      subdivisions: 256,
    }, [], 'grad');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric solve success');
    }
    expect(result.roots[0]).toBeGreaterThan(33.2);
    expect(result.roots[0]).toBeLessThan(33.5);
  });

  it('treats equivalent integer and decimal endpoint forms the same', () => {
    const integerBounds = runNumericIntervalSolve('x^2=4', {
      start: '-3',
      end: '3',
      subdivisions: 128,
    });
    const decimalBounds = runNumericIntervalSolve('x^2=4', {
      start: '-3.0',
      end: '3.0',
      subdivisions: 128,
    });

    expect(integerBounds.kind).toBe('success');
    expect(decimalBounds.kind).toBe('success');
    if (integerBounds.kind !== 'success' || decimalBounds.kind !== 'success') {
      throw new Error('Expected numeric solve successes');
    }
    expect(decimalBounds.roots).toHaveLength(integerBounds.roots.length);
    expect(decimalBounds.roots[0]).toBeCloseTo(integerBounds.roots[0], 8);
    expect(decimalBounds.roots[1]).toBeCloseTo(integerBounds.roots[1], 8);
  });

  it('keeps shifted intervals local and can legitimately find different roots', () => {
    const firstWindow = runNumericIntervalSolve('\\sin\\left(x\\right)=0', {
      start: '0.1',
      end: '4',
      subdivisions: 128,
    });
    const secondWindow = runNumericIntervalSolve('\\sin\\left(x\\right)=0', {
      start: '4',
      end: '7',
      subdivisions: 128,
    });

    expect(firstWindow.kind).toBe('success');
    expect(secondWindow.kind).toBe('success');
    if (firstWindow.kind !== 'success' || secondWindow.kind !== 'success') {
      throw new Error('Expected numeric solve successes');
    }
    expect(firstWindow.roots[0]).toBeGreaterThan(3.1);
    expect(firstWindow.roots[0]).toBeLessThan(3.2);
    expect(secondWindow.roots[0]).toBeGreaterThan(6.2);
    expect(secondWindow.roots[0]).toBeLessThan(6.4);
  });

  it('uses bounded refinement to stabilize dense nested periodic windows', () => {
    const result = runNumericIntervalSolve('\\sin\\left(\\tan\\left(\\ln\\left(x+1\\right)\\right)\\right)=1', {
      start: '1',
      end: '100',
      subdivisions: 256,
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric solve success');
    }
    expect(result.roots.length).toBeGreaterThan(8);
    expect(result.diagnostics.adaptiveSampleCount).toBeGreaterThan(0);
    expect(result.summaryText).toContain('adaptive samples');
  });

  it('recovers an even-multiplicity root without a sign change when residual-verified', () => {
    const result = runNumericIntervalSolve('\\left(x-0.3\\right)^2=0', {
      start: '0',
      end: '1',
      subdivisions: 64,
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric solve success');
    }
    expect(result.roots[0]).toBeGreaterThan(0.29);
    expect(result.roots[0]).toBeLessThan(0.31);
    expect(result.summaryText).toContain('Recovered');
  });

  it('rejects invalid intervals', () => {
    const result = runNumericIntervalSolve('x=0', {
      start: '1',
      end: '0',
      subdivisions: 256,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('Start < End');
    expect(result.error).toContain('local real window');
  });

  it('explains invalid subdivision counts and dense periodic pressure', () => {
    const result = runNumericIntervalSolve('x=0', {
      start: '-1',
      end: '1',
      subdivisions: 4,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('at least 8 subdivisions');
    expect(result.error).toContain('Dense or nested periodic cases');
  });

  it('returns actionable no-root guidance for poor intervals', () => {
    const result = runNumericIntervalSolve('\\cos\\left(x\\right)=x', {
      start: '3',
      end: '20',
      subdivisions: 512,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('local interval search');
    expect(result.error).toContain('not a proof that no roots exist elsewhere');
    expect(result.error).toContain('suggested interval from exact output');
    expect(result.error).toContain('increase subdivisions for dense or nested periodic cases');
  });

  it('explains rejected candidates as domain or validation evidence', () => {
    const result = runNumericIntervalSolve('x=1', {
      start: '0',
      end: '2',
      subdivisions: 128,
    }, [{ kind: 'nonzero', expressionLatex: 'x-1' }]);

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.rejectedCandidateCount).toBeGreaterThan(0);
    expect(result.error).toContain('rejected after substitution');
    expect(result.error).toContain('Discontinuities, domain holes, or residual validation');
  });

  it('avoids accepting discontinuity sign changes as roots', () => {
    const result = runNumericIntervalSolve('\\frac{1}{x}=0', {
      start: '-1',
      end: '1',
      subdivisions: 128,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.diagnostics.discontinuityCellCount).toBeGreaterThan(0);
    expect(result.error).toContain('domain holes');
  });

  it('adds unit-aware branch guidance for direct trig composition failures in degree mode', () => {
    const result = runNumericIntervalSolve('\\tan\\left(\\ln\\left(x+1\\right)\\right)=1', {
      start: '0',
      end: '10',
      subdivisions: 512,
    }, [], 'deg');

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('ln(x+1) stays about in');
    expect(result.error).toContain('45 deg + 180 deg * k');
  });

  it('adds unit-aware branch guidance for direct trig composition failures in grad mode', () => {
    const result = runNumericIntervalSolve('\\tan\\left(\\ln\\left(x+1\\right)\\right)=1', {
      start: '0',
      end: '10',
      subdivisions: 512,
    }, [], 'grad');

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('ln(x+1) stays about in');
    expect(result.error).toContain('50 grad + 200 grad * k');
  });

  it('adds abs-branch guidance for recognized direct absolute-value families', () => {
    const result = runNumericIntervalSolve('\\left|x+1\\right|=e^x', {
      start: '5',
      end: '6',
      subdivisions: 256,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('absolute-value family and generates');
    expect(result.error).toContain('x+1=\\exponentialE^{x}');
  });

  it('adds wrapped abs-branch guidance for recognized affine absolute-value families', () => {
    const result = runNumericIntervalSolve('2\\left|x+1\\right|-3=x', {
      start: '2',
      end: '4',
      subdivisions: 128,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('absolute-value family and generates');
    expect(result.error).toContain('x+1=\\frac{-x}{2}-\\frac{3}{2}');
  });

  it('adds stronger-carrier abs guidance for recognized unresolved polynomial families', () => {
    const result = runNumericIntervalSolve('\\left|x^2+1\\right|+1=e^x', {
      start: '3',
      end: '5',
      subdivisions: 256,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('stronger absolute-value carrier family');
    expect(result.error).toContain('x^2+1=\\exponentialE^{x}-1');
  });

  it('adds outer-polynomial abs guidance when the interval misses every generated branch', () => {
    const result = runNumericIntervalSolve('\\left|x-1\\right|^2-5\\left|x-1\\right|+6=0', {
      start: '-10',
      end: '-5',
      subdivisions: 128,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('absolute-value family and generates');
    expect(result.error).toContain('x-1=2');
    expect(result.error).toContain('x-1=-3');
  });

  it('keeps outer-polynomial composition-backed abs guidance branch-aware on unresolved intervals', () => {
    const result = runNumericIntervalSolve('6\\left|\\sin\\left(x^3+x\\right)\\right|^2-5\\left|\\sin\\left(x^3+x\\right)\\right|+1=0', {
      start: '0',
      end: '1',
      subdivisions: 256,
    }, [], 'deg');

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('\\sin(x^3+x)=\\frac{1}{2}');
    expect(result.error).toContain('\\sin(x^3+x)=\\frac{-1}{3}');
  });

  it('keeps outer non-periodic composition-backed abs guidance branch-aware on unresolved intervals', () => {
    const result = runNumericIntervalSolve('2^{\\left|\\sin\\left(x^5+x\\right)\\right|}=2^{\\frac{1}{2}}', {
      start: '0',
      end: '0.2',
      subdivisions: 128,
    }, [], 'rad');

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('\\sin(x^5+x)=0.500');
    expect(result.error).toContain('\\sin(x^5+x)=-0.500');
  });

  it('flags intervals whose recognized abs magnitude stays negative', () => {
    const result = runNumericIntervalSolve('\\left|x+1\\right|=-x-10', {
      start: '0',
      end: '1',
      subdivisions: 128,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('requires');
    expect(result.error).toContain('\\ge0');
    expect(result.error).toContain('stays negative across the chosen interval');
  });

  it('flags wrapped abs intervals whose normalized comparison stays negative', () => {
    const result = runNumericIntervalSolve('2\\left|x+1\\right|-3=x', {
      start: '-10',
      end: '-5',
      subdivisions: 128,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('\\frac{x}{2}+\\frac{3}{2}\\ge0');
    expect(result.error).toContain('stays negative across the chosen interval');
  });

  it('flags intervals for single-branch abs families', () => {
    const result = runNumericIntervalSolve('\\left|x+1\\right|=0', {
      start: '1',
      end: '2',
      subdivisions: 128,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('single branch');
    expect(result.error).toContain('x+1=0');
  });
});
