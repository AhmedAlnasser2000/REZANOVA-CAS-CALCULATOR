import { describe, expect, it } from 'vitest';
import { runEquationMode } from '../equation';
import { finalizeEquationCanonicalRuntimeOutcome } from '../../equation/solve-result';
import { tryDirectComplexLocusOutcome } from './complex-direct-locus';
import { makeRequest } from './test-support';

function solve(equationLatex: string, target = 'z') {
  const result = tryDirectComplexLocusOutcome({ equationLatex, target });
  if (!result || result.kind !== 'success') throw new Error(`Expected a direct locus for ${equationLatex}`);
  return result;
}

describe('direct complex Equation loci', () => {
  it('returns a parameterized vertical line for a real-part condition', () => {
    const result = solve('Re(z)=1');
    expect(result.exactLatex).toBe('z=1+t\\imaginaryI');
    expect(result.exactSupplementLatex).toEqual(['t\\in\\mathbb{R}']);
    expect(result.answerRows?.rows[0]?.label).toBe('Vertical line');
  });

  it('returns a parameterized horizontal line for an imaginary-part condition', () => {
    const result = solve('Im(z)=2');
    expect(result.exactLatex).toBe('z=t+2\\imaginaryI');
    expect(result.answerRows?.rows[0]?.label).toBe('Horizontal line');
  });

  it('returns the real axis for a conjugate equality', () => {
    const result = solve('conj(z)=z');
    expect(result.exactLatex).toBe('z=t');
    expect(result.exactSupplementLatex).toEqual(['t\\in\\mathbb{R}']);
    expect(result.answerRows?.rows[0]?.label).toBe('Real axis');
  });

  it('returns a point, empty set, and circle for affine magnitudes', () => {
    expect(solve('abs(z+5)=0').exactLatex).toBe('z=-5');
    expect(solve('abs(z-1)=-2').exactLatex).toBe('\\varnothing');
    expect(solve('abs(2z+4)=6').exactLatex).toBe('\\left|z+2\\right|=3');
  });

  it('returns the nonnegative real ray for sqrt(abs(z)^2)=z', () => {
    const result = solve('\\sqrt{abs(z)^2}=z');
    expect(result.exactLatex).toBe('z=t');
    expect(result.exactSupplementLatex).toEqual(['t\\in\\mathbb{R}', 't\\ge0']);
    expect(result.answerRows?.rows[0]?.label).toBe('Nonnegative real ray');
  });

  it('keeps composite affine-magnitude cases on the controlled boundary', () => {
    expect(tryDirectComplexLocusOutcome({ equationLatex: 'abs(z^2+1)=2', target: 'z' })).toBeUndefined();
  });

  it('routes direct loci through the Complex Equation screen before the deferred boundary', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: String.raw`\operatorname{Re}(z)=1`,
      equationSolveTarget: 'z',
      equationAnswerMode: 'exact',
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') throw new Error('Expected a direct locus answer');
    expect(result.exactLatex).toBe(String.raw`z=1+t\imaginaryI`);
    expect(result.exactSupplementLatex).toEqual([String.raw`t\in\mathbb{R}`]);
    expect(result.detailSections?.some((section) => section.title === 'Locus Meaning')).toBe(true);
    const finalized = finalizeEquationCanonicalRuntimeOutcome(result);
    if (finalized.kind === 'prompt') throw new Error('Expected a finalized locus result');
    expect(finalized.canonicalResult.version).toBe(2);
  });
});
