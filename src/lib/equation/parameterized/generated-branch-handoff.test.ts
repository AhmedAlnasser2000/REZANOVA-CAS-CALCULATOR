import { describe, expect, it, vi } from 'vitest';
import { createEquationSelectedTargetSearchTrace } from '../equation-target-shape';
import {
  type GeneratedBranchHandoffFamily,
  solveGeneratedBranchEquations,
} from './generated-branch-handoff';

describe('solveGeneratedBranchEquations', () => {
  it('route-gates supported families and records skipped family evidence', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const linear = vi.fn(() => ({
      kind: 'unsupported' as const,
      reason: 'not-linear',
      message: 'not linear',
    }));
    const polynomial = vi.fn(() => ({
      kind: 'unsupported' as const,
      reason: 'not-polynomial',
      message: 'not polynomial',
    }));
    const rational = vi.fn(() => ({
      kind: 'success' as const,
      exactLatex: 'z=a+\\frac{1}{b}',
    }));
    const families: GeneratedBranchHandoffFamily[] = [
      { family: 'linear', solve: linear },
      { family: 'polynomial', solve: polynomial },
      { family: 'rational', solve: rational },
    ];

    const result = solveGeneratedBranchEquations({
      branchEquations: ['\\frac{1}{z-a}=b'],
      target: 'z',
      families,
      searchTrace: trace.record,
      failureMessage: () => 'failed',
    });

    expect(result.kind).toBe('success');
    expect(linear).not.toHaveBeenCalled();
    expect(polynomial).not.toHaveBeenCalled();
    expect(rational).toHaveBeenCalledTimes(1);
    expect(trace.events).toContainEqual({
      kind: 'family-skipped',
      phase: 'generated-handoff',
      family: 'linear',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-skipped',
      phase: 'generated-handoff',
      family: 'polynomial',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'rational',
    });
  });

  it('aggregates branch solutions and supplements', () => {
    const families: GeneratedBranchHandoffFamily[] = [
      {
        family: 'linear',
        solve: (equationLatex) => ({
          kind: 'success',
          exactLatex: equationLatex === 'z=a' ? 'z=a' : 'z=b',
          exactSupplementLatex: equationLatex === 'z=a' ? ['a\\ne0'] : ['b\\ne0'],
        }),
      },
    ];

    const result = solveGeneratedBranchEquations({
      branchEquations: ['z=a', 'z=b'],
      target: 'z',
      families,
      failureMessage: () => 'failed',
    });

    expect(result).toMatchObject({
      kind: 'success',
      solutionExpressions: ['a', 'b'],
      exactSupplementLatex: ['a\\ne0', 'b\\ne0'],
    });
  });

  it('uses caller failure message selection', () => {
    const families: GeneratedBranchHandoffFamily[] = [
      {
        family: 'linear',
        solve: () => ({ kind: 'unsupported', reason: 'not-linear', message: 'linear failed' }),
      },
      {
        family: 'polynomial',
        solve: () => ({ kind: 'unsupported', reason: 'not-polynomial', message: 'polynomial failed' }),
      },
    ];

    const result = solveGeneratedBranchEquations({
      branchEquations: ['z=a'],
      target: 'z',
      families,
      failureMessage: ({ attempts }) =>
        attempts.find((attempt) => attempt.family === 'polynomial')?.result.message ?? 'failed',
    });

    expect(result).toMatchObject({
      kind: 'unsupported',
      branchLatex: 'z=a',
      message: 'polynomial failed',
    });
  });

  it('drops complex infinity solutions when requested', () => {
    const families: GeneratedBranchHandoffFamily[] = [
      {
        family: 'linear',
        solve: (equationLatex) => ({
          kind: 'success',
          exactLatex: equationLatex === 'z=0' ? 'z=\\tilde\\infty' : 'z=a',
        }),
      },
    ];

    const result = solveGeneratedBranchEquations({
      branchEquations: ['z=0', 'z=a'],
      target: 'z',
      families,
      dropComplexInfinity: true,
      failureMessage: () => 'failed',
    });

    expect(result).toMatchObject({
      kind: 'success',
      solutionExpressions: ['a'],
    });
  });
});
