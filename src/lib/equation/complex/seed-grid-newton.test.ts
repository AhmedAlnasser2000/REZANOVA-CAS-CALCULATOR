import { describe, expect, it } from 'vitest';
import { createComplexNumericEvaluator } from './numeric-evaluator';
import { findComplexNewtonCandidates } from './seed-grid-newton';

function rootsFor(expressionLatex: string, options: Partial<Parameters<typeof findComplexNewtonCandidates>[0]> = {}) {
  const evaluator = createComplexNumericEvaluator({
    expressionLatex,
    target: 'z',
  });
  return findComplexNewtonCandidates({
    evaluator,
    region: { reMin: -4, reMax: 4, imMin: -2, imMax: 2 },
    gridSize: 9,
    ...options,
  });
}

describe('Complex seed-grid Newton candidates', () => {
  it('finds simple principal-branch roots in a bounded region', () => {
    const result = rootsFor('e^z-1=0', {
      region: { reMin: -1, reMax: 1, imMin: -1, imMax: 1 },
      gridSize: 5,
    });

    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.candidates.some((candidate) =>
      Math.abs(candidate.value.re) < 1e-7 && Math.abs(candidate.value.im) < 1e-7)).toBe(true);
    expect(result.diagnostics.deterministicSeedCount).toBe(25);
    expect(result.diagnostics.convergedSeedCount).toBeGreaterThan(0);
    expect(result.diagnostics.totalEvaluations).toBeGreaterThan(0);
  });

  it('finds non-real roots without using the real interval solver', () => {
    const result = rootsFor('z^2+1=0', {
      region: { reMin: -1, reMax: 1, imMin: -2, imMax: 2 },
      gridSize: 5,
    });

    const imaginaryRoots = result.candidates
      .filter((candidate) => Math.abs(candidate.value.re) < 1e-7)
      .map((candidate) => Math.round(candidate.value.im));
    expect(imaginaryRoots).toEqual(expect.arrayContaining([-1, 1]));
    expect(result.candidates.every((candidate) => candidate.residualNorm < 1e-8)).toBe(true);
  });

  it('enumerates local sine roots inside the selected rectangle', () => {
    const result = rootsFor(String.raw`\sin(z)=0`, {
      region: { reMin: -4, reMax: 4, imMin: -1, imMax: 1 },
      gridSize: 9,
      dedupeTolerance: 1e-5,
    });

    const realRoots = result.candidates
      .filter((candidate) => Math.abs(candidate.value.im) < 1e-7)
      .map((candidate) => Number(candidate.value.re.toFixed(3)));
    expect(realRoots).toEqual(expect.arrayContaining([
      Number((-Math.PI).toFixed(3)),
      0,
      Number(Math.PI.toFixed(3)),
    ]));
  });

  it('uses reproducible supplemental random seeds', () => {
    const first = rootsFor('z^2+1=0', {
      region: { reMin: -1, reMax: 1, imMin: -2, imMax: 2 },
      gridSize: 1,
      randomSeedCount: 12,
      randomSeed: 1234,
    });
    const second = rootsFor('z^2+1=0', {
      region: { reMin: -1, reMax: 1, imMin: -2, imMax: 2 },
      gridSize: 1,
      randomSeedCount: 12,
      randomSeed: 1234,
    });

    expect(first.diagnostics.supplementalRandomUsed).toBe(true);
    expect(first.diagnostics.randomSeedCount).toBe(12);
    expect(first.candidates.map((candidate) => candidate.value)).toEqual(second.candidates.map((candidate) => candidate.value));
  });

  it('rejects invalid regions without probing', () => {
    const result = findComplexNewtonCandidates({
      evaluator: createComplexNumericEvaluator({ expressionLatex: 'z=0', target: 'z' }),
      region: { reMin: 1, reMax: -1, imMin: -1, imMax: 1 },
    });

    expect(result.candidates).toHaveLength(0);
    expect(result.diagnostics.attemptedSeedCount).toBe(0);
  });

  it('reports unresolved-symbol failures as rejected seeds', () => {
    const result = findComplexNewtonCandidates({
      evaluator: createComplexNumericEvaluator({ expressionLatex: 'z+a=0', target: 'z' }),
      region: { reMin: -1, reMax: 1, imMin: -1, imMax: 1 },
      gridSize: 3,
    });

    expect(result.candidates).toHaveLength(0);
    expect(result.diagnostics.rejectedSeedCount).toBe(9);
  });
});
