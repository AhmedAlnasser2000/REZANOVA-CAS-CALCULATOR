import { describe, expect, it } from 'vitest';
import type { GraphConditionIR, GraphPiecewiseSpecV1 } from '../contracts';
import { GraphExpressionPlanCache } from '../evaluator';
import { buildGraphPiecewiseConditionPartition } from './piecewise-condition-evidence';

const expression = (mathJson: GraphConditionIR extends never ? never : unknown, freeSymbols: string[] = []) => ({
  mathJson: mathJson as never,
  freeSymbols,
});

const x = expression('x', ['x']);
const relation = {
  kind: 'explicit-y' as const,
  origin: 'authored-relation' as const,
  rhs: x,
};

function comparison(operator: '<' | '<=' | '=' | '>=' | '>', right: unknown): GraphConditionIR {
  return { kind: 'comparison', left: x, operator, right: expression(right) };
}

function partition(conditions: GraphConditionIR[], parameters: Record<string, number> = {}) {
  const piecewise: GraphPiecewiseSpecV1 = {
    version: 1,
    branches: conditions.map((condition, index) => ({
      branchId: `branch-${index + 1}`,
      relation,
      condition,
    })),
  };
  return buildGraphPiecewiseConditionPartition({
    itemId: 'piecewise',
    sourceRevision: 1,
    piecewise,
    independentSymbol: 'x',
    minimum: -10,
    maximum: 10,
    pixelSpan: 1_000,
    tolerancePixels: 0.35,
    parameterEnvironment: parameters,
    cache: new GraphExpressionPlanCache(),
  });
}

describe('piecewise condition evidence', () => {
  it('proves narrow global overlaps and distinguishes offscreen branches from impossible ones', () => {
    const result = partition([comparison('<=', 0.01), comparison('>=', 0), comparison('>', 100)]);
    expect(result.evidence.basis).toBe('exact-global');
    expect(result.evidence.overlapBranchPairs).toContainEqual({
      branchIds: ['branch-1', 'branch-2'], scope: 'global',
    });
    expect(result.evidence.branchApplicability).toContainEqual({ branchId: 'branch-3', status: 'offscreen' });
  });

  it('retains a point gap between exclusive touching branches and closes it when one endpoint is inclusive', () => {
    const gap = partition([comparison('<', 0), comparison('>', 0)]);
    expect(gap.evidence.uncoveredGaps).toContainEqual({
      minimum: 0, maximum: 0, minimumInclusive: true, maximumInclusive: true,
    });
    const covered = partition([comparison('<=', 0), comparison('>', 0)]);
    expect(covered.evidence.uncoveredGaps).toEqual([]);
  });

  it('resolves parameterized bounds exactly and invalidates the partition value with the environment', () => {
    const condition: GraphConditionIR = {
      kind: 'comparison', left: x, operator: '<', right: expression('a', ['a']),
    };
    const first = partition([condition], { a: 2 });
    const second = partition([condition], { a: -3 });
    expect(first.evidence.boundaries[0]?.value).toBe(2);
    expect(second.evidence.boundaries[0]?.value).toBe(-3);
  });

  it('classifies nonlinear periodic conditions adaptively in the current viewport', () => {
    const condition: GraphConditionIR = {
      kind: 'comparison',
      left: expression(['Sin', 'x'], ['x']),
      operator: '>',
      right: expression(0),
    };
    const result = partition([condition]);
    expect(result.evidence.basis).toBe('adaptive-current-viewport');
    expect(result.branchIntervals.get('branch-1')?.length).toBeGreaterThan(2);
    expect(result.evidence.branchApplicability[0]?.status).toBe('applicable-current-viewport');
  });

  it('reports unresolved non-finite condition boundaries instead of claiming completeness', () => {
    const condition: GraphConditionIR = {
      kind: 'comparison',
      left: expression(['Log', -1]),
      operator: '>',
      right: expression(0),
    };
    const result = partition([condition]);
    expect(result.evidence.basis).toBe('unresolved');
    expect(result.evidence.unresolvedBoundaryCount).toBeGreaterThan(0);
    expect(result.evidence.branchApplicability[0]?.status).toBe('unresolved');
  });
});
