import { describe, expect, it } from 'vitest';
import { solvePolynomialSystem2x2 } from '../equation-polynomial-system';
import { finalizeEquationCanonicalRuntimeOutcome } from '../solve-result';
import type { StoredVariableValue } from '../../../types/calculator';

function expectSuccess(result: ReturnType<typeof solvePolynomialSystem2x2>) {
  if (result.kind !== 'success') {
    throw new Error(`Expected success, got ${JSON.stringify(result)}`);
  }
  expect(result.kind).toBe('success');
  return result;
}

function expectError(result: ReturnType<typeof solvePolynomialSystem2x2>) {
  if (result.kind !== 'error') {
    throw new Error(`Expected error, got ${JSON.stringify(result)}`);
  }
  expect(result.kind).toBe('error');
  return result;
}

function symmetricProductThrough(count: number) {
  return Array.from({ length: count }, (_, index) => `(x^2-${(index + 1) ** 2})`).join('*');
}

describe('solvePolynomialSystem2x2', () => {
  it('solves a linear polynomial system through resultant projection', () => {
    const result = expectSuccess(solvePolynomialSystem2x2(['x+y=3', 'x-y=1']));

    expect(result.exactLatex).toContain('\\left(2,1\\right)');
    expect(result.approxText).toContain('(x, y) ~= (2, 1)');
    expect(result.detailSections?.map((section) => section.title)).toContain('Resultant Projection');
  });

  it('solves nonlinear retained-variable systems and validates pairs', () => {
    const result = expectSuccess(solvePolynomialSystem2x2(['y=x^2', 'y=1']));

    expect(result.exactLatex).toContain('\\left(-1,1\\right)');
    expect(result.exactLatex).toContain('\\left(1,1\\right)');
    expect(result.detailSections?.find((section) => section.title === 'Candidate Check')?.lines.join(' '))
      .toContain('accepted 2');
  });

  it('solves circle and line intersections through exact candidate validation', () => {
    const result = expectSuccess(solvePolynomialSystem2x2(['x^2+y^2=5', 'y=x+1']));

    expect(result.exactLatex).toContain('\\left(-2,-1\\right)');
    expect(result.exactLatex).toContain('\\left(1,2\\right)');
    expect(result.detailSections?.find((section) => section.title === 'Candidate Check')?.lines.join(' '))
      .toContain('accepted 2');
  });

  it('solves degree-12 retained projections when factors stay bounded', () => {
    const result = expectSuccess(solvePolynomialSystem2x2([
      `y=${symmetricProductThrough(6)}`,
      'y=0',
    ]));

    for (const root of [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]) {
      expect(result.exactLatex).toContain(`\\left(${root},0\\right)`);
    }
    expect(result.detailSections?.find((section) => section.title === 'Resultant Projection')?.lines.join(' '))
      .toContain('Eliminated y to project onto x');
  });

  it('keeps degree-13 retained projections outside the bounded system frontier', () => {
    const result = expectError(solvePolynomialSystem2x2([
      'y=x^{13}',
      'y=0',
    ]));

    expect(result.error).toContain('degree exceeded');
  });

  it('treats MathLive spacing around operations as harmless syntax', () => {
    const result = expectSuccess(solvePolynomialSystem2x2([
      'y=x^2\\quad+\\quad 4x',
      'y=5x\\quad+\\quad 6',
    ]));

    expect(result.exactLatex).toContain('\\left(-2,-4\\right)');
    expect(result.exactLatex).toContain('\\left(3,21\\right)');
  });

  it('substitutes stored constants while protecting x and y', () => {
    const storedVariables: StoredVariableValue[] = [
      { name: 'a', valueLatex: '2', numericValue: 2 },
      { name: 'x', valueLatex: '99', numericValue: 99 },
      { name: 'y', valueLatex: '88', numericValue: 88 },
    ];
    const result = expectSuccess(solvePolynomialSystem2x2(['a*x+y=4', 'x-y=0'], {
      storedVariables,
    }));

    expect(result.exactLatex).toContain('\\frac{4}{3}');
    expect(result.variableSubstitutions).toEqual([{ name: 'a', valueLatex: '2', numericValue: 2 }]);
    expect(result.detailSections?.find((section) => section.title === 'Stored Values')?.lines.join(' '))
      .toContain('a=2');
    expect(result.detailSections?.find((section) => section.title === 'Variable Policy')?.lines.join(' '))
      .toContain('Kept x symbolic');
  });

  it('uses stored constants in nonlinear systems without treating x or y as parameters', () => {
    const storedVariables: StoredVariableValue[] = [
      { name: 'a', valueLatex: '2', numericValue: 2 },
      { name: 'x', valueLatex: '99', numericValue: 99 },
      { name: 'y', valueLatex: '88', numericValue: 88 },
    ];
    const result = expectSuccess(solvePolynomialSystem2x2(['y=a*x^2', 'y=8'], {
      storedVariables,
    }));

    expect(result.exactLatex).toContain('\\left(-2,8\\right)');
    expect(result.exactLatex).toContain('\\left(2,8\\right)');
    expect(result.variableSubstitutions).toEqual([{ name: 'a', valueLatex: '2', numericValue: 2 }]);
  });

  it('rejects unstored symbolic parameters', () => {
    const result = expectError(solvePolynomialSystem2x2(['x+y+z=0', 'x-y=0']));

    expect(result.error).toContain('Only x and y may stay symbolic');
    expect(result.error).toContain('z');
  });

  it('explains underconstrained inputs that do not include both system variables', () => {
    const result = expectError(solvePolynomialSystem2x2(['x^2+4x', '1+5x']));

    expect(result.error).toContain('relate both x and y');
    expect(result.error).toContain('missing y');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('y=x^2+4x');
  });

  it('explains inconsistent constant projections as no solution pairs', () => {
    const result = expectError(solvePolynomialSystem2x2(['y=x^2+44', 'y=x^2+5']));

    expect(result.error).toContain('no real solution pairs');
    expect(result.detailSections?.find((section) => section.title === 'Resultant Projection')?.lines.join(' '))
      .toContain('nonzero constant');
  });

  it('solves direct square substitutions before resultant projection', () => {
    const result = expectSuccess(solvePolynomialSystem2x2([
      'y^2-x^2=9',
      '3x^2+2y^2=8',
    ]));

    expect(result.exactLatex).toBe('\\varnothing');
    expect(result.answerRows?.rows[0]?.label).toBe('No real solution pairs');
    expect(result.detailSections?.[0]?.title).toBe('Square Substitution');
    const finalized = finalizeEquationCanonicalRuntimeOutcome(result);
    if (finalized.kind === 'prompt') throw new Error('Expected a finalized direct system result');
    expect(finalized.canonicalResult.version).toBe(2);
  });

  it('solves reciprocal-square substitutions with denominator exclusions', () => {
    const result = expectSuccess(solvePolynomialSystem2x2([
      '4/x^2+1/y^2=24',
      '5/x^2-2/y^2+4=0',
    ]));

    expect(result.systemReadback?.rows).toHaveLength(4);
    expect(result.exactSupplementLatex).toEqual(['x\\ne0', 'y\\ne0']);
    const finalized = finalizeEquationCanonicalRuntimeOutcome(result);
    if (finalized.kind === 'prompt') throw new Error('Expected a finalized direct system result');
    expect(finalized.canonicalResult.version).toBe(2);
  });

  it('stops cleanly when projection or candidate caps are exceeded', () => {
    const projectionStop = expectError(solvePolynomialSystem2x2(['x+y=3', 'x-y=1'], {
      bivariateOptions: { maxSylvesterDimension: 1 },
    }));
    expect(projectionStop.error).toContain('Sylvester matrix');

    const candidateStop = expectError(solvePolynomialSystem2x2(['y^2=1', 'x-y=0'], {
      maxCandidatePairs: 1,
    }));
    expect(candidateStop.error).toContain('too many candidate pairs');
    expect(candidateStop.detailSections?.[0]?.lines.join(' ')).toContain('candidate pairs');
  });

  it('filters extraneous cross-product candidates through validation', () => {
    const result = expectSuccess(solvePolynomialSystem2x2(['y^2=1', 'x-y=0']));

    expect(result.exactLatex).toContain('\\left(-1,-1\\right)');
    expect(result.exactLatex).toContain('\\left(1,1\\right)');
    expect(result.exactLatex).not.toContain('\\left(0,1\\right)');
    expect(result.rejectedCandidateCount).toBeGreaterThan(0);
    expect(result.detailSections?.some((section) => section.title === 'Extraneous Solutions')).toBe(true);
    expect(result.detailSections?.flatMap((section) => section.lines).join(' ')).toContain('does not satisfy both original equations');
  });

  it('returns a local error for empty polynomial-system input', () => {
    const result = expectError(solvePolynomialSystem2x2(['', 'x-y=0']));

    expect(result.error).toContain('Enter both polynomial equations');
  });
});
