import { describe, expect, it } from 'vitest';
import { createComplexNumericEvaluator } from './numeric-evaluator';
import { verifyComplexContourWinding } from './contour-winding';
import { findComplexNewtonCandidates, type ComplexRectangularRegion } from './seed-grid-newton';

function candidatesFor(expressionLatex: string, region: ComplexRectangularRegion) {
  const evaluator = createComplexNumericEvaluator({ expressionLatex, target: 'z' });
  const candidates = findComplexNewtonCandidates({
    evaluator,
    region,
    gridSize: 9,
    randomSeedCount: 8,
    randomSeed: 20260701,
  }).candidates;
  return { evaluator, candidates };
}

describe('Complex contour winding verification', () => {
  it('verifies seed-grid candidates for exp(z)=1 in a bounded rectangle', () => {
    const region = { reMin: -1, reMax: 1, imMin: -1, imMax: 1 };
    const { evaluator, candidates } = candidatesFor('e^z-1=0', region);

    const result = verifyComplexContourWinding({ evaluator, region, candidates });

    expect(result.kind).toBe('verified');
    if (result.kind !== 'verified') {
      throw new Error('Expected verified contour count');
    }
    expect(result.rootCount).toBe(1);
    expect(result.candidateCount).toBe(1);
    expect(result.minimumBoundaryResidual).toBeGreaterThan(0);
  });

  it('verifies multiple sine roots inside the region', () => {
    const region = { reMin: -4, reMax: 4, imMin: -1, imMax: 1 };
    const { evaluator, candidates } = candidatesFor(String.raw`\sin(z)=0`, region);

    const result = verifyComplexContourWinding({ evaluator, region, candidates });

    expect(result.kind).toBe('verified');
    if (result.kind !== 'verified') {
      throw new Error('Expected verified sine contour count');
    }
    expect(result.rootCount).toBe(3);
    expect(result.candidateCount).toBe(3);
  });

  it('returns inconclusive when candidates do not match the contour count', () => {
    const region = { reMin: -2, reMax: 2, imMin: -2, imMax: 2 };
    const evaluator = createComplexNumericEvaluator({ expressionLatex: 'z^2+1=0', target: 'z' });

    const result = verifyComplexContourWinding({ evaluator, region, candidates: [] });

    expect(result.kind).toBe('inconclusive');
    if (result.kind !== 'inconclusive') {
      throw new Error('Expected contour mismatch');
    }
    expect(result.rootCount).toBe(2);
    expect(result.candidateCount).toBe(0);
  });

  it('stops when the contour boundary touches a root', () => {
    const region = { reMin: -2, reMax: 2, imMin: -1, imMax: 1 };
    const { evaluator, candidates } = candidatesFor('z^2+1=0', region);

    const result = verifyComplexContourWinding({ evaluator, region, candidates });

    expect(result.kind).toBe('unsafe');
    if (result.kind !== 'unsafe') {
      throw new Error('Expected unsafe contour boundary result');
    }
    expect(result.reason).toContain('boundary passes too close');
  });

  it('stops when the boundary touches principal branch-cut diagnostics', () => {
    const region = { reMin: -2, reMax: 2, imMin: -1, imMax: 1 };
    const evaluator = createComplexNumericEvaluator({ expressionLatex: String.raw`\ln(z)=0`, target: 'z' });

    const result = verifyComplexContourWinding({ evaluator, region, candidates: [] });

    expect(result.kind).toBe('unsafe');
    if (result.kind !== 'unsafe') {
      throw new Error('Expected unsafe branch-cut contour result');
    }
    expect(result.reason).toContain('principal branch');
    expect(result.branchDiagnosticCount).toBeGreaterThan(0);
  });

  it('verifies meromorphic contours using known pole counts', () => {
    const region = { reMin: -0.5, reMax: 1.5, imMin: -0.5, imMax: 0.5 };
    const { evaluator, candidates } = candidatesFor('(z-1)/z=0', region);

    const result = verifyComplexContourWinding({
      evaluator,
      region,
      candidates,
      knownPoleCount: 1,
      poleDiagnosticCount: 1,
    });

    expect(result.kind).toBe('verified');
    if (result.kind !== 'verified') {
      throw new Error('Expected pole-aware contour verification');
    }
    expect(result.zerosMinusPoles).toBe(0);
    expect(result.knownPoleCount).toBe(1);
    expect(result.rootCount).toBe(1);
    expect(result.candidateCount).toBe(1);
    expect(result.poleDiagnosticCount).toBe(1);
  });

  it('can verify a bounded no-root meromorphic region when only poles are inside', () => {
    const region = { reMin: -1, reMax: 1, imMin: -1, imMax: 1 };
    const evaluator = createComplexNumericEvaluator({ expressionLatex: '1/z=0', target: 'z' });

    const result = verifyComplexContourWinding({
      evaluator,
      region,
      candidates: [],
      knownPoleCount: 1,
      poleDiagnosticCount: 1,
    });

    expect(result.kind).toBe('verified');
    if (result.kind !== 'verified') {
      throw new Error('Expected pole-aware zero-root verification');
    }
    expect(result.rootCount).toBe(0);
    expect(result.zerosMinusPoles).toBe(-1);
    expect(result.knownPoleCount).toBe(1);
  });
});
